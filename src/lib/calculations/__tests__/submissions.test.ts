/**
 * Submissions Calculation Tests
 *
 * Run with: npx tsx src/lib/calculations/__tests__/submissions.test.ts
 *
 * Tests the centralized calculation utilities for submission amounts.
 */

import {
  calculateHourlyTotal,
  calculateFixedTotal,
  calculateTotalForStorage,
  getSubmissionPaySummary,
  toSafeNumber,
  roundCurrency,
  formatCurrency,
  normalizePayType,
  getDefaultOvertimeRate,
  DEFAULT_HOURLY_RATE,
  DEFAULT_OT_MULTIPLIER,
} from "../submissions";

// Simple test harness
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `${message ? message + ": " : ""}Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
    );
  }
}

function assertClose(actual: number, expected: number, tolerance = 0.01, message?: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `${message ? message + ": " : ""}Expected ${expected} (±${tolerance}) but got ${actual}`
    );
  }
}

// ============================================================
// Test Suite
// ============================================================

console.log("\n🧪 Running Submissions Calculation Tests\n");
console.log("=".repeat(60) + "\n");

// ----------------------------------------
// toSafeNumber tests
// ----------------------------------------
console.log("📋 toSafeNumber tests:");

test("toSafeNumber: converts number correctly", () => {
  assertEqual(toSafeNumber(42), 42);
});

test("toSafeNumber: converts string number correctly", () => {
  assertEqual(toSafeNumber("42.5"), 42.5);
});

test("toSafeNumber: handles null as 0", () => {
  assertEqual(toSafeNumber(null), 0);
});

test("toSafeNumber: handles undefined as 0", () => {
  assertEqual(toSafeNumber(undefined), 0);
});

test("toSafeNumber: handles empty string as 0", () => {
  assertEqual(toSafeNumber(""), 0);
});

test("toSafeNumber: handles NaN string as 0", () => {
  assertEqual(toSafeNumber("abc"), 0);
});

// ----------------------------------------
// roundCurrency tests
// ----------------------------------------
console.log("\n📋 roundCurrency tests:");

test("roundCurrency: rounds to 2 decimal places", () => {
  assertEqual(roundCurrency(100.456), 100.46);
});

test("roundCurrency: handles clean numbers", () => {
  assertEqual(roundCurrency(100), 100);
});

test("roundCurrency: rounds down correctly", () => {
  assertEqual(roundCurrency(100.444), 100.44);
});

// ----------------------------------------
// calculateHourlyTotal tests
// ----------------------------------------
console.log("\n📋 calculateHourlyTotal tests:");

test("Hourly only: regularHours=40, otHours=0", () => {
  const result = calculateHourlyTotal({
    regularRate: 20,
    regularHours: 40,
    overtimeRate: 30,
    overtimeHours: 0,
  });
  assertEqual(result.regularAmount, 800, "regularAmount");
  assertEqual(result.overtimeAmount, 0, "overtimeAmount");
  assertEqual(result.totalAmount, 800, "totalAmount");
});

test("Hourly + OT: regularHours=40, otHours=10", () => {
  const result = calculateHourlyTotal({
    regularRate: 20,
    regularHours: 40,
    overtimeRate: 30,
    overtimeHours: 10,
  });
  assertEqual(result.regularAmount, 800, "regularAmount");
  assertEqual(result.overtimeAmount, 300, "overtimeAmount");
  assertEqual(result.totalAmount, 1100, "totalAmount");
});

test("QA Example: Regular $20 × 80 hrs + OT $30 × 10 hrs = $1900", () => {
  const result = calculateHourlyTotal({
    regularRate: 20,
    regularHours: 80,
    overtimeRate: 30,
    overtimeHours: 10,
  });
  assertEqual(result.regularAmount, 1600, "regularAmount");
  assertEqual(result.overtimeAmount, 300, "overtimeAmount");
  assertEqual(result.totalAmount, 1900, "totalAmount");
});

test("Missing OT rate: should treat as 0 OT amount", () => {
  const result = calculateHourlyTotal({
    regularRate: 25,
    regularHours: 40,
    overtimeRate: 0, // Missing/zero OT rate
    overtimeHours: 10,
  });
  assertEqual(result.regularAmount, 1000, "regularAmount");
  assertEqual(result.overtimeAmount, 0, "overtimeAmount (0 rate × hours = 0)");
  assertEqual(result.totalAmount, 1000, "totalAmount");
});

test("String inputs: should compute correctly", () => {
  const result = calculateHourlyTotal({
    regularRate: "25.5",
    regularHours: "40",
    overtimeRate: "38.25",
    overtimeHours: "10",
  });
  assertEqual(result.regularAmount, 1020, "regularAmount");
  assertEqual(result.overtimeAmount, 382.5, "overtimeAmount");
  assertEqual(result.totalAmount, 1402.5, "totalAmount");
});

test("Handles null values safely", () => {
  const result = calculateHourlyTotal({
    regularRate: null,
    regularHours: 40,
    overtimeRate: 30,
    overtimeHours: null,
  });
  assertEqual(result.regularAmount, 0, "regularAmount (null rate)");
  assertEqual(result.overtimeAmount, 0, "overtimeAmount (null hours)");
  assertEqual(result.totalAmount, 0, "totalAmount");
});

// ----------------------------------------
// calculateFixedTotal tests
// ----------------------------------------
console.log("\n📋 calculateFixedTotal tests:");

test("Fixed: monthlyRate=3500 => total=3500", () => {
  const result = calculateFixedTotal({ monthlyRate: 3500 });
  assertEqual(result, 3500);
});

test("Fixed: string monthlyRate='2500' => total=2500", () => {
  const result = calculateFixedTotal({ monthlyRate: "2500" });
  assertEqual(result, 2500);
});

test("Fixed: null monthlyRate => total=0", () => {
  const result = calculateFixedTotal({ monthlyRate: null });
  assertEqual(result, 0);
});

// ----------------------------------------
// normalizePayType tests
// ----------------------------------------
console.log("\n📋 normalizePayType tests:");

test("normalizePayType: 'hourly' => 'hourly'", () => {
  assertEqual(normalizePayType("hourly"), "hourly");
});

test("normalizePayType: 'Hourly' => 'hourly'", () => {
  assertEqual(normalizePayType("Hourly"), "hourly");
});

test("normalizePayType: 'fixed' => 'fixed'", () => {
  assertEqual(normalizePayType("fixed"), "fixed");
});

test("normalizePayType: 'Fixed' => 'fixed'", () => {
  assertEqual(normalizePayType("Fixed"), "fixed");
});

test("normalizePayType: null => 'hourly' (default)", () => {
  assertEqual(normalizePayType(null), "hourly");
});

test("normalizePayType: undefined => 'hourly' (default)", () => {
  assertEqual(normalizePayType(undefined), "hourly");
});

// ----------------------------------------
// getSubmissionPaySummary tests
// ----------------------------------------
console.log("\n📋 getSubmissionPaySummary tests:");

test("getSubmissionPaySummary: hourly contractor", () => {
  const summary = getSubmissionPaySummary({
    payType: "hourly",
    regularHours: 40,
    overtimeHours: 10,
    hourlyRate: 25,
    overtimeRate: 37.5,
  });
  assertEqual(summary.payType, "hourly");
  assertEqual(summary.regularAmount, 1000);
  assertEqual(summary.overtimeAmount, 375);
  assertEqual(summary.totalAmount, 1375);
  assertEqual(summary.monthlyRate, null);
  assertEqual(summary.displayTotalLabel, "Total Amount");
});

test("getSubmissionPaySummary: fixed contractor", () => {
  const summary = getSubmissionPaySummary({
    payType: "fixed",
    regularHours: 40, // Hours are tracked but don't affect pay
    overtimeHours: 10,
    fixedRate: 3500,
  });
  assertEqual(summary.payType, "fixed");
  assertEqual(summary.regularAmount, 0);
  assertEqual(summary.overtimeAmount, 0);
  assertEqual(summary.totalAmount, 3500);
  assertEqual(summary.monthlyRate, 3500);
  assertEqual(summary.displayTotalLabel, "Monthly Rate");
});

test("getSubmissionPaySummary: uses contractorType for pay type", () => {
  const summary = getSubmissionPaySummary({
    contractorType: "Fixed",
    regularHours: 80,
    monthlyRate: 4000,
  });
  assertEqual(summary.payType, "fixed");
  assertEqual(summary.totalAmount, 4000);
});

test("getSubmissionPaySummary: uses rateType for pay type", () => {
  const summary = getSubmissionPaySummary({
    rateType: "Hourly",
    regularHours: 40,
    hourly_rate: 30, // snake_case field name
    overtime_rate: 45,
    overtimeHours: 5,
  });
  assertEqual(summary.payType, "hourly");
  assertEqual(summary.totalAmount, 1425); // (30 × 40) + (45 × 5)
});

test("getSubmissionPaySummary: fallback to total_amount when no rates", () => {
  const summary = getSubmissionPaySummary({
    payType: "hourly",
    regularHours: 40,
    overtimeHours: 10,
    // No rates provided
    total_amount: 1500, // Pre-calculated fallback
  });
  assertEqual(summary.totalAmount, 1500);
});

// ----------------------------------------
// calculateTotalForStorage tests
// ----------------------------------------
console.log("\n📋 calculateTotalForStorage tests:");

test("calculateTotalForStorage: hourly", () => {
  const total = calculateTotalForStorage({
    payType: "hourly",
    regularHours: 40,
    overtimeHours: 10,
    regularRate: 25,
    overtimeRate: 37.5,
  });
  assertEqual(total, 1375);
});

test("calculateTotalForStorage: fixed", () => {
  const total = calculateTotalForStorage({
    payType: "Fixed",
    regularHours: 160,
    overtimeHours: 0,
    regularRate: 0,
    overtimeRate: 0,
    monthlyRate: 5000,
  });
  assertEqual(total, 5000);
});

// ----------------------------------------
// getDefaultOvertimeRate tests
// ----------------------------------------
console.log("\n📋 getDefaultOvertimeRate tests:");

test("getDefaultOvertimeRate: from hourly rate", () => {
  const otRate = getDefaultOvertimeRate(50);
  assertEqual(otRate, 75); // 50 × 1.5
});

test("getDefaultOvertimeRate: uses default when null", () => {
  const otRate = getDefaultOvertimeRate(null);
  assertEqual(otRate, DEFAULT_HOURLY_RATE * DEFAULT_OT_MULTIPLIER);
});

// ----------------------------------------
// formatCurrency tests
// ----------------------------------------
console.log("\n📋 formatCurrency tests:");

test("formatCurrency: formats USD correctly", () => {
  const result = formatCurrency(1234.56);
  assertEqual(result, "$1,234.56");
});

test("formatCurrency: handles null", () => {
  const result = formatCurrency(null);
  assertEqual(result, "$0.00");
});

// ============================================================
// Summary
// ============================================================
console.log("\n" + "=".repeat(60));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log("❌ Some tests failed!\n");
  process.exit(1);
} else {
  console.log("✅ All tests passed!\n");
  process.exit(0);
}
