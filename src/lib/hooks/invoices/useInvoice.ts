/**
 * useInvoice Hook
 * 
 * Fetches invoice data from the backend API.
 * The backend handles on-demand generation if the invoice doesn't exist yet.
 * Returns signed URL for viewing invoice PDF.
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

// API base URL - defaults to localhost in development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface InvoiceData {
  invoiceUrl: string;
  invoiceNumber: string;
  generatedAt: string;
}

interface InvoiceError {
  error: string;
  message?: string;
}

// Query key for invoice caching
export const INVOICE_QUERY_KEY = 'invoice';

/**
 * Fetch invoice data from the backend.
 * The backend will generate the invoice on-demand if it doesn't exist.
 */
async function fetchInvoice(submissionId: string): Promise<InvoiceData> {
  const response = await fetch(`${API_BASE_URL}/api/invoices/${submissionId}`);
  
  if (!response.ok) {
    const errorData: InvoiceError = await response.json().catch(() => ({
      error: 'Failed to fetch invoice',
    }));
    throw new Error(errorData.message || errorData.error || 'Failed to fetch invoice');
  }
  
  return response.json();
}

export interface UseInvoiceResult {
  /** Fetch invoice URL and open in new tab */
  openInvoice: () => Promise<void>;
  /** Get invoice data without opening */
  getInvoice: () => Promise<InvoiceData | null>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Cached invoice data if available */
  invoiceData: InvoiceData | null;
}

/**
 * Hook for managing invoice operations for a specific submission.
 * The backend handles on-demand generation, so we only need GET requests.
 */
export function useInvoice(submissionId: string | undefined): UseInvoiceResult {
  const [isManualLoading, setIsManualLoading] = useState(false);

  // Query for fetching invoice (disabled by default, triggered manually)
  const invoiceQuery = useQuery({
    queryKey: [INVOICE_QUERY_KEY, submissionId],
    queryFn: () => fetchInvoice(submissionId!),
    enabled: false, // Don't auto-fetch, wait for manual trigger
    staleTime: 60000, // Cache for 1 minute (signed URLs expire)
    retry: false,
  });

  /**
   * Get invoice data (refetches if needed)
   */
  const getInvoice = async (): Promise<InvoiceData | null> => {
    if (!submissionId) return null;

    try {
      const result = await invoiceQuery.refetch();
      return result.data || null;
    } catch {
      return null;
    }
  };

  /**
   * Open invoice in new tab.
   * The backend will generate the invoice on-demand if it doesn't exist.
   */
  const openInvoice = async (): Promise<void> => {
    if (!submissionId) return;

    setIsManualLoading(true);
    try {
      // Single GET request - backend handles get-or-create
      const result = await invoiceQuery.refetch();
      
      if (result.data?.invoiceUrl) {
        window.open(result.data.invoiceUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // If we got here without data, throw an error
      if (result.error) {
        throw result.error;
      }
      throw new Error('Unable to load invoice');
    } finally {
      setIsManualLoading(false);
    }
  };

  return {
    openInvoice,
    getInvoice,
    isLoading: invoiceQuery.isFetching || isManualLoading,
    error: invoiceQuery.error || null,
    invoiceData: invoiceQuery.data || null,
  };
}

/**
 * Lazy hook for invoice button - simpler interface
 */
export function useInvoiceButton(submissionId: string | undefined) {
  const { openInvoice, isLoading, error } = useInvoice(submissionId);

  return {
    onClick: openInvoice,
    isLoading,
    error,
    label: isLoading ? 'Loading...' : 'View Invoice',
  };
}
