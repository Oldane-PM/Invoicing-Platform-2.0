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
 * Helper to select the active or latest completed work order for a contractor
 */
function getCurrentWorkOrder(workOrders: any[]): any | null {
  if (!workOrders || workOrders.length === 0) return null;

  const todayStr = new Date().toISOString().substring(0, 10);

  // 1. Try to find an active one (start_date <= today and end_date >= today)
  const activeOrder = workOrders.find(
    (wo: any) => wo.start_date <= todayStr && wo.end_date >= todayStr
  );
  if (activeOrder) return activeOrder;

  // 2. If no active one, find the one with the latest start_date
  return [...workOrders].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] || null;
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
    .in("id", contractorIds)
    .ilike("role", "contractor");

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
    logSupabaseError(
      "listTeamContractors - contractors query",
      contractorsError
    );
    // Don't throw - contractors table may be empty, we can still show profiles
  }

  // Step 3.5: Get completed system work orders for these contractors
  const { data: workOrdersData, error: workOrdersError } = await supabase
    .from("system_work_orders")
    .select("contractor_user_id, pay_type, pay_amount, start_date, end_date, status")
    .in("contractor_user_id", contractorIds)
    .eq("status", "COMPLETED");

  if (workOrdersError) {
    logSupabaseError(
      "listTeamContractors - system_work_orders query",
      workOrdersError
    );
  }

  // Step 3.6: Get contractor profiles (onboarding data)
  const { data: contractorProfiles, error: cpError } = await supabase
    .from("contractor_profiles")
    .select("user_id, onboarding_role, onboarding_rate, onboarding_rate_type, contract_start_date, contract_end_date")
    .in("user_id", contractorIds);

  if (cpError) {
    logSupabaseError("listTeamContractors - contractor_profiles query", cpError);
  }
  
  // Step 3.7: Fetch active contracts (fixed rate details)
  const { data: activeContracts, error: acError } = await supabase
    .from("contracts")
    .select("contractor_user_id, contract_type, fixed_monthly_rate, start_date, end_date, project_name")
    .in("contractor_user_id", contractorIds)
    .eq("is_active", true);

  if (acError) {
    logSupabaseError("listTeamContractors - contracts query", acError);
  }

  // Step 4: Merge results
  const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
  const contractorsMap = new Map(
    (contractorsData || []).map((c: any) => [c.contractor_id, c])
  );
  const contractorProfilesMap = new Map((contractorProfiles || []).map((cp: any) => [cp.user_id, cp]));
  const activeContractsMap = new Map((activeContracts || []).map((ac: any) => [ac.contractor_user_id, ac]));

  // Group work orders by contractor
  const workOrdersMap = new Map<string, any[]>();
  (workOrdersData || []).forEach((wo: any) => {
    const list = workOrdersMap.get(wo.contractor_user_id) || [];
    list.push(wo);
    workOrdersMap.set(wo.contractor_user_id, list);
  });

  return contractorIds
    .map((contractorId: string) => {
      const profile = profilesMap.get(contractorId);
      const contractor = contractorsMap.get(contractorId);
      const contractorWorkOrders = workOrdersMap.get(contractorId) || [];
      const currentWorkOrder = getCurrentWorkOrder(contractorWorkOrders);
      const cpData = contractorProfilesMap.get(contractorId);
      const activeContract = activeContractsMap.get(contractorId);

      // If no profile found (shouldn't happen due to FKs but possible with bad RLS), skip
      if (!profile) return null;

      const contractStart = cpData?.contract_start_date || activeContract?.start_date || (currentWorkOrder ? currentWorkOrder.start_date : (contractor?.contract_start || null));
      const contractEnd = cpData?.contract_end_date || activeContract?.end_date || (currentWorkOrder ? currentWorkOrder.end_date : (contractor?.contract_end || null));

      let rateType = "Hourly";
      if (cpData?.onboarding_rate_type === "fixed") {
        rateType = "Fixed";
      } else if (cpData?.onboarding_rate_type === "hourly") {
        rateType = "Hourly";
      } else if (activeContract?.contract_type === "fixed") {
        rateType = "Fixed";
      } else if (activeContract?.contract_type === "hourly") {
        rateType = "Hourly";
      } else if (currentWorkOrder) {
        rateType = currentWorkOrder.pay_type;
      }

      let hourlyRate = 0;
      if (cpData?.onboarding_rate != null) {
        hourlyRate = cpData.onboarding_rate;
      } else if (activeContract?.contract_type === "fixed" && activeContract?.fixed_monthly_rate != null) {
        hourlyRate = activeContract.fixed_monthly_rate;
      } else if (currentWorkOrder) {
        hourlyRate = currentWorkOrder.pay_amount;
      } else if (contractor?.hourly_rate != null) {
        hourlyRate = contractor.hourly_rate;
      }

      const overtimeRate = rateType === "Hourly" ? hourlyRate * 1.5 : (contractor?.overtime_rate || 0);

      return {
        id: contractorId,
        fullName: profile?.full_name || "Unknown",
        email: profile?.email || "",
        hourlyRate,
        overtimeRate,
        projectName: activeContract?.project_name || contractor?.default_project_name || null,
        contractType: rateType,
        contractStart,
        contractEnd,
        isActive: contractor?.is_active ?? true,
      };
    })
    .filter((c: TeamContractor | null): c is TeamContractor => c !== null);
}

