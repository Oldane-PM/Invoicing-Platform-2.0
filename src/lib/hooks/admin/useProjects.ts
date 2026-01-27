/**
 * useProjects Hook
 *
 * Provides project data and operations for admin users.
 * Uses react-query for caching and state management.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProjects, createProject, updateProject } from "../../supabase/repos/projects.repo";
import type { ProjectRow, CreateProjectInput, UpdateProjectInput } from "../../types";
import { QUERY_KEYS } from "../queryKeys";

type SortField = "name" | "client" | "start_date" | "created_at";

interface UseProjectsResult {
  rows: ProjectRow[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  search: string;
  setSearch: (search: string) => void;
  page: number;
  setPage: (page: number) => void;
  sortBy: SortField;
  setSortBy: (sortBy: SortField) => void;
  sortDir: "asc" | "desc";
  setSortDir: (sortDir: "asc" | "desc") => void;
  refetch: () => void;
  createProject: (input: CreateProjectInput) => Promise<ProjectRow>;
  creating: boolean;
  createError: Error | null;
  updateProject: (input: UpdateProjectInput) => Promise<ProjectRow>;
  updating: boolean;
  updateError: Error | null;
}

export function useProjects(): UseProjectsResult {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Debounced search (300ms)
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      // Reset to page 1 when search changes
      if (page !== 1) setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, page]);

  // Fetch projects query
  const query = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_PROJECTS, debouncedSearch, page, sortBy, sortDir],
    queryFn: () =>
      listProjects({
        search: debouncedSearch,
        page,
        pageSize: 20,
        sortBy,
        sortDir,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_PROJECTS] });
    },
    onError: (error: Error) => {
      console.error("[useProjects] createProject error:", error.message);
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: updateProject,
    onSuccess: () => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_PROJECTS] });
    },
    onError: (error: Error) => {
      console.error("[useProjects] updateProject error:", error.message);
    },
  });

  return {
    rows: query.data?.rows || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    search,
    setSearch,
    page,
    setPage,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    refetch: query.refetch,
    createProject: createMutation.mutateAsync,
    creating: createMutation.isPending,
    createError: createMutation.error as Error | null,
    updateProject: updateMutation.mutateAsync,
    updating: updateMutation.isPending,
    updateError: updateMutation.error as Error | null,
  };
}
