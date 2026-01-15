/**
 * Employee Directory Repository
 *
 * Handles fetching employee data for the admin directory.
 */

import { getSupabaseClient } from "../client";
import type { EmployeeDirectoryRow } from "../../types";

interface ListEmployeesParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

interface ListEmployeesResult {
  rows: EmployeeDirectoryRow[];
  total: number;
}

/**
 * List employees (contractors) with pagination, search, and sorting
 */
export async function listEmployees({
  search = "",
  page = 1,
  pageSize = 20,
  sortBy = "full_name",
  sortDir = "asc",
}: ListEmployeesParams): Promise<ListEmployeesResult> {
  const supabase = getSupabaseClient();
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  // Step 1: Base query on profiles table for role='CONTRACTOR'
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, created_at, role", { count: "exact" })
    .eq("role", "CONTRACTOR");

  // Apply search if provided
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Apply sorting to the base query where possible
  // Note: complex sorting (like by manager name) might need in-memory sort or joins,
  // but for now we'll support sorting by fields present on profiles.
  if (sortBy === "full_name" || sortBy === "email" || sortBy === "created_at") {
    query = query.order(sortBy, { ascending: sortDir === "asc" });
  } else {
    // Default sort
    query = query.order("full_name", { ascending: true });
  }

  // Apply pagination
  query = query.range(start, end);

  const { data: profiles, error: profilesError, count } = await query;

  if (profilesError) {
    console.error("[employeeDirectory.repo] listEmployees error:", profilesError);
    throw new Error(`Failed to fetch employees: ${profilesError.message}`);
  }

  if (!profiles || profiles.length === 0) {
    return { rows: [], total: 0 };
  }

  const profileIds = profiles.map((p) => p.id);

  // Step 2: Fetch related contractor details
  const { data: contractors, error: contractorsError } = await supabase
    .from("contractors")
    .select("contractor_id, hourly_rate, overtime_rate, contract_start, contract_end, is_active")
    .in("contractor_id", profileIds);

  if (contractorsError) {
    console.error("[employeeDirectory.repo] fetch contractors error:", contractorsError);
    // Continue with partial data
  }

  // Step 3: Fetch manager assignments
  const { data: managerTeams, error: managersError } = await supabase
    .from("manager_teams")
    .select("contractor_id, manager_id")
    .in("contractor_id", profileIds);

  if (managersError) {
    console.error("[employeeDirectory.repo] fetch managers error:", managersError);
  }

  // Manually fetch manager profiles to avoid FK naming issues
  const managerIds = Array.from(new Set((managerTeams || []).map(t => t.manager_id)));
  
  let managerProfilesMap = new Map();
  if (managerIds.length > 0) {
    const { data: managerProfiles, error: managerProfilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", managerIds);

    if (!managerProfilesError && managerProfiles) {
      managerProfilesMap = new Map(managerProfiles.map(p => [p.id, p.full_name]));
    } else if (managerProfilesError) {
      console.error("[employeeDirectory.repo] fetch manager profiles error:", managerProfilesError);
    }
  }

  // Map for quick lookup
  const contractorMap = new Map(
    (contractors || []).map((c) => [c.contractor_id, c])
  );
  
  // Map contractor_id -> manager_name
  const managerMap = new Map();
  (managerTeams || []).forEach((item: any) => {
    const managerName = managerProfilesMap.get(item.manager_id);
    if (managerName) {
      managerMap.set(item.contractor_id, managerName);
    }
  });

  // Step 4: Merge data
  let rows: EmployeeDirectoryRow[] = profiles.map((profile) => {
    const contractor = contractorMap.get(profile.id);
    const managerName = managerMap.get(profile.id);

    return {
      contractor_id: profile.id, // ID is used as contractor_id in UI
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      status: contractor?.is_active === false ? "Inactive" : "Active",
      joined_at: profile.created_at,
      reporting_manager_name: managerName,
      contract_start: contractor?.contract_start,
      contract_end: contractor?.contract_end,
      hourly_rate: contractor?.hourly_rate,
      fixed_rate: undefined, // Schema doesn't seem to have fixed_rate on contractors table provided in previous context but UI expects it. keeping undefined for now.
      rate_type: contractor?.hourly_rate ? "Hourly" : "Fixed", // Basic inference
      contract_type: "Contractor",
      position: "Contractor", // Placeholder as not in schema
      department: "Engineering", // Placeholder as not in schema
    };
  });

  // Handle derived field sorting (manager_name, rates) if needed
  if (sortBy === "manager_name") {
    rows.sort((a, b) => {
      const valA = a.reporting_manager_name || "";
      const valB = b.reporting_manager_name || "";
      return sortDir === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  } else if (sortBy === "hourly_rate") {
    rows.sort((a, b) => {
      const valA = a.hourly_rate || 0;
      const valB = b.hourly_rate || 0;
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }

  return {
    rows,
    total: count || 0,
  };
}
