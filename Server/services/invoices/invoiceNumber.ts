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
 * Increment the numeric portion of an invoice number, preserving prefix/suffix
 * and zero-padding width.
 *
 * Mirrors src/lib/invoiceSequence.ts — keep the two in sync.
 *   "INV-0042" -> "INV-0043",  "2024/100" -> "2024/101",  "55" -> "56"
 */
export function incrementInvoiceNumber(previous: string | null | undefined): string {
  const raw = (previous ?? '').trim();
  if (!raw) return '0001';

  const match = raw.match(/(\d+)(\D*)$/);
  if (!match) return `${raw}-0001`;

  const digits = match[1];
  const suffix = match[2] ?? '';
  const prefix = raw.slice(0, match.index);
  const next = parseInt(digits, 10) + 1;
  const padded = String(next).padStart(digits.length, '0');
  return `${prefix}${padded}${suffix}`;
}

/** Numeric value of the trailing digit run, or -1 when there is none. */
function trailingSequence(value: string | null | undefined): number {
  const match = (value ?? '').trim().match(/(\d+)(\D*)$/);
  return match ? parseInt(match[1], 10) : -1;
}

/**
 * Get the next invoice number for a specific contractor (vendor-scoped sequence).
 *
 * The sequence is seeded by the contractor's `last_invoice_number` (entered during
 * onboarding) and continues from the highest invoice already issued to them. The
 * highest-sequence value found is incremented, preserving its format. Falls back
 * to the global generator when the contractor has no seed and no prior invoices.
 */
export async function getNextInvoiceNumberForContractor(contractorId: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  // Seed entered during onboarding.
  const { data: profile, error: profileError } = await supabase
    .from('contractor_profiles')
    .select('last_invoice_number')
    .eq('user_id', contractorId)
    .maybeSingle();

  if (profileError) {
    console.error('[invoiceNumber] Error fetching onboarding seed:', profileError);
  }

  // Invoices already issued to this contractor.
  const { data: issued, error: issuedError } = await supabase
    .from('submissions')
    .select('invoice_number')
    .eq('contractor_user_id', contractorId)
    .not('invoice_number', 'is', null);

  if (issuedError) {
    console.error('[invoiceNumber] Error fetching issued invoices:', issuedError);
  }

  const candidates: string[] = [];
  if (profile?.last_invoice_number) candidates.push(profile.last_invoice_number);
  for (const row of issued ?? []) {
    if (row.invoice_number) candidates.push(row.invoice_number);
  }

  if (candidates.length === 0) {
    // No vendor-specific history — fall back to the global generator.
    return getNextInvoiceNumber();
  }

  // Increment the candidate with the highest trailing sequence (preserves its format).
  const previous = candidates.reduce((best, current) =>
    trailingSequence(current) > trailingSequence(best) ? current : best
  );

  return incrementInvoiceNumber(previous);
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
