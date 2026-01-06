import * as React from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { MetricCard } from "./MetricCard";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";
import { Search, Users, Clock, DollarSign, FileText, Copy } from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  contractorType: "Hourly" | "Fixed";
  rate: number;
  project: string;
  contractStart: Date;
  contractEnd: Date;
  status: "Active" | "Inactive";
}

const mockTeamMembers: TeamMember[] = [
  {
    id: "EMP-001",
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    contractorType: "Hourly",
    rate: 50,
    project: "Platform Migration",
    contractStart: new Date(2025, 8, 1),
    contractEnd: new Date(2026, 8, 1),
    status: "Active",
  },
  {
    id: "EMP-002",
    name: "Michael Chen",
    email: "michael.chen@company.com",
    contractorType: "Fixed",
    rate: 75,
    project: "API Development",
    contractStart: new Date(2025, 6, 15),
    contractEnd: new Date(2026, 6, 15),
    status: "Active",
  },
  {
    id: "EMP-003",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@company.com",
    contractorType: "Hourly",
    rate: 50,
    project: "UI Redesign",
    contractStart: new Date(2025, 9, 1),
    contractEnd: new Date(2026, 3, 1),
    status: "Active",
  },
  {
    id: "EMP-004",
    name: "David Kim",
    email: "david.kim@company.com",
    contractorType: "Hourly",
    rate: 60,
    project: "Data Analytics",
    contractStart: new Date(2025, 7, 1),
    contractEnd: new Date(2026, 7, 1),
    status: "Active",
  },
  {
    id: "EMP-005",
    name: "Jessica Martinez",
    email: "jessica.martinez@company.com",
    contractorType: "Hourly",
    rate: 55,
    project: "Mobile App",
    contractStart: new Date(2025, 10, 1),
    contractEnd: new Date(2026, 10, 1),
    status: "Active",
  },
];

export function ManagerTeamView() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortColumn, setSortColumn] = React.useState<keyof TeamMember | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied to clipboard");
  };

  const handleSort = (column: keyof TeamMember) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredTeam = React.useMemo(() => {
    let filtered = mockTeamMembers.filter((member) => {
      const matchesSearch =
        searchQuery === "" ||
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.project.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal instanceof Date && bVal instanceof Date) {
          return sortDirection === "asc"
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

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
  }, [searchQuery, sortColumn, sortDirection]);

  const totalMembers = mockTeamMembers.length;
  const activeContractors = mockTeamMembers.filter(m => m.status === "Active").length;
  const hourlyContractors = mockTeamMembers.filter(m => m.contractorType === "Hourly").length;
  const fixedContractors = mockTeamMembers.filter(m => m.contractorType === "Fixed").length;

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="p-4 border border-gray-200 rounded-[14px] bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by name, email, or project…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-gray-50 border-gray-200 rounded-lg"
          />
        </div>
        {searchQuery && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {filteredTeam.length} {filteredTeam.length === 1 ? "member" : "members"}
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
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead
                className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort("name")}
              >
                Contractor Name {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="font-semibold text-gray-700">Email</TableHead>
              <TableHead
                className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900 text-right"
                onClick={() => handleSort("rate")}
              >
                Rate {sortColumn === "rate" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort("project")}
              >
                Project {sortColumn === "project" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort("contractStart")}
              >
                Contract Start {sortColumn === "contractStart" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort("contractEnd")}
              >
                Contract End {sortColumn === "contractEnd" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeam.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-12 w-12 text-gray-300" />
                    <p className="text-gray-600">No team members found</p>
                    <p className="text-sm text-gray-500">
                      {searchQuery ? "Try adjusting your search" : "Team members will appear here"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTeam.map((member) => (
                <TableRow key={member.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <Badge
                        variant="secondary"
                        className="mt-1 bg-gray-100 text-gray-700 border-gray-200"
                      >
                        {member.contractorType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{member.email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyEmail(member.email)}
                        className="h-6 w-6 rounded hover:bg-gray-100"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    ${member.rate}/hr
                  </TableCell>
                  <TableCell className="text-gray-700">{member.project}</TableCell>
                  <TableCell className="text-gray-700">
                    {format(member.contractStart, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {format(member.contractEnd, "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}