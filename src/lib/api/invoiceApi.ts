/**
 * Invoice API Client
 *
 * Handles invoice-related API calls to the backend.
 */

import { supabase } from '../supabase/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Get the current user's access token for API calls
 */
async function getAccessToken(): Promise<string | null> {
  if (!supabase) {
    console.error('[invoiceApi] Supabase client not available');
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Response type for invoice URL request
 */
interface InvoiceUrlResponse {
  status: 'success' | 'pending' | 'failed' | 'error';
  message?: string;
  data?: {
    url: string;
    expiresIn: number;
    invoiceNumber?: string;
  };
  invoice_status?: string;
}

/**
 * Fetch a signed URL to view/download an invoice PDF
 *
 * @param submissionId - The submission ID to get the invoice for
 * @returns Promise with the signed URL or error info
 */
export async function getInvoiceUrl(submissionId: string): Promise<InvoiceUrlResponse> {
  const token = await getAccessToken();

  if (!token) {
    return {
      status: 'error',
      message: 'Not authenticated. Please log in.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}/invoice`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        status: 'success',
        data: data.data,
      };
    }

    // Handle specific status codes
    if (response.status === 409) {
      return {
        status: data.status || 'pending',
        message: data.message,
        invoice_status: data.invoice_status,
      };
    }

    if (response.status === 401) {
      return {
        status: 'error',
        message: 'Session expired. Please log in again.',
      };
    }

    if (response.status === 403) {
      return {
        status: 'error',
        message: 'Access denied. You can only view your own invoices.',
      };
    }

    return {
      status: 'error',
      message: data.message || 'Failed to fetch invoice',
    };
  } catch (error) {
    console.error('[invoiceApi] Error fetching invoice:', error);
    return {
      status: 'error',
      message: 'Network error. Please try again.',
    };
  }
}

/**
 * Open invoice PDF in a new tab
 *
 * Handles all states: success (opens PDF), pending (shows toast), error (shows toast)
 *
 * @param submissionId - The submission ID
 * @param onPending - Callback when invoice is generating
 * @param onError - Callback when error occurs
 * @returns Promise<boolean> - true if PDF was opened
 */
export async function openInvoicePdf(
  submissionId: string,
  onPending?: (message: string) => void,
  onError?: (message: string) => void
): Promise<boolean> {
  const result = await getInvoiceUrl(submissionId);

  if (result.status === 'success' && result.data?.url) {
    // Open PDF in new tab
    window.open(result.data.url, '_blank', 'noopener,noreferrer');
    return true;
  }

  if (result.status === 'pending') {
    onPending?.(result.message || 'Invoice is being generated. Please try again shortly.');
    return false;
  }

  if (result.status === 'failed') {
    onError?.(result.message || 'Invoice generation failed. Please contact support.');
    return false;
  }

  onError?.(result.message || 'Failed to load invoice.');
  return false;
}
