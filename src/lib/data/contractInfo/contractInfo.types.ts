/**
 * Contract Info Types
 *
 * Types for contract information update operations.
 */

/**
 * Payload for updating contract information
 * All fields except contractor_id are optional (partial update)
 */
export interface ContractInfoUpdatePayload {
  contractor_id: string;
  contract_start?: string | null;  // ISO date string
  contract_end?: string | null;    // ISO date string
  hourly_rate?: number | null;
  overtime_rate?: number | null;
  rate_type?: "Hourly" | "Fixed" | null;
  fixed_rate?: number | null;
  position?: string | null;
  department?: string | null;
}

/**
 * Result of contract info update
 */
export interface ContractInfoUpdateResult {
  contractor_id: string;
  contract_start: string | null;
  contract_end: string | null;
  hourly_rate: number | null;
  overtime_rate: number | null;
  is_active: boolean;
}
