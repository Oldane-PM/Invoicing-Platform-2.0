/**
 * Contract Info Repository
 *
 * Data access layer for contract information operations.
 * Updates the contractors table which is the source of truth for:
 * - hourly_rate, overtime_rate
 * - contract_start, contract_end
 *
 * ARCHITECTURE: UI → Hooks → Repos → Supabase
 */

import { getSupabaseClient } from "../../supabase/client";
import type {
  ContractInfoUpdatePayload,
  ContractInfoUpdateResult,
} from "./contractInfo.types";

/**
 * Update contract information for a contractor
 *
 * Uses upsert to handle both insert and update in the contractors table.
 * Only provided fields are updated (partial update).
 */
export async function updateContractInfo(
  payload: ContractInfoUpdatePayload
): Promise<ContractInfoUpdateResult> {
  const supabase = getSupabaseClient();
  const { contractor_id, ...updates } = payload;

  // Map frontend field names to database column names
  const dbUpdates: Record<string, unknown> = {
    contractor_id, // Required for upsert
    is_active: true, // Default to active
  };

  if (updates.contract_start !== undefined) {
    dbUpdates.contract_start = updates.contract_start;
  }
  if (updates.contract_end !== undefined) {
    dbUpdates.contract_end = updates.contract_end;
  }
  if (updates.hourly_rate !== undefined) {
    dbUpdates.hourly_rate = updates.hourly_rate;
  }
  if (updates.overtime_rate !== undefined) {
    dbUpdates.overtime_rate = updates.overtime_rate;
  }

  console.log("[ContractInfo] Upserting contract info for:", contractor_id, dbUpdates);

  // Use upsert to handle both insert and update
  // This works whether the contractor exists or not
  const { data, error } = await supabase
    .from("contractors")
    .upsert(dbUpdates, {
      onConflict: "contractor_id",
    })
    .select("contractor_id, contract_start, contract_end, hourly_rate, overtime_rate, is_active")
    .maybeSingle();

  if (error) {
    console.error("[ContractInfo] Error upserting contract info:", error);
    throw new Error(`Failed to update contract info: ${error.message}`);
  }

  // If no data returned, fetch it (upsert might not return on some configurations)
  if (!data) {
    const { data: fetchedData, error: fetchError } = await supabase
      .from("contractors")
      .select("contractor_id, contract_start, contract_end, hourly_rate, overtime_rate, is_active")
      .eq("contractor_id", contractor_id)
      .maybeSingle();

    if (fetchError) {
      console.error("[ContractInfo] Error fetching after upsert:", fetchError);
      throw new Error(`Failed to verify contract info update: ${fetchError.message}`);
    }

    if (!fetchedData) {
      throw new Error("Failed to save contract info - record not found after save");
    }

    console.log("[ContractInfo] Contract info saved successfully (fetched):", contractor_id);
    return fetchedData as ContractInfoUpdateResult;
  }

  console.log("[ContractInfo] Contract info saved successfully:", contractor_id);
  return data as ContractInfoUpdateResult;
}

/**
 * Get contract information for a contractor
 */
export async function getContractInfo(
  contractorId: string
): Promise<ContractInfoUpdateResult | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("contractors")
    .select("contractor_id, contract_start, contract_end, hourly_rate, overtime_rate, is_active")
    .eq("contractor_id", contractorId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[ContractInfo] Error fetching contract info:", error);
    throw new Error(`Failed to fetch contract info: ${error.message}`);
  }

  return data as ContractInfoUpdateResult | null;
}
