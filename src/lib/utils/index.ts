export { cn } from "./cn";

/**
 * Format an ISO date string to a human-readable format
 * e.g., "2026-01-15" -> "Jan 15, 2026"
 */
export function formatDate(iso: string, locale = "en-US"): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format a number as currency
 * e.g., 12600 -> "$12,600.00"
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
