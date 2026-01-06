import * as React from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { MetricCard } from "./MetricCard";
import { Combobox } from "./Combobox";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { SubmissionReviewDrawer } from "./SubmissionReviewDrawer";
import { Submission, MetricData } from "../types";
import { format } from "date-fns";
import { toast } from "sonner";
import { Search, FileX, Users, FileText, DollarSign, TrendingUp } from "lucide-react";

interface AdminDashboardProps {
  metrics: MetricData;
  submissions: Submission[];
  projects: string[];
  managers: string[];
  months: string[];
}

const statusStyles: Record<string, string> = {
  Pending: "bg-blue-100 text-blue-700 border-blue-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
  Paid: "bg-purple-100 text-purple-700 border-purple-200",
};

export function AdminDashboard({
  metrics,
  submissions,
  projects,
  managers,
  months,
}: AdminDashboardProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [contractorType, setContractorType] = React.useState("");
  const [invoiceStatus, setInvoiceStatus] = React.useState("");
  const [project, setProject] = React.useState("");
  const [manager, setManager] = React.useState("");
  const [month, setMonth] = React.useState("");
  const [selectedSubmission, setSelectedSubmission] = React.useState<any>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [submissionsList, setSubmissionsList] = React.useState(submissions);

  React.useEffect(() => {
    setSubmissionsList(submissions);
  }, [submissions]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setContractorType("");
    setInvoiceStatus("");
    setProject("");
    setManager("");
    setMonth("");
    toast.success("All filters cleared");
  };

  const handleMetricClick = (metric: string) => {
    if (metric === "pending") {
      setInvoiceStatus("Pending");
      toast.info("Filtered to pending payments");
    }
  };

  const handleSubmissionClick = (submission: Submission) => {
    const drawerSubmission = {
      id: submission.id,
      contractor: submission.employeeName,
      contractorType: submission.contractorType,
      reportingManager: submission.manager,
      project: submission.project,
      period: format(submission.date, "MMMM yyyy"),
      submittedOn: format(submission.date, "MMM d, yyyy"),
      status: submission.status as "Submitted" | "Approved" | "Rejected" | "Needs Clarification",
      regularHours: submission.totalHours - submission.overtimeHours,
      overtimeHours: submission.overtimeHours,
      totalAmount: `$${submission.totalAmount.toLocaleString()}`,
      notes: "Standard bi-weekly submission with no issues reported.",
      managerEmail: "manager@company.com",
    };
    setSelectedSubmission(drawerSubmission);
    setDrawerOpen(true);
  };

  const handleStatusUpdate = (submissionId: string, status: any, note?: string) => {
    setSubmissionsList(prev => 
      prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, status: status }
          : sub
      )
    );
    
    if (selectedSubmission) {
      setSelectedSubmission({
        ...selectedSubmission,
        status: status
      });
    }
  };

  const filteredSubmissions = React.useMemo(() => {
    return submissionsList.filter((submission) => {
      const matchesSearch =
        searchQuery === "" ||
        submission.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.manager.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesContractorType =
        contractorType === "" || submission.contractorType === contractorType;

      const matchesStatus =
        invoiceStatus === "" || submission.status === invoiceStatus;

      const matchesProject = project === "" || submission.project === project;

      const matchesManager = manager === "" || submission.manager === manager;

      return (
        matchesSearch &&
        matchesContractorType &&
        matchesStatus &&
        matchesProject &&
        matchesManager
      );
    });
  }, [
    submissionsList,
    searchQuery,
    contractorType,
    invoiceStatus,
    project,
    manager,
  ]);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Employees"
          value={metrics.totalEmployees}
          subtitle="Active contractors"
          icon={Users}
          accentColor="purple"
          onClick={() => handleMetricClick("total")}
        />
        <MetricCard
          title="Pending Payments"
          value={metrics.pendingPayments}
          subtitle="Needs attention"
          icon={FileText}
          accentColor="yellow"
          onClick={() => handleMetricClick("pending")}
        />
        <MetricCard
          title="Total Payout"
          value={`$${metrics.totalPayout.toLocaleString()}`}
          subtitle="Approved payouts this month"
          icon={DollarSign}
          accentColor="green"
          onClick={() => handleMetricClick("payout")}
        />
        <MetricCard
          title="% vs Last Month"
          value={`${metrics.payoutChange > 0 ? "+" : ""}${metrics.payoutChange}%`}
          trend={{
            value: metrics.payoutChange,
            isPositive: metrics.payoutChange > 0,
          }}
          icon={TrendingUp}
          accentColor={metrics.payoutChange > 0 ? "green" : "red"}
          onClick={() => handleMetricClick("change")}
        />
      </div>

      {/* Filters & Search */}
      <Card className="p-4 border border-gray-200 rounded-[14px] bg-white">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name, project, manager…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-gray-50 border-gray-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Combobox
              value={contractorType}
              onValueChange={setContractorType}
              options={[
                { value: "Hourly", label: "Hourly" },
                { value: "Fixed", label: "Fixed" },
              ]}
              placeholder="Contractor Type"
            />
            <Combobox
              value={invoiceStatus}
              onValueChange={setInvoiceStatus}
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Approved", label: "Approved" },
                { value: "Rejected", label: "Rejected" },
                { value: "Paid", label: "Paid" },
              ]}
              placeholder="Invoice Status"
            />
            <Combobox
              value={project}
              onValueChange={setProject}
              options={projects.map((p) => ({ value: p, label: p }))}
              placeholder="Project"
            />
            <Combobox
              value={manager}
              onValueChange={setManager}
              options={managers.map((m) => ({ value: m, label: m }))}
              placeholder="Manager"
            />
            <Combobox
              value={month}
              onValueChange={setMonth}
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
                  Employee
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Contractor Type
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Total Hours
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
              {filteredSubmissions.length === 0 ? (
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
                filteredSubmissions.map((submission) => (
                  <TableRow
                    key={submission.id}
                    className="h-16 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => handleSubmissionClick(submission)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{submission.employeeName}</div>
                        <div className="text-sm text-gray-500">
                          {format(submission.date, "MMM d, yyyy")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">{submission.contractorType}</TableCell>
                    <TableCell className="text-gray-700">{submission.totalHours}</TableCell>
                    <TableCell className="text-gray-700">{submission.overtimeHours}</TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      ${submission.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusStyles[submission.status]} border rounded-full px-3 py-1 font-medium text-xs`}
                      >
                        {submission.status}
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
        submission={selectedSubmission}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}