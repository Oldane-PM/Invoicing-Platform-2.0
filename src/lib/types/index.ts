// Type definitions for the invoicing platform

export type ContractorType = "Hourly" | "Fixed";
export type InvoiceStatus = "Pending" | "Approved" | "Rejected" | "Paid";
export type UserRole = "Contractor" | "Manager" | "Admin";
export type RateType = "Hourly" | "Fixed";

export interface Submission {
  id: string;
  employeeName: string;
  contractorType: ContractorType;
  totalHours: number;
  overtimeHours: number;
  totalAmount: number;
  status: InvoiceStatus;
  project: string;
  manager: string;
  date: Date;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  contractStartDate: Date;
  contractEndDate: Date;
  rateType: RateType;
  hourlyRate?: number;
  fixedRate?: number;
  contractType: ContractorType;
  reportingManager: string;
  position: string;
  department: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  enabled: boolean;
}

export interface Notification {
  id: string;
  type: "approval" | "contract" | "submission" | "payment";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

export interface MetricData {
  totalEmployees: number;
  pendingPayments: number;
  totalPayout: number;
  payoutChange: number;
}

// Contractor Submissions types
// Workflow statuses - single source of truth for submission lifecycle
export type SubmissionStatus =
  | "PENDING_MANAGER"           // Contractor submitted, awaiting manager review
  | "REJECTED_CONTRACTOR"       // Manager rejected, contractor action required
  | "CLARIFICATION_REQUESTED"   // Admin requested clarification from manager
  | "AWAITING_ADMIN_PAYMENT"    // Manager approved, awaiting admin payment
  | "PAID";                     // Admin paid, workflow complete

// Legacy status aliases for backwards compatibility (map to new statuses)
// PENDING -> PENDING_MANAGER
// APPROVED -> AWAITING_ADMIN_PAYMENT
// REJECTED -> REJECTED_CONTRACTOR
// NEEDS_CLARIFICATION -> CLARIFICATION_REQUESTED

export interface ContractorSubmission {
  id: string;
  submissionDate: string;
  projectName: string;
  description: string;
  regularHours: number;
  overtimeHours: number;
  totalAmount: number;
  status: SubmissionStatus;
  invoiceUrl?: string | null;
  workPeriod?: string; // "YYYY-MM"
  excludedDates?: string[]; // ["YYYY-MM-DD", ...]
  overtimeDescription?: string | null;
  // Workflow notes - travel with submission through lifecycle
  rejectionReason?: string | null;      // Manager rejection note to contractor
  adminNote?: string | null;            // Admin clarification request note (shown to manager)
  managerNote?: string | null;          // Manager clarification response (shown to admin)
  updatedAt?: string | null;
}

// ============================================
// STATUS HELPERS - Centralized workflow logic
// ============================================

/** Human-readable labels for each status */
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  PENDING_MANAGER: "Pending Manager Approval",
  REJECTED_CONTRACTOR: "Rejected (Action Required)",
  CLARIFICATION_REQUESTED: "Admin Requested Clarification",
  AWAITING_ADMIN_PAYMENT: "Awaiting Admin Payment",
  PAID: "Paid",
};

/** Contractor-facing status labels (simpler) */
export const CONTRACTOR_STATUS_LABELS: Record<SubmissionStatus, string> = {
  PENDING_MANAGER: "Submitted",
  REJECTED_CONTRACTOR: "Action Required",
  CLARIFICATION_REQUESTED: "Under Review",
  AWAITING_ADMIN_PAYMENT: "Approved",
  PAID: "Paid",
};

/** Valid status transitions based on role */
export type SubmissionAction =
  | "APPROVE"           // Manager: PENDING_MANAGER -> AWAITING_ADMIN_PAYMENT
  | "REJECT"            // Manager: PENDING_MANAGER -> REJECTED_CONTRACTOR
  | "PAY"               // Admin: AWAITING_ADMIN_PAYMENT -> PAID
  | "REQUEST_CLARIFICATION" // Admin: AWAITING_ADMIN_PAYMENT -> CLARIFICATION_REQUESTED
  | "RESPOND_RESUBMIT"  // Manager: CLARIFICATION_REQUESTED -> AWAITING_ADMIN_PAYMENT
  | "RESPOND_REJECT"    // Manager: CLARIFICATION_REQUESTED -> REJECTED_CONTRACTOR
  | "RESUBMIT";         // Contractor: REJECTED_CONTRACTOR -> PENDING_MANAGER

export interface ActionConfig {
  label: string;
  variant: "default" | "destructive" | "outline" | "secondary";
  requiresNote: boolean;
  notePlaceholder?: string;
}

