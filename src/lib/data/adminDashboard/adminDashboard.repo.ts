/**
 * Admin Dashboard Repository
 * 
 * Data access layer for admin dashboard.
 * All Supabase queries for admin functionality are encapsulated here.
 * 
 * ARCHITECTURE: UI → Hooks → Repos → Supabase
 * This file is the ONLY place where admin dashboard Supabase queries exist.
 * 
 * IMPORTANT: All totals should use stored total_amount from submissions table.
 * Never recalculate totals independently - this ensures consistency with invoices.
 */

import { getSupabaseClient } from '../../supabase/client';
import type {
  AdminMetrics,
  AdminSubmission,
  SubmissionDetails,
  SubmissionFilters,
  RequestClarificationParams,
} from './adminDashboard.types';

/**
 * Get admin dashboard metrics
 */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = getSupabaseClient();

  // Get total contractors (active contracts)
  const { count: totalContractors } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get active contracts count
  const { count: activeContracts } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get pending submissions count
  const { count: pendingSubmissions } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  // Get total invoice value (sum of all approved submissions this month)
  // IMPORTANT: Use stored total_amount for consistency - never recalculate
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: approvedSubmissions } = await supabase
    .from('submissions')
    .select('total_amount')
    .eq('status', 'approved')
    .gte('submitted_at', startOfMonth.toISOString());

  // Sum the stored total_amount values for consistency
  // This ensures metrics match actual submission/invoice totals
  let totalInvoiceValue = 0;
  if (approvedSubmissions) {
    for (const sub of approvedSubmissions) {
      totalInvoiceValue += sub.total_amount || 0;
    }
  }

  return {
    totalContractors: totalContractors || 0,
    activeContracts: activeContracts || 0,
    pendingSubmissions: pendingSubmissions || 0,
    totalInvoiceValue: Math.round(totalInvoiceValue),
  };
}

/**
 * Get submissions with optional filters
 * Uses direct columns (regular_hours, overtime_hours, work_period) - same as Manager repo
 */
