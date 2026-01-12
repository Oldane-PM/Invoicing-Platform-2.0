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
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";

// Rate constants - will be fetched from contract/rates table in production
const DEFAULT_HOURLY_RATE = 75;
const DEFAULT_OT_MULTIPLIER = 1.5;

/**
 * Interface for submissions data source
 * Any implementation (Supabase, Mock, etc.) must implement this interface
 */
export interface SubmissionsDataSource {
  listMySubmissions(): Promise<ContractorSubmission[]>;
  createSubmission(draft: SubmissionDraft): Promise<ContractorSubmission>;
}



/**
 * Map database submission status to frontend SubmissionStatus type
 */
function mapDbStatusToFrontend(dbStatus: string, hasPaidInvoice: boolean): SubmissionStatus {
  // If there's a paid invoice, show as PAID regardless of submission status
  if (hasPaidInvoice) {
    return "PAID";
  }

  const statusMap: Record<string, SubmissionStatus> = {
    draft: "PENDING",
    submitted: "PENDING",
    pending_review: "PENDING",
    approved: "APPROVED",
    rejected: "REJECTED",
    needs_clarification: "NEEDS_CLARIFICATION",
  };
  return statusMap[dbStatus] || "PENDING";
}


/**
 * Supabase implementation of SubmissionsDataSource
 * Works with the normalized schema (submissions, submission_line_items, overtime_entries)
 */
/**
 * Supabase implementation of SubmissionsDataSource
 * Works with the actual schema (flat submissions table, contractors table)
 */
class SupabaseSubmissionsDataSource implements SubmissionsDataSource {
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

    const contractorUserId = await this.getContractorUserId();
    console.log("[SupabaseSubmissionsDataSource] Fetching submissions for:", contractorUserId);

    // Fetch submissions with related data
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select(
        `
        id,
        project_name,
        description,
        period_start,
        period_end,
        work_period,
        regular_hours,
        overtime_hours,
        overtime_description,
        total_amount,
        status,
        submitted_at,
        created_at
      `
      )
      .eq("contractor_user_id", contractorUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SupabaseSubmissionsDataSource] Error fetching submissions:", error);
      throw error;
    }

    // Transform to ContractorSubmission format
    return (submissions || []).map((sub) => {
      // Determine status
      const status = mapDbStatusToFrontend(sub.status, false); // No invoices table, so passed false

      // Format work period as "YYYY-MM" if not present
      const workPeriod = sub.work_period || format(new Date(sub.period_start), "yyyy-MM");

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
      };
    });
  }

  async createSubmission(draft: SubmissionDraft): Promise<ContractorSubmission> {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const contractorUserId = await this.getContractorUserId();
    console.log("[SupabaseSubmissionsDataSource] Creating submission for:", contractorUserId);

    // Get contractor details
    const details = await this.getContractorDetails(contractorUserId);
    const hourlyRate = details?.hourlyRate || DEFAULT_HOURLY_RATE;
    const overtimeRate = details?.overtimeRate || (hourlyRate * DEFAULT_OT_MULTIPLIER);
    const projectName = details?.projectName || "General Work";

    // Parse work period to get period_start and period_end
    const periodDate = parse(draft.workPeriod, "yyyy-MM", new Date());
    const periodStart = format(startOfMonth(periodDate), "yyyy-MM-dd");
    const periodEnd = format(endOfMonth(periodDate), "yyyy-MM-dd");

    // Calculate total amount
    const totalAmount = (draft.hoursSubmitted * hourlyRate) + (draft.overtimeHours * overtimeRate);

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        contractor_user_id: contractorUserId,
        project_name: projectName,
        description: draft.description,
        period_start: periodStart,
        period_end: periodEnd,
        work_period: draft.workPeriod,
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
      status: "PENDING",
      invoiceUrl: null,
      workPeriod: submission.work_period,
      excludedDates: draft.excludedDates, // Returned from input, but not persisted deeply
      overtimeDescription: submission.overtime_description,
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
 * Reset the data source instance (useful for testing)
 */
export function resetSubmissionsDataSource(): void {
  dataSourceInstance = null;
}
