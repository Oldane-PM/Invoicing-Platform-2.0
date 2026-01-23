/**
 * Submissions Calculation Utilities
 *
 * Single source of truth for all submission amount calculations.
 * Handles both hourly and fixed-rate contractors consistently.
 *
 * RULES:
 * - Hourly: Total = (regularRate × regularHours) + (overtimeRate × overtimeHours)
 * - Fixed: Total = monthlyRate (hours are tracked but don't affect pay)
 * - All numeric inputs are safely converted with Number() to avoid string math
 * - Missing values are treated as 0
 * - Currency amounts are rounded to 2 decimal places for display
 */

export type PayType = "hourly" | "fixed";

export interface HourlyCalculationInput {
  regularRate: number | string | null | undefined;
  regularHours: number | string | null | undefined;
  overtimeRate: number | string | null | undefined;
  overtimeHours: number | string | null | undefined;
}

export interface FixedCalculationInput {
  monthlyRate: number | string | null | undefined;
}

export interface PaySummary {
  payType: PayType;
  regularAmount: number;
  overtimeAmount: number;
  totalAmount: number;
  monthlyRate: number | null;
  displayTotalLabel: string;
}

export interface SubmissionWithRates {
  // Hours
  regularHours?: number | string | null;
  overtimeHours?: number | string | null;
  // Rate info (from contractor or contract)
  payType?: PayType | "Hourly" | "Fixed" | string | null;
  rateType?: PayType | "Hourly" | "Fixed" | string | null;
  contractorType?: "Hourly" | "Fixed" | string | null;
  // Rates
  regularRate?: number | string | null;
  hourlyRate?: number | string | null;
  hourly_rate?: number | string | null;
  overtimeRate?: number | string | null;
  overtime_rate?: number | string | null;
  monthlyRate?: number | string | null;
  fixedRate?: number | string | null;
  fixed_rate?: number | string | null;
  // Pre-calculated total (fallback if rates unavailable)
  totalAmount?: number | string | null;
  total_amount?: number | string | null;
}

/**
 * Safely convert any value to a number, treating null/undefined/NaN as 0
 */
