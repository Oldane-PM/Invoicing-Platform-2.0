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
export type SubmissionStatus =
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "REJECTED"
  | "NEEDS_CLARIFICATION";

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
  reporting_manager_name?: string; // matched to reporting_manager_name
  contract_start?: string;
  contract_end?: string;
  hourly_rate?: number;
  fixed_rate?: number;
  rate_type?: string;
  rate_type?: string;
  contract_type?: string;
  position?: string;
  department?: string;
}
