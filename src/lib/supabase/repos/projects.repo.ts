/**
 * Projects Repository
 *
 * Handles fetching and creating project data for the admin projects page.
 * Only accesses Supabase - no direct DB access from UI components.
 */

import { getSupabaseClient } from "../client";
import type { ProjectRow, CreateProjectInput, UpdateProjectInput } from "../../types";

interface ListProjectsParams {
  search?: string;
  enabled?: boolean; // Filter by enabled status
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "client" | "start_date" | "created_at";
  sortDir?: "asc" | "desc";
}

interface ListProjectsResult {
  rows: ProjectRow[];
  total: number;
}

/**
 * List projects with pagination, search, sorting, and enabled filter
 */
export async function listProjects({
  search = "",
  enabled,
  page = 1,
  pageSize = 20,
  sortBy = "created_at",
  sortDir = "desc",
}: ListProjectsParams): Promise<ListProjectsResult> {
  const supabase = getSupabaseClient();
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  // Try full query with joins first (requires migration to be applied)
  // Falls back to simple query if joins fail (pre-migration state)
  let useSimpleQuery = false;

  try {
    // Build query with manager join and contractor count subquery
    let query = supabase
      .from("projects")
      .select(`
        *,
        manager:profiles!projects_manager_id_fkey(id, full_name, email),
        project_assignments(count)
      `, { count: "exact" });

    // Apply search filter (by name or client)
    if (search) {
      query = query.or(`name.ilike.%${search}%,client.ilike.%${search}%`);
    }

    // Apply enabled filter (only if column exists)
    if (enabled !== undefined) {
      query = query.eq("is_enabled", enabled);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDir === "asc" });

    // Apply pagination
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) {
      // If 500 error, likely the joins don't exist yet - fall back to simple query
      if (error.code === "42P01" || error.message?.includes("relation") || error.code === "PGRST" || !error.code) {
        console.warn("[projects.repo] Full query failed (schema may not be migrated), falling back to simple query");
        useSimpleQuery = true;
      } else {
        console.error("[projects.repo] listProjects error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }
    }

    if (!useSimpleQuery && data) {
      // Map database columns (snake_case) to TypeScript interface (camelCase)
      const rows: ProjectRow[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        client: row.client,
        description: row.description,
        resourceCount: row.resource_count,
        startDate: row.start_date,
        endDate: row.end_date,
        createdAt: row.created_at,
        // New fields
        managerId: row.manager_id || null,
        managerName: row.manager?.full_name || null,
        managerEmail: row.manager?.email || null,
        isEnabled: row.is_enabled ?? true,
        contractorCount: row.project_assignments?.[0]?.count || 0,
      }));

      return {
        rows,
        total: count || 0,
      };
    }
  } catch (e) {
    console.warn("[projects.repo] Query with joins failed, falling back to simple query", e);
    useSimpleQuery = true;
  }

  // Fallback: Simple query without joins (works before migration)
  let simpleQuery = supabase
    .from("projects")
    .select("*", { count: "exact" });

  if (search) {
    simpleQuery = simpleQuery.or(`name.ilike.%${search}%,client.ilike.%${search}%`);
  }

  simpleQuery = simpleQuery.order(sortBy, { ascending: sortDir === "asc" });
  simpleQuery = simpleQuery.range(start, end);

  const { data, error, count } = await simpleQuery;

  if (error) {
    console.error("[projects.repo] listProjects (simple) error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  const rows: ProjectRow[] = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    client: row.client,
    description: row.description,
    resourceCount: row.resource_count,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    // Default values for new fields (migration not applied yet)
    managerId: row.manager_id || null,
    managerName: null,
    managerEmail: null,
    isEnabled: row.is_enabled ?? true,
    contractorCount: 0,
  }));

  return {
    rows,
    total: count || 0,
  };
}

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: string): Promise<ProjectRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      manager:profiles!projects_manager_id_fkey(id, full_name, email),
      project_assignments(count)
    `)
    .eq("id", projectId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    console.error("[projects.repo] getProjectById error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    client: data.client,
    description: data.description,
    resourceCount: data.resource_count,
    startDate: data.start_date,
    endDate: data.end_date,
    createdAt: data.created_at,
    managerId: data.manager_id,
    managerName: data.manager?.full_name || null,
    managerEmail: data.manager?.email || null,
    isEnabled: data.is_enabled ?? true,
    contractorCount: data.project_assignments?.[0]?.count || 0,
  };
}

/**
 * Create a new project
 */
export async function createProject(
  input: CreateProjectInput
): Promise<ProjectRow> {
  const supabase = getSupabaseClient();

  // Map TypeScript interface (camelCase) to database columns (snake_case)
  const insertData = {
    name: input.name,
    client: input.client,
    description: input.description ?? null,
    resource_count: input.resourceCount ?? 0,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
    is_enabled: true, // New projects are enabled by default
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(insertData)
    .select(`
      *,
      manager:profiles!projects_manager_id_fkey(id, full_name, email),
      project_assignments(count)
    `)
    .single();

  if (error) {
    console.error("[projects.repo] createProject error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to create project: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to create project: No data returned");
  }

  // Map response to TypeScript interface
  return {
    id: data.id,
    name: data.name,
    client: data.client,
    description: data.description,
    resourceCount: data.resource_count,
    startDate: data.start_date,
    endDate: data.end_date,
    createdAt: data.created_at,
    managerId: data.manager_id,
    managerName: data.manager?.full_name || null,
    managerEmail: data.manager?.email || null,
    isEnabled: data.is_enabled ?? true,
    contractorCount: data.project_assignments?.[0]?.count || 0,
  };
}

/**
 * Update an existing project
 */
export async function updateProject(
  input: UpdateProjectInput
): Promise<ProjectRow> {
  const supabase = getSupabaseClient();

  // Map TypeScript interface (camelCase) to database columns (snake_case)
  const updateData = {
    name: input.name,
    client: input.client,
    description: input.description ?? null,
    resource_count: input.resourceCount,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("projects")
    .update(updateData)
    .eq("id", input.id)
    .select(`
      *,
      manager:profiles!projects_manager_id_fkey(id, full_name, email),
      project_assignments(count)
    `)
    .single();

  if (error) {
    console.error("[projects.repo] updateProject error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to update project: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to update project: No data returned");
  }

  // Map response to TypeScript interface
  return {
    id: data.id,
    name: data.name,
    client: data.client,
    description: data.description,
    resourceCount: data.resource_count,
    startDate: data.start_date,
    endDate: data.end_date,
    createdAt: data.created_at,
    managerId: data.manager_id,
    managerName: data.manager?.full_name || null,
    managerEmail: data.manager?.email || null,
    isEnabled: data.is_enabled ?? true,
    contractorCount: data.project_assignments?.[0]?.count || 0,
  };
}

/**
 * Enable or disable a project
 */
export async function setProjectEnabled(
  projectId: string,
  enabled: boolean
): Promise<ProjectRow> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .update({
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select(`
      *,
      manager:profiles!projects_manager_id_fkey(id, full_name, email),
      project_assignments(count)
    `)
    .single();

  if (error) {
    console.error("[projects.repo] setProjectEnabled error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to ${enabled ? "enable" : "disable"} project: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Failed to ${enabled ? "enable" : "disable"} project: No data returned`);
  }

  return {
    id: data.id,
    name: data.name,
    client: data.client,
    description: data.description,
    resourceCount: data.resource_count,
    startDate: data.start_date,
    endDate: data.end_date,
    createdAt: data.created_at,
    managerId: data.manager_id,
    managerName: data.manager?.full_name || null,
    managerEmail: data.manager?.email || null,
    isEnabled: data.is_enabled ?? true,
    contractorCount: data.project_assignments?.[0]?.count || 0,
  };
}
