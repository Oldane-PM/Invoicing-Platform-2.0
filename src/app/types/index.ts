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