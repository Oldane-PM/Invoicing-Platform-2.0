/**
 * Admin Dashboard Domain Types
 * 
 * Type definitions for the admin dashboard domain layer.
 * These types represent the business logic layer and are independent of database schema.
 */

export interface AdminMetrics {
  totalContractors: number;
  activeContracts: number;
  pendingSubmissions: number;
  totalInvoiceValue: number;
}

export interface AdminSubmission {
  id: string;
  contractorName: string;
  contractorType: 'Hourly' | 'Fixed';
  projectName: string;
  managerName: string;
  regularHours: number;
  overtimeHours: number;
  totalAmount: number;
  status: 'submitted' | 'approved' | 'rejected' | 'needs_clarification' | 'paid';
  submittedAt: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string | null; // Timestamp when submission was paid
}

export interface SubmissionDetails extends AdminSubmission {
  contractorEmail: string;
  description: string;
  notes?: string;
  rejectionReason?: string;
  clarificationMessage?: string;
  adminNote?: string | null; // Admin's clarification request note
  managerNote?: string | null; // Manager's response to clarification
}

export interface SubmissionFilters {
  search?: string;
  contractorType?: string;
  status?: string;
  project?: string;
  manager?: string;
  month?: string;
}

export interface ApproveSubmissionParams {
  submissionId: string;
  adminUserId: string;
}

export interface RejectSubmissionParams {
  submissionId: string;
  reason: string;
  adminUserId: string;
}

export interface RequestClarificationParams {
  submissionId: string;
  message: string;
  adminUserId: string;
}

export interface MarkPaidParams {
  submissionId: string;
  adminUserId: string;
}