export async function getSubmissions(filters: SubmissionFilters = {}): Promise<AdminSubmission[]> {
  const supabase = getSupabaseClient();

  // Query using direct columns - aligned with Manager repo approach
  let query = supabase
    .from('submissions')
    .select(`
      id,
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
      status,
      submitted_at,
      approved_at,
      paid_at,
      created_at,
      rejection_reason,
      profiles: contractor_user_id (
        full_name,
        email
      )
    `)
    .order('submitted_at', { ascending: false });

  // Apply status filter
  if (filters.status) {
    const dbStatus = filters.status.toLowerCase();
    if (dbStatus === 'paid') {
      // PAID filter: approved submissions with paid_at
      query = query.eq('status', 'approved').not('paid_at', 'is', null);
    } else {
      query = query.eq('status', dbStatus);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[AdminDashboard] Error fetching submissions:', error);
    console.error('[AdminDashboard] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get all contractor IDs from submissions
  const contractorIds = [...new Set(data.map((s: any) => s.contractor_user_id).filter(Boolean))];

  // Fetch manager assignments from manager_teams
  const { data: managerTeams } = await supabase
    .from('manager_teams')
    .select('contractor_id, manager_id')
    .in('contractor_id', contractorIds);

  // Get manager profile names
  const managerIds = [...new Set((managerTeams || []).map((mt: any) => mt.manager_id).filter(Boolean))];
  
  const { data: managerProfiles } = managerIds.length > 0 
    ? await supabase.from('profiles').select('id, full_name').in('id', managerIds)
    : { data: [] };

  // Build contractor -> manager name map
  const contractorManagerMap = new Map<string, string>();
  (managerTeams || []).forEach((mt: any) => {
    const manager = (managerProfiles || []).find((p: any) => p.id === mt.manager_id);
    if (manager) {
      contractorManagerMap.set(mt.contractor_id, manager.full_name);
    }
  });

  // Map to domain type - using direct columns like Manager repo
  let submissions: AdminSubmission[] = data.map((sub: any) => {
    // Handle potential array or object return from joins
    const profile = Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles;

    // Use direct columns - same as Manager repo
    const regularHours = sub.regular_hours || 0;
    const overtimeHours = sub.overtime_hours || 0;
    const totalAmount = sub.total_amount || 0;

    // Determine display status (paid if approved + has paid_at)
    let displayStatus = sub.status;
    if (sub.status === 'approved' && sub.paid_at) {
      displayStatus = 'paid';
    }

    // Get manager name from lookup
    const managerName = contractorManagerMap.get(sub.contractor_user_id) || 'Unknown Manager';

    return {
      id: sub.id,
      contractorName: profile?.full_name || 'Unknown Contractor',
      contractorType: 'Hourly' as const, // Default, could be enhanced with contract lookup
      projectName: sub.project_name || 'Unknown Project',
      managerName,
      regularHours,
      overtimeHours,
      totalAmount,
      status: displayStatus,
      submittedAt: sub.submitted_at || sub.created_at,
      periodStart: sub.period_start || '',
      periodEnd: sub.period_end || '',
      workPeriod: sub.work_period || '',
      paidAt: sub.paid_at,
      approvedAt: sub.approved_at,
    };
  });

  // Apply client-side filters
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    submissions = submissions.filter(
      (sub) =>
        sub.contractorName.toLowerCase().includes(searchLower) ||
        sub.projectName.toLowerCase().includes(searchLower) ||
        sub.managerName.toLowerCase().includes(searchLower)
    );
  }

  if (filters.contractorType) {
    submissions = submissions.filter((sub) => sub.contractorType === filters.contractorType);
  }

  if (filters.project) {
    submissions = submissions.filter((sub) => sub.projectName === filters.project);
  }

  if (filters.manager) {
    submissions = submissions.filter((sub) => sub.managerName === filters.manager);
  }

  if (filters.month) {
    // Filter by work_period or period_start month (format: "January 2026")
    submissions = submissions.filter((sub) => {
      // Try work_period first
      if (sub.workPeriod) {
        // If format is YYYY-MM, convert to "Month YYYY"
        if (/^\d{4}-\d{2}$/.test(sub.workPeriod)) {
          const [year, month] = sub.workPeriod.split('-').map(Number);
          const date = new Date(year, month - 1, 1);
          const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          return monthYear === filters.month;
        }
        return sub.workPeriod === filters.month;
      }
      // Fallback to period_start
      if (sub.periodStart) {
        const date = new Date(sub.periodStart);
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return monthYear === filters.month;
      }
      return false;
    });
  }

  return submissions;
}

/**
 * Get detailed submission information
 * Uses direct columns - aligned with Manager repo approach
 */
export async function getSubmissionDetails(submissionId: string): Promise<SubmissionDetails> {
  const supabase = getSupabaseClient();

  // Query using direct columns - same as Manager repo
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
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
      status,
      submitted_at,
      approved_at,
      paid_at,
      created_at,
      rejection_reason,
      profiles: contractor_user_id (
        full_name,
        email
      )
    `)
    .eq('id', submissionId)
    .single();

  if (error) {
    console.error('[AdminDashboard] Error fetching submission details:', error);
    console.error('[AdminDashboard] Error details:', JSON.stringify(error, null, 2));
    console.error('[AdminDashboard] Submission ID:', submissionId);
    throw error;
  }

  if (!data) {
    throw new Error('Submission not found');
  }

  // Handle potential array or object return from joins
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  // Use direct columns - same as Manager repo
  const regularHours = data.regular_hours || 0;
  const overtimeHours = data.overtime_hours || 0;
  const totalAmount = data.total_amount || 0;

  // Determine display status (paid if approved + has paid_at)
  let displayStatus = data.status;
  if (data.status === 'approved' && data.paid_at) {
    displayStatus = 'paid';
  }

  // Fetch manager name from manager_teams
  let managerName = 'Unknown Manager';
  const { data: managerTeam } = await supabase
    .from('manager_teams')
    .select('manager_id')
    .eq('contractor_id', data.contractor_user_id)
    .maybeSingle();

  if (managerTeam?.manager_id) {
    const { data: managerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', managerTeam.manager_id)
      .maybeSingle();
    
    if (managerProfile?.full_name) {
      managerName = managerProfile.full_name;
    }
  }

  return {
    id: data.id,
    contractorName: profile?.full_name || 'Unknown Contractor',
    contractorEmail: profile?.email || '',
    contractorType: 'Hourly' as const, // Default, could be enhanced with contract lookup
    projectName: data.project_name || 'Unknown Project',
    managerName,
    regularHours,
    overtimeHours,
    totalAmount,
    status: displayStatus,
    submittedAt: data.submitted_at || data.created_at,
    periodStart: data.period_start || '',
    periodEnd: data.period_end || '',
    workPeriod: data.work_period || '',
    paidAt: data.paid_at,
    approvedAt: data.approved_at,
    description: data.description || 'No description provided',
    overtimeDescription: data.overtime_description,
    notes: undefined,
    rejectionReason: data.rejection_reason ?? undefined,
    clarificationMessage: undefined, // Legacy field
    adminNote: undefined, // Could be added if column exists
    managerNote: undefined, // Could be added if column exists
  };
}

/**
 * Request clarification on a submission
 * Admin asks manager for clarification -> status becomes CLARIFICATION_REQUESTED
 * Only valid from AWAITING_ADMIN_PAYMENT (approved) status
 */
export async function requestClarification(params: RequestClarificationParams): Promise<void> {
  const supabase = getSupabaseClient();

  // Verify submission is in approved status (awaiting admin payment)
  const { data: existing, error: fetchError } = await supabase
    .from('submissions')
    .select('status, paid_at')
    .eq('id', params.submissionId)
    .single();

  if (fetchError || !existing) {
    throw new Error('Submission not found');
  }

  if (existing.status !== 'approved' || existing.paid_at) {
    throw new Error(`Cannot request clarification: submission must be in approved/awaiting payment status`);
  }

  // NOTE: admin_note, manager_note columns may not exist in all schemas - only update core fields
  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'needs_clarification',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.submissionId);

  if (error) {
    console.error('[AdminDashboard] Error requesting clarification:', error);
    throw new Error(error.message || 'Failed to request clarification');
  }
}

/**
 * Mark a submission as paid
 * Only valid from AWAITING_ADMIN_PAYMENT (approved) status
 */
export async function markPaid(params: { submissionId: string; adminUserId: string }): Promise<void> {
  const supabase = getSupabaseClient();

  // Verify submission is in approved status
  const { data: existing, error: fetchError } = await supabase
    .from('submissions')
    .select('status, paid_at, contractor_user_id, total_amount')
    .eq('id', params.submissionId)
    .single();

  if (fetchError || !existing) {
    throw new Error('Submission not found');
  }

  if (existing.status !== 'approved') {
    throw new Error(`Cannot mark as paid: submission must be in approved status (current: ${existing.status})`);
  }

  if (existing.paid_at) {
    throw new Error('Submission is already marked as paid');
  }

  const paidAt = new Date().toISOString();

  // Update submission with paid_at timestamp AND status to 'paid'
  const { error: updateError } = await supabase
    .from('submissions')
    .update({
      status: 'paid',
      paid_at: paidAt,
      updated_at: paidAt,
    })
    .eq('id', params.submissionId);

  if (updateError) {
    console.error('[AdminDashboard] Error marking submission as paid:', updateError);
    throw updateError;
  }

  // Create payment record
  const { error: paymentError } = await supabase.from('payments').insert({
    submission_id: params.submissionId,
    admin_id: params.adminUserId,
    contractor_id: existing.contractor_user_id,
    amount: existing.total_amount,
    status: 'PAID',
    paid_at: paidAt,
  });

  if (paymentError) {
    console.error('[AdminDashboard] Error creating payment record:', paymentError);
    // Don't throw - submission is already marked paid
  }
}

/**
 * Get list of unique projects
 */
export async function getProjects(): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('contracts')
    .select('project_name')
    .eq('is_active', true);

  if (error) {
    console.error('[AdminDashboard] Error fetching projects:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  // Get unique project names
  const uniqueProjects = [...new Set(data.map((c) => c.project_name).filter(Boolean))];
  return uniqueProjects.sort();
}

/**
 * Get list of unique managers
 */
export async function getManagers(): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('manager_user_id')
    .eq('is_active', true);

  if (error) {
    console.error('[AdminDashboard] Error fetching managers:', error);
    throw error;
  }

  if (!contracts || contracts.length === 0) {
    return [];
  }

  // Get unique manager IDs
  const managerIds = [...new Set(contracts.map(c => c.manager_user_id).filter(Boolean))];

  if (managerIds.length === 0) {
    return [];
  }

  // Fetch manager names
  const { data: managers } = await supabase
    .from('app_users')
    .select('full_name')
    .in('id', managerIds);

  // Get unique manager names
  const uniqueManagers = [...new Set((managers || []).map(m => m.full_name).filter(Boolean))];
  return uniqueManagers.sort();
}