/** Get allowed actions for a role and status */
export function getAllowedActions(
  role: "contractor" | "manager" | "admin",
  status: SubmissionStatus
): { action: SubmissionAction; config: ActionConfig }[] {
  const actions: { action: SubmissionAction; config: ActionConfig }[] = [];

  if (role === "contractor") {
    if (status === "REJECTED_CONTRACTOR") {
      actions.push({
        action: "RESUBMIT",
        config: {
          label: "Edit & Resubmit",
          variant: "default",
          requiresNote: false,
        },
      });
    }
  }

  if (role === "manager") {
    if (status === "PENDING_MANAGER") {
      actions.push({
        action: "APPROVE",
        config: {
          label: "Approve",
          variant: "default",
          requiresNote: false,
        },
      });
      actions.push({
        action: "REJECT",
        config: {
          label: "Reject",
          variant: "destructive",
          requiresNote: true,
          notePlaceholder: "Provide instructions for the contractor...",
        },
      });
    }
    if (status === "CLARIFICATION_REQUESTED") {
      actions.push({
        action: "RESPOND_RESUBMIT",
        config: {
          label: "Resubmit to Admin",
          variant: "default",
          requiresNote: true,
          notePlaceholder: "Explain clarification or provide additional details...",
        },
      });
      actions.push({
        action: "RESPOND_REJECT",
        config: {
          label: "Reject to Contractor",
          variant: "destructive",
          requiresNote: true,
          notePlaceholder: "Provide instructions for the contractor...",
        },
      });
    }
  }

  if (role === "admin") {
    if (status === "AWAITING_ADMIN_PAYMENT") {
      actions.push({
        action: "PAY",
        config: {
          label: "Mark as Paid",
          variant: "default",
          requiresNote: false,
        },
      });
      actions.push({
        action: "REQUEST_CLARIFICATION",
        config: {
          label: "Request Clarification",
          variant: "outline",
          requiresNote: true,
          notePlaceholder: "What clarification do you need from the manager?",
        },
      });
    }
  }

  return actions;
}

/** Map legacy DB status to new frontend status */
export function mapDbStatusToSubmissionStatus(
  dbStatus: string,
  paidAt?: string | null
): SubmissionStatus {
  // If paid_at is set, it's paid regardless of status field
  if (paidAt) return "PAID";

  const statusMap: Record<string, SubmissionStatus> = {
    // Legacy mappings
    draft: "PENDING_MANAGER",
    submitted: "PENDING_MANAGER",
    pending_review: "PENDING_MANAGER",
    pending: "PENDING_MANAGER",
    // New workflow statuses (lowercase in DB)
    pending_manager: "PENDING_MANAGER",
    approved: "AWAITING_ADMIN_PAYMENT",
    awaiting_admin_payment: "AWAITING_ADMIN_PAYMENT",
    rejected: "REJECTED_CONTRACTOR",
    rejected_contractor: "REJECTED_CONTRACTOR",
    needs_clarification: "CLARIFICATION_REQUESTED",
    clarification_requested: "CLARIFICATION_REQUESTED",
    paid: "PAID",
  };

  return statusMap[dbStatus.toLowerCase()] || "PENDING_MANAGER";
}

/** Map frontend status to DB status for writes */
export function mapSubmissionStatusToDb(status: SubmissionStatus): string {
  const dbStatusMap: Record<SubmissionStatus, string> = {
    PENDING_MANAGER: "submitted",
    REJECTED_CONTRACTOR: "rejected",
    CLARIFICATION_REQUESTED: "needs_clarification",
    AWAITING_ADMIN_PAYMENT: "approved",
    PAID: "approved", // PAID is derived from paid_at, not status field
  };
  return dbStatusMap[status];
}

// Type for excluded dates in calendar
export type ExcludedDate = string; // "YYYY-MM-DD"

// Draft type for creating a new submission
export interface SubmissionDraft {
  workPeriod: string; // "YYYY-MM"
  excludedDates: ExcludedDate[];
  hoursSubmitted: number;
  description: string;
  overtimeHours: number;
  overtimeDescription?: string | null;
  projectName?: string; // optional for now if app doesn't have project selection
}

export interface EmployeeDirectoryRow {
  contractor_id: string; // Used as key in table
  full_name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  joined_at: string;
  reporting_manager_id?: string; // manager's user ID for updating assignments
  reporting_manager_name?: string; // matched to reporting_manager_name
  contract_start?: string;
  contract_end?: string;
  hourly_rate?: number;
  fixed_rate?: number;
  rate_type?: string;
  contract_type?: string;
  position?: string;
  department?: string;
}

// ============================================
// PROJECT TYPES
// ============================================

export interface ProjectRow {
  id: string;
  name: string;
  client: string;
  description: string | null;
  resourceCount: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  client: string;
  description?: string | null;
  resourceCount?: number;
  startDate: string;
  endDate?: string | null;
}

export interface UpdateProjectInput {
  id: string;
  name: string;
  client: string;
  description?: string | null;
  resourceCount: number;
  startDate: string;
  endDate?: string | null;
}
