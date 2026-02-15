/**
 * Project Assignments Repository
 *
 * Handles contractor and manager assignments to projects.
 * Only accesses Supabase - no direct DB access from UI components.
 */

import { getSupabaseClient } from "../client";
import type { ProjectContractor, ContractorProject } from "../../types";

/**
 * List all contractors assigned to a project
 */
export async function listProjectContractors(
  projectId: string
): Promise<ProjectContractor[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("project_assignments")
    .select(`
      id,
      contractor_id,
      created_at,
      contractor:profiles!project_assignments_contractor_id_fkey(id, full_name, email)
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projectAssignments.repo] listProjectContractors error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to fetch project contractors: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.contractor?.id || row.contractor_id,
    fullName: row.contractor?.full_name || "Unknown",
    email: row.contractor?.email || "",
    assignedAt: row.created_at,
  }));
}

/**
 * Assign a contractor to a project (upsert - ignores if already assigned)
 */
export async function assignContractorToProject(
  projectId: string,
  contractorId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("project_assignments")
    .upsert(
      {
        project_id: projectId,
        contractor_id: contractorId,
      },
      {
        onConflict: "project_id,contractor_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    console.error("[projectAssignments.repo] assignContractorToProject error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to assign contractor to project: ${error.message}`);
  }
}

/**
 * Remove a contractor from a project
 */
export async function removeContractorFromProject(
  projectId: string,
  contractorId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("project_assignments")
    .delete()
    .eq("project_id", projectId)
    .eq("contractor_id", contractorId);

  if (error) {
    console.error("[projectAssignments.repo] removeContractorFromProject error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to remove contractor from project: ${error.message}`);
  }
}

/**
 * Assign a manager to a project
 */
export async function assignManagerToProject(
  projectId: string,
  managerId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("projects")
    .update({
      manager_id: managerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    console.error("[projectAssignments.repo] assignManagerToProject error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to assign manager to project: ${error.message}`);
  }
}

/**
 * Remove manager from a project (set to null)
 */
export async function removeManagerFromProject(projectId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("projects")
    .update({
      manager_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    console.error("[projectAssignments.repo] removeManagerFromProject error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to remove manager from project: ${error.message}`);
  }
}

/**
 * List all enabled projects assigned to a contractor
 * Used for the contractor's project dropdown when submitting hours
 */
export async function listContractorAssignedProjects(
  contractorId: string
): Promise<ContractorProject[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("project_assignments")
    .select(`
      project_id,
      project:projects!project_assignments_project_id_fkey(id, name, client, is_enabled)
    `)
    .eq("contractor_id", contractorId);

  if (error) {
    console.error("[projectAssignments.repo] listContractorAssignedProjects error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to fetch contractor projects: ${error.message}`);
  }

  // Filter to only enabled projects and map to ContractorProject type
  return (data || [])
    .filter((row: any) => row.project?.is_enabled === true)
    .map((row: any) => ({
      id: row.project?.id || row.project_id,
      name: row.project?.name || "Unknown Project",
      client: row.project?.client || "",
    }));
}

/**
 * List all contractors available for assignment (not already assigned to project)
 */
export async function listAvailableContractors(
  projectId: string
): Promise<{ id: string; fullName: string; email: string }[]> {
  const supabase = getSupabaseClient();

  // First get contractors already assigned to this project
  const { data: assigned, error: assignedError } = await supabase
    .from("project_assignments")
    .select("contractor_id")
    .eq("project_id", projectId);

  if (assignedError) {
    console.error("[projectAssignments.repo] listAvailableContractors (assigned) error:", {
      message: assignedError.message,
      details: assignedError.details,
      hint: assignedError.hint,
      code: assignedError.code,
    });
    throw new Error(`Failed to fetch assigned contractors: ${assignedError.message}`);
  }

  const assignedIds = (assigned || []).map((a: any) => a.contractor_id);

  // Get all contractors (case-insensitive role check)
  let query = supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("role", "CONTRACTOR");

  // Exclude already assigned contractors
  if (assignedIds.length > 0) {
    query = query.not("id", "in", `(${assignedIds.join(",")})`);
  }

  const { data, error } = await query.order("full_name", { ascending: true });

  if (error) {
    console.error("[projectAssignments.repo] listAvailableContractors error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to fetch available contractors: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    fullName: row.full_name || "Unknown",
    email: row.email || "",
  }));
}

/**
 * List all managers available for assignment
 */
export async function listAvailableManagers(): Promise<
  { id: string; fullName: string; email: string }[]
> {
  const supabase = getSupabaseClient();

  // Case-insensitive role check
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("role", "MANAGER")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[projectAssignments.repo] listAvailableManagers error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to fetch available managers: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    fullName: row.full_name || "Unknown",
    email: row.email || "",
  }));
}
