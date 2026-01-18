/**
 * Admin Dashboard Repository
 * 
 * Data access layer for admin dashboard.
 * All Supabase queries for admin functionality are encapsulated here.
 * 
 * ARCHITECTURE: UI → Hooks → Repos → Supabase
 * This file is the ONLY place where admin dashboard Supabase queries exist.
 */

import { getSupabaseClient } from '../../supabase/client';
import type {
  AdminMetrics,
  AdminSubmission,
  SubmissionDetails,
  SubmissionFilters,
  ApproveSubmissionParams,
  RejectSubmissionParams,
  RequestClarificationParams,
} from './adminDashboard.types';
import {
  calculateTotalAmount,
} from './adminDashboard.mappers';

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
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: approvedSubmissions } = await supabase
    .from('submissions')
    .select(`
      id,
      submission_line_items (hours),
      overtime_entries (overtime_hours),
      contracts (
        rates (hourly_rate, overtime_multiplier, effective_from, effective_to)
      )
    `)
    .eq('status', 'approved')
    .gte('submitted_at', startOfMonth.toISOString());

  // Calculate total invoice value
  let totalInvoiceValue = 0;
  if (approvedSubmissions) {
    for (const sub of approvedSubmissions) {
      const lineItems = Array.isArray(sub.submission_line_items) ? sub.submission_line_items : [];
      const overtimeEntries = Array.isArray(sub.overtime_entries) ? sub.overtime_entries : [];
      
      const regularHours = lineItems.reduce((sum: number, li: any) => sum + (li.hours || 0), 0);
      const overtimeHours = overtimeEntries.reduce((sum: number, ot: any) => sum + (ot.overtime_hours || 0), 0);
      
      const contractData = Array.isArray(sub.contracts) ? sub.contracts[0] : sub.contracts;
      const rates = Array.isArray((contractData as any)?.rates) ? (contractData as any).rates : [];
      const currentRate = rates.find((r: any) => {
        const today = new Date().toISOString().split('T')[0];
        return r.effective_from <= today && (!r.effective_to || r.effective_to >= today);
      });
      
      const amount = calculateTotalAmount(
        regularHours,
        overtimeHours,
        currentRate?.hourly_rate,
        currentRate?.overtime_multiplier
      );
      totalInvoiceValue += amount;
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
 */
export async function getSubmissions(filters: SubmissionFilters = {}): Promise<AdminSubmission[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('submissions')
    .select(`
      id,
      period_start,
      period_end,
      status,
      submitted_at,
      created_at,
      total_amount,
      contractor_user_id,
      contract_id,
      submission_line_items (
        hours
      ),
      overtime_entries (
        overtime_hours
      )
    `)
    .order('submitted_at', { ascending: false });

  // Apply status filter
  if (filters.status) {
    query = query.eq('status', filters.status.toLowerCase());
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

  // Fetch contractors data
  const contractorIds = [...new Set(data.map(s => s.contractor_user_id).filter(Boolean))];
  const { data: contractors } = await supabase
    .from('app_users')
    .select('id, full_name, email')
    .in('id', contractorIds);

  // Fetch contracts data
  const contractIds = [...new Set(data.map(s => s.contract_id).filter(Boolean))];
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, project_name, contract_type, manager_user_id')
    .in('id', contractIds);

  // Fetch managers data
  const managerIds = [...new Set((contracts || []).map(c => c.manager_user_id).filter(Boolean))];
  const { data: managers } = managerIds.length > 0 ? await supabase
    .from('app_users')
    .select('id, full_name')
    .in('id', managerIds) : { data: [] };

  // Fetch rates data
  const { data: rates } = await supabase
    .from('rates')
    .select('contract_id, hourly_rate, overtime_multiplier, effective_from, effective_to')
    .in('contract_id', contractIds);

  // Create lookup maps
  const contractorMap = new Map((contractors || []).map(c => [c.id, c]));
  const contractMap = new Map((contracts || []).map(c => [c.id, c]));
  const managerMap = new Map((managers || []).map(m => [m.id, m]));
  const ratesMap = new Map<string, any[]>();
  (rates || []).forEach(r => {
    if (!ratesMap.has(r.contract_id)) {
      ratesMap.set(r.contract_id, []);
    }
    ratesMap.get(r.contract_id)!.push(r);
  });

  // Map to domain type with merged data
  let submissions = data.map(sub => {
    const contractor = contractorMap.get(sub.contractor_user_id);
    const contract = contractMap.get(sub.contract_id);
    const manager = contract?.manager_user_id ? managerMap.get(contract.manager_user_id) : null;
    const contractRates = ratesMap.get(sub.contract_id) || [];

    // Calculate hours
    const lineItems = Array.isArray(sub.submission_line_items) ? sub.submission_line_items : [];
    const overtimeEntries = Array.isArray(sub.overtime_entries) ? sub.overtime_entries : [];
    const regularHours = lineItems.reduce((sum: number, li: any) => sum + (li.hours || 0), 0);
    const overtimeHours = overtimeEntries.reduce((sum: number, ot: any) => sum + (ot.overtime_hours || 0), 0);

    // Find current rate
    const today = new Date().toISOString().split('T')[0];
    const currentRate = contractRates.find(r =>
      r.effective_from <= today && (!r.effective_to || r.effective_to >= today)
    );

    const totalAmount = sub.total_amount || calculateTotalAmount(
      regularHours,
      overtimeHours,
      currentRate?.hourly_rate,
      currentRate?.overtime_multiplier
    );

    return {
      id: sub.id,
      contractorName: contractor?.full_name || 'Unknown Contractor',
      contractorType: contract?.contract_type === 'hourly' ? 'Hourly' as const : 'Fixed' as const,
      projectName: contract?.project_name || 'Unknown Project',
      managerName: manager?.full_name || 'Unknown Manager',
      regularHours,
      overtimeHours,
      totalAmount,
      status: sub.status,
      submittedAt: sub.submitted_at || sub.created_at,
      periodStart: sub.period_start,
      periodEnd: sub.period_end,
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
    // Filter by period_start month (format: "January 2026")
    submissions = submissions.filter((sub) => {
      const date = new Date(sub.periodStart);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return monthYear === filters.month;
    });
  }

  return submissions;
}

/**
 * Get detailed submission information
 */
export async function getSubmissionDetails(submissionId: string): Promise<SubmissionDetails> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      period_start,
      period_end,
      status,
      submitted_at,
      created_at,
      total_amount,
      contractor_user_id,
      contract_id,
      paid_at,
      submission_line_items (
        hours,
        note
      ),
      overtime_entries (
        overtime_hours
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

  // Fetch contractor
  const { data: contractor } = await supabase
    .from('app_users')
    .select('full_name, email')
    .eq('id', data.contractor_user_id)
    .single();

  // Fetch contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('project_name, contract_type, manager_user_id')
    .eq('id', data.contract_id)
    .single();

  // Fetch manager
  const { data: manager } = contract?.manager_user_id ? await supabase
    .from('app_users')
    .select('full_name')
    .eq('id', contract.manager_user_id)
    .single() : { data: null };

  // Fetch rates
  const { data: rates } = await supabase
    .from('rates')
    .select('hourly_rate, overtime_multiplier, effective_from, effective_to')
    .eq('contract_id', data.contract_id);

  // Calculate hours
  const lineItems = Array.isArray(data.submission_line_items) ? data.submission_line_items : [];
  const overtimeEntries = Array.isArray(data.overtime_entries) ? data.overtime_entries : [];
  const regularHours = lineItems.reduce((sum: number, li: any) => sum + (li.hours || 0), 0);
  const overtimeHours = overtimeEntries.reduce((sum: number, ot: any) => sum + (ot.overtime_hours || 0), 0);

  // Find current rate
  const today = new Date().toISOString().split('T')[0];
  const currentRate = (rates || []).find(r =>
    r.effective_from <= today && (!r.effective_to || r.effective_to >= today)
  );

  const totalAmount = data.total_amount || calculateTotalAmount(
    regularHours,
    overtimeHours,
    currentRate?.hourly_rate,
    currentRate?.overtime_multiplier
  );

  // Extract description from line items
  const description = lineItems
    .filter((li: any) => li.note)
    .map((li: any) => li.note)
    .join(' ') || 'No description provided';

  return {
    id: data.id,
    contractorName: contractor?.full_name || 'Unknown Contractor',
    contractorEmail: contractor?.email || '',
    contractorType: contract?.contract_type === 'hourly' ? 'Hourly' as const : 'Fixed' as const,
    projectName: contract?.project_name || 'Unknown Project',
    managerName: manager?.full_name || 'Unknown Manager',
    regularHours,
    overtimeHours,
    totalAmount,
    status: data.status,
    submittedAt: data.submitted_at || data.created_at,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    paidAt: data.paid_at,
    description,
    notes: undefined,
    // NOTE: These columns may not exist in all schemas
    rejectionReason: (data as any).rejection_reason ?? undefined,
    clarificationMessage: undefined, // Legacy field
    adminNote: (data as any).admin_note ?? undefined,
    managerNote: (data as any).manager_note ?? undefined,
  };
}

/**
 * Approve a submission
 */
export async function approveSubmission(params: ApproveSubmissionParams): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: params.adminUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.submissionId);

  if (error) {
    console.error('[AdminDashboard] Error approving submission:', error);
    throw error;
  }
}

/**
 * Reject a submission with reason
 */
export async function rejectSubmission(params: RejectSubmissionParams): Promise<void> {
  const supabase = getSupabaseClient();

  // NOTE: rejection_reason column may not exist in all schemas - only update core fields
  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: params.adminUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.submissionId);

  if (error) {
    console.error('[AdminDashboard] Error rejecting submission:', error);
    throw new Error(error.message || 'Failed to reject submission');
  }
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
