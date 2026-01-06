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
import { Employee } from "../lib/types";
import { format } from "date-fns";
import { Search, Users } from "lucide-react";

interface EmployeeDirectoryProps {
  employees: Employee[];
  onEmployeeClick: (employee: Employee) => void;
}

type SortField = keyof Employee;
type SortDirection = "asc" | "desc";

export function EmployeeDirectory({
  employees,
  onEmployeeClick,
}: EmployeeDirectoryProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
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
    let result = employees.filter((employee) => {
      const matchesSearch =
        searchQuery === "" ||
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.reportingManager.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });

    if (sortField) {
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [employees, searchQuery, sortField, sortDirection]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="p-4 border border-gray-200 rounded-[14px] bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by name or manager..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  onClick={() => handleSort("name")}
                >
                  Name
                  {sortField === "name" && (
                    <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableHead>
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("contractStartDate")}
                >
                  Contract Start Date
                  {sortField === "contractStartDate" && (
                    <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableHead>
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("contractEndDate")}
                >
                  Contract End Date
                  {sortField === "contractEndDate" && (
                    <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
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
                  onClick={() => handleSort("reportingManager")}
                >
                  Reporting Manager
                  {sortField === "reportingManager" && (
                    <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Users className="w-16 h-16 mb-3" strokeWidth={1.5} />
                      <div className="text-gray-600 font-medium">No employees found</div>
                      <div className="text-sm text-gray-500 mt-1">Try adjusting your search</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedEmployees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="h-16 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => onEmployeeClick(employee)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 bg-purple-100 text-purple-700">
                          <AvatarFallback className="bg-purple-100 text-purple-700 font-medium">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.position}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {format(employee.contractStartDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {format(employee.contractEndDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-gray-700">{employee.rateType}</TableCell>
                    <TableCell className="text-right text-gray-700">
                      {employee.hourlyRate ? `$${employee.hourlyRate}/hr` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      {employee.fixedRate
                        ? `$${employee.fixedRate.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-gray-700">{employee.contractType}</TableCell>
                    <TableCell className="text-gray-500">{employee.reportingManager}</TableCell>
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