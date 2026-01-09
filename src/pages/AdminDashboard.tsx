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
import { SubmissionReviewDrawer } from "./SubmissionReviewDrawer";
import { toast } from "sonner";
import { Search, FileX, Users, FileText, DollarSign, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  useAdminMetrics,
  useAdminSubmissions,
  useProjects,
  useManagers,
} from "../lib/hooks/adminDashboard";
import type { SubmissionFilters } from "../lib/data/adminDashboard";

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  needs_clarification: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const statusLabels: Record<string, string> = {
  submitted: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  needs_clarification: "Needs Clarification",
};

export function AdminDashboard() {
  // Filters state
  const [filters, setFilters] = React.useState<SubmissionFilters>({});
  const [selectedSubmissionId, setSelectedSubmissionId] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Fetch data using hooks
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useAdminMetrics();
  const { data: submissions, isLoading: submissionsLoading, error: submissionsError } = useAdminSubmissions(filters);
  const { data: projects } = useProjects();
  const { data: managers } = useManagers();

  // Generate month options (last 4 months)
  const months = React.useMemo(() => {
    const result: string[] = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }
    return result;
  }, []);

  const handleResetFilters = () => {
    setFilters({});
    toast.success("All filters cleared");
  };

  const handleMetricClick = (metric: string) => {
    if (metric === "pending") {
      setFilters({ ...filters, status: "submitted" });
      toast.info("Filtered to pending submissions");
    }
  };

  const handleSubmissionClick = (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedSubmissionId(null);
  };

  // Show error state if metrics fail to load
  if (metricsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-sm text-gray-600 mb-4">
            {metricsError instanceof Error ? metricsError.message : 'An error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsLoading ? (
          // Loading skeletons
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 border border-gray-200 rounded-[14px] bg-white animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </Card>
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Total Contractors"
              value={metrics?.totalContractors || 0}
              subtitle="Active contractors"
              icon={Users}
              accentColor="purple"
              onClick={() => handleMetricClick("total")}
            />
            <MetricCard
              title="Pending Submissions"
              value={metrics?.pendingSubmissions || 0}
              subtitle="Needs attention"
              icon={FileText}
              accentColor="yellow"
              onClick={() => handleMetricClick("pending")}
            />
            <MetricCard
              title="Total Invoice Value"
              value={`$${(metrics?.totalInvoiceValue || 0).toLocaleString()}`}
              subtitle="Approved this month"
              icon={DollarSign}
              accentColor="green"
              onClick={() => handleMetricClick("payout")}
            />
            <MetricCard
              title="Active Contracts"
              value={metrics?.activeContracts || 0}
              subtitle="Currently active"
              icon={TrendingUp}
              accentColor="blue"
              onClick={() => handleMetricClick("contracts")}
            />
          </>
        )}
      </div>

      {/* Filters & Search */}
      <Card className="p-4 border border-gray-200 rounded-[14px] bg-white">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name, project, manager…"
              value={filters.search || ""}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-11 h-11 bg-gray-50 border-gray-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Combobox
              value={filters.contractorType || ""}
              onValueChange={(value) => setFilters({ ...filters, contractorType: value })}
              options={[
                { value: "Hourly", label: "Hourly" },
                { value: "Fixed", label: "Fixed" },
              ]}
              placeholder="Contractor Type"
            />
            <Combobox
              value={filters.status || ""}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
              options={[
                { value: "submitted", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "needs_clarification", label: "Needs Clarification" },
              ]}
              placeholder="Status"
            />
            <Combobox
              value={filters.project || ""}
              onValueChange={(value) => setFilters({ ...filters, project: value })}
              options={(projects || []).map((p) => ({ value: p, label: p }))}
              placeholder="Project"
            />
            <Combobox
              value={filters.manager || ""}
              onValueChange={(value) => setFilters({ ...filters, manager: value })}
              options={(managers || []).map((m) => ({ value: m, label: m }))}
              placeholder="Manager"
            />
            <Combobox
              value={filters.month || ""}
              onValueChange={(value) => setFilters({ ...filters, month: value })}
              options={months.map((m) => ({ value: m, label: m }))}
              placeholder="Month"
            />
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleResetFilters} className="text-gray-600">
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard Table */}
      <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50">
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Contractor
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Type
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Regular Hours
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Overtime Hours
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Total Amount
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissionsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Loader2 className="w-8 h-8 mb-3 animate-spin" />
                      <div className="text-gray-600 font-medium">Loading submissions...</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : submissionsError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <AlertCircle className="w-16 h-16 mb-3 text-red-500" />
                      <div className="text-gray-600 font-medium mb-2">Failed to load submissions</div>
                      <div className="text-sm text-gray-500">
                        {submissionsError instanceof Error ? submissionsError.message : 'An error occurred'}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !submissions || submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FileX className="w-16 h-16 mb-3" strokeWidth={1.5} />
                      <div className="text-gray-600 font-medium">No submissions match your filters</div>
                      <div className="text-sm text-gray-500 mt-1">Try adjusting your search criteria</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((submission) => (
                  <TableRow
                    key={submission.id}
                    className="h-16 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => handleSubmissionClick(submission.id)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{submission.contractorName}</div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(submission.submittedAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">{submission.contractorType}</TableCell>
                    <TableCell className="text-gray-700">{submission.regularHours}</TableCell>
                    <TableCell className="text-gray-700">{submission.overtimeHours}</TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      ${submission.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusStyles[submission.status] || statusStyles.submitted} border rounded-full px-3 py-1 font-medium text-xs`}
                      >
                        {statusLabels[submission.status] || submission.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Submission Review Drawer */}
      <SubmissionReviewDrawer
        submissionId={selectedSubmissionId}
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
      />
    </div>
  );
}