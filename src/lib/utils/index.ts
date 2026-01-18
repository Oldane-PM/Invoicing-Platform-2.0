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

/**
 * Extract work period key from a submission object.
 * Returns a Date representing the first day of the work period month.
 * Supports multiple field formats: workPeriod (YYYY-MM), work_period_key, workPeriodYear/Month
 */
export function getWorkPeriodKey(submission: {
  workPeriod?: string;
  work_period_key?: string;
  workPeriodYear?: number;
  workPeriodMonth?: number;
  work_period_year?: number;
  work_period_month?: number;
  submissionDate?: string;
}): Date {
  // Primary: workPeriod in "YYYY-MM" format
  if (submission.workPeriod) {
    const [year, month] = submission.workPeriod.split("-").map(Number);
    if (year && month) return new Date(year, month - 1, 1);
  }

  // work_period_key (date string)
  if (submission.work_period_key) {
    return new Date(submission.work_period_key);
  }

  // workPeriodYear + workPeriodMonth
  if (submission.workPeriodYear && submission.workPeriodMonth) {
    return new Date(submission.workPeriodYear, submission.workPeriodMonth - 1, 1);
  }

  // work_period_year + work_period_month (snake_case)
  if (submission.work_period_year && submission.work_period_month) {
    return new Date(submission.work_period_year, submission.work_period_month - 1, 1);
  }

  // Fallback: use submission date
  if (submission.submissionDate) {
    return new Date(submission.submissionDate);
  }

  // Last resort: current date
  return new Date();
}

/**
 * Format a Date as a work period label (e.g., "Jan 2026")
 */
export function formatWorkPeriodLabel(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Get a stable sort key for a work period (YYYY-MM format)
 * Used for grouping and sorting submissions by work period
 */
export function getWorkPeriodSortKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Group submissions by work period
 * Returns an array of groups sorted by work period (newest first)
 */
export function groupSubmissionsByWorkPeriod<
  T extends {
    workPeriod?: string;
    work_period_key?: string;
    workPeriodYear?: number;
    workPeriodMonth?: number;
    work_period_year?: number;
    work_period_month?: number;
    submissionDate?: string;
  }
>(submissions: T[]): { key: string; periodLabel: string; rows: T[] }[] {
  const map = new Map<string, T[]>();

  for (const s of submissions) {
    const keyDate = getWorkPeriodKey(s);
    const key = getWorkPeriodSortKey(keyDate);
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }

  // Sort groups descending by key (YYYY-MM)
  const sortedKeys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));

  return sortedKeys.map((k) => {
    const rows = map.get(k) ?? [];
    // Sort rows within group: newest submission date first
    rows.sort((a, b) => {
      const dateA = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
      const dateB = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
      return dateB - dateA;
    });

    // Get label from the first row's work period
    const periodLabel = formatWorkPeriodLabel(getWorkPeriodKey(rows[0]));
    return { key: k, periodLabel, rows };
  });
}
