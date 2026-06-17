/**
 * Vendor Onboarding Types
 *
 * Shared types for contractor onboarding (signed work order + manually entered
 * contract details + invoice sequence seed). Used by both the Supabase repo and
 * the localStorage demo store so the UI/hook are storage-agnostic.
 */

export interface VendorOnboardingData {
  user_id: string;

  // Manually entered contract details (off the signed work order)
  onboarding_role: string | null;
  onboarding_rate: number | null;
  contract_start_date: string | null; // ISO date (yyyy-MM-dd)
  contract_end_date: string | null;   // ISO date (yyyy-MM-dd)

  // Invoice sequence seed — new invoices increment the numeric portion of this.
  last_invoice_number: string | null;

  // Uploaded signed work order (current/most-recent)
  work_order_path: string | null;
  work_order_filename: string | null;
  work_order_uploaded_at: string | null;

  onboarding_completed_at: string | null;
}

/** Partial update payload for saving onboarding fields. */
export type VendorOnboardingPatch = Partial<
  Omit<VendorOnboardingData, "user_id">
>;

/** Result of uploading a signed work order. */
export interface WorkOrderUploadResult {
  path: string;
  filename: string;
  uploadedAt: string;
}

/** A reference to a stored work order plus a URL that can be opened/downloaded. */
export interface WorkOrderRef {
  path: string;
  filename: string | null;
  url: string;
}

export function emptyVendorOnboarding(userId: string): VendorOnboardingData {
  return {
    user_id: userId,
    onboarding_role: null,
    onboarding_rate: null,
    contract_start_date: null,
    contract_end_date: null,
    last_invoice_number: null,
    work_order_path: null,
    work_order_filename: null,
    work_order_uploaded_at: null,
    onboarding_completed_at: null,
  };
}
