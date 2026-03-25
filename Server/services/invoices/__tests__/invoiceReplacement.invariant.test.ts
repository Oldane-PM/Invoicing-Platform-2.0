/**
 * Invariant tests for invoice replacement (storage path cleanup decision).
 * Run: npx tsx Server/services/invoices/__tests__/invoiceReplacement.invariant.test.ts
 */

import { shouldDeleteOldStorageFile, isInvoiceStaleVersusSubmission } from "../generateInvoiceForSubmission";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`❌ ${name}`);
    console.log(`   Error: ${msg}`);
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

console.log("\n🧪 Invoice replacement invariant tests\n");

test("shouldDeleteOldStorageFile: same path => false (no orphan risk)", () => {
  assertEqual(shouldDeleteOldStorageFile("a/b/c.pdf", "a/b/c.pdf"), false);
});

test("shouldDeleteOldStorageFile: different paths => true", () => {
  assertEqual(shouldDeleteOldStorageFile("u1/s1/invoice-1.pdf", "u1/s1/invoice-2.pdf"), true);
});

test("shouldDeleteOldStorageFile: null old => false", () => {
  assertEqual(shouldDeleteOldStorageFile(null, "a/b.pdf"), false);
});

test("shouldDeleteOldStorageFile: empty old => false", () => {
  assertEqual(shouldDeleteOldStorageFile("", "a/b.pdf"), false);
});

console.log("\n📋 isInvoiceStaleVersusSubmission:\n");

test("stale: updated_at after invoice_generated_at", () => {
  assertEqual(
    isInvoiceStaleVersusSubmission({
      invoice_generated_at: "2026-03-25T10:00:00.000Z",
      updated_at: "2026-03-25T12:00:00.000Z",
      submitted_at: "2026-03-25T09:00:00.000Z",
    }),
    true
  );
});

test("not stale: invoice generated after last edit", () => {
  assertEqual(
    isInvoiceStaleVersusSubmission({
      invoice_generated_at: "2026-03-25T14:00:00.000Z",
      updated_at: "2026-03-25T12:00:00.000Z",
      submitted_at: "2026-03-25T12:00:00.000Z",
    }),
    false
  );
});

test("stale: uses submitted_at when updated_at null", () => {
  assertEqual(
    isInvoiceStaleVersusSubmission({
      invoice_generated_at: "2026-03-25T10:00:00.000Z",
      updated_at: null,
      submitted_at: "2026-03-25T11:00:00.000Z",
    }),
    true
  );
});

console.log(`\n📊 ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
