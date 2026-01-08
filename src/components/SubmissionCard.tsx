import { Card } from "./ui/card";
import { SubmissionStatusPill } from "./SubmissionStatusPill";
import { InvoiceActionButton } from "./InvoiceActionButton";
import { formatDate, formatCurrency } from "../lib/utils";
import type { ContractorSubmission } from "../lib/types";

interface SubmissionCardProps {
  submission: ContractorSubmission;
}

export function SubmissionCard({ submission }: SubmissionCardProps) {
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

      {/* View Invoice Button */}
      <div className="mt-4">
        <InvoiceActionButton
          submissionId={submission.id}
          invoiceStatus={submission.invoiceStatus}
        />
      </div>
    </Card>
  );
}
