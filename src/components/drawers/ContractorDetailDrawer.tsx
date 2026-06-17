import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "../ui/sheet";
import { EmployeeDirectoryRow } from "../../lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Combobox } from "../shared/Combobox";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Pencil, Calendar, DollarSign, Clock, User, FileText, ExternalLink, Hash, Download, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";
import { useContractorSubmissions } from "../../lib/hooks/admin/useContractorSubmissions";
import { useManagerOptions } from "../../lib/hooks/admin/useManagerOptions";
import { useUpdateManagerAssignment } from "../../lib/hooks/admin/useUpdateManagerAssignment";
import { useUpdateContractInfo } from "../../lib/hooks/admin/useUpdateContractInfo";
import { useContractorOnboarding } from "../../lib/hooks/admin/useContractorOnboarding";
import { incrementInvoiceNumber } from "../../lib/invoiceSequence";
import { groupSubmissionsByWorkPeriod } from "../../lib/utils";

interface ContractorDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeDirectoryRow | null;
  onSave: (employee: EmployeeDirectoryRow) => void;
}

const statusStyles: Record<string, string> = {
  Pending: "bg-blue-100 text-blue-700 border-blue-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
  Paid: "bg-purple-100 text-purple-700 border-purple-200",
};

/**
 * Normalize status to display format (Title Case)
 * Handles both legacy DB statuses and new workflow statuses
 */
function normalizeStatus(status: string): "Pending" | "Approved" | "Rejected" | "Paid" {
  const normalized = status?.toUpperCase();
  switch (normalized) {
    // New workflow statuses
    case "AWAITING_ADMIN_PAYMENT":
      return "Approved";
    case "REJECTED_CONTRACTOR":
      return "Rejected";
    case "PAID":
      return "Paid";
    case "PENDING_MANAGER":
    case "CLARIFICATION_REQUESTED":
      return "Pending";
    // Legacy statuses (for backwards compatibility)
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "PENDING":
    case "NEEDS_CLARIFICATION":
    case "SUBMITTED":
    default:
      return "Pending";
  }
}

type TabType = "submissions" | "contract" | "taxforms";

