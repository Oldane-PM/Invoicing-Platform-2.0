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
import { mockContractorSubmissions } from "./mockData";
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";

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
 * Calculate total amount based on hours and rates
 */
function calculateTotalAmount(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number = DEFAULT_HOURLY_RATE,
  otMultiplier: number = DEFAULT_OT_MULTIPLIER
): number {
  const regularAmount = regularHours * hourlyRate;
  const overtimeAmount = overtimeHours * hourlyRate * otMultiplier;
  return regularAmount + overtimeAmount;
}

/**
 * Generate a unique ID for mock submissions
 */
function generateMockId(): string {
  return `CSUB-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
   * Get the active contract for a contractor (for project name, rates, and organization_id)
   */
  private async getActiveContract(contractorUserId: string): Promise<{
    id: string;
    organizationId: string;
    projectName: string;
    hourlyRate: number;
    otMultiplier: number;
  } | null> {
    if (!supabase) return null;

    // Get active contract with rates
    const { data: contract, error } = await supabase
      .from("contracts")
      .select(
        `
        id,
        organization_id,
        project_name,
        rates (
          hourly_rate,
          overtime_multiplier,
          effective_from,
          effective_to
        )
      `
      )
      .eq("contractor_user_id", contractorUserId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !contract) {
      console.log("[SupabaseSubmissionsDataSource] No active contract found, using defaults");
      return null;
    }

    // Safely extract rates array - Supabase may return object, array, or null
    const ratesRaw = contract.rates;
    const rates: Array<{
      hourly_rate: number;
      overtime_multiplier: number;
      effective_from: string;
      effective_to: string | null;
    }> = Array.isArray(ratesRaw) ? ratesRaw : [];

    const today = new Date().toISOString().split("T")[0];
    const currentRate = rates.find(
      (r) => r.effective_from <= today && (!r.effective_to || r.effective_to >= today)
    );

    return {
      id: contract.id,
      organizationId: contract.organization_id,
      projectName: contract.project_name || "General Work",
      hourlyRate: currentRate?.hourly_rate || DEFAULT_HOURLY_RATE,
      otMultiplier: currentRate?.overtime_multiplier || DEFAULT_OT_MULTIPLIER,
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
        period_start,
        period_end,
        status,
        submitted_at,
        created_at,
        contract_id,
        contracts (
          project_name
        ),
        submission_line_items (
          work_date,
          hours,
          is_non_working_day,
          note
        ),
        overtime_entries (
          overtime_hours,
          description
        ),
        invoices (
          pdf_url,
          status
        )
      `
      )
      .eq("contractor_user_id", contractorUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SupabaseSubmissionsDataSource] Error fetching submissions:", error);
      throw error;
    }

    // Get contract rates for amount calculation
    const contract = await this.getActiveContract(contractorUserId);

    // Transform to ContractorSubmission format
    return (submissions || []).map((sub) => {
      // Safely extract arrays - Supabase may return object, array, or null
      const lineItemsRaw = sub.submission_line_items;
      const lineItems: Array<{
        work_date: string;
        hours: number;
        is_non_working_day: boolean;
        note: string | null;
      }> = Array.isArray(lineItemsRaw) ? lineItemsRaw : [];

      const overtimeEntriesRaw = sub.overtime_entries;
      const overtimeEntries: Array<{
        overtime_hours: number;
        description: string | null;
      }> = Array.isArray(overtimeEntriesRaw) ? overtimeEntriesRaw : [];

      // Safely extract invoices - CRITICAL: must be array before calling .find()
      const invoicesRaw = sub.invoices;
      const invoices: Array<{
        pdf_url: string | null;
        status: string;
      }> = Array.isArray(invoicesRaw) ? invoicesRaw : [];

      // contracts is a single object (not array) due to the foreign key relationship
      const contractData = sub.contracts as { project_name: string } | { project_name: string }[] | null;
      const contracts = Array.isArray(contractData) ? contractData[0] : contractData;

      // Calculate totals from line items
      const regularHours = lineItems.reduce((sum, li) => sum + (li.hours || 0), 0);
      const overtimeHours = overtimeEntries.reduce((sum, ot) => sum + (ot.overtime_hours || 0), 0);

      // Get excluded dates (non-working days)
      const excludedDates = lineItems
        .filter((li) => li.is_non_working_day)
        .map((li) => li.work_date);

      // Get overtime description (combine if multiple)
      const overtimeDescription =
        overtimeEntries
          .filter((ot) => ot.description)
          .map((ot) => ot.description)
          .join("; ") || null;

      // Get work description from line item notes
      const description =
        lineItems
          .filter((li) => li.note)
          .map((li) => li.note)
          .join(" ") || "Work completed for this period";

      // Calculate total amount
      const totalAmount = calculateTotalAmount(
        regularHours,
        overtimeHours,
        contract?.hourlyRate || DEFAULT_HOURLY_RATE,
        contract?.otMultiplier || DEFAULT_OT_MULTIPLIER
      );

      // Check if any invoice is paid
      const hasPaidInvoice = invoices.some((inv) => inv.status === "paid");

      // Determine status
      const status = mapDbStatusToFrontend(sub.status, hasPaidInvoice);

      // Get invoice URL from the first invoice if available
      const invoiceUrl = invoices.length > 0 ? (invoices[0].pdf_url || null) : null;

      // Format work period as "YYYY-MM"
      const workPeriod = format(new Date(sub.period_start), "yyyy-MM");

      return {
        id: sub.id,
        submissionDate: sub.submitted_at || sub.created_at,
        projectName: contracts?.project_name || contract?.projectName || "General Work",
        description,
        regularHours,
        overtimeHours,
        totalAmount,
        status,
        invoiceUrl,
        workPeriod,
        excludedDates,
        overtimeDescription,
      };
    });
  }

  async createSubmission(draft: SubmissionDraft): Promise<ContractorSubmission> {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const contractorUserId = await this.getContractorUserId();
    console.log("[SupabaseSubmissionsDataSource] Creating submission for:", contractorUserId);

    // Get active contract
    const contract = await this.getActiveContract(contractorUserId);

    // Parse work period to get period_start and period_end
    const periodDate = parse(draft.workPeriod, "yyyy-MM", new Date());
    const periodStart = format(startOfMonth(periodDate), "yyyy-MM-dd");
    const periodEnd = format(endOfMonth(periodDate), "yyyy-MM-dd");

    // Create submission header
    // Note: organization_id is required by the schema
    if (!contract) {
      throw new Error("No active contract found. Please contact your administrator.");
    }

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        organization_id: contract.organizationId,
        contractor_user_id: contractorUserId,
        contract_id: contract.id,
        period_start: periodStart,
        period_end: periodEnd,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (submissionError) {
      console.error("[SupabaseSubmissionsDataSource] Error creating submission:", submissionError);
      throw submissionError;
    }

    // Create line items for each working day
    const allDays = eachDayOfInterval({
      start: new Date(periodStart),
      end: new Date(periodEnd),
    });

    const excludedDatesSet = new Set(draft.excludedDates);
    const hoursPerDay = draft.hoursSubmitted / allDays.filter((d) => !isWeekend(d) && !excludedDatesSet.has(format(d, "yyyy-MM-dd"))).length || 8;

    const lineItems = allDays.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const isNonWorking = isWeekend(day) || excludedDatesSet.has(dateStr);

      return {
        submission_id: submission.id,
        work_date: dateStr,
        hours: isNonWorking ? 0 : hoursPerDay,
        is_non_working_day: isNonWorking,
        note: isNonWorking ? null : draft.description,
      };
    });

    const { error: lineItemsError } = await supabase
      .from("submission_line_items")
      .insert(lineItems);

    if (lineItemsError) {
      console.error("[SupabaseSubmissionsDataSource] Error creating line items:", lineItemsError);
      // Don't throw - submission was created, line items can be added later
    }

    // Create overtime entry if overtime hours > 0
    if (draft.overtimeHours > 0) {
      const { error: overtimeError } = await supabase.from("overtime_entries").insert({
        submission_id: submission.id,
        work_date: periodEnd, // Associate with end of period
        overtime_hours: draft.overtimeHours,
        description: draft.overtimeDescription || "Overtime work",
      });

      if (overtimeError) {
        console.error("[SupabaseSubmissionsDataSource] Error creating overtime entry:", overtimeError);
      }
    }

    // Calculate total amount
    const totalAmount = calculateTotalAmount(
      draft.hoursSubmitted,
      draft.overtimeHours,
      contract.hourlyRate,
      contract.otMultiplier
    );

    console.log("[SupabaseSubmissionsDataSource] Created submission:", submission.id);

    return {
      id: submission.id,
      submissionDate: submission.submitted_at || submission.created_at,
      projectName: contract.projectName,
      description: draft.description,
      regularHours: draft.hoursSubmitted,
      overtimeHours: draft.overtimeHours,
      totalAmount,
      status: "PENDING",
      invoiceUrl: null,
      workPeriod: draft.workPeriod,
      excludedDates: draft.excludedDates,
      overtimeDescription: draft.overtimeDescription,
    };
  }
}

