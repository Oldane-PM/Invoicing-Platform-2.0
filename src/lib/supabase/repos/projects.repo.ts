/**
 * Projects Repository
 *
 * Handles fetching and creating project data for the admin projects page.
 * Only accesses Supabase - no direct DB access from UI components.
 */

import { getSupabaseClient } from "../client";
import type { ProjectRow, CreateProjectInput } from "../../types";

interface ListProjectsParams {
  search?: string;
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
 * List projects with pagination, search, and sorting
 */
export async function listProjects({
  search = "",
  page = 1,
  pageSize = 20,
  sortBy = "created_at",
  sortDir = "desc",
}: ListProjectsParams): Promise<ListProjectsResult> {
  const supabase = getSupabaseClient();
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  // Build query
  let query = supabase
    .from("projects")
    .select("*", { count: "exact" });

  // Apply search filter (by name or client)
  if (search) {
    query = query.or(`name.ilike.%${search}%,client.ilike.%${search}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDir === "asc" });

  // Apply pagination
  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) {
    console.error("[projects.repo] listProjects error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  // Map database columns (snake_case) to TypeScript interface (camelCase)
  const rows: ProjectRow[] = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    client: row.client,
    description: row.description,
    resourceCount: row.resource_count,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  }));

  return {
    rows,
    total: count || 0,
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
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(insertData)
    .select()
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
  };
}
