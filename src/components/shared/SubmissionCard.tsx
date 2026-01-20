import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { SubmissionStatusPill } from "./SubmissionStatusPill";
import { InvoiceButton } from "./InvoiceButton";
import { formatDate, formatCurrency } from "../../lib/utils";
import { Edit } from "lucide-react";
import type { ContractorSubmission } from "../../lib/types";

interface SubmissionCardProps {
  submission: ContractorSubmission;
  onEdit?: (submission: ContractorSubmission) => void;
}

export function SubmissionCard({ submission, onEdit }: SubmissionCardProps) {
  // Debug logging
  console.log('[SubmissionCard] Rendering submission:', {
    id: submission.id,
    status: submission.status,
    rejectionReason: submission.rejectionReason,
    hasRejectionReason: !!submission.rejectionReason,
    isRejected: submission.status === "REJECTED_CONTRACTOR"
  });

  // Check if submission can be edited
  const isEditable = submission.status === "PENDING_MANAGER" || submission.status === "REJECTED_CONTRACTOR";

  return (
    <Card className="bg-white rounded-[14px] border border-[#EFEFEF] p-5 transition-all hover:shadow-md">
      {/* Header Row: Date + Status */}
      <div className="flex items-start justify-between mb-3">
        <p className="font-semibold text-gray-900">
          {formatDate(submission.submissionDate)}
        </p>
        <SubmissionStatusPill status={submission.status} />
      </div>

      {/* Project Name */}
      <p className="text-sm font-medium text-gray-600 mb-4">
        {submission.projectName}
      </p>

      {/* Work Description */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Work Description</p>
        <p className="text-sm text-gray-700 line-clamp-3">
          {submission.description}
        </p>
      </div>

      {/* Metrics Row: Hours & Amount */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Regular Hours</p>
          <p className="text-lg font-semibold text-gray-900">
            {submission.regularHours}h
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Overtime Hours</p>
          <p className="text-lg font-semibold text-gray-900">
            {submission.overtimeHours}h
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Total Amount</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(submission.totalAmount)}
          </p>
        </div>
      </div>

      {/* Rejection Reason - shown when status is REJECTED_CONTRACTOR */}
      {submission.status === "REJECTED_CONTRACTOR" && submission.rejectionReason && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Rejection Reason</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-900 leading-relaxed">
              {submission.rejectionReason.trim() || "No reason provided"}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        {/* Edit Button - only for editable submissions */}
        {isEditable && onEdit && (
          <Button
            onClick={() => onEdit(submission)}
            variant="outline"
            className="flex-1 h-10 rounded-[10px] border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Submission
          </Button>
        )}
        
        {/* View Invoice Button */}
        <div className={isEditable && onEdit ? "flex-1" : "w-full"}>
          <InvoiceButton invoiceUrl={submission.invoiceUrl} />
        </div>
      </div>
    </Card>
  );
}
