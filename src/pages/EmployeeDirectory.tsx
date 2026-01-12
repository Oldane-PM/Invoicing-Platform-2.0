import * as React from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useEmployeeDirectory } from "../lib/hooks/admin/useEmployeeDirectory";
import { format } from "date-fns";
import { Search, Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";

import { EmployeeDirectoryRow } from "../lib/types";

interface EmployeeDirectoryProps {
  onEmployeeClick: (employee: EmployeeDirectoryRow) => void;
}

type SortField = "full_name" | "contract_start" | "contract_end" | "hourly_rate" | "fixed_rate" | "manager_name";
type SortDirection = "asc" | "desc";

export function EmployeeDirectory({ onEmployeeClick }: EmployeeDirectoryProps) {
  const {
    data: employees,
    isLoading,
    error,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    refetch,
  } = useEmployeeDirectory();

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredAndSortedEmployees = React.useMemo(() => {
    if (!employees) return [];

    // Client-side sorting for manager_name if needed
    if (sortBy === "manager_name") {
      return [...employees].sort((a, b) => {
        const aValue = a.reporting_manager_name || "";
        const bValue = b.reporting_manager_name || "";
        if (aValue < bValue) return sortDir === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return employees;
  }, [employees, sortBy, sortDir]);

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load employee directory. {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="p-4 border border-gray-200 rounded-[14px] bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by contractor name or manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 bg-gray-50 border-gray-200 rounded-lg"
          />
        </div>
      </Card>

      {/* Employee Table */}
      <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50">
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("full_name")}
                >
                  Name + Role
                  {sortBy === "full_name" && (
                    <span className="ml-2">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("contract_start")}
                >
                  Contract Start
                  {sortBy === "contract_start" && (
                    <span className="ml-2">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("contract_end")}
                >
                  Contract End
                  {sortBy === "contract_end" && (
                    <span className="ml-2">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Rate Type
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium text-right">
                  Hourly Rate
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium text-right">
                  Fixed Rate
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Contract Type
                </TableHead>
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("manager_name")}
                >
                  Reporting Manager
                  {sortBy === "manager_name" && (
                    <span className="ml-2">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                      <div className="text-gray-600 font-medium mt-3">
                        Loading employees...
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Users className="w-16 h-16 mb-3" strokeWidth={1.5} />
                      <div className="text-gray-600 font-medium">
                        No employees found
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Try adjusting your search
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedEmployees.map((employee) => (
                  <TableRow
                    key={employee.contractor_id}
                    className="h-16 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => onEmployeeClick(employee)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 bg-purple-100 text-purple-700">
                          <AvatarFallback className="bg-purple-100 text-purple-700 font-medium">
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {employee.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.role}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {employee.contract_start
                        ? format(
                            new Date(employee.contract_start),
                            "MMM d, yyyy"
                          )
                        : "-"}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {employee.contract_end
                        ? format(new Date(employee.contract_end), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {employee.rate_type || "-"}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      {employee.hourly_rate
                        ? `$${employee.hourly_rate}/hr`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      {employee.fixed_rate
                        ? `$${employee.fixed_rate.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {employee.contract_type || "-"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {employee.reporting_manager_name || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
