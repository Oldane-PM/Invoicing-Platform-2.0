/**
 * Contractor Profile Repository
 * 
 * Handles database operations for contractor profile (Personal + Banking info).
 * Contract information is read-only and fetched from the contracts table.
 */

import { getSupabaseClient } from "../client";

// =============================================
// TYPES
// =============================================

export interface ContractorProfileData {
  user_id: string;
  
  // Personal Information
  full_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  state_parish: string | null;
  country: string | null;
  postal_code: string | null;
  email: string | null;
  phone: string | null;
  
  // Banking Details
  bank_name: string | null;
  bank_address: string | null;
  bank_account_name: string | null;
  swift_code: string | null;
  bank_routing_number: string | null;
  account_type: string | null;
  currency: string | null;
  bank_account_number: string | null;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface ContractInfo {
  contract_id: string;
  project_name: string | null;
  contract_type: string | null;
  start_date: string | null;
  end_date: string | null;
  hourly_rate: number | null;
  overtime_rate: number | null;
  position: string | null;
  department: string | null;
  reporting_manager_id: string | null;  // Manager's UUID for reliable identification
  reporting_manager_name: string | null;
}

export interface FullContractorProfile {
  profile: ContractorProfileData;
  contract: ContractInfo | null;
}

// Partial update type for saving specific tabs
export type ContractorProfilePatch = Partial<Omit<ContractorProfileData, 'user_id' | 'created_at' | 'updated_at'>>;

// =============================================
// FETCH OPERATIONS
// =============================================

/**
 * Get contractor profile by user ID
 * Returns null if no profile exists yet (new contractor)
 */
export async function getContractorProfile(userId: string): Promise<ContractorProfileData | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("contractor_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) {
    // PGRST116 = no rows found, which is okay for new contractors
    if (error.code !== "PGRST116") {
      console.error("[contractorProfile.repo] Error fetching profile:", error);
      throw error;
    }
    return null;
  }
  
  return data;
}

/**
 * Get contract information for a contractor (read-only)
 * Fetches from contracts + contractors tables
 */
export async function getContractInfo(userId: string): Promise<ContractInfo | null> {
  const supabase = getSupabaseClient();
  
  // First get from contractors table (has rates)
  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select(`
      contractor_id,
      hourly_rate,
      overtime_rate,
      default_project_name,
      contract_start,
      contract_end,
      is_active
    `)
    .eq("contractor_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  
  if (contractorError && contractorError.code !== "PGRST116") {
    console.error("[contractorProfile.repo] Error fetching contractor:", contractorError);
  }
  
  // Then get active contract
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(`
      id,
      project_name,
      contract_type,
      start_date,
      end_date
    `)
    .eq("contractor_user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (contractError && contractError.code !== "PGRST116") {
    console.error("[contractorProfile.repo] Error fetching contract:", contractError);
  }
  
  // Try to get manager ID and name from manager_teams
  let reportingManagerId: string | null = null;
  let reportingManagerName: string | null = null;
  const { data: teamData } = await supabase
    .from("manager_teams")
    .select(`
      manager_id,
      profiles!manager_teams_manager_id_fkey(full_name)
    `)
    .eq("contractor_id", userId)
    .limit(1)
    .maybeSingle();
  
  if (teamData) {
    reportingManagerId = teamData.manager_id || null;
    reportingManagerName = (teamData.profiles as any)?.full_name || null;
  }
  
  // If we have no data at all, return null
  if (!contractor && !contract) {
    return null;
  }
  
  return {
    contract_id: contract?.id || "",
    project_name: contract?.project_name || contractor?.default_project_name || null,
    contract_type: contract?.contract_type || "hourly",
    start_date: contract?.start_date || contractor?.contract_start || null,
    end_date: contract?.end_date || contractor?.contract_end || null,
    hourly_rate: contractor?.hourly_rate || null,
    overtime_rate: contractor?.overtime_rate || null,
    position: null, // Not currently stored
    department: null, // Not currently stored
    reporting_manager_id: reportingManagerId,
    reporting_manager_name: reportingManagerName,
  };
}

/**
 * Get full contractor profile (profile + contract info)
 */
export async function getFullContractorProfile(userId: string): Promise<FullContractorProfile> {
  const [profile, contract] = await Promise.all([
    getContractorProfile(userId),
    getContractInfo(userId),
  ]);
  
  // If no profile exists, return empty profile with user_id
  const profileData: ContractorProfileData = profile || {
    user_id: userId,
    full_name: null,
    address_line1: null,
    address_line2: null,
    state_parish: null,
    country: null,
    postal_code: null,
    email: null,
    phone: null,
    bank_name: null,
    bank_address: null,
    bank_account_name: null,
    swift_code: null,
    bank_routing_number: null,
    account_type: "Checking",
    currency: "USD",
    bank_account_number: null,
  };
  
  return {
    profile: profileData,
    contract,
  };
}

// =============================================
// SAVE OPERATIONS
// =============================================

/**
 * Upsert contractor profile (create or update)
 * Only updates the fields provided in the patch
 */
export async function upsertContractorProfile(
  userId: string,
  patch: ContractorProfilePatch
): Promise<ContractorProfileData> {
  const supabase = getSupabaseClient();
  
  console.log("[contractorProfile.repo] Upserting profile for:", userId, patch);
  
  const { data, error } = await supabase
    .from("contractor_profiles")
    .upsert(
      {
        user_id: userId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();
  
  if (error) {
    console.error("[contractorProfile.repo] Error upserting profile:", error);
    throw error;
  }
  
  console.log("[contractorProfile.repo] Profile saved:", data.user_id);
  return data;
}
