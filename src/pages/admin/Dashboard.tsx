import * as React from "react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { MetricCard } from "../../components/shared/MetricCard";
import { Combobox } from "../../components/shared/Combobox";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { SubmissionReviewDrawer } from "../../components/drawers/SubmissionReviewDrawer";
import { toast } from "sonner";
import { Search, FileX, Users, FileText, DollarSign, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "../../components/ui/checkbox";
import { useAuth } from "../../lib/hooks/useAuth";
import {
  useAdminMetrics,
  useAdminSubmissions,
  useProjects,
  useManagers,
} from "../../lib/hooks/adminDashboard";
import { useBulkMarkPaid } from "../../lib/hooks/adminDashboard/useSubmissionActions";
import type { SubmissionFilters } from "../../lib/data/adminDashboard";

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  pending_manager: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  awaiting_admin_payment: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  rejected_contractor: "bg-red-100 text-red-700 border-red-200",
  needs_clarification: "bg-yellow-100 text-yellow-700 border-yellow-200",
  clarification_requested: "bg-yellow-100 text-yellow-700 border-yellow-200",
  paid: "bg-purple-100 text-purple-700 border-purple-200",
};

const statusLabels: Record<string, string> = {
  submitted: "Pending Manager Approval",
  pending_manager: "Pending Manager Approval",
  approved: "Awaiting Admin Payment",
  awaiting_admin_payment: "Awaiting Admin Payment",
  rejected: "Rejected",
  rejected_contractor: "Rejected (Action Required)",
  needs_clarification: "Needs Clarification",
  clarification_requested: "Admin Requested Clarification",
  paid: "Paid",
};

/**
 * Format work period for display (null-safe with fallback)
 * Expects workPeriod in format "YYYY-MM" or uses periodStart as fallback
 */
function formatWorkPeriod(workPeriod: string | undefined, periodStart: string | undefined): string {
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

  // Fallback: use periodStart if work period is missing
  if (periodStart) {
    try {
      return format(new Date(periodStart), "MMM yyyy");
    } catch {
      return "—";
    }
  }

  return "—";
}

