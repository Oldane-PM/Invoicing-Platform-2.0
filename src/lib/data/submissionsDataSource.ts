/**
 * Submissions Data Source Abstraction
 *
 * This module provides an abstraction layer for submissions data access.
 * It supports both Supabase (production) and Mock (development/fallback) implementations.
 *
 * SIMPLIFIED APPROACH:
 * - Fetch submissions with flat column access (no nested array joins)
 * - Use separate queries for line items and overtime when needed
 * - Avoid invoices?.find() - use direct column mapping instead
 */

import type { ContractorSubmission, SubmissionDraft, SubmissionStatus } from "../types";
import { mapDbStatusToSubmissionStatus } from "../types";
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import {
  calculateTotalForStorage,
  DEFAULT_HOURLY_RATE,
  DEFAULT_OT_MULTIPLIER,
  getDefaultOvertimeRate,
} from "../calculations";

/**
 * Interface for submissions data source
 * Any implementation (Supabase, Mock, etc.) must implement this interface
 */
export interface SubmissionsDataSource {
  listMySubmissions(): Promise<ContractorSubmission[]>;
  createSubmission(draft: SubmissionDraft): Promise<ContractorSubmission>;
  getSubmittedWorkPeriods(): Promise<string[]>;
  hasSubmissionForPeriod(workPeriod: string): Promise<boolean>;
  /** Resubmit a rejected submission - updates status back to PENDING_MANAGER */
  resubmitAfterRejection(submissionId: string, updatedData?: Partial<SubmissionDraft>): Promise<ContractorSubmission>;
}


/**
 * Supabase implementation of SubmissionsDataSource
 * Works with the actual schema (flat submissions table, contractors table)
 *
 * DEDUPLICATION: Uses static (class-level) tracking to prevent duplicate concurrent fetches.
 * Static ensures deduplication works even if multiple instances somehow exist.
 */
class SupabaseSubmissionsDataSource implements SubmissionsDataSource {
  // STATIC: Ensures in-flight tracking survives any instance recreation
  private static inFlightListRequest: Promise<ContractorSubmission[]> | null = null;
  private static cachedResult: ContractorSubmission[] | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_TTL_MS = 5000; // Cache results for 5 seconds
  private static fetchCount = 0; // Debug counter

  /** Clear cache and reset state (called on logout/user change) */
  static clearCache(): void {
    SupabaseSubmissionsDataSource.inFlightListRequest = null;
    SupabaseSubmissionsDataSource.cachedResult = null;
    SupabaseSubmissionsDataSource.cacheTimestamp = 0;
    SupabaseSubmissionsDataSource.fetchCount = 0;
    console.log("[SupabaseSubmissionsDataSource] Cache cleared");
  }

  private async getContractorUserId(): Promise<string> {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      throw new Error("User not authenticated. Please log in.");
    }

