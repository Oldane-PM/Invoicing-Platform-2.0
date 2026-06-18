/**
 * Manager Dashboard Repository
 *
 * Handles all Supabase queries related to manager dashboard metrics.
 * ONLY this file imports the Supabase client for dashboard operations.
 */

import { getSupabaseClient } from "../client";

export interface DashboardMetrics {
  teamSize: number;
  pendingApprovals: number;
  totalHours: number;
  totalInvoiced: number;
  approvedThisMonth: number;
  paidThisMonth: number;
}

export interface RecentSubmission {
  id: string;
  contractorName: string;
  projectName: string;
  totalAmount: number;
  status: string;
  submittedAt: string;
}

/**
 * Get dashboard metrics for a manager
 */
export async function getDashboardMetrics(
  _managerId: string
): Promise<DashboardMetrics> {
  const supabase = getSupabaseClient();

  // Get all active contractor profiles for "team size"
  const { data: teamData, error: teamError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "CONTRACTOR");

  if (teamError) {
    console.error("[managerDashboard.repo] Profiles fetch error:", teamError);
    throw teamError;
  }

  const teamSize = teamData?.length || 0;

  // Get all submissions
  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select("status, regular_hours, overtime_hours, total_amount, approved_at, paid_at");

  if (subError) {
    console.error("[managerDashboard.repo] Submissions fetch error:", subError);
    throw subError;
  }

  // Calculate metrics
  const now = new Date();
  const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM

  let pendingApprovals = 0;
  let totalHours = 0;
  let totalInvoiced = 0;
  let approvedThisMonth = 0;
  let paidThisMonth = 0;

  (submissions || []).forEach((s: any) => {
    // Count pending - database stores as 'submitted' for pending manager review
    if (s.status === "submitted" || s.status === "pending_review") {
      pendingApprovals++;
    }

    // Sum hours and amounts
    totalHours += (s.regular_hours || 0) + (s.overtime_hours || 0);
    totalInvoiced += s.total_amount || 0;

    // Count this month's approvals and payments
    if (s.approved_at && s.approved_at.startsWith(currentMonth)) {
      approvedThisMonth++;
    }
    if (s.paid_at && s.paid_at.startsWith(currentMonth)) {
      paidThisMonth++;
    }
  });

  return {
    teamSize,
    pendingApprovals,
    totalHours,
    totalInvoiced,
    approvedThisMonth,
    paidThisMonth,
  };
}

/**
 * Get recent submissions for dashboard
 */
export async function getRecentSubmissions(
  _managerId: string,
  limit: number = 5
): Promise<RecentSubmission[]> {
  const supabase = getSupabaseClient();



  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      id,
      project_name,
      total_amount,
      status,
      submitted_at,
      profiles: contractor_user_id (
        full_name
      )
    `
    )
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[managerDashboard.repo] getRecentSubmissions error:", error);
    throw error;
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    contractorName: s.profiles?.full_name || "Unknown",
    projectName: s.project_name || "",
    totalAmount: s.total_amount || 0,
    status: s.status || "PENDING",
    submittedAt: s.submitted_at,
  }));
}

/**
 * Get submission counts by status
 */
export async function getSubmissionCountsByStatus(
  _managerId: string
): Promise<Record<string, number>> {
  const supabase = getSupabaseClient();



  const { data, error } = await supabase
    .from("submissions")
    .select("status");

  if (error) {
    console.error("[managerDashboard.repo] getSubmissionCountsByStatus error:", error);
    throw error;
  }

  const counts: Record<string, number> = {
    PENDING: 0,
    APPROVED: 0,
    PAID: 0,
    REJECTED: 0,
    NEEDS_CLARIFICATION: 0,
  };

  (data || []).forEach((s: any) => {
    if (s.status && counts[s.status] !== undefined) {
      counts[s.status]++;
    }
  });

  return counts;
}
