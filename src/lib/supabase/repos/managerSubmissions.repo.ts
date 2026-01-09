/**
 * Manager Submissions Repository
 *
 * Handles all Supabase queries related to submissions from a manager's perspective.
 * ONLY this file imports the Supabase client for manager submission operations.
 */

import { getSupabaseClient } from "../client";

export interface ManagerSubmission {
  id: string;
  contractorId: string;
  contractorName: string;
  contractorEmail: string;
  projectName: string;
  description: string;
  workPeriod: string;
  submissionDate: string;
  regularHours: number;
  overtimeHours: number;
  overtimeDescription: string | null;
  totalAmount: number;
  status: string; // lowercase from DB: submitted, approved, rejected, needs_clarification
  rejectionReason: string | null;
  submittedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  hourlyRate?: number;
  overtimeRate?: number;
}

// Map DB status to filter values (lowercase)
const statusFilterMap: Record<string, string> = {
  PENDING: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  PAID: "approved", // Paid submissions have approved status + paid_at
  NEEDS_CLARIFICATION: "needs_clarification",
};

export interface SubmissionFilters {
  status?: string;
  search?: string;
  limit?: number;
}

/**
 * List submissions for manager's team
 */
export async function listTeamSubmissions(
  managerId: string,
  filters?: SubmissionFilters
): Promise<ManagerSubmission[]> {
  const supabase = getSupabaseClient();

  // First get the contractor IDs in this manager's team
  const { data: teamData, error: teamError } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  if (teamError) {
    console.error("[managerSubmissions.repo] Team fetch error:", teamError);
    throw teamError;
  }

  const teamContractorIds = (teamData || []).map((t: any) => t.contractor_id);

  if (teamContractorIds.length === 0) {
    return [];
  }

  // Build submissions query
  let query = supabase
    .from("submissions")
    .select(
      `
      id,
      contractor_user_id,
      project_name,
      description,
      work_period,
      regular_hours,
      overtime_hours,
      overtime_description,
      total_amount,
      status,
      rejection_reason,
      submitted_at,
      approved_at,
      paid_at,
      profiles!submissions_contractor_user_id_fkey (
        full_name,
        email
      ),
      contractors (
        hourly_rate,
        overtime_rate
      )
    `
    )
    .in("contractor_user_id", teamContractorIds)
    .order("submitted_at", { ascending: false });

  // Apply filters - convert uppercase frontend status to lowercase DB status
  if (filters?.status && filters.status !== "ALL") {
    const dbStatus = statusFilterMap[filters.status] || filters.status.toLowerCase();
    if (filters.status === "PAID") {
      // PAID filter: approved submissions with paid_at
      query = query.eq("status", "approved").not("paid_at", "is", null);
    } else {
      query = query.eq("status", dbStatus);
    }
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[managerSubmissions.repo] listTeamSubmissions error:", error);
    throw error;
  }

  // Transform and filter by search if needed
  // Map lowercase DB status to uppercase frontend status
  const mapDbStatusToFrontend = (dbStatus: string, paidAt: string | null): string => {
    if (paidAt) return "PAID";
    const statusMap: Record<string, string> = {
      draft: "PENDING",
      submitted: "PENDING",
      pending_review: "PENDING",
      approved: "APPROVED",
      rejected: "REJECTED",
      needs_clarification: "NEEDS_CLARIFICATION",
    };
    return statusMap[dbStatus] || "PENDING";
  };

  let submissions = (data || []).map((s: any) => ({
    id: s.id,
    contractorId: s.contractor_user_id,
    contractorName: s.profiles?.full_name || "Unknown",
    contractorEmail: s.profiles?.email || "",
    projectName: s.project_name || "",
    description: s.description || "",
    workPeriod: s.work_period || "",
    submissionDate: s.submitted_at || s.created_at,
    regularHours: s.regular_hours || 0,
    overtimeHours: s.overtime_hours || 0,
    overtimeDescription: s.overtime_description,
    totalAmount: s.total_amount || 0,
    status: mapDbStatusToFrontend(s.status, s.paid_at),
    rejectionReason: s.rejection_reason,
    submittedAt: s.submitted_at,
    approvedAt: s.approved_at,
    paidAt: s.paid_at,
    hourlyRate: s.contractors?.hourly_rate,
    overtimeRate: s.contractors?.overtime_rate,
  }));

  // Apply search filter client-side
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    submissions = submissions.filter(
      (s: ManagerSubmission) =>
        s.contractorName.toLowerCase().includes(searchLower) ||
        s.contractorEmail.toLowerCase().includes(searchLower) ||
        s.projectName.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower)
    );
  }

  return submissions;
}

/**
 * Get single submission details
 */
