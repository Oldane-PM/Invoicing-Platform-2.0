import * as React from "react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { MetricCard } from "../../components/shared/MetricCard";
import { Combobox } from "../../components/shared/Combobox";
import { MultiMonthSelector } from "../../components/shared/MultiMonthSelector";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { ManagerSubmissionDrawer } from "../../components/drawers/ManagerSubmissionDrawer";
import { toast } from "sonner";
import {
  Search,
  Users,
  Clock,
  FileText,
  DollarSign,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useManagerDashboard } from "../../lib/hooks/manager/useManagerDashboard";
import { useManagerSubmissions } from "../../lib/hooks/manager/useManagerSubmissions";
import { useSubmissionActions } from "../../lib/hooks/manager/useSubmissionActions";
import { useTeam } from "../../lib/hooks/manager/useTeam";
import type { ManagerSubmission } from "../../lib/supabase/repos/managerSubmissions.repo";

// Map database status to display status
type DisplayStatus = "Pending" | "Approved" | "Rejected" | "Paid" | "Clarification";

function mapStatusToDisplay(status: string): DisplayStatus {
  const normalizedStatus = status.toUpperCase();
  switch (normalizedStatus) {
    case "PAID":
      return "Paid";
    case "APPROVED":
    case "AWAITING_ADMIN_PAYMENT":
      return "Approved";
    case "REJECTED":
    case "REJECTED_CONTRACTOR":
      return "Rejected";
    case "NEEDS_CLARIFICATION":
    case "CLARIFICATION_REQUESTED":
      return "Clarification";
    case "PENDING":
    case "PENDING_MANAGER":
    case "SUBMITTED":
    default:
      return "Pending";
  }
}

const statusStyles: Record<DisplayStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
  Paid: "bg-purple-100 text-purple-700 border-purple-200",
  Clarification: "bg-orange-100 text-orange-700 border-orange-200",
};

/**
 * Format work period for display (null-safe with fallback)
 * Expects workPeriod in format "YYYY-MM" or "January 2026" or similar
 */
function formatWorkPeriod(submission: ManagerSubmission): string {
  const { workPeriod, submissionDate } = submission;

  // Try to parse workPeriod if it exists
  if (workPeriod) {
    // If it's already formatted like "January 2026", return as-is abbreviated
    if (/^[A-Za-z]+ \d{4}$/.test(workPeriod)) {
      try {
        return format(new Date(workPeriod), "MMM yyyy");
      } catch {
        return workPeriod;
      }
    }

    // If it's "YYYY-MM" format
    if (/^\d{4}-\d{2}$/.test(workPeriod)) {
      try {
        const [year, month] = workPeriod.split("-").map(Number);
        return format(new Date(year, month - 1, 1), "MMM yyyy");
      } catch {
        return workPeriod;
      }
    }

    // If it's a date string like "2026-01-01"
    try {
      return format(new Date(workPeriod), "MMM yyyy");
    } catch {
      return workPeriod;
    }
  }

  // Fallback: show submission date if work period is missing
  if (submissionDate) {
    try {
      return format(new Date(submissionDate), "MMM d, yyyy");
    } catch {
      return "—";
    }
  }

  return "—";
}

export function ManagerDashboard() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedMonths, setSelectedMonths] = React.useState<string[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    React.useState<ManagerSubmission | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Use live data hooks
  const { metrics, loading: metricsLoading, refetch: refetchMetrics } = useManagerDashboard();
  const { teamSize, loading: teamLoading } = useTeam();
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useManagerSubmissions({
    status: statusFilter || undefined,
  });
  const { approve, reject } = useSubmissionActions();

  const handleSubmissionClick = (submission: ManagerSubmission) => {
    setSelectedSubmission(submission);
    setDrawerOpen(true);
  };

  const handleStatusUpdate = async (
    submissionId: string,
    newStatus: "Approved" | "Rejected",
    reason?: string
  ) => {
    let success = false;

    if (newStatus === "Approved") {
      success = await approve(submissionId);
      if (success) {
        toast.success("Submission approved successfully");
      }
    } else if (newStatus === "Rejected") {
      success = await reject(submissionId, reason || "No reason provided");
      if (success) {
        toast.success("Submission rejected");
      }
    }

    if (success) {
      // Refetch data to update UI
      refetchSubmissions();
      refetchMetrics();
      setDrawerOpen(false);
    } else {
      toast.error("Failed to update submission status");
    }
  };


  // Filter submissions by search query and selected months (client-side)
  const filteredSubmissions = React.useMemo(() => {
    let filtered = submissions;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((submission) => {
        const contractorName = submission.contractorName?.toLowerCase() || "";
        const contractorEmail = submission.contractorEmail?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();

        return contractorName.includes(query) || contractorEmail.includes(query);
      });
    }

    // Filter by selected months
    if (selectedMonths.length > 0) {
      filtered = filtered.filter((submission) => {
        // Extract YYYY-MM from workPeriod
        const workPeriod = submission.workPeriod;
        if (!workPeriod) return false;

        // Handle different workPeriod formats
        let monthKey: string | null = null;

        // Format: "YYYY-MM"
        if (/^\d{4}-\d{2}$/.test(workPeriod)) {
          monthKey = workPeriod;
        }
        // Format: "January 2026" or similar
        else if (/^[A-Za-z]+ \d{4}$/.test(workPeriod)) {
          try {
            const date = new Date(workPeriod);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            monthKey = `${year}-${month}`;
          } catch {
            return false;
          }
        }
        // Format: "2026-01-01" or other date strings
        else {
          try {
            const date = new Date(workPeriod);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            monthKey = `${year}-${month}`;
          } catch {
            return false;
          }
        }

        return monthKey ? selectedMonths.includes(monthKey) : false;
      });
    }

    return filtered;
  }, [submissions, searchQuery, selectedMonths]);


  const isLoading = metricsLoading || submissionsLoading || teamLoading;

  // Calculate metrics from live data or use defaults
  const pendingCount = metrics?.pendingApprovals ?? 0;
  const totalHours = metrics?.totalHours ?? 0;
  const totalInvoice = metrics?.totalInvoiced ?? 0;

  const handleRefresh = () => {
    refetchSubmissions();
    refetchMetrics();
    toast.success("Data refreshed");
  };

  return (
    <>
      <div className="space-y-6">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <Combobox
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: "PENDING", label: "Pending" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "NEEDS_CLARIFICATION", label: "Needs Clarification" },
                    { value: "REJECTED", label: "Rejected" },
                    { value: "PAID", label: "Paid" },
                  ]}
                  placeholder="All Statuses"
                />
              </div>
              <div className="md:col-span-4">
                <MultiMonthSelector
                  selectedMonths={selectedMonths}
                  onMonthsChange={setSelectedMonths}
                  placeholder="All Time"
                />
              </div>
              <div className="md:col-span-4 flex md:justify-end">
                {(searchQuery || statusFilter || selectedMonths.length > 0) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("");
                      setSelectedMonths([]);
                      toast.success("All filters cleared");
                    }}
                    className="w-full md:w-auto h-11 border-gray-200 rounded-lg"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Team Submission Table */}
        <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
          {submissionsLoading && submissions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-600">Loading submissions...</span>
            </div>
          ) : submissionsError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-600 mb-2">Failed to load submissions</p>
              <p className="text-sm text-gray-500 mb-4">
                {submissionsError.message}
              </p>
              <Button
                onClick={() => refetchSubmissions()}
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
                  <TableHead className="font-semibold text-gray-700">
                    Work Period
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Employee Name
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">
                    Total Hours
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">
                    Overtime Hours
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">
                    Invoice Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center">
                    Status
                  </TableHead>
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
                          {searchQuery || statusFilter || selectedMonths.length > 0
                            ? "Try adjusting your filters"
                            : "Submissions will appear here"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((submission) => {
                    const displayStatus = mapStatusToDisplay(submission.status);
                    const totalHours =
                      submission.regularHours + submission.overtimeHours;

                    return (
                      <TableRow
                        key={submission.id}
                        onClick={() => handleSubmissionClick(submission)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <TableCell className="text-gray-700">
                          {formatWorkPeriod(submission)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">
                              {submission.contractorName || "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {submission.contractorEmail || ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900">
                          {totalHours}h
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          {submission.overtimeHours}h
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900">
                          ${submission.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Badge
                              className={`${statusStyles[displayStatus]} border`}
                            >
                              {displayStatus}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Submission Review Drawer */}
      <ManagerSubmissionDrawer
        submission={
          selectedSubmission
            ? {
                id: selectedSubmission.id,
                employeeName: selectedSubmission.contractorName || "Unknown",
                employeeEmail: selectedSubmission.contractorEmail || "",
                contractType: selectedSubmission.contractType,
                project: selectedSubmission.projectName || "",
                dateSubmitted: new Date(selectedSubmission.submissionDate),
                regularHours: selectedSubmission.regularHours,
                overtimeHours: selectedSubmission.overtimeHours,
                totalHours:
                  selectedSubmission.regularHours +
                  selectedSubmission.overtimeHours,
                invoiceAmount: selectedSubmission.totalAmount,
                status: mapStatusToDisplay(
                  selectedSubmission.status
                ) as "Pending" | "Approved" | "Rejected" | "Paid" | "Clarification",
                hourlyRate: selectedSubmission.hourlyRate,
                overtimeRate: selectedSubmission.overtimeRate,
                fixedMonthlyRate: selectedSubmission.fixedMonthlyRate,
                notes: selectedSubmission.description,
                rejectionReason: selectedSubmission.rejectionReason,
              }
            : null
        }
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </>
  );
}
