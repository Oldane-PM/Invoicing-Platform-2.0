/**
 * Authenticated invoice API calls (session cookies).
 */

const API_BASE_URL = (
  import.meta.env.VITE_AUTH_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001"
).replace(/\/+$/, "");

export interface ReplaceInvoiceAfterEditResponse {
  replaced: boolean;
  generated?: boolean;
  invoiceUrl?: string;
  invoiceNumber?: string;
  generatedAt?: string;
  message?: string;
}

/**
 * After updating submitted hours, replace the prior invoice (if any) with one built from the updated submission row.
 */
export async function replaceInvoiceAfterSubmissionEditApi(
  submissionId: string
): Promise<ReplaceInvoiceAfterEditResponse> {
  const response = await fetch(`${API_BASE_URL}/api/invoices/${submissionId}/replace-after-edit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Invoice replace failed (${response.status})`);
  }

  return data as ReplaceInvoiceAfterEditResponse;
}