/**
 * Mock implementation of SubmissionsDataSource
 * Uses in-memory array for development/fallback when Supabase is not configured
 */
class MockSubmissionsDataSource implements SubmissionsDataSource {
  private submissions: ContractorSubmission[] = [...mockContractorSubmissions];

  async listMySubmissions(): Promise<ContractorSubmission[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("[MockSubmissionsDataSource] Returning", this.submissions.length, "submissions");

    // Return sorted by submission date (newest first)
    return [...this.submissions].sort(
      (a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
    );
  }

  async createSubmission(draft: SubmissionDraft): Promise<ContractorSubmission> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log("[MockSubmissionsDataSource] Creating submission with draft:", draft);

    const totalAmount = calculateTotalAmount(draft.hoursSubmitted, draft.overtimeHours);
    const now = new Date().toISOString();

    const newSubmission: ContractorSubmission = {
      id: generateMockId(),
      submissionDate: now,
      projectName: draft.projectName || "General Work",
      description: draft.description,
      regularHours: draft.hoursSubmitted,
      overtimeHours: draft.overtimeHours,
      totalAmount,
      status: "PENDING",
      invoiceUrl: null,
      workPeriod: draft.workPeriod,
      excludedDates: draft.excludedDates,
      overtimeDescription: draft.overtimeDescription,
    };

    // Add to beginning of array (newest first)
    this.submissions.unshift(newSubmission);

    console.log("[MockSubmissionsDataSource] Created submission:", newSubmission);
    return newSubmission;
  }
}

/**
 * Singleton instances
 */
let dataSourceInstance: SubmissionsDataSource | null = null;

/**
 * Get the appropriate data source based on environment configuration
 * - If Supabase is configured, use SupabaseSubmissionsDataSource
 * - Otherwise, fall back to MockSubmissionsDataSource
 */
export function getSubmissionsDataSource(): SubmissionsDataSource {
  if (!dataSourceInstance) {
    if (isSupabaseConfigured) {
      console.log("[SubmissionsDataSource] Using Supabase implementation");
      dataSourceInstance = new SupabaseSubmissionsDataSource();
    } else {
      console.log("[SubmissionsDataSource] Using Mock implementation (Supabase not configured)");
      dataSourceInstance = new MockSubmissionsDataSource();
    }
  }
  return dataSourceInstance;
}

/**
 * Reset the data source instance (useful for testing)
 */
export function resetSubmissionsDataSource(): void {
  dataSourceInstance = null;
}