export function toSafeNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Round a number to 2 decimal places for currency display
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Format a number as currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number | null | undefined, currency = "USD"): string {
  const safeAmount = toSafeNumber(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

/**
 * Calculate total amount for an HOURLY contractor
 *
 * Formula: (regularRate × regularHours) + (overtimeRate × overtimeHours)
 *
 * @param input - The rates and hours
 * @returns Object with regularAmount, overtimeAmount, and totalAmount (all rounded to 2dp)
 */
export function calculateHourlyTotal(input: HourlyCalculationInput): {
  regularAmount: number;
  overtimeAmount: number;
  totalAmount: number;
} {
  const regularRate = toSafeNumber(input.regularRate);
  const regularHours = toSafeNumber(input.regularHours);
  const overtimeRate = toSafeNumber(input.overtimeRate);
  const overtimeHours = toSafeNumber(input.overtimeHours);

  const regularAmount = roundCurrency(regularRate * regularHours);
  const overtimeAmount = roundCurrency(overtimeRate * overtimeHours);
  const totalAmount = roundCurrency(regularAmount + overtimeAmount);

  return {
    regularAmount,
    overtimeAmount,
    totalAmount,
  };
}

/**
 * Calculate total amount for a FIXED-rate contractor
 *
 * For fixed-rate contractors, the total is simply the monthly rate.
 * Hours are tracked for reporting but don't affect pay.
 *
 * @param input - The monthly rate
 * @returns The monthly rate as the total amount
 */
export function calculateFixedTotal(input: FixedCalculationInput): number {
  return roundCurrency(toSafeNumber(input.monthlyRate));
}

/**
 * Normalize pay type from various input formats to our standard PayType
 */
export function normalizePayType(
  payType: PayType | "Hourly" | "Fixed" | string | null | undefined
): PayType {
  if (!payType) return "hourly"; // Default to hourly
  const normalized = String(payType).toLowerCase().trim();
  if (normalized === "fixed") return "fixed";
  return "hourly";
}

/**
 * Extract pay type from a submission object (checks multiple possible field names)
 */
function extractPayType(submission: SubmissionWithRates): PayType {
  // Check various possible field names for pay type
  const payTypeValue =
    submission.payType ??
    submission.rateType ??
    submission.contractorType;

  return normalizePayType(payTypeValue);
}

/**
 * Extract rates from a submission object (checks multiple possible field names)
 */
function extractRates(submission: SubmissionWithRates): {
  regularRate: number;
  overtimeRate: number;
  monthlyRate: number;
} {
  // Regular/hourly rate (check multiple field names)
  const regularRate = toSafeNumber(
    submission.regularRate ??
    submission.hourlyRate ??
    submission.hourly_rate
  );

  // Overtime rate
  const overtimeRate = toSafeNumber(
    submission.overtimeRate ??
    submission.overtime_rate
  );

  // Monthly/fixed rate
  const monthlyRate = toSafeNumber(
    submission.monthlyRate ??
    submission.fixedRate ??
    submission.fixed_rate
  );

  return { regularRate, overtimeRate, monthlyRate };
}

/**
 * Get complete pay summary for a submission
 *
 * This is the primary function to use in UI components.
 * It handles both hourly and fixed contractors and returns all the info
 * needed for display (amounts, labels, etc.)
 *
 * @param submission - Submission data with optional rate info
 * @returns Complete pay summary with amounts and display labels
 */
export function getSubmissionPaySummary(submission: SubmissionWithRates): PaySummary {
  const payType = extractPayType(submission);
  const { regularRate, overtimeRate, monthlyRate } = extractRates(submission);

  const regularHours = toSafeNumber(submission.regularHours);
  const overtimeHours = toSafeNumber(submission.overtimeHours);

  if (payType === "fixed") {
    // Fixed-rate contractor: total is the monthly rate
    const totalAmount = calculateFixedTotal({ monthlyRate });

    return {
      payType: "fixed",
      regularAmount: 0,
      overtimeAmount: 0,
      totalAmount,
      monthlyRate: totalAmount,
      displayTotalLabel: "Monthly Rate",
    };
  }

  // Hourly contractor: calculate from hours × rates
  const { regularAmount, overtimeAmount, totalAmount } = calculateHourlyTotal({
    regularRate,
    regularHours,
    overtimeRate,
    overtimeHours,
  });

  // If we couldn't calculate (no rates), fall back to stored total_amount
  const finalTotalAmount =
    totalAmount > 0
      ? totalAmount
      : roundCurrency(toSafeNumber(submission.totalAmount ?? submission.total_amount));

  return {
    payType: "hourly",
    regularAmount,
    overtimeAmount,
    totalAmount: finalTotalAmount,
    monthlyRate: null,
    displayTotalLabel: "Total Amount",
  };
}

/**
 * Calculate total amount for database storage
 *
 * Use this when creating or updating submissions to compute the total_amount field.
 *
 * @param params - All the parameters needed for calculation
 * @returns The total amount to store in the database
 */
export function calculateTotalForStorage(params: {
  payType: PayType | "Hourly" | "Fixed" | string | null | undefined;
  regularHours: number | string | null | undefined;
  overtimeHours: number | string | null | undefined;
  regularRate: number | string | null | undefined;
  overtimeRate: number | string | null | undefined;
  monthlyRate?: number | string | null | undefined;
}): number {
  const normalizedPayType = normalizePayType(params.payType);

  if (normalizedPayType === "fixed") {
    return calculateFixedTotal({ monthlyRate: params.monthlyRate });
  }

  const { totalAmount } = calculateHourlyTotal({
    regularRate: params.regularRate,
    regularHours: params.regularHours,
    overtimeRate: params.overtimeRate,
    overtimeHours: params.overtimeHours,
  });

  return totalAmount;
}

// Default rate constants (used as fallbacks)
export const DEFAULT_HOURLY_RATE = 75;
export const DEFAULT_OT_MULTIPLIER = 1.5;

/**
 * Get default overtime rate based on hourly rate
 */
export function getDefaultOvertimeRate(hourlyRate: number | string | null | undefined): number {
  const rate = toSafeNumber(hourlyRate) || DEFAULT_HOURLY_RATE;
  return roundCurrency(rate * DEFAULT_OT_MULTIPLIER);
}
