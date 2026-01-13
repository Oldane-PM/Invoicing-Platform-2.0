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
  managerId: string
): Promise<DashboardMetrics> {
  const supabase = getSupabaseClient();

  // Get team contractor IDs
  const { data: teamData, error: teamError } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  if (teamError) {
    console.error("[managerDashboard.repo] Team fetch error:", teamError);
    throw teamError;
  }

  const teamContractorIds = (teamData || []).map((t: any) => t.contractor_id);
  const teamSize = teamContractorIds.length;

  if (teamSize === 0) {
    return {
      teamSize: 0,
      pendingApprovals: 0,
      totalHours: 0,
      totalInvoiced: 0,
      approvedThisMonth: 0,
      paidThisMonth: 0,
    };
  }

  // Get all submissions for team
  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select("status, regular_hours, overtime_hours, total_amount, approved_at, paid_at")
    .in("contractor_user_id", teamContractorIds);

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
    // Count pending
    if (s.status === "PENDING") {
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
  managerId: string,
  limit: number = 5
): Promise<RecentSubmission[]> {
  const supabase = getSupabaseClient();

  // Get team contractor IDs
  const { data: teamData } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  const teamContractorIds = (teamData || []).map((t: any) => t.contractor_id);

  if (teamContractorIds.length === 0) {
    return [];
  }

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
    .in("contractor_user_id", teamContractorIds)
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
  managerId: string
): Promise<Record<string, number>> {
  const supabase = getSupabaseClient();

  // Get team contractor IDs
  const { data: teamData } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  const teamContractorIds = (teamData || []).map((t: any) => t.contractor_id);

  if (teamContractorIds.length === 0) {
    return {
      PENDING: 0,
      APPROVED: 0,
      PAID: 0,
      REJECTED: 0,
      NEEDS_CLARIFICATION: 0,
    };
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("status")
    .in("contractor_user_id", teamContractorIds);

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
