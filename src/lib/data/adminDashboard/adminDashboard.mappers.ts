/**
 * Admin Dashboard Database Mappers
 * 
 * Maps database rows to domain types for the admin dashboard.
 * 
 * IMPORTANT: These mappers are primarily for legacy schemas that used
 * submission_line_items and overtime_entries tables. The current schema
 * stores data directly on the submissions table.
 * 
 * BEST PRACTICE: Always use stored total_amount from submissions table.
 * Do NOT recalculate totals - this ensures consistency with invoices.
 * The repo (adminDashboard.repo.ts) handles this correctly.
 */

import type { AdminSubmission, SubmissionDetails } from './adminDashboard.types';
import {
  calculateHourlyTotal,
  calculateFixedTotal,
  toSafeNumber,
  normalizePayType,
  DEFAULT_HOURLY_RATE,
  DEFAULT_OT_MULTIPLIER,
} from '../../calculations';

/**
 * Calculate total amount based on hours and rates
 * 
 * @deprecated PREFER using stored total_amount from submissions table.
 * This function should only be used as a fallback when stored totals are unavailable.
 * Using stored totals ensures Submission Total === Invoice Total.
 * 
 * For hourly: (regularRate × regularHours) + (overtimeRate × overtimeHours)
 * For fixed: uses monthlyRate directly
 */
export function calculateTotalAmount(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number = DEFAULT_HOURLY_RATE,
  otMultiplier: number = DEFAULT_OT_MULTIPLIER,
  contractType?: 'hourly' | 'fixed' | string,
  monthlyRate?: number
): number {
  const payType = normalizePayType(contractType);
  
  if (payType === 'fixed' && monthlyRate !== undefined) {
    return calculateFixedTotal({ monthlyRate });
  }
  
  // Calculate overtime rate from multiplier
  const overtimeRate = toSafeNumber(hourlyRate) * toSafeNumber(otMultiplier);
  
  const { totalAmount } = calculateHourlyTotal({
    regularRate: hourlyRate,
    regularHours,
    overtimeRate,
    overtimeHours,
  });
  
  return totalAmount;
}

/**
 * Map database submission row to AdminSubmission
 * 
 * @deprecated This mapper is for legacy schemas using submission_line_items/overtime_entries.
 * The current repo (adminDashboard.repo.ts) uses direct column access and stored total_amount.
 * Prefer the repo's inline mapping which uses stored totals for consistency.
 */
export function mapDbSubmissionToAdminSubmission(dbRow: any): AdminSubmission {
  // Extract contractor info from app_users join
  const contractorData = Array.isArray(dbRow.app_users) ? dbRow.app_users[0] : dbRow.app_users;
  const contractorName = contractorData?.full_name || 'Unknown Contractor';
  
  // Extract contract info
  const contractData = Array.isArray(dbRow.contracts) ? dbRow.contracts[0] : dbRow.contracts;
  const projectName = contractData?.project_name || 'Unknown Project';
  const contractType = contractData?.contract_type === 'hourly' ? 'Hourly' : 'Fixed';
  
  // Extract manager info (from contract's manager relationship)
  const managerData = contractData?.manager_user || null;
  const managerName = managerData?.full_name || 'Unknown Manager';
  
  // Extract line items and overtime
  const lineItems = Array.isArray(dbRow.submission_line_items) ? dbRow.submission_line_items : [];
  const overtimeEntries = Array.isArray(dbRow.overtime_entries) ? dbRow.overtime_entries : [];
  
  // Calculate totals
  const regularHours = lineItems.reduce((sum: number, li: any) => sum + (li.hours || 0), 0);
  const overtimeHours = overtimeEntries.reduce((sum: number, ot: any) => sum + (ot.overtime_hours || 0), 0);
  
  // Get rate from contract
  const rates = Array.isArray(contractData?.rates) ? contractData.rates : [];
  const currentRate = rates.find((r: any) => {
    const today = new Date().toISOString().split('T')[0];
    return r.effective_from <= today && (!r.effective_to || r.effective_to >= today);
  });
  
  const hourlyRate = currentRate?.hourly_rate || DEFAULT_HOURLY_RATE;
  const otMultiplier = currentRate?.overtime_multiplier || DEFAULT_OT_MULTIPLIER;
  
  const totalAmount = calculateTotalAmount(regularHours, overtimeHours, hourlyRate, otMultiplier);
  
  return {
    id: dbRow.id,
    contractorName,
    contractorType: contractType as 'Hourly' | 'Fixed',
    projectName,
    managerName,
    regularHours,
    overtimeHours,
    totalAmount,
    status: dbRow.status,
    submittedAt: dbRow.submitted_at || dbRow.created_at,
    periodStart: dbRow.period_start || '',
    periodEnd: dbRow.period_end || '',
    workPeriod: dbRow.work_period || '',
    paidAt: dbRow.paid_at,
    approvedAt: dbRow.approved_at,
  };
}

/**
 * Map database submission row to SubmissionDetails (includes additional fields)
 * 
 * @deprecated This mapper is for legacy schemas using submission_line_items/overtime_entries.
 * The current repo (adminDashboard.repo.ts) uses direct column access and stored total_amount.
 * Prefer the repo's inline mapping which uses stored totals for consistency.
 */
export function mapDbSubmissionToDetails(dbRow: any): SubmissionDetails {
  const baseSubmission = mapDbSubmissionToAdminSubmission(dbRow);
  
  // Extract contractor email
  const contractorData = Array.isArray(dbRow.app_users) ? dbRow.app_users[0] : dbRow.app_users;
  const contractorEmail = contractorData?.email || '';
  
  // Extract line items for description
  const lineItems = Array.isArray(dbRow.submission_line_items) ? dbRow.submission_line_items : [];
  const description = lineItems
    .filter((li: any) => li.note)
    .map((li: any) => li.note)
    .join(' ') || 'No description provided';
  
  // Extract notes/reasons from submission metadata
  const notes = dbRow.notes || undefined;
  const rejectionReason = dbRow.rejection_reason || undefined;
  const clarificationMessage = dbRow.clarification_message || undefined;
  
  return {
    ...baseSubmission,
    contractorEmail,
    description,
    notes,
    rejectionReason,
    clarificationMessage,
    overtimeDescription: dbRow.overtime_description || undefined,
    adminNote: dbRow.admin_note || undefined,
    managerNote: dbRow.manager_note || undefined,
  };
}
