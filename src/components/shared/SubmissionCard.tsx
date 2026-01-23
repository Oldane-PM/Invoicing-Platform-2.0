import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { SubmissionStatusPill } from "./SubmissionStatusPill";
import { InvoiceButton } from "./InvoiceButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { formatDate, formatCurrency } from "../../lib/utils";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteSubmission } from "../../lib/hooks/contractor";
import type { ContractorSubmission } from "../../lib/types";

interface SubmissionCardProps {
  submission: ContractorSubmission;
  onEdit?: (submission: ContractorSubmission) => void;
}

export function SubmissionCard({ submission, onEdit }: SubmissionCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { deleteSubmission, loading: isDeleting } = useDeleteSubmission();

  // Check if submission can be edited
  const isEditable = submission.status === "PENDING_MANAGER" || submission.status === "REJECTED_CONTRACTOR";
  
  // Check if submission can be deleted (not approved or paid)
  const isDeletable = submission.status !== "PAID" && submission.status !== "AWAITING_ADMIN_PAYMENT";

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Show specific message if trying to delete non-deletable submission
    if (submission.status === "PAID") {
      toast.error("Paid submissions cannot be deleted");
      return;
    }
    if (submission.status === "AWAITING_ADMIN_PAYMENT") {
      toast.error("Approved submissions cannot be deleted");
      return;
    }
    
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    const success = await deleteSubmission(submission.id);
    
    if (success) {
      toast.success("Submission deleted");
      setIsDeleteDialogOpen(false);
    } else {
      toast.error("Failed to delete submission");
    }
  };

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

      {/* Action Buttons Row */}
      <div className="mt-4 flex flex-row justify-between gap-2">
        {/* LEFT: Invoice/View Invoice Button */}
        <InvoiceButton submissionId={submission.id} />
        
        {/* RIGHT: Action Buttons */}
        <div className="flex gap-2">
          {/* Delete Button - only for deletable submissions */}
          {isDeletable && (
            <Button
              onClick={handleDeleteClick}
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-[10px] border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              aria-label="Delete submission"
              title="Delete submission"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          
          {/* Edit Button (conditional) */}
          {isEditable && onEdit && (
            <Button
              onClick={() => onEdit(submission)}
              variant="outline"
              className="h-10 rounded-[10px] border-blue-600 text-blue-600 hover:bg-blue-50 px-4"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Submission
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
