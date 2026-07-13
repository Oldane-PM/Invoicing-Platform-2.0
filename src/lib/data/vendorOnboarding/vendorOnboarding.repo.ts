/**
 * Vendor Onboarding Repository (Supabase)
 *
 * Persists onboarding data to the contractor_profiles columns added in migration
 * 052, uploads signed work orders to the private "work-orders" storage bucket,
 * and records each upload in vendor_work_orders for audit purposes.
 */

import { getSupabaseClient } from "../../supabase/client";
import {
  emptyVendorOnboarding,
  type VendorOnboardingData,
  type VendorOnboardingPatch,
  type WorkOrderRef,
  type WorkOrderUploadResult,
} from "./vendorOnboarding.types";

const WORK_ORDERS_BUCKET = "work-orders";
const SIGNED_URL_EXPIRY_SECONDS = 600; // 10 minutes

// Columns that belong to onboarding (subset of contractor_profiles).
const ONBOARDING_COLUMNS =
  "user_id, onboarding_role, onboarding_rate, onboarding_rate_type, contract_start_date, contract_end_date, last_invoice_number, work_order_path, work_order_filename, work_order_uploaded_at, w8_ben_path, w8_ben_filename, initial_invoice_path, initial_invoice_filename, onboarding_completed_at";

/** Fetch onboarding fields for a contractor. Returns empty record if none yet. */
export async function getVendorOnboarding(userId: string): Promise<VendorOnboardingData> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("contractor_profiles")
    .select(ONBOARDING_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[vendorOnboarding.repo] Error fetching onboarding:", error);
    throw error;
  }

  if (!data) return emptyVendorOnboarding(userId);

  return {
    user_id: userId,
    onboarding_role: data.onboarding_role ?? null,
    onboarding_rate: data.onboarding_rate ?? null,
    onboarding_rate_type: data.onboarding_rate_type ?? null,
    contract_start_date: data.contract_start_date ?? null,
    contract_end_date: data.contract_end_date ?? null,
    last_invoice_number: data.last_invoice_number ?? null,
    work_order_path: data.work_order_path ?? null,
    work_order_filename: data.work_order_filename ?? null,
    work_order_uploaded_at: data.work_order_uploaded_at ?? null,
    w8_ben_path: data.w8_ben_path ?? null,
    w8_ben_filename: data.w8_ben_filename ?? null,
    initial_invoice_path: data.initial_invoice_path ?? null,
    initial_invoice_filename: data.initial_invoice_filename ?? null,
    onboarding_completed_at: data.onboarding_completed_at ?? null,
  };
}