export async function getSubmissionDetails(
  submissionId: string,
  managerId: string
): Promise<ManagerSubmission | null> {
  const supabase = getSupabaseClient();

  // First verify submission belongs to manager's team
  const { data: teamData } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  const teamContractorIds = (teamData || []).map((t: any) => t.contractor_id);

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      id,
      contractor_user_id,
      project_name,
      description,
      work_period,
      regular_hours,
      overtime_hours,
      overtime_description,
      total_amount,
      status,
      rejection_reason,
      submitted_at,
      approved_at,
      paid_at,
      profiles!submissions_contractor_user_id_fkey (
        full_name,
        email
      ),
      contractors (
        hourly_rate,
        overtime_rate
      )
    `
    )
    .eq("id", submissionId)
    .single();

  if (error) {
    console.error("[managerSubmissions.repo] getSubmissionDetails error:", error);
    throw error;
  }

  if (!data || !teamContractorIds.includes(data.contractor_user_id)) {
    return null;
  }

  // Map lowercase DB status to uppercase frontend status
  const mapDbStatusToFrontend = (dbStatus: string, paidAt: string | null): string => {
    if (paidAt) return "PAID";
    const statusMap: Record<string, string> = {
      draft: "PENDING",
      submitted: "PENDING",
      pending_review: "PENDING",
      approved: "APPROVED",
      rejected: "REJECTED",
      needs_clarification: "NEEDS_CLARIFICATION",
    };
    return statusMap[dbStatus] || "PENDING";
  };

  return {
    id: data.id,
    contractorId: data.contractor_user_id,
    contractorName: data.profiles?.full_name || "Unknown",
    contractorEmail: data.profiles?.email || "",
    projectName: data.project_name || "",
    description: data.description || "",
    workPeriod: data.work_period || "",
    submissionDate: data.submitted_at || data.created_at,
    regularHours: data.regular_hours || 0,
    overtimeHours: data.overtime_hours || 0,
    overtimeDescription: data.overtime_description,
    totalAmount: data.total_amount || 0,
    status: mapDbStatusToFrontend(data.status, data.paid_at),
    rejectionReason: data.rejection_reason,
    submittedAt: data.submitted_at,
    approvedAt: data.approved_at,
    paidAt: data.paid_at,
    hourlyRate: data.contractors?.hourly_rate,
    overtimeRate: data.contractors?.overtime_rate,
  };
}

/**
 * Approve a submission
 */
export async function approveSubmission(
  submissionId: string,
  managerId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("submissions")
    .update({
      status: "approved",
      manager_id: managerId,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", submissionId);

  if (error) {
    console.error("[managerSubmissions.repo] approveSubmission error:", error);
    throw error;
  }
}

/**
 * Reject a submission
 */
export async function rejectSubmission(
  submissionId: string,
  managerId: string,
  reason: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("submissions")
    .update({
      status: "rejected",
      manager_id: managerId,
      rejection_reason: reason,
    })
    .eq("id", submissionId);

  if (error) {
    console.error("[managerSubmissions.repo] rejectSubmission error:", error);
    throw error;
  }
}

/**
 * Mark submission as paid and create payment record
 */
export async function markSubmissionPaid(
  submissionId: string,
  managerId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // First get submission details
  const { data: submission, error: fetchError } = await supabase
    .from("submissions")
    .select("contractor_user_id, total_amount")
    .eq("id", submissionId)
    .single();

  if (fetchError || !submission) {
    console.error("[managerSubmissions.repo] markSubmissionPaid fetch error:", fetchError);
    throw fetchError || new Error("Submission not found");
  }

  const paidAt = new Date().toISOString();

  // Update submission status
  const { error: updateError } = await supabase
    .from("submissions")
    .update({
      status: "approved", // Use 'approved' - paid status is derived from invoice
      paid_at: paidAt,
    })
    .eq("id", submissionId);

  if (updateError) {
    console.error("[managerSubmissions.repo] markSubmissionPaid update error:", updateError);
    throw updateError;
  }

  // Create payment record
  const { error: paymentError } = await supabase.from("payments").insert({
    submission_id: submissionId,
    manager_id: managerId,
    contractor_id: submission.contractor_user_id,
    amount: submission.total_amount,
    status: "PAID",
    paid_at: paidAt,
  });

  if (paymentError) {
    console.error("[managerSubmissions.repo] markSubmissionPaid payment error:", paymentError);
    // Don't throw - submission is already updated
  }
}

/**
 * Request clarification on a submission
 */
export async function requestClarification(
  submissionId: string,
  managerId: string,
  note: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("submissions")
    .update({
      status: "needs_clarification",
      manager_id: managerId,
      rejection_reason: note,
    })
    .eq("id", submissionId);

  if (error) {
    console.error("[managerSubmissions.repo] requestClarification error:", error);
    throw error;
  }
}
