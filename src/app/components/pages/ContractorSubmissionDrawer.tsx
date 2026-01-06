import * as React from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader } from "../ui/sheet";
import { X, Calendar, Clock, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import type { ContractorSubmission } from "./ContractorDashboard";

interface ContractorSubmissionDrawerProps {
  submission: ContractorSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusStyles: Record<ContractorSubmission["status"], string> = {
  Paid: "bg-purple-600 text-white border-purple-600",
  Approved: "bg-green-600 text-white border-green-600",
  Pending: "bg-gray-400 text-white border-gray-400",
  Rejected: "bg-red-600 text-white border-red-600",
};

export function ContractorSubmissionDrawer({
  submission,
  open,
  onOpenChange,
}: ContractorSubmissionDrawerProps) {
  if (!submission) return null;

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
              <Badge className={`${statusStyles[submission.status]} border`}>
                {submission.status}
              </Badge>
            </div>
          </div>

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
                  <div className="text-sm font-medium text-gray-900">{submission.project}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-0.5">Work Period</div>
                  <div className="text-sm font-medium text-gray-900">
                    {format(submission.workPeriodStart, "MMM d")} –{" "}
                    {format(submission.workPeriodEnd, "MMM d, yyyy")}
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
          </div>
        </div>

        {/* Footer - Read-only message */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              Submitted on {format(submission.submissionDate, "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}