/**
 * Admin Managers Types
 * 
 * Type definitions for manager selection in admin contract editing.
 */

export interface ManagerOption {
  id: string;
  label: string; // "First Last"
}

export interface UpdateManagerAssignmentParams {
  contractorId: string;
  newManagerId: string | null;
  oldManagerId?: string | null;
}