    return user.id;
  }

  /**
   * Get the active contractor details (project name, rates)
   */
  private async getContractorDetails(contractorUserId: string): Promise<{
    hourlyRate: number;
    overtimeRate: number;
    projectName: string;
  } | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("contractors")
      .select("hourly_rate, overtime_rate, default_project_name")
      .eq("contractor_id", contractorUserId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.log("[SupabaseSubmissionsDataSource] No active contractor details found, using defaults");
      return null;
    }

    return {
      hourlyRate: data.hourly_rate || DEFAULT_HOURLY_RATE,
      overtimeRate: data.overtime_rate || (DEFAULT_HOURLY_RATE * DEFAULT_OT_MULTIPLIER),
      projectName: data.default_project_name || "General Work",
    };
  }

  async listMySubmissions(): Promise<ContractorSubmission[]> {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const now = Date.now();
    const cacheAge = SupabaseSubmissionsDataSource.cacheTimestamp > 0 
      ? now - SupabaseSubmissionsDataSource.cacheTimestamp 
      : Infinity;

    // DEDUPLICATION 1: If there's already an in-flight request, return it
    if (SupabaseSubmissionsDataSource.inFlightListRequest) {
      console.log("[SupabaseSubmissionsDataSource] ⏳ Returning in-flight request (deduped)");
      return SupabaseSubmissionsDataSource.inFlightListRequest;
    }

    // DEDUPLICATION 2: Return cached result if still fresh (within TTL)
    if (SupabaseSubmissionsDataSource.cachedResult && cacheAge < SupabaseSubmissionsDataSource.CACHE_TTL_MS) {
      console.log(`[SupabaseSubmissionsDataSource] 📦 Returning cached result (age: ${cacheAge}ms)`);
      return SupabaseSubmissionsDataSource.cachedResult;
    }

    // No cache hit - perform actual fetch
    SupabaseSubmissionsDataSource.fetchCount++;
    const fetchNum = SupabaseSubmissionsDataSource.fetchCount;
    console.log(`[SupabaseSubmissionsDataSource] 🔄 Fetch #${fetchNum} starting (cache age: ${cacheAge === Infinity ? 'never' : cacheAge + 'ms'})`);

    // Create the promise IMMEDIATELY (before any await) to prevent race conditions
    const fetchPromise = this.performListSubmissions();
    SupabaseSubmissionsDataSource.inFlightListRequest = fetchPromise;

    try {
      const result = await fetchPromise;
      // Cache the successful result
      SupabaseSubmissionsDataSource.cachedResult = result;
      SupabaseSubmissionsDataSource.cacheTimestamp = Date.now();
      console.log(`[SupabaseSubmissionsDataSource] ✅ Fetch #${fetchNum} complete, cached ${result.length} submissions`);
      return result;
    } finally {
      // Clear in-flight tracking when done
      SupabaseSubmissionsDataSource.inFlightListRequest = null;
    }
  }

  /**
   * Internal method that performs the actual fetch
   */
  private async performListSubmissions(): Promise<ContractorSubmission[]> {
    const contractorUserId = await this.getContractorUserId();
    console.log("[SupabaseSubmissionsDataSource] Fetching submissions for contractor:", contractorUserId);

    // Fetch submissions - NO relationship joins, just base columns that exist
    // Order by work_period_key (descending) to show most recent work periods first
    // Secondary sort by created_at for submissions in the same work period
    // NOTE: rejection_reason column exists for manager rejection notes
    const { data: submissions, error } = await supabase!
      .from("submissions")
      .select(
        `
        id,
        project_name,
        description,
        period_start,
        period_end,
        work_period,
        work_period_key,
        regular_hours,
        overtime_hours,
        overtime_description,
        total_amount,
        status,
        submitted_at,
        created_at,
        updated_at,
        paid_at,
        rejection_reason
      `
      )
      .eq("contractor_user_id", contractorUserId)
      .order("work_period_key", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SupabaseSubmissionsDataSource] Error fetching submissions:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // Throw a proper Error object with the message for the UI to display
      throw new Error(error.message || "Failed to fetch submissions from database");
    }

    console.log(`[SupabaseSubmissionsDataSource] Fetched ${submissions?.length ?? 0} submissions`);

    // Handle empty results gracefully (NOT an error)
    if (!submissions || submissions.length === 0) {
      console.log("[SupabaseSubmissionsDataSource] No submissions found for user");
      return [];
    }

    // Transform to ContractorSubmission format
    return submissions.map((sub: any) => {
      // Use centralized status mapping from types
      const status = mapDbStatusToSubmissionStatus(sub.status, sub.paid_at);

      // Format work period as "YYYY-MM" if not present
      const workPeriod = sub.work_period || (sub.period_start ? format(new Date(sub.period_start), "yyyy-MM") : "");

      return {
        id: sub.id,
        submissionDate: sub.submitted_at || sub.created_at,
        projectName: sub.project_name || "General Work",
        description: sub.description || "",
        regularHours: sub.regular_hours || 0,
        overtimeHours: sub.overtime_hours || 0,
        totalAmount: sub.total_amount || 0,
        status,
        invoiceUrl: null, // Invoices table does not exist
        workPeriod,
        excludedDates: [], // Not stored in flat schema
        overtimeDescription: sub.overtime_description,
        // Workflow notes (columns may not exist in all schemas - set to null/undefined)
        rejectionReason: sub.rejection_reason ?? null,
        adminNote: sub.admin_note ?? null,
        managerNote: sub.manager_note ?? null,
        updatedAt: sub.updated_at,
      };
    });
  }

  async createSubmission(draft: SubmissionDraft): Promise<ContractorSubmission> {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const contractorUserId = await this.getContractorUserId();
    console.log("[SupabaseSubmissionsDataSource] Creating submission for:", contractorUserId);

    // Check for duplicate work period submission
    const hasDuplicate = await this.hasSubmissionForPeriod(draft.workPeriod);
    if (hasDuplicate) {
      const periodDate = parse(draft.workPeriod, "yyyy-MM", new Date());
      const periodLabel = format(periodDate, "MMMM yyyy");
      throw new Error(`You have already submitted hours for ${periodLabel}. Each work period can only have one submission.`);
    }

    // Get contractor's active contract (most recent if multiple)
    const { data: contractData, error: contractError } = await supabase
      .from("contracts")
      .select("id, project_name")
      .eq("contractor_user_id", contractorUserId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contractError) {
      console.error("[SupabaseSubmissionsDataSource] Error fetching contract:", {
        error: contractError,
        message: contractError.message,
        details: contractError.details,
        hint: contractError.hint,
        code: contractError.code
      });
      throw new Error(`Error fetching contract: ${contractError.message || 'Unknown error'}`);
    }

    if (!contractData) {
      console.error("[SupabaseSubmissionsDataSource] No active contract found for contractor");
      throw new Error("No active contract found. Please contact your manager to set up a contract.");
    }

    const contractId = contractData.id;
    const projectName = contractData.project_name || "General Work";

    // Get contractor details (for rates)
    const details = await this.getContractorDetails(contractorUserId);
    const hourlyRate = details?.hourlyRate || DEFAULT_HOURLY_RATE;
    const overtimeRate = details?.overtimeRate || getDefaultOvertimeRate(hourlyRate);

    // Parse work period to get period_start and period_end
    const periodDate = parse(draft.workPeriod, "yyyy-MM", new Date());
    const periodStart = format(startOfMonth(periodDate), "yyyy-MM-dd");
    const periodEnd = format(endOfMonth(periodDate), "yyyy-MM-dd");

    // Calculate total amount using centralized calculation
    // For now, assuming hourly contractors (fixed-rate logic can be added when contract type is available)
    const totalAmount = calculateTotalForStorage({
      payType: "hourly",
      regularHours: draft.hoursSubmitted,
      overtimeHours: draft.overtimeHours,
      regularRate: hourlyRate,
      overtimeRate: overtimeRate,
    });

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        contractor_user_id: contractorUserId,
        contract_id: contractId,
        project_name: projectName,
        description: draft.description,
        period_start: periodStart,
        period_end: periodEnd,
        work_period: draft.workPeriod,
        work_period_key: periodStart, // First day of month for sorting
        regular_hours: draft.hoursSubmitted,
        overtime_hours: draft.overtimeHours,
        overtime_description: draft.overtimeDescription || null,
        total_amount: totalAmount,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (submissionError) {
      console.error("[SupabaseSubmissionsDataSource] Error creating submission:", submissionError);
      throw submissionError;
    }

    console.log("[SupabaseSubmissionsDataSource] Created submission:", submission.id);

    return {
      id: submission.id,
      submissionDate: submission.submitted_at || submission.created_at,
      projectName: submission.project_name,
      description: submission.description,
      regularHours: submission.regular_hours,
      overtimeHours: submission.overtime_hours,
      totalAmount: submission.total_amount,
      status: "PENDING_MANAGER" as SubmissionStatus,
      invoiceUrl: null,
      workPeriod: submission.work_period,
      excludedDates: draft.excludedDates, // Returned from input, but not persisted deeply
      overtimeDescription: submission.overtime_description,
      rejectionReason: null,
      adminNote: null,
      managerNote: null,
      updatedAt: submission.created_at,
    };
  }

  /**
   * Get all work periods that already have submissions for the current user
   * Returns array of work periods in "YYYY-MM" format
   */
  async getSubmittedWorkPeriods(): Promise<string[]> {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const contractorUserId = await this.getContractorUserId();

    const { data, error } = await supabase
      .from("submissions")
      .select("work_period")
      .eq("contractor_user_id", contractorUserId)
      .not("work_period", "is", null);

    if (error) {
      console.error("[SupabaseSubmissionsDataSource] Error fetching work periods:", error);
      throw new Error(error.message || "Failed to fetch work periods");
    }

    // Extract unique work periods
    const periods = (data || [])
      .map((row) => row.work_period)
      .filter((period): period is string => !!period);

    return [...new Set(periods)];
  }

  /**
   * Check if a submission already exists for the given work period
   */
  async hasSubmissionForPeriod(workPeriod: string): Promise<boolean> {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const contractorUserId = await this.getContractorUserId();

    const { count, error } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("contractor_user_id", contractorUserId)
      .eq("work_period", workPeriod);

    if (error) {
      console.error("[SupabaseSubmissionsDataSource] Error checking for existing submission:", error);
      throw new Error(error.message || "Failed to check for existing submission");
    }

    return (count ?? 0) > 0;
  }

  /**
   * Resubmit a rejected submission
   * Only allowed when status is REJECTED_CONTRACTOR
   * Transitions status back to PENDING_MANAGER (submitted)
   */
  async resubmitAfterRejection(
    submissionId: string,
    updatedData?: Partial<SubmissionDraft>
  ): Promise<ContractorSubmission> {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const contractorUserId = await this.getContractorUserId();

    // First verify this submission belongs to the user and is in rejected status
    const { data: existing, error: fetchError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("contractor_user_id", contractorUserId)
      .single();

    if (fetchError || !existing) {
      throw new Error("Submission not found or access denied");
    }

    // Check status - only allow resubmit from rejected
    const currentStatus = mapDbStatusToSubmissionStatus(existing.status, existing.paid_at);
    if (currentStatus !== "REJECTED_CONTRACTOR") {
      throw new Error(`Cannot resubmit: submission is not in rejected status (current: ${currentStatus})`);
    }

    // Build update payload - only include columns that are guaranteed to exist
    // NOTE: rejection_reason, admin_note, manager_note columns may not exist in all schemas
    const updatePayload: Record<string, any> = {
      status: "submitted", // Back to pending manager review
      updated_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(), // Update submission date
    };

    // Apply any updates from the contractor (e.g., updated description, hours)
    if (updatedData?.description) {
      updatePayload.description = updatedData.description;
    }
    if (updatedData?.hoursSubmitted !== undefined) {
      updatePayload.regular_hours = updatedData.hoursSubmitted;
    }
    if (updatedData?.overtimeHours !== undefined) {
      updatePayload.overtime_hours = updatedData.overtimeHours;
    }
    if (updatedData?.overtimeDescription !== undefined) {
      updatePayload.overtime_description = updatedData.overtimeDescription;
    }
    
    // Recalculate total if hours were updated
    if (updatedData?.hoursSubmitted !== undefined || updatedData?.overtimeHours !== undefined) {
      const regularHours = updatedData?.hoursSubmitted ?? existing.regular_hours ?? 0;
      const overtimeHours = updatedData?.overtimeHours ?? existing.overtime_hours ?? 0;
      const hourlyRate = DEFAULT_HOURLY_RATE;
      const overtimeRate = getDefaultOvertimeRate(hourlyRate);
      
      updatePayload.total_amount = calculateTotalForStorage({
        payType: "hourly",
        regularHours,
        overtimeHours,
        regularRate: hourlyRate,
        overtimeRate,
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("submissions")
      .update(updatePayload)
      .eq("id", submissionId)
      .select()
      .single();

    if (updateError) {
      console.error("[SupabaseSubmissionsDataSource] Error resubmitting:", updateError);
      throw updateError;
    }

    console.log("[SupabaseSubmissionsDataSource] Resubmitted submission:", submissionId);

    return {
      id: updated.id,
      submissionDate: updated.submitted_at || updated.created_at,
      projectName: updated.project_name || "General Work",
      description: updated.description || "",
      regularHours: updated.regular_hours || 0,
      overtimeHours: updated.overtime_hours || 0,
      totalAmount: updated.total_amount || 0,
      status: "PENDING_MANAGER" as SubmissionStatus,
      invoiceUrl: null,
      workPeriod: updated.work_period,
      excludedDates: [],
      overtimeDescription: updated.overtime_description,
      rejectionReason: null,
      adminNote: null,
      managerNote: null,
      updatedAt: updated.updated_at,
    };
  }
}

/**
 * Singleton instances
 */
let dataSourceInstance: SubmissionsDataSource | null = null;

/**
 * Get the Supabase data source
 * Throws an error if Supabase is not configured
 */
export function getSubmissionsDataSource(): SubmissionsDataSource {
  if (!dataSourceInstance) {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Please set up your environment variables.");
    }
    console.log("[SubmissionsDataSource] Using Supabase implementation");
    dataSourceInstance = new SupabaseSubmissionsDataSource();
  }
  return dataSourceInstance;
}

/**
 * Reset the data source instance and cache (useful for testing and logout)
 */
export function resetSubmissionsDataSource(): void {
  dataSourceInstance = null;
  // Also clear static cache since user may have changed
  SupabaseSubmissionsDataSource.clearCache();
}