/** Upsert onboarding fields. Only updates the provided fields. */
export async function saveVendorOnboarding(
  userId: string,
  patch: VendorOnboardingPatch
): Promise<VendorOnboardingData> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("contractor_profiles")
    .upsert(
      { user_id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select(ONBOARDING_COLUMNS)
    .single();

  if (error) {
    console.error("[vendorOnboarding.repo] Error saving onboarding:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(
      `${error.message}${error.code ? ` (code ${error.code})` : ""}${
        error.details ? ` — ${error.details}` : ""
      }`
    );
  }

  // Auto-sync extracted work order data into the official contract tables so they match perfectly
  try {
    const isHourly = patch.onboarding_rate_type === "hourly";
    const isFixed = patch.onboarding_rate_type === "fixed";
    
    // Only sync if there are rate or date fields provided
    if (patch.onboarding_rate !== undefined || patch.contract_start_date !== undefined || patch.contract_end_date !== undefined) {
      // Inline the update logic to avoid circular imports or complex deps
      const dbUpdates: any = { contractor_id: userId, is_active: true };
      if (patch.contract_start_date !== undefined) dbUpdates.contract_start = patch.contract_start_date;
      if (patch.contract_end_date !== undefined) dbUpdates.contract_end = patch.contract_end_date;
      if (isHourly && patch.onboarding_rate != null) {
        dbUpdates.hourly_rate = patch.onboarding_rate;
        dbUpdates.overtime_rate = patch.onboarding_rate * 1.5;
      } else {
        dbUpdates.hourly_rate = null;
        dbUpdates.overtime_rate = null;
      }
      
      await supabase.from("contractors").upsert(dbUpdates, { onConflict: "contractor_id" });
      
      if (isHourly || isFixed) {
        const contractUpdates: any = {};
        if (isHourly) contractUpdates.contract_type = "hourly";
        if (isFixed) {
            contractUpdates.contract_type = "fixed";
            if (patch.onboarding_rate != null) contractUpdates.fixed_monthly_rate = patch.onboarding_rate;
        }
        if (patch.contract_start_date !== undefined) contractUpdates.start_date = patch.contract_start_date;
        if (patch.contract_end_date !== undefined) contractUpdates.end_date = patch.contract_end_date;

        const { data: existingContract } = await supabase
          .from("contracts")
          .select("id")
          .eq("contractor_user_id", userId)
          .eq("is_active", true)
          .maybeSingle();

        if (existingContract) {
          await supabase.from("contracts").update(contractUpdates).eq("id", existingContract.id);
        } else {
          await supabase.from("contracts").insert({
            contractor_user_id: userId,
            is_active: true,
            project_name: patch.onboarding_role || "General Work",
            start_date: patch.contract_start_date || new Date().toISOString().split("T")[0],
            end_date: patch.contract_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            ...contractUpdates
          });
        }
      }
      console.log(`[vendorOnboarding.repo] Auto-synced work order data to official contract for user ${userId}`);
    }
  } catch (syncError) {
    console.error("[vendorOnboarding.repo] Failed to auto-sync contract info:", syncError);
  }

  return getVendorOnboarding(userId);
}

/**
 * Upload a signed work order to the work-orders bucket and record it in the
 * audit table. Returns the stored path + filename.
 */
export async function uploadWorkOrder(
  userId: string,
  file: File
): Promise<WorkOrderUploadResult> {
  const supabase = getSupabaseClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(WORK_ORDERS_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    console.error("[vendorOnboarding.repo] Work order upload failed:", uploadError);
    throw new Error(`Failed to upload work order: ${uploadError.message}`);
  }

  const uploadedAt = new Date().toISOString();

  // Record in audit table (non-fatal if it fails — upload already succeeded).
  const { error: auditError } = await supabase.from("vendor_work_orders").insert({
    user_id: userId,
    storage_path: path,
    file_name: file.name,
    file_size: file.size,
    content_type: file.type || null,
    uploaded_at: uploadedAt,
  });

  if (auditError) {
    console.error("[vendorOnboarding.repo] Work order audit insert failed:", auditError);
  }

  return { path, filename: file.name, uploadedAt };
}

/** Build an openable signed URL for a stored work order. */
export async function getWorkOrderRef(
  path: string,
  filename: string | null
): Promise<WorkOrderRef> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.storage
      .from(WORK_ORDERS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data) {
      console.error("[vendorOnboarding.repo] Failed to sign work order URL:", error);
      throw new Error(`Failed to open work order: ${error?.message ?? "unknown error"}`);
    }

    return { path, filename, url: data.signedUrl };
  } catch (err) {
    throw err;
  }
}

/** Upload a W8-BEN to the work-orders bucket. */
export async function uploadW8Ben(
  userId: string,
  file: File
): Promise<WorkOrderUploadResult> {
  const supabase = getSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/w8ben-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(WORK_ORDERS_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    console.error("[vendorOnboarding.repo] W8-BEN upload failed:", uploadError);
    throw new Error(`Failed to upload W8-BEN: ${uploadError.message}`);
  }

  return { path, filename: file.name, uploadedAt: new Date().toISOString() };
}

/** Upload an Initial Invoice to the work-orders bucket. */
export async function uploadInitialInvoice(
  userId: string,
  file: File
): Promise<WorkOrderUploadResult> {
  const supabase = getSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/initial-invoice-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(WORK_ORDERS_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    console.error("[vendorOnboarding.repo] Initial Invoice upload failed:", uploadError);
    throw new Error(`Failed to upload Initial Invoice: ${uploadError.message}`);
  }

  return { path, filename: file.name, uploadedAt: new Date().toISOString() };
}