/**
 * List all contractors on the platform
 */
export async function listAllContractors(): Promise<TeamContractor[]> {
  const supabase = getSupabaseClient();
  const sessionResponse = await supabase.auth.getSession();
  const token = sessionResponse?.data?.session?.access_token;
  
  const baseUrl = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}/api/users/contractors`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to fetch contractors" }));
    throw new Error(errorData.error || "Failed to fetch contractors");
  }

  return response.json();
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

  console.log(
    "[team.repo] getAvailableContractors called for manager:",
    managerId
  );

  // Step 1: Get IDs of contractors already in team
  const { data: teamData, error: teamError } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  if (teamError) {
    logSupabaseError(
      "getAvailableContractors - manager_teams query",
      teamError
    );
    throw new Error(`Failed to fetch team: ${teamError.message}`);
  }

  const existingContractorIds = new Set(
    (teamData || []).map((t: any) => t.contractor_id)
  );
  console.log(
    "[team.repo] Existing team contractor IDs:",
    Array.from(existingContractorIds)
  );

  // Step 2: Get all profiles with role='CONTRACTOR'
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .ilike("role", "contractor")
    .limit(25);

  if (profilesError) {
    logSupabaseError("getAvailableContractors - profiles query", profilesError);
    throw new Error(`Failed to fetch contractors: ${profilesError.message}`);
  }

  console.log(
    "[team.repo] Found contractor profiles:",
    profilesData?.length || 0,
    profilesData
  );

  // Step 3: Filter out contractors already in team
  const available = (profilesData || [])
    .filter((p: any) => !existingContractorIds.has(p.id))
    .map((p: any) => ({
      id: p.id,
      fullName: p.full_name || "Unknown",
      email: p.email || "",
    }));

  console.log(
    "[team.repo] Available contractors after filtering:",
    available.length
  );
  return available;
}

/**
 * Search contractors (for add-to-team dialog)
 * Returns contractors not currently in manager's team, filtered by search query
 */
export async function searchContractors(
  managerId: string,
  query: string
): Promise<AvailableContractor[]> {
  const supabase = getSupabaseClient();

  console.log("[team.repo] searchContractors called:", { managerId, query });

  // Step 1: Get IDs of contractors already in team
  const { data: teamData, error: teamError } = await supabase
    .from("manager_teams")
    .select("contractor_id")
    .eq("manager_id", managerId);

  if (teamError) {
    logSupabaseError("searchContractors - manager_teams query", teamError);
    throw new Error(`Failed to fetch team: ${teamError.message}`);
  }

  const existingContractorIds = new Set(
    (teamData || []).map((t: any) => t.contractor_id)
  );

  // Step 2: Search profiles with role='CONTRACTOR'
  let profilesQuery = supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .ilike("role", "contractor");

  // Add search filter if query provided
  if (query.trim()) {
    const searchTerm = query.trim();
    profilesQuery = profilesQuery.or(
      `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
    );
  }

  const { data: profilesData, error: profilesError } =
    await profilesQuery.limit(25);

  if (profilesError) {
    logSupabaseError("searchContractors - profiles query", profilesError);
    throw new Error(`Failed to search contractors: ${profilesError.message}`);
  }

  console.log(
    "[team.repo] Search results:",
    profilesData?.length || 0,
    profilesData
  );

  // Step 3: Filter out contractors already in team
  // We do NOT strictly check the 'contractors' table here.
  // If a user has a profile with role='CONTRACTOR', they can be added.
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
