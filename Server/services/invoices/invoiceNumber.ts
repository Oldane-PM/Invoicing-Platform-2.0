/**
 * Invoice Number Generation Service
 * 
 * Generates unique, sequential invoice numbers.
 * Format: {PREFIX}-{YEAR}-{SEQUENCE} (e.g., INV-2026-0001)
 */

import { getSupabaseAdmin } from '../../clients/supabase.server';

// Invoice number prefix from environment variable (default: "INV")
const INVOICE_NUMBER_PREFIX = process.env.INVOICE_NUMBER_PREFIX || 'INV';

/**
 * Get the next invoice number from the database
 * Uses the highest existing invoice_number to determine sequence
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const currentYear = new Date().getFullYear();
  const prefix = `${INVOICE_NUMBER_PREFIX}-${currentYear}-`;

  // Find the highest invoice number for the current year
  const { data, error } = await supabase
    .from('submissions')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[invoiceNumber] Error fetching last invoice number:', error);
    // Fall back to timestamp-based number if query fails
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }

  let nextSequence = 1;

  if (data && data.length > 0 && data[0].invoice_number) {
    // Extract sequence number from existing invoice number
    const lastNumber = data[0].invoice_number;
    const sequenceStr = lastNumber.replace(prefix, '');
    const lastSequence = parseInt(sequenceStr, 10);
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  // Format with leading zeros (4 digits)
  const sequenceFormatted = nextSequence.toString().padStart(4, '0');
  return `${prefix}${sequenceFormatted}`;
}

/**
 * Validate invoice number format
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
  // Dynamically build pattern using configured prefix
  const escapedPrefix = INVOICE_NUMBER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedPrefix}-\\d{4}-\\d{4,}$`);
  return pattern.test(invoiceNumber);
}
