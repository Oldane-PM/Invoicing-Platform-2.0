/**
 * Invoice Sequence Utilities
 *
 * Pure helpers for vendor-scoped invoice numbering. A contractor enters their
 * "last invoice number" during onboarding (e.g. "INV-0042", "2024/100", "55").
 * Each new invoice generated for that vendor increments the numeric portion of
 * that value, preserving any prefix/suffix and zero-padding width.
 *
 * NOTE: This logic is intentionally dependency-free so it can be shared by the
 * client (onboarding preview / demo mode) and mirrored by the server invoice
 * generator. If you change the algorithm here, update
 * Server/services/invoices/invoiceNumber.ts to match.
 */

// Matches the LAST run of digits in the string (the sequence portion).
const LAST_DIGITS = /(\d+)(\D*)$/;

export interface ParsedInvoiceNumber {
  /** Everything before the trailing number (prefix), e.g. "INV-". */
  prefix: string;
  /** The numeric value of the trailing number. */
  sequence: number;
  /** Zero-padding width of the trailing number, e.g. 4 for "0042". */
  width: number;
  /** Any trailing non-digit characters after the number (rare). */
  suffix: string;
  /** True when the input contained a numeric portion we could increment. */
  hasNumber: boolean;
}

/**
 * Parse an invoice number into its prefix + trailing sequence parts.
 * Returns hasNumber=false when the value has no digits to increment.
 */
export function parseInvoiceNumber(value: string): ParsedInvoiceNumber {
  const raw = (value ?? "").trim();
  const match = raw.match(LAST_DIGITS);

  if (!match) {
    return { prefix: raw, sequence: 0, width: 0, suffix: "", hasNumber: false };
  }

  const digits = match[1];
  const suffix = match[2] ?? "";
  const prefix = raw.slice(0, match.index);

  return {
    prefix,
    sequence: parseInt(digits, 10),
    width: digits.length,
    suffix,
    hasNumber: true,
  };
}

/**
 * Format a sequence number back into the original shape (prefix + padded number + suffix).
 */
export function formatInvoiceNumber(parsed: ParsedInvoiceNumber, sequence: number): string {
  const padded = String(sequence).padStart(parsed.width, "0");
  return `${parsed.prefix}${padded}${parsed.suffix}`;
}

/**
 * Increment an invoice number by one, preserving prefix/suffix and padding.
 *
 * Examples:
 *   "INV-0042"   -> "INV-0043"
 *   "2024/100"   -> "2024/101"
 *   "55"         -> "56"
 *   "INV-0099"   -> "INV-0100"
 *   ""           -> "0001"   (no prior number: start the sequence)
 *   "DRAFT"      -> "DRAFT-0001" (no number: append one)
 */
export function incrementInvoiceNumber(previous: string | null | undefined): string {
  const raw = (previous ?? "").trim();

  if (!raw) {
    return "0001";
  }

  const parsed = parseInvoiceNumber(raw);

  if (!parsed.hasNumber) {
    return `${raw}-0001`;
  }

  return formatInvoiceNumber(parsed, parsed.sequence + 1);
}
