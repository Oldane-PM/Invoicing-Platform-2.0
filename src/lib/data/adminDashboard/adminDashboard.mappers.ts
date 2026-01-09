/**
 * Admin Dashboard Database Mappers
 * 
 * Maps database rows to domain types for the admin dashboard.
 * Handles data transformation and calculation logic.
 */

import type { AdminSubmission, SubmissionDetails } from './adminDashboard.types';

// Rate constants - fallback if rates not found
const DEFAULT_HOURLY_RATE = 75;
const DEFAULT_OT_MULTIPLIER = 1.5;

/**
 * Calculate total amount based on hours and rates
 */
export function calculateTotalAmount(
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
 * Map database submission row to AdminSubmission
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
    contractorType: contractType,
    projectName,
    managerName,
    regularHours,
    overtimeHours,
    totalAmount,
    status: dbRow.status,
    submittedAt: dbRow.submitted_at || dbRow.created_at,
    periodStart: dbRow.period_start,
    periodEnd: dbRow.period_end,
  };
}

/**
 * Map database submission row to SubmissionDetails (includes additional fields)
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
  };
}