export function ContractorDetailDrawer({
  open,
  onOpenChange,
  employee,
  onSave,
}: ContractorDetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>("submissions");
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState<EmployeeDirectoryRow | null>(null);

  // W-8BEN state
  const [w8benData, setW8benData] = React.useState<any>(null);
  const [w8benLoading, setW8benLoading] = React.useState(false);
  const [returnReason, setReturnReason] = React.useState("");
  const [returning, setReturning] = React.useState(false);
  const [showReturnInput, setShowReturnInput] = React.useState(false);

  // Fetch submissions directly
  const { data: realSubmissions, isLoading: isLoadingSubmissions } = useContractorSubmissions(
    employee?.contractor_id // Use the correct ID field from EmployeeDirectoryRow
  );

  // Fetch manager options for combobox
  const { data: managerOptions = [], isLoading: isLoadingManagers } = useManagerOptions();

  // Mutation to update manager assignment
  const updateManagerAssignment = useUpdateManagerAssignment();

  // Mutation to update contract info (rates, dates, etc.)
  const updateContractInfo = useUpdateContractInfo();

  // Read-only onboarding data (work order + entered contract details) for review
  const { data: onboarding, getWorkOrderUrl } = useContractorOnboarding(employee?.contractor_id);

  const handleViewWorkOrder = async () => {
    if (!onboarding?.work_order_path) return;
    try {
      const ref = await getWorkOrderUrl(onboarding.work_order_path, onboarding.work_order_filename);
      if (ref.url) {
        window.open(ref.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Work order file is not available");
      }
    } catch (err) {
      toast.error("Could not open work order", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  // Group submissions by Work Period
  const groupedSubmissions = React.useMemo(
    () => groupSubmissionsByWorkPeriod(realSubmissions ?? []),
    [realSubmissions]
  );

  const fetchW8ben = React.useCallback(async () => {
    if (!employee?.contractor_id) return;
    setW8benLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/w8ben/${employee.contractor_id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setW8benData(data.data);
      } else {
        setW8benData(null);
      }
    } catch {
      setW8benData(null);
    } finally {
      setW8benLoading(false);
    }
  }, [employee?.contractor_id]);

  const handleReturnForReview = async () => {
    if (!employee?.contractor_id) return;
    setReturning(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/w8ben/${employee.contractor_id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: returnReason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('W-8BEN form returned for review');
        setShowReturnInput(false);
        setReturnReason('');
        fetchW8ben();
      } else {
        toast.error(data.error || 'Failed to return form');
      }
    } catch {
      toast.error('Failed to return form');
    } finally {
      setReturning(false);
    }
  };

  React.useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
      setIsEditing(false);
      setActiveTab("submissions");
      setW8benData(null);
      setShowReturnInput(false);
      setReturnReason('');
    }
  }, [employee]);

  React.useEffect(() => {
    if (activeTab === 'taxforms' && employee) {
      fetchW8ben();
    }
  }, [activeTab, employee, fetchW8ben]);

  const handleSave = async () => {
    if (!formData || !employee) return;

    // Validation
    if (!formData.contract_start || !formData.contract_end) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.contract_start && formData.contract_end && formData.contract_end < formData.contract_start) {
      toast.error("End date cannot be earlier than start date");
      return;
    }

    if (formData.rate_type === "Hourly" && !formData.hourly_rate) {
      toast.error("Hourly rate is required for hourly contractors");
      return;
    }

    if (formData.rate_type === "Fixed" && !formData.fixed_rate) {
      toast.error("Fixed rate is required for fixed contractors");
      return;
    }

    try {
      // Update contract info in Supabase (rates, dates)
      await updateContractInfo.mutateAsync({
        contractor_id: employee.contractor_id,
        contract_start: formData.contract_start,
        contract_end: formData.contract_end,
        hourly_rate: formData.rate_type === "Hourly" ? formData.hourly_rate : null,
        overtime_rate: formData.rate_type === "Hourly" && formData.hourly_rate
          ? formData.hourly_rate * 1.5
          : null,
        rate_type: formData.rate_type as "Hourly" | "Fixed" | null,
        fixed_rate: formData.rate_type === "Fixed" ? formData.fixed_rate : null,
        position: formData.position,
        department: formData.department,
      });

      // Check if manager assignment changed
      const oldManagerId = employee.reporting_manager_id;
      const newManagerId = formData.reporting_manager_id;

      if (oldManagerId !== newManagerId) {
        await updateManagerAssignment.mutateAsync({
          contractorId: employee.contractor_id,
          newManagerId: newManagerId || null,
          oldManagerId: oldManagerId || null,
        });
      }

      // Notify parent of the update (for local state sync if needed)
      onSave(formData);
      setIsEditing(false);
      toast.success("Contract information updated successfully");
    } catch (error) {
      console.error("[ContractorDetailDrawer] Save failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update contract information"
      );
    }
  };

  const handleCancel = () => {
    setFormData(employee);
    setIsEditing(false);
  };

  if (!formData || !employee) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[440px] sm:max-w-[40%] p-0 bg-white border-l border-gray-200">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-3">
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1">
              {employee.contract_type || "Contractor"}
            </Badge>
          </div>
          <div>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 bg-purple-100 text-purple-700">
                <AvatarFallback className="bg-purple-100 text-purple-700 text-xl font-medium">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{employee.full_name}</h2>
                <div className="text-sm text-gray-500">{employee.email}</div>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Segmented Control Tabs */}
        <div className="px-6 pt-5 pb-4">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex w-full">
            <button
              onClick={() => setActiveTab("submissions")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "submissions"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Submissions
            </button>
            <button
              onClick={() => setActiveTab("contract")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "contract"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Contract Info
            </button>
            <button
              onClick={() => setActiveTab("taxforms")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "taxforms"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tax Forms
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <ScrollArea className="h-[calc(100vh-240px)] px-6 pb-6">
          {activeTab === "submissions" && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Recent Submissions
              </h3>
              <div className="space-y-5">
                {isLoadingSubmissions ? (
                   <div className="text-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
                     <div className="text-sm text-gray-500 mt-2">Loading history...</div>
                   </div>
                ) : groupedSubmissions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-sm text-gray-500">No submissions found</div>
                  </div>
                ) : (
                  groupedSubmissions.map((group) => (
                    <div key={group.key} className="space-y-3">
                      {/* Work Period Header */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          {group.periodLabel}
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>

                      {/* Submissions for this Work Period */}
                      {group.rows.map((submission) => {
                        const displayStatus = normalizeStatus(submission.status);
                        return (
                          <div
                            key={submission.id}
                            className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all bg-white"
                          >
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold text-sm text-gray-900">
                                  {format(new Date(submission.submissionDate), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {submission.projectName}
                                </div>
                              </div>
                              <Badge
                                className={`${statusStyles[displayStatus] || "bg-gray-100 text-gray-700"} border rounded-full px-3 py-1 font-medium text-xs`}
                              >
                                {displayStatus}
                              </Badge>
                            </div>
                            {/* Card Body - 3 Column Grid */}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <div className="text-[11px] text-gray-500 mb-1">Regular Hours</div>
                                <div className="font-semibold text-sm text-gray-900">
                                  {submission.regularHours}h
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-gray-500 mb-1">Overtime</div>
                                <div className="font-semibold text-sm text-gray-900">
                                  {submission.overtimeHours}h
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-gray-500 mb-1">Total Amount</div>
                                <div className="font-semibold text-base text-gray-900">
                                  ${submission.totalAmount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            {/* Rejection Reason (only shown when status is Rejected) */}
                            {displayStatus === "Rejected" && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-[11px] text-gray-500 mb-1">Rejection Reason</div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <p className="text-sm text-red-900 leading-relaxed">
                                    {submission.rejectionReason?.trim()
                                      ? submission.rejectionReason
                                      : "No reason provided"}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Payment Link */}
                            {submission.paymentLink && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-[11px] text-gray-500 mb-1">Payment Link</div>
                                <a 
                                  href={submission.paymentLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[13px] text-blue-600 hover:text-blue-800 break-all leading-relaxed"
                                >
                                  {submission.paymentLink}
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "contract" && (
            <div>
              {/* Section Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold text-gray-900">
                  Contract Information
                </h3>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="border-gray-200 text-gray-700 hover:bg-gray-50 h-9"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="border-gray-200 text-gray-700 hover:bg-gray-50 h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="bg-purple-600 hover:bg-purple-700 h-9"
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="space-y-6">
                  {/* Contract Summary Grid */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    {/* Dates Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Start Date</span>
                        </div>
                        <div className="font-medium text-sm text-gray-900">
                          {formData.contract_start
                            ? format(new Date(formData.contract_start.toString().substring(0, 10) + "T12:00:00Z"), "MMM d, yyyy")
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>End Date</span>
                        </div>
                        <div className="font-medium text-sm text-gray-900">
                          {formData.contract_end
                            ? format(new Date(formData.contract_end.toString().substring(0, 10) + "T12:00:00Z"), "MMM d, yyyy")
                            : "Ongoing"}
                        </div>
                      </div>
                    </div>

                    {/* Rates Row */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Hourly Rate</span>
                        </div>
                        <div className="font-medium text-sm text-gray-900">
                          {formData.hourly_rate ? `$${formData.hourly_rate}/hour` : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Overtime Rate</span>
                        </div>
                        <div className="font-medium text-sm text-gray-900">
                          {formData.hourly_rate
                            ? `$${(formData.hourly_rate * 1.5).toFixed(2)}/hour`
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role & Reporting Info */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Position</div>
                      <div className="font-medium text-sm text-gray-900">
                        {formData.position}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Department</div>
                      <div className="font-medium text-sm text-gray-900">
                        {formData.department}
                      </div>
                    </div>
                    {formData.role?.toLowerCase() !== "admin" && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                          <User className="w-3.5 h-3.5" />
                          <span>Reporting Manager</span>
                        </div>
                        <div className="font-medium text-sm text-gray-900">
                          {formData.reporting_manager_name || "-"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Onboarding (read-only) — work order + contractor-entered details */}
                  <div className="pt-2 border-t border-gray-200 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900">Work Order</h4>

                    {/* Signed Work Order */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">Signed Work Order</div>
                      {onboarding?.work_order_path ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                            <span className="text-sm text-gray-900 truncate">
                              {onboarding.work_order_filename || "Work order"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleViewWorkOrder}
                            className="h-8 px-2.5 text-purple-600 hover:bg-purple-50 shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">No work order uploaded</div>
                      )}
                    </div>

                    {/* Entered contract details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Role (entered)</div>
                        <div className="font-medium text-sm text-gray-900">
                          {onboarding?.onboarding_role || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          {onboarding?.onboarding_rate_type === "fixed" ? "Fixed Rate (entered)" : "Hourly Rate (entered)"}
                        </div>
                        <div className="font-medium text-sm text-gray-900">
                          {onboarding?.onboarding_rate != null
                            ? `$${onboarding.onboarding_rate}${onboarding.onboarding_rate_type === "fixed" ? "/monthly" : "/hr"}`
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Contract Start</div>
                        <div className="font-medium text-sm text-gray-900">
                          {onboarding?.contract_start_date
                            ? format(new Date(onboarding.contract_start_date + "T12:00:00Z"), "MMM d, yyyy")
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Contract Expiry</div>
                        <div className="font-medium text-sm text-gray-900">
                          {onboarding?.contract_end_date
                            ? format(new Date(onboarding.contract_end_date + "T12:00:00Z"), "MMM d, yyyy")
                            : "-"}
                        </div>
                      </div>
                    </div>

                    {/* Invoice sequence */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Hash className="w-3.5 h-3.5" />
                        <span>Invoice Sequence</span>
                      </div>
                      {onboarding?.last_invoice_number ? (
                        <div className="font-medium text-sm text-gray-900">
                          Last: {onboarding.last_invoice_number}
                          <span className="text-gray-400"> · </span>
                          Next: {incrementInvoiceNumber(onboarding.last_invoice_number)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">Not set</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startDate" className="text-xs text-gray-700 mb-1.5 block">
                        Start Date
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.contract_start ? formData.contract_start.toString().substring(0, 10) : ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contract_start: e.target.value,
                          })
                        }
                        className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-xs text-gray-700 mb-1.5 block">
                        End Date
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        min={formData.contract_start ? formData.contract_start.toString().substring(0, 10) : undefined}
                        value={formData.contract_end ? formData.contract_end.toString().substring(0, 10) : ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contract_end: e.target.value,
                          })
                        }
                        className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="rateType" className="text-xs text-gray-700 mb-1.5 block">
                      Rate Type
                    </Label>
                    <Combobox
                      value={formData.rate_type || ""}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          rate_type: value as "Hourly" | "Fixed",
                        })
                      }
                      options={[
                        { value: "Hourly", label: "Hourly" },
                        { value: "Fixed", label: "Fixed" },
                      ]}
                      placeholder="Select rate type"
                    />
                  </div>
                  {formData.rate_type === "Hourly" && (
                    <div>
                      <Label htmlFor="hourlyRate" className="text-xs text-gray-700 mb-1.5 block">
                        Hourly Rate
                      </Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        value={formData.hourly_rate || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hourly_rate: parseFloat(e.target.value),
                          })
                        }
                        placeholder="Enter hourly rate"
                        className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                      />
                    </div>
                  )}
                  {formData.rate_type === "Fixed" && (
                    <div>
                      <Label htmlFor="fixedRate" className="text-xs text-gray-700 mb-1.5 block">
                        Fixed Rate
                      </Label>
                      <Input
                        id="fixedRate"
                        type="number"
                        value={formData.fixed_rate || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fixed_rate: parseFloat(e.target.value),
                          })
                        }
                        placeholder="Enter fixed rate"
                        className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="position" className="text-xs text-gray-700 mb-1.5 block">
                      Position
                    </Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData({ ...formData, position: e.target.value })
                      }
                      className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department" className="text-xs text-gray-700 mb-1.5 block">
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                    />
                  </div>
                  {formData.role?.toLowerCase() !== "admin" && (
                    <div>
                      <Label htmlFor="manager" className="text-xs text-gray-700 mb-1.5 block">
                        Reporting Manager
                      </Label>
                      <Combobox
                        value={formData.reporting_manager_id || ""}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            reporting_manager_id: value || undefined,
                            reporting_manager_name: managerOptions.find((m) => m.id === value)?.label,
                          })
                        }
                        options={managerOptions.map((m) => ({ value: m.id, label: m.label }))}
                        placeholder={isLoadingManagers ? "Loading managers..." : "Select a manager"}
                        searchPlaceholder="Search managers..."
                        emptyText="No managers found."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "taxforms" && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                W-8BEN Form
              </h3>

              {w8benLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  <div className="text-sm text-gray-500 mt-2">Loading tax forms...</div>
                </div>
              ) : !w8benData ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-sm text-gray-600 font-medium">No W-8BEN form submitted</div>
                  <div className="text-xs text-gray-500 mt-1">This contractor has not yet submitted a W-8BEN form.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    {w8benData.status === 'submitted' ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Submitted
                      </Badge>
                    ) : w8benData.status === 'returned' ? (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Returned for Review
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">{w8benData.status}</Badge>
                    )}
                  </div>

                  {/* Form Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Name</div>
                        <div className="text-sm font-medium text-gray-900">{w8benData.form_data?.name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Citizenship</div>
                        <div className="text-sm font-medium text-gray-900">{w8benData.form_data?.citizenship || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Residence</div>
                      <div className="text-sm text-gray-900">
                        {w8benData.form_data?.residenceAddress}, {w8benData.form_data?.residenceCity}, {w8benData.form_data?.residenceCountry}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Signed by</div>
                        <div className="text-sm font-medium text-gray-900">{w8benData.signature_data?.name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Signed on</div>
                        <div className="text-sm text-gray-900">
                          {w8benData.signature_data?.date
                            ? new Date(w8benData.signature_data.date).toLocaleDateString()
                            : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Download PDF */}
                  {w8benData.signed_pdf_url && (
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => window.open(w8benData.signed_pdf_url, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                      Download Signed PDF
                    </Button>
                  )}

                  {/* Return for Review */}
                  {w8benData.status === 'submitted' && (
                    <div className="pt-4 border-t border-gray-200">
                      {!showReturnInput ? (
                        <Button
                          variant="outline"
                          className="w-full flex items-center justify-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                          onClick={() => setShowReturnInput(true)}
                        >
                          <RotateCcw className="w-4 h-4" />
                          Return for Review
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <Label className="text-xs text-gray-700">Reason for return (optional)</Label>
                          <Input
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            placeholder="e.g. Missing foreign tax ID, incorrect address..."
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setShowReturnInput(false); setReturnReason(''); }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleReturnForReview}
                              disabled={returning}
                              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              {returning ? 'Returning...' : 'Confirm Return'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
