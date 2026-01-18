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
import { Pencil, Calendar, DollarSign, Clock } from "lucide-react";
import { useContractorSubmissions } from "../../lib/hooks/admin/useContractorSubmissions";
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
 * Normalize status from DB (uppercase) to display format (Title Case)
 */
function normalizeStatus(status: string): "Pending" | "Approved" | "Rejected" | "Paid" {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "PAID":
      return "Paid";
    case "PENDING":
    case "NEEDS_CLARIFICATION":
    default:
      return "Pending";
  }
}

type TabType = "submissions" | "contract";

export function ContractorDetailDrawer({
  open,
  onOpenChange,
  employee,
  onSave,
}: ContractorDetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>("submissions");
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState<EmployeeDirectoryRow | null>(null);

  // Fetch submissions directly
  const { data: realSubmissions, isLoading: isLoadingSubmissions } = useContractorSubmissions(
    employee?.contractor_id // Use the correct ID field from EmployeeDirectoryRow
  );

  // Group submissions by Work Period
  const groupedSubmissions = React.useMemo(
    () => groupSubmissionsByWorkPeriod(realSubmissions ?? []),
    [realSubmissions]
  );

  React.useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
      setIsEditing(false);
      setActiveTab("submissions");
    }
  }, [employee]);

  const handleSave = () => {
    if (!formData) return;

    // Validation
    if (!formData.contract_start || !formData.contract_end) {
      toast.error("Please fill in all required fields");
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

    onSave(formData);
    setIsEditing(false);
    toast.success("Contract information updated successfully");
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
                            ? format(new Date(formData.contract_start), "MMM d, yyyy")
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
                            ? format(new Date(formData.contract_end), "MMM d, yyyy")
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
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Reporting Manager</div>
                      <div className="font-medium text-sm text-gray-900">
                        {formData.reporting_manager_name}
                      </div>
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
                        value={formData.contract_start ? format(new Date(formData.contract_start), "yyyy-MM-dd") : ""}
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
                        value={formData.contract_end ? format(new Date(formData.contract_end), "yyyy-MM-dd") : ""}
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
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
