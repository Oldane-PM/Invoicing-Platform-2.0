/**
 * Calculations Module
 *
 * Centralized calculation utilities for the invoicing platform.
 */

export {
  // Types
  type PayType,
  type HourlyCalculationInput,
  type FixedCalculationInput,
  type PaySummary,
  type SubmissionWithRates,
  // Core calculation functions
  calculateHourlyTotal,
  calculateFixedTotal,
  calculateTotalForStorage,
  // Helper functions
  toSafeNumber,
  roundCurrency,
  formatCurrency,
  normalizePayType,
  getSubmissionPaySummary,
  getDefaultOvertimeRate,
  // Constants
  DEFAULT_HOURLY_RATE,
  DEFAULT_OT_MULTIPLIER,
} from "./submissions";
