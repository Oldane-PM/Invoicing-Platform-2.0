/**
 * Team Repository
 *
 * Handles all Supabase queries related to manager teams.
 * ONLY this file imports the Supabase client for team operations.
 *
 * Uses TWO-STEP QUERY APPROACH to avoid PostgREST join issues:
 * 1. Query manager_teams for contractor_ids
 * 2. Query profiles and contractors separately
 * 3. Merge results in code
 */

import { getSupabaseClient } from "../client";

export interface TeamContractor {
  id: string;
  fullName: string;
  email: string;
  hourlyRate: number;
  overtimeRate: number;
  projectName: string | null;
  contractType: string;
  contractStart: string | null;
  contractEnd: string | null;
  isActive: boolean;
}

export interface AvailableContractor {
  id: string;
  fullName: string;
  email: string;
}

/**
 * Helper to log Supabase errors with full details
 */
function logSupabaseError(context: string, error: any): void {
  console.error(`[team.repo] ${context}:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    error,
  });
}

/**
 * List all contractors in the manager's team
 * Uses two-step query to avoid PostgREST relationship issues
 */
export async function listTeamContractors(
  managerId: string
): Promise<TeamContractor[]> {
  const supabase = getSupabaseClient();

  // Step 1: Get contractor IDs from manager_teams
  const { data: teamData, error: teamError } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  if (teamError) {
    logSupabaseError("listTeamContractors - manager_teams query", teamError);
    throw new Error(`Failed to fetch team: ${teamError.message}`);
  }

  const contractorIds = (teamData || []).map((t: any) => t.contractor_id);

  if (contractorIds.length === 0) {
    return [];
  }

  // Step 2: Get profiles for these contractors
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", contractorIds);

  if (profilesError) {
    logSupabaseError("listTeamContractors - profiles query", profilesError);
    throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
  }

  // Step 3: Get contractor details (rates, contract info)
  const { data: contractorsData, error: contractorsError } = await supabase
    .from("contractors")
    .select(
      "contractor_id, hourly_rate, overtime_rate, default_project_name, contract_start, contract_end, is_active"
    )
    .in("contractor_id", contractorIds);

  if (contractorsError) {
    logSupabaseError("listTeamContractors - contractors query", contractorsError);
    // Don't throw - contractors table may be empty, we can still show profiles
  }

  // Step 4: Merge results
  const profilesMap = new Map(
    (profilesData || []).map((p: any) => [p.id, p])
  );
  const contractorsMap = new Map(
    (contractorsData || []).map((c: any) => [c.contractor_id, c])
  );

  return contractorIds.map((contractorId: string) => {
    const profile = profilesMap.get(contractorId);
    const contractor = contractorsMap.get(contractorId);

    return {
      id: contractorId,
      fullName: profile?.full_name || "Unknown",
      email: profile?.email || "",
      hourlyRate: contractor?.hourly_rate || 0,
      overtimeRate: contractor?.overtime_rate || 0,
      projectName: contractor?.default_project_name || null,
      contractType: "Hourly", // Default
      contractStart: contractor?.contract_start || null,
      contractEnd: contractor?.contract_end || null,
      isActive: contractor?.is_active ?? true,
    };
  });
}

/**
 * Get team size for a manager
 */
export async function getTeamSize(managerId: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from("manager_teams")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", managerId);

  if (error) {
    logSupabaseError("getTeamSize", error);
    throw new Error(`Failed to get team size: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get all contractors available to add to team
 * Returns contractors with role='CONTRACTOR' who are NOT already in this manager's team
 */
export async function getAvailableContractors(
  managerId: string
): Promise<AvailableContractor[]> {
  const supabase = getSupabaseClient();

  console.log("[team.repo] getAvailableContractors called for manager:", managerId);

  // Step 1: Get IDs of contractors already in team
  const { data: teamData, error: teamError } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  if (teamError) {
    logSupabaseError("getAvailableContractors - manager_teams query", teamError);
    throw new Error(`Failed to fetch team: ${teamError.message}`);
  }

  const existingContractorIds = new Set(
    (teamData || []).map((t: any) => t.contractor_id)
  );
  console.log("[team.repo] Existing team contractor IDs:", Array.from(existingContractorIds));

  // Step 2: Get all profiles with role='CONTRACTOR'
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("role", "CONTRACTOR")
    .limit(25);

  if (profilesError) {
    logSupabaseError("getAvailableContractors - profiles query", profilesError);
    throw new Error(`Failed to fetch contractors: ${profilesError.message}`);
  }

  console.log("[team.repo] Found contractor profiles:", profilesData?.length || 0, profilesData);

  // Step 3: Filter out contractors already in team
  const available = (profilesData || [])
    .filter((p: any) => !existingContractorIds.has(p.id))
    .map((p: any) => ({
      id: p.id,
      fullName: p.full_name || "Unknown",
      email: p.email || "",
    }));

  console.log("[team.repo] Available contractors after filtering:", available.length);
  return available;
}

/**
 * Search available contractors (for add-to-team dialog)
 * Returns contractors not currently in manager's team, filtered by search query
 */
export async function searchAvailableContractors(
  managerId: string,
  query: string
): Promise<AvailableContractor[]> {
  const supabase = getSupabaseClient();

  console.log("[team.repo] searchAvailableContractors called:", { managerId, query });

  // Step 1: Get IDs of contractors already in team
  const { data: teamData, error: teamError } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  if (teamError) {
    logSupabaseError("searchAvailableContractors - manager_teams query", teamError);
    throw new Error(`Failed to fetch team: ${teamError.message}`);
  }

  const existingContractorIds = new Set(
    (teamData || []).map((t: any) => t.contractor_id)
  );

  // Step 2: Search profiles with role='CONTRACTOR'
  let profilesQuery = supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("role", "CONTRACTOR");

  // Add search filter if query provided
  if (query.trim()) {
    const searchTerm = query.trim();
    profilesQuery = profilesQuery.or(
      `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
    );
  }

  const { data: profilesData, error: profilesError } = await profilesQuery.limit(25);

  if (profilesError) {
    logSupabaseError("searchAvailableContractors - profiles query", profilesError);
    throw new Error(`Failed to search contractors: ${profilesError.message}`);
  }

  console.log("[team.repo] Search results:", profilesData?.length || 0, profilesData);

  // Step 3: Filter out contractors already in team
  const available = (profilesData || [])
    .filter((p: any) => !existingContractorIds.has(p.id))
    .map((p: any) => ({
      id: p.id,
      fullName: p.full_name || "Unknown",
      email: p.email || "",
    }));

  console.log("[team.repo] Available after filtering:", available.length);
  return available;
}

/**
 * Add a contractor to manager's team
 */
export async function addContractorToTeam(
  managerId: string,
  contractorId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("manager_teams").insert({
    manager_id: managerId,
    contractor_id: contractorId,
  });

  if (error) {
    logSupabaseError("addContractorToTeam", error);
    throw new Error(`Failed to add contractor to team: ${error.message}`);
  }
}

/**
 * Remove a contractor from manager's team
 */
export async function removeContractorFromTeam(
  managerId: string,
  contractorId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("manager_teams")
    .delete()
    .eq("manager_id", managerId)
    .eq("contractor_id", contractorId);

  if (error) {
    logSupabaseError("removeContractorFromTeam", error);
    throw new Error(`Failed to remove contractor from team: ${error.message}`);
  }
}