export function AdminDashboard() {
  // Filters state
  const [filters, setFilters] = React.useState<SubmissionFilters>({});
  const [selectedSubmissionId, setSelectedSubmissionId] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  
  // Multi-selection state
  const [selectedSubmissionIds, setSelectedSubmissionIds] = React.useState<string[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = React.useState(false);

  // Fetch data using hooks
  const { user } = useAuth();
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useAdminMetrics();
  const { data: submissions, isLoading: submissionsLoading, error: submissionsError } = useAdminSubmissions(filters);
  const { data: projects } = useProjects();
  const { data: managers } = useManagers();
  const bulkMarkPaidMutation = useBulkMarkPaid();

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

  const handleSubmissionClick = (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedSubmissionId(null);
    // Unselect this item when drawer closes just in case it was processed
    if (selectedSubmissionId) {
      setSelectedSubmissionIds(prev => prev.filter(id => id !== selectedSubmissionId));
    }
  };

  const handleBulkPay = async () => {
    if (selectedSubmissionIds.length === 0 || !user?.id) return;
    
    setShowBulkConfirm(false);
    const results = await bulkMarkPaidMutation.mutateAsync({ 
      submissionIds: selectedSubmissionIds, 
      adminUserId: user.id 
    });
    
    if (results.successful.length > 0) {
      setSelectedSubmissionIds(prev => prev.filter(id => !results.successful.includes(id)));
    }
  };

  const approvableSubmissions = (submissions || []).filter(s => 
    s.status === "approved" || s.status === "awaiting_admin_payment"
  );
  const allApprovableSelected = approvableSubmissions.length > 0 && 
    approvableSubmissions.every(s => selectedSubmissionIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allApprovableSelected) {
      setSelectedSubmissionIds(prev => prev.filter(id => !approvableSubmissions.find(s => s.id === id)));
    } else {
      const approvableIds = approvableSubmissions.map(s => s.id);
      setSelectedSubmissionIds(prev => Array.from(new Set([...prev, ...approvableIds])));
    }
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
      {/* Header Actions */}
      <div className="flex justify-between items-center h-10">
        <div>
          {selectedSubmissionIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                {selectedSubmissionIds.length} selected
              </span>
              <Button 
                onClick={() => setShowBulkConfirm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                disabled={bulkMarkPaidMutation.isPending}
              >
                {bulkMarkPaidMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-2" />
                )}
                Bulk Pay ({selectedSubmissionIds.length})
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedSubmissionIds([])}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

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
            />
            <MetricCard
              title="Pending Submissions"
              value={metrics?.pendingSubmissions || 0}
              subtitle="Needs attention"
              icon={FileText}
              accentColor="yellow"
            />
            <MetricCard
              title="Total Invoice Value"
              value={`$${(metrics?.totalInvoiceValue || 0).toLocaleString()}`}
              subtitle="Awaiting payment"
              icon={DollarSign}
              accentColor="green"
            />
            <MetricCard
              title="Active Contracts"
              value={metrics?.activeContracts || 0}
              subtitle="Currently active"
              icon={TrendingUp}
              accentColor="blue"
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
                { value: "submitted", label: "Pending Manager Approval" },
                { value: "approved", label: "Awaiting Admin Payment" },
                { value: "paid", label: "Paid" },
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
                <TableHead className="w-12 text-center px-4">
                  <Checkbox 
                    checked={allApprovableSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={approvableSubmissions.length === 0}
                    aria-label="Select all approvable submissions"
                  />
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Work Period
                </TableHead>
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
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Loader2 className="w-8 h-8 mb-3 animate-spin" />
                      <div className="text-gray-600 font-medium">Loading submissions...</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : submissionsError ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
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
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FileX className="w-16 h-16 mb-3" strokeWidth={1.5} />
                      <div className="text-gray-600 font-medium">No submissions match your filters</div>
                      <div className="text-sm text-gray-500 mt-1">Try adjusting your search criteria</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((submission) => {
                  const isApprovable = submission.status === "approved" || submission.status === "awaiting_admin_payment";
                  const isSelected = selectedSubmissionIds.includes(submission.id);

                  return (
                    <TableRow
                      key={submission.id}
                      className={`h-16 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${isSelected ? 'bg-purple-50/50' : ''}`}
                      onClick={() => handleSubmissionClick(submission.id)}
                    >
                      <TableCell className="text-center px-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => {
                            setSelectedSubmissionIds(prev => 
                              prev.includes(submission.id) ? prev.filter(id => id !== submission.id) : [...prev, submission.id]
                            );
                          }}
                          disabled={!isApprovable}
                          aria-label={`Select submission for ${submission.contractorName}`}
                        />
                      </TableCell>
                      <TableCell className="text-gray-700">
                      {formatWorkPeriod(submission.workPeriod, submission.periodStart)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{submission.contractorName}</div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(submission.submittedAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">{submission.contractorType}</TableCell>
                    <TableCell className="text-gray-700">{submission.regularHours}h</TableCell>
                    <TableCell className="text-gray-700">{submission.overtimeHours}h</TableCell>
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
                  );
                })
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

      {/* Bulk Pay Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4 mx-auto">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                Pay {selectedSubmissionIds.length} Invoices?
              </h3>
              <p className="text-center text-gray-600 mb-6 text-sm">
                You are about to mark {selectedSubmissionIds.length} invoice(s) as paid. This action cannot be undone.
              </p>
              
              <div className="flex gap-3 mt-8">
                <Button 
                  variant="outline" 
                  className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowBulkConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleBulkPay}
                  disabled={bulkMarkPaidMutation.isPending}
                >
                  {bulkMarkPaidMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Paying...
                    </>
                  ) : (
                    'Confirm Payment'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}