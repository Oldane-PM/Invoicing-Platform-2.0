import * as React from "react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { toast } from "sonner";
import { Search, Users, Copy, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useTeam } from "../../lib/hooks/manager/useTeam";
import type { TeamContractor } from "../../lib/supabase/repos/team.repo";

interface ManagerTeamViewProps {
  onContractorClick?: (contractor: TeamContractor) => void;
}

export function ManagerTeamView({ onContractorClick }: ManagerTeamViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortColumn, setSortColumn] =
    React.useState<keyof TeamContractor | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc"
  );

  // Use live data hook
  const {
    contractors,
    loading,
    error,
    refetch,
  } = useTeam();

  const handleCopyEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    toast.success("Email copied to clipboard");
  };

  const handleSort = (column: keyof TeamContractor) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };


  const filteredTeam = React.useMemo(() => {
    let filtered = contractors.filter((member) => {
      const matchesSearch =
        searchQuery === "" ||
        member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.projectName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matchesSearch;
    });

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return filtered;
  }, [contractors, searchQuery, sortColumn, sortDirection]);

  return (
    <>
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Contractors ({contractors.length})
            </h2>
            <p className="text-sm text-gray-500">
              View all contractors on the platform
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                toast.success("Contractor data refreshed");
              }}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="p-4 border border-gray-200 rounded-[14px] bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name, email, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-gray-50 border-gray-200 rounded-lg"
            />
          </div>
          {searchQuery && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {filteredTeam.length}{" "}
                {filteredTeam.length === 1 ? "member" : "members"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  toast.success("Search cleared");
                }}
                className="border-gray-200 rounded-lg"
              >
                Clear
              </Button>
            </div>
          )}
        </Card>

        {/* Team Table */}
        <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
          {loading && contractors.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-600">Loading team...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-600 mb-2">Failed to load team</p>
              <p className="text-sm text-gray-500 mb-4">{error.message}</p>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead
                    className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort("fullName")}
                  >
                    Contractor Name{" "}
                    {sortColumn === "fullName" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Email
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900 text-right"
                    onClick={() => handleSort("hourlyRate")}
                  >
                    Rate{" "}
                    {sortColumn === "hourlyRate" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort("projectName")}
                  >
                    Project{" "}
                    {sortColumn === "projectName" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort("contractStart")}
                  >
                    Contract Start{" "}
                    {sortColumn === "contractStart" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort("contractEnd")}
                  >
                    Contract End{" "}
                    {sortColumn === "contractEnd" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeam.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-600">No contractors found</p>
                        <p className="text-sm text-gray-500">
                          {searchQuery
                            ? "Try adjusting your search"
                            : "No contractors are currently registered on the platform"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeam.map((member) => (
                    <TableRow 
                      key={member.id} 
                      className={`hover:bg-gray-50 ${onContractorClick ? 'cursor-pointer' : ''}`}
                      onClick={() => onContractorClick?.(member)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.fullName}
                          </div>
                          <Badge
                            variant="secondary"
                            className="mt-1 bg-gray-100 text-gray-700 border-gray-200"
                          >
                            {member.contractType || "Hourly"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">
                            {member.email}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleCopyEmail(e, member.email)}
                            className="h-6 w-6 rounded hover:bg-gray-100"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        ${member.hourlyRate || 0}/{member.contractType === "Fixed" ? "mo" : "hr"}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {member.projectName || "-"}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {member.contractStart
                          ? format(new Date(member.contractStart.toString().substring(0, 10) + "T12:00:00Z"), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {member.contractEnd
                          ? format(new Date(member.contractEnd.toString().substring(0, 10) + "T12:00:00Z"), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>


    </>
  );
}
