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
/**
 * List all submissions for a specific contractor
 */
export async function listContractorSubmissions(contractorId: string): Promise<ContractorSubmission[]> {
  const supabase = getSupabaseClient();

  console.log(`[submissions.repo] Fetching submissions for contractor: ${contractorId}`);

  // Query submissions with related data
  // Note: 'total_amount', 'regular_hours' etc are not on the submissions table,
  // we must calculate them or fetch from related tables.
  const { data: submissions, error } = await supabase
    .from("submissions")
    .select(`
      id,
      status,
      submitted_at,
      created_at,
      period_start,
      period_end,
      contractor_user_id,
      contracts (
        project_name
      ),
      submission_line_items (
        hours
      ),
      overtime_entries (
        overtime_hours,
        description
      ),
      invoices (
        total,
        pdf_url
      )
    `)
    .eq("contractor_user_id", contractorId)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("listContractorSubmissions", error);
    // Return empty array instead of throwing to avoid crashing UI, but log error
    console.error("Supabase error details:", error);
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return (submissions || []).map((sub: any) => {
    // Determine status
    const status = mapDbStatusToFrontend(sub.status);

    // Calculate totals
    const regularHours = sub.submission_line_items?.reduce((sum: number, item: any) => sum + (item.hours || 0), 0) || 0;
    const overtimeHours = sub.overtime_entries?.reduce((sum: number, item: any) => sum + (item.overtime_hours || 0), 0) || 0;
    
    // Get total amount from invoice if exists, otherwise 0 (or could estimate)
    // The invoices relation returns an array
    const invoice = sub.invoices?.[0];
    const totalAmount = invoice?.total || 0;

    // Format work period as "YYYY-MM" if not present
    const workPeriod = sub.period_start ? format(new Date(sub.period_start), "yyyy-MM") : "";

    return {
      id: sub.id,
      submissionDate: sub.submitted_at || sub.created_at,
      projectName: sub.contracts?.project_name || "General Work",
      description: "", // Description not on submission table, could derive from line items notes if needed
      regularHours,
      overtimeHours,
      totalAmount,
      status,
      invoiceUrl: invoice?.pdf_url || null,
      workPeriod,
      excludedDates: [],
      overtimeDescription: sub.overtime_entries?.[0]?.description || null,
    };
  });
}

/**
 * Alias for listContractorSubmissions to be used by Admin/Manager logic
 */
export const listSubmissionsByContractorId = listContractorSubmissions;

