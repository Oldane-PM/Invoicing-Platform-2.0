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
 */
function mapDbStatusToFrontend(dbStatus: string): SubmissionStatus {
  const statusMap: Record<string, SubmissionStatus> = {
    draft: "PENDING",
    submitted: "PENDING",
    pending_review: "PENDING",
    approved: "APPROVED",
    rejected: "REJECTED",
    needs_clarification: "NEEDS_CLARIFICATION",
    paid: "PAID"
  };
  return statusMap[dbStatus] || "PENDING";
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
 */
export async function listContractorSubmissions(contractorId: string): Promise<ContractorSubmission[]> {
  const supabase = getSupabaseClient();

  console.log(`[submissions.repo] Fetching submissions for contractor: ${contractorId}`);

  const { data: submissions, error } = await supabase
    .from("submissions")
    .select(`
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
      created_at,
      contractor_user_id
    `)
    .eq("contractor_user_id", contractorId)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("listContractorSubmissions", error);
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return (submissions || []).map((sub) => {
    // Determine status
    const status = mapDbStatusToFrontend(sub.status);

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
      invoiceUrl: null, // Ensure this column exists if we need it, but requirements say "Works even if invoices are null"
      workPeriod,
      excludedDates: [],
      overtimeDescription: sub.overtime_description,
    };
  });
}
