import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader } from "../ui/sheet";
import { Calendar, Clock, DollarSign, FileText, AlertCircle, Edit } from "lucide-react";
import { format, parse } from "date-fns";
import type { ContractorSubmission, SubmissionStatus } from "../../lib/types";
import { CONTRACTOR_STATUS_LABELS } from "../../lib/types";

interface ContractorSubmissionDrawerProps {
  submission: ContractorSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Handler for resubmitting a rejected submission */
  onResubmit?: (submissionId: string) => void;
}

// Map SubmissionStatus to display status for styling
type DisplayStatus = "Paid" | "Approved" | "Pending" | "Rejected" | "Action Required";

function mapStatusToDisplay(status: SubmissionStatus): DisplayStatus {
  switch (status) {
    case "PAID":
      return "Paid";
    case "AWAITING_ADMIN_PAYMENT":
      return "Approved";
    case "REJECTED_CONTRACTOR":
      return "Action Required";
    case "PENDING_MANAGER":
    case "CLARIFICATION_REQUESTED":
    default:
      return "Pending";
  }
}

function getStatusLabel(status: SubmissionStatus): string {
  return CONTRACTOR_STATUS_LABELS[status] || status;
}

const statusStyles: Record<DisplayStatus, string> = {
  Paid: "bg-purple-600 text-white border-purple-600",
  Approved: "bg-green-600 text-white border-green-600",
  Pending: "bg-gray-400 text-white border-gray-400",
  Rejected: "bg-red-600 text-white border-red-600",
  "Action Required": "bg-red-600 text-white border-red-600",
};

export function ContractorSubmissionDrawer({
  submission,
  open,
  onOpenChange,
  onResubmit,
}: ContractorSubmissionDrawerProps) {
  if (!submission) return null;

  const displayStatus = mapStatusToDisplay(submission.status);
  const isRejected = submission.status === "REJECTED_CONTRACTOR";
  const canResubmit = isRejected && onResubmit;

  // Parse work period to get start/end dates for display
  const workPeriodDate = submission.workPeriod
    ? parse(submission.workPeriod, "yyyy-MM", new Date())
    : new Date();
  const workPeriodStart = new Date(
    workPeriodDate.getFullYear(),
    workPeriodDate.getMonth(),
    1
  );
  const workPeriodEnd = new Date(
    workPeriodDate.getFullYear(),
    workPeriodDate.getMonth() + 1,
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[460px] sm:max-w-[40%] p-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
        {/* Drawer Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="mb-3">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              Submission Details
            </div>
            <div className="text-sm text-gray-600">
              Review your submitted hours
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Status */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 uppercase tracking-wide">Status</span>
              <Badge className={`${statusStyles[displayStatus]} border`}>
                {getStatusLabel(submission.status)}
              </Badge>
            </div>
          </div>

          {/* Rejection Reason - only shown when rejected */}
          {isRejected && submission.rejectionReason && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Action Required
              </h3>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-xs text-red-700 mb-1">Manager Instructions:</div>
                <p className="text-sm text-red-900 leading-relaxed">
                  {submission.rejectionReason}
                </p>
              </div>
            </div>
          )}

          {/* Project & Work Period */}
          <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Project Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-purple-700" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-0.5">Project</div>
                  <div className="text-sm font-medium text-gray-900">{submission.projectName}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-0.5">Work Period</div>
                  <div className="text-sm font-medium text-gray-900">
                    {format(workPeriodStart, "MMM d")} –{" "}
                    {format(workPeriodEnd, "MMM d, yyyy")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time Breakdown */}
          <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Time Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Regular Hours</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {submission.regularHours}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Overtime</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {submission.overtimeHours}
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-purple-700 mb-1">Total Amount</div>
                  <div className="text-2xl font-bold text-purple-900">
                    ${submission.totalAmount.toLocaleString()}
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-purple-300" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Description
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                {submission.description}
              </p>
            </div>
            {submission.overtimeDescription && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Overtime Description</div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {submission.overtimeDescription}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          {canResubmit ? (
            <div className="space-y-3">
              <Button
                onClick={() => onResubmit(submission.id)}
                className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit & Resubmit
              </Button>
              <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                <Clock className="w-3 h-3" />
                <span>
                  Originally submitted on {format(new Date(submission.submissionDate), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                Submitted on {format(new Date(submission.submissionDate), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
