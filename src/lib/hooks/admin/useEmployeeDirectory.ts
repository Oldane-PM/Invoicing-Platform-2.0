/**
 * useEmployeeDirectory Hook
 *
 * Provides employee directory data and operations for admin users.
 * Uses react-query for caching and state management.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEmployees } from "../../supabase/repos/employeeDirectory.repo";
import type { EmployeeDirectoryRow } from "../../types";
import { QUERY_KEYS } from "../queryKeys";

interface UseEmployeeDirectoryResult {
  data: EmployeeDirectoryRow[] | undefined;
  isLoading: boolean;
  error: Error | null;
  search: string;
  setSearch: (search: string) => void;
  page: number;
  setPage: (page: number) => void;
  sortBy:
    | "full_name"
    | "contract_start"
    | "contract_end"
    | "hourly_rate"
    | "fixed_rate"
    | "manager_name";
  setSortBy: (
    sortBy:
      | "full_name"
      | "contract_start"
      | "contract_end"
      | "hourly_rate"
      | "fixed_rate"
      | "manager_name"
  ) => void;
  sortDir: "asc" | "desc";
  setSortDir: (sortDir: "asc" | "desc") => void;
  total: number;
  refetch: () => void;
}

export function useEmployeeDirectory(): UseEmployeeDirectoryResult {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<
    | "full_name"
    | "contract_start"
    | "contract_end"
    | "hourly_rate"
    | "fixed_rate"
    | "manager_name"
  >("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  const query = useQuery({
    queryKey: [QUERY_KEYS.EMPLOYEE_DIRECTORY, debouncedSearch, page, sortBy, sortDir],
    queryFn: () =>
      listEmployees({
        search: debouncedSearch,
        page,
        pageSize: 20,
        sortBy,
        sortDir,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    data: query.data?.rows,
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
    total: query.data?.total || 0,
    refetch: query.refetch,
  };
}
