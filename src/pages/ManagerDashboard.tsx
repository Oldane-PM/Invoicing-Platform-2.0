import * as React from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { MetricCard } from "./MetricCard";
import { Combobox } from "./Combobox";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { ManagerSubmissionDrawer } from "./ManagerSubmissionDrawer";
import { toast } from "sonner";
import { Search, Users, Clock, FileText, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface SubmissionData {
  id: string;
  employeeName: string;
  employeeEmail: string;
  contractorType: string;
  project: string;
  dateSubmitted: Date;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  invoiceAmount: number;
  status: "Pending" | "Approved" | "Rejected";
  rate: number;
  notes?: string;
}

const mockSubmissions: SubmissionData[] = [
  {
    id: "SUB-001",
    employeeName: "Sarah Johnson",
    employeeEmail: "sarah.johnson@company.com",
    contractorType: "Hourly",
    project: "Platform Migration",
    dateSubmitted: new Date(2026, 0, 15),
    regularHours: 160,
    overtimeHours: 8,
    totalHours: 168,
    invoiceAmount: 8400,
    status: "Pending",
    rate: 50,
    notes: "Worked extra hours during critical deployment phase.",
  },
  {
    id: "SUB-002",
    employeeName: "Michael Chen",
    employeeEmail: "michael.chen@company.com",
    contractorType: "Fixed",
    project: "API Development",
    dateSubmitted: new Date(2026, 0, 14),
    regularHours: 160,
    overtimeHours: 0,
    totalHours: 160,
    invoiceAmount: 12000,
    status: "Approved",
    rate: 75,
  },
  {
    id: "SUB-003",
    employeeName: "Emily Rodriguez",
    employeeEmail: "emily.rodriguez@company.com",
    contractorType: "Hourly",
    project: "UI Redesign",
    dateSubmitted: new Date(2026, 0, 16),
    regularHours: 160,
    overtimeHours: 5,
    totalHours: 165,
    invoiceAmount: 8250,
    status: "Pending",
    rate: 50,
    notes: "Additional hours for client revisions.",
  },
  {
    id: "SUB-004",
    employeeName: "David Kim",
    employeeEmail: "david.kim@company.com",
    contractorType: "Hourly",
    project: "Data Analytics",
    dateSubmitted: new Date(2026, 0, 13),
    regularHours: 160,
    overtimeHours: 0,
    totalHours: 160,
    invoiceAmount: 9600,
    status: "Approved",
    rate: 60,
  },
  {
    id: "SUB-005",
    employeeName: "Jessica Martinez",
    employeeEmail: "jessica.martinez@company.com",
    contractorType: "Hourly",
    project: "Mobile App",
    dateSubmitted: new Date(2026, 0, 17),
    regularHours: 152,
    overtimeHours: 12,
    totalHours: 164,
    invoiceAmount: 9020,
    status: "Pending",
    rate: 55,
    notes: "Weekend work for app store submission deadline.",
  },
];

const statusStyles: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

export function ManagerDashboard() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [timeRangeFilter, setTimeRangeFilter] = React.useState("");
  const [submissions, setSubmissions] = React.useState(mockSubmissions);
  const [selectedSubmission, setSelectedSubmission] = React.useState<SubmissionData | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleSubmissionClick = (submission: SubmissionData) => {
    setSelectedSubmission(submission);
    setDrawerOpen(true);
  };

  const handleStatusUpdate = (submissionId: string, newStatus: "Approved" | "Rejected", reason?: string) => {
    setSubmissions(prev =>
      prev.map(sub =>
        sub.id === submissionId
          ? { ...sub, status: newStatus }
          : sub
      )
    );

    if (selectedSubmission?.id === submissionId) {
      setSelectedSubmission({ ...selectedSubmission, status: newStatus });
    }
  };

  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch =
        searchQuery === "" ||
        submission.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.employeeEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "" || submission.status === statusFilter;

      // For now, timeRange is just a placeholder
      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchQuery, statusFilter]);

  const teamSize = submissions.length;
  const pendingCount = submissions.filter(s => s.status === "Pending").length;
  const totalHours = submissions.reduce((sum, s) => sum + s.totalHours, 0);
  const totalInvoice = submissions.reduce((sum, s) => sum + s.invoiceAmount, 0);

  return (
    <>
      <div className="space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Team Size"
            value={teamSize}
            subtitle="Active contractors"
            icon={Users}
            accentColor="purple"
          />
          <MetricCard
            title="Pending Approvals"
            value={pendingCount}
            subtitle="Awaiting your review"
            icon={Clock}
            accentColor="yellow"
          />
          <MetricCard
            title="Total Hours"
            value={totalHours}
            subtitle="This period"
            icon={FileText}
            accentColor="blue"
          />
          <MetricCard
            title="Total Invoice"
            value={`$${totalInvoice.toLocaleString()}`}
            subtitle="This period"
            icon={DollarSign}
            accentColor="green"
          />
        </div>

        {/* Filters & Search */}
        <Card className="p-4 border border-gray-200 rounded-[14px] bg-white">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search contractor name or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-gray-50 border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <Combobox
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { value: "Pending", label: "Pending" },
                  { value: "Approved", label: "Approved" },
                  { value: "Rejected", label: "Rejected" },
                ]}
                placeholder="All Statuses"
              />
              <Combobox
                value={timeRangeFilter}
                onValueChange={setTimeRangeFilter}
                options={[
                  { value: "this_month", label: "This Month" },
                  { value: "last_month", label: "Last Month" },
                  { value: "this_quarter", label: "This Quarter" },
                ]}
                placeholder="All Time"
              />
              {(searchQuery || statusFilter || timeRangeFilter) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("");
                    setTimeRangeFilter("");
                    toast.success("All filters cleared");
                  }}
                  className="border-gray-200 rounded-lg"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Team Submission Table */}
        <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700">Date of Submission</TableHead>
                <TableHead className="font-semibold text-gray-700">Employee Name</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Total Hours</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Overtime Hours</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Invoice Amount</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-600">No submissions found</p>
                      <p className="text-sm text-gray-500">
                        {searchQuery || statusFilter || timeRangeFilter
                          ? "Try adjusting your filters"
                          : "Submissions will appear here"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TableRow
                    key={submission.id}
                    onClick={() => handleSubmissionClick(submission)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <TableCell className="text-gray-700">
                      {format(submission.dateSubmitted, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{submission.employeeName}</div>
                        <div className="text-sm text-gray-500">{submission.employeeEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900">
                      {submission.totalHours}h
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      {submission.overtimeHours}h
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900">
                      ${submission.invoiceAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge className={`${statusStyles[submission.status]} border`}>
                          {submission.status}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Submission Review Drawer */}
      <ManagerSubmissionDrawer
        submission={selectedSubmission}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </>
  );
}