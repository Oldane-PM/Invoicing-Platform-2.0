/**
 * Submissions Repository
 *
 * Handles all Supabase queries related to contractor submissions.
 * Replaces the data source pattern for direct repo usage.
 */

import { getSupabaseClient } from "../client";
import type { ContractorSubmission, SubmissionStatus } from "../../types";
import { format } from "date-fns";

/**
 * Map database submission status to frontend SubmissionStatus type
 * Uses the new workflow statuses
 */
function mapDbStatusToFrontend(dbStatus: string, paidAt?: string | null): SubmissionStatus {
  // If paid_at is set, it's paid regardless of status field
  if (paidAt) return "PAID";

  const statusMap: Record<string, SubmissionStatus> = {
    draft: "PENDING_MANAGER",
    submitted: "PENDING_MANAGER",
    pending_review: "PENDING_MANAGER",
    pending: "PENDING_MANAGER",
    pending_manager: "PENDING_MANAGER",
    approved: "AWAITING_ADMIN_PAYMENT",
    awaiting_admin_payment: "AWAITING_ADMIN_PAYMENT",
    rejected: "REJECTED_CONTRACTOR",
    rejected_contractor: "REJECTED_CONTRACTOR",
    needs_clarification: "CLARIFICATION_REQUESTED",
    clarification_requested: "CLARIFICATION_REQUESTED",
    paid: "PAID",
  };
  return statusMap[dbStatus?.toLowerCase()] || "PENDING_MANAGER";
}

/**
 * Helper to log Supabase errors with full details
 */
function logSupabaseError(context: string, error: any): void {
  console.error(`[submissions.repo] ${context}:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    error,
  });
}

/**
 * List all submissions for a specific contractor
 * Uses direct columns from submissions table (regular_hours, overtime_hours, total_amount, etc.)
 */
export async function listContractorSubmissions(contractorId: string): Promise<ContractorSubmission[]> {
  const supabase = getSupabaseClient();

  console.log(`[submissions.repo] Fetching submissions for contractor: ${contractorId}`);

  // Query submissions with direct columns - aligned with admin dashboard approach
  const { data: submissions, error } = await supabase
    .from("submissions")
    .select(`
      id,
      status,
      submitted_at,
      created_at,
      contractor_user_id,
      project_name,
      description,
      work_period,
      period_start,
      period_end,
      regular_hours,
      overtime_hours,
      overtime_description,
      total_amount,
      rejection_reason,
      paid_at
    `)
    .eq("contractor_user_id", contractorId)
    .order("submitted_at", { ascending: false });

  if (error) {
    logSupabaseError("listContractorSubmissions", error);
    console.error("Supabase error details:", error);
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return (submissions || []).map((sub: any) => {
    // Determine status - pass paid_at for correct status resolution
    const status = mapDbStatusToFrontend(sub.status, sub.paid_at);

    // Use direct columns from submissions table
    const regularHours = sub.regular_hours || 0;
    const overtimeHours = sub.overtime_hours || 0;
    const totalAmount = sub.total_amount || 0;

    // Work period from direct column or derived from period_start
    const workPeriod = sub.work_period || (sub.period_start ? format(new Date(sub.period_start), "yyyy-MM") : "");

    return {
      id: sub.id,
      submissionDate: sub.submitted_at || sub.created_at,
      projectName: sub.project_name || "General Work",
      description: sub.description || "",
      regularHours,
      overtimeHours,
      totalAmount,
      status,
      invoiceUrl: null, // Could be enhanced with invoice lookup if needed
      workPeriod,
      excludedDates: [],
      overtimeDescription: sub.overtime_description || null,
      rejectionReason: sub.rejection_reason || null,
    };
  });
}

