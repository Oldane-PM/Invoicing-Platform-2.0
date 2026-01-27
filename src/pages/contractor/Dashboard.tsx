import * as React from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ContractorSubmissionDrawer } from "../../components/drawers/ContractorSubmissionDrawer";
import { InvoiceButton } from "../../components/shared/InvoiceButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Plus, Clock, Loader2, RefreshCw, Edit, Trash2 } from "lucide-react";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import { useSubmissions } from "../../lib/hooks/contractor/useSubmissions";
import { useDeleteSubmission } from "../../lib/hooks/contractor/useDeleteSubmission";
import { getWorkPeriodKey, groupSubmissionsByWorkPeriod } from "../../lib/utils";
import type { ContractorSubmission, SubmissionStatus } from "../../lib/types";

/**
 * Format Work Period for display (e.g., "Jan 2026")
 * Uses workPeriod field (YYYY-MM format) if available, falls back to submissionDate
 */
function formatWorkPeriodDisplay(submission: ContractorSubmission): string {
  // Primary: use workPeriod (stored as "YYYY-MM")
  if (submission.workPeriod) {
    try {
      const date = parse(submission.workPeriod, "yyyy-MM", new Date());
      return format(date, "MMM yyyy");
    } catch {
      // Fall through to fallback
    }
  }
  // Fallback: use submission date
  return format(new Date(submission.submissionDate), "MMM d, yyyy");
}

// Map SubmissionStatus to display status (using new workflow statuses)
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

const statusStyles: Record<DisplayStatus, string> = {
  Paid: "bg-purple-600 text-white border-purple-600",
  Approved: "bg-green-600 text-white border-green-600",
  Pending: "bg-gray-400 text-white border-gray-400",
  Rejected: "bg-red-600 text-white border-red-600",
  "Action Required": "bg-red-600 text-white border-red-600",
};

interface ContractorDashboardProps {
  onNavigateToSubmit?: () => void;
  onEditSubmission?: (submission: ContractorSubmission) => void;
}

export function ContractorDashboard({
  onNavigateToSubmit,
  onEditSubmission,
}: ContractorDashboardProps) {
  // Use the Supabase-backed submissions hook
  const { submissions, loading, error, refetch } = useSubmissions();
  const { deleteSubmission, loading: isDeleting } = useDeleteSubmission();

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [submissionToDelete, setSubmissionToDelete] = React.useState<ContractorSubmission | null>(null);

  // Get the 3 most recent submissions for the dashboard, grouped by Work Period
  const groupedRecentSubmissions = React.useMemo(() => {
    // First, sort all submissions by work period and submission date
    const sorted = [...submissions].sort((a, b) => {
      // Primary sort: by work period (descending)
      const workPeriodDiff = getWorkPeriodKey(b).getTime() - getWorkPeriodKey(a).getTime();
      if (workPeriodDiff !== 0) return workPeriodDiff;
      // Secondary sort: by submission date (descending)
      return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
    });

    // Take the 3 most recent and group them
    const recentThree = sorted.slice(0, 3);
    return groupSubmissionsByWorkPeriod(recentThree);
  }, [submissions]);

  // Flat list for checking if there are any submissions (for empty state)
  const hasSubmissions = submissions.length > 0;

  const [selectedSubmission, setSelectedSubmission] =
    React.useState<ContractorSubmission | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleCardClick = (submission: ContractorSubmission) => {
    setSelectedSubmission(submission);
    setDrawerOpen(true);
  };

  // Check if a submission can be deleted (not approved or paid)
  const isDeletable = (status: SubmissionStatus) => {
    return status !== "PAID" && status !== "AWAITING_ADMIN_PAYMENT";
  };

  const handleDeleteClick = (e: React.MouseEvent, submission: ContractorSubmission) => {
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
    
    setSubmissionToDelete(submission);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!submissionToDelete) return;
    
    const success = await deleteSubmission(submissionToDelete.id);
    
    if (success) {
      toast.success("Submission deleted");
      setIsDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    } else {
      toast.error("Failed to delete submission");
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#F9FAFB]">
        {/* Primary Action Section */}
        <div className="max-w-[1040px] mx-auto px-6 pt-8 pb-6">
          <Button
            onClick={() => onNavigateToSubmit?.()}
            className="h-11 bg-purple-600 hover:bg-purple-700 rounded-[10px] px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Submit Hours
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            Submit your work hours for the selected period
          </p>
        </div>

        {/* Recent Submissions Section */}
        <div className="max-w-[1040px] mx-auto px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Submissions
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Submission Cards */}
          <div className="space-y-6">
            {loading && submissions.length === 0 ? (
              // Loading State
              <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center">
                <Loader2 className="w-12 h-12 text-purple-500 mx-auto mb-3 animate-spin" />
                <p className="text-gray-600 font-medium">
                  Loading submissions...
                </p>
              </div>
            ) : error ? (
              // Error State
              <div className="bg-white rounded-[14px] border border-red-200 p-12 text-center">
                <p className="text-red-600 font-medium mb-2">
                  Failed to load submissions
                </p>
                <p className="text-sm text-gray-500 mb-4">{error.message}</p>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : !hasSubmissions ? (
              // Empty State
              <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No submissions yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Click "Submit Hours" above to create your first submission
                </p>
              </div>
            ) : (
              // Submissions grouped by Work Period
              groupedRecentSubmissions.map((group) => (
                <div key={group.key} className="space-y-4">
                  {/* Work Period Header */}
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      {group.periodLabel}
                    </h3>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  {/* Submissions for this Work Period */}
                  {group.rows.map((submission) => {
                    const displayStatus = mapStatusToDisplay(submission.status);

                    return (
                      <div
                        key={submission.id}
                        onClick={() => handleCardClick(submission)}
                        className="bg-white rounded-[14px] border border-[#EFEFEF] p-5 cursor-pointer transition-all hover:shadow-md"
                      >
                        {/* Row 1: Header Row - Submission Date */}
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {formatWorkPeriodDisplay(submission)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Submitted: {format(new Date(submission.submissionDate), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge
                            className={`${statusStyles[displayStatus]} border`}
                          >
                            {displayStatus}
                          </Badge>
                        </div>

                        {/* Row 2: Project Context */}
                        <p className="text-sm font-medium text-gray-600 mt-3 mb-4">
                          {submission.projectName}
                        </p>

                        {/* Row 3: Work Description */}
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-1">
                            Work Description
                          </p>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {submission.description}
                          </p>
                        </div>

                        {/* Row 4: Hours & Amount Summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Regular Hours
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {submission.regularHours}h
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Overtime</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {submission.overtimeHours}h
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Total Amount
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${submission.totalAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Rejection Reason - shown when status is REJECTED_CONTRACTOR */}
                        {submission.status === "REJECTED_CONTRACTOR" && submission.rejectionReason && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2">Manager Instructions</p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-sm text-red-900 leading-relaxed">
                                {submission.rejectionReason.trim() || "No reason provided"}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 flex justify-between gap-2">
                          {/* View Invoice Button - LEFT (uses backend-generated PDF) */}
                          <InvoiceButton submissionId={submission.id} />
                          
                          {/* RIGHT: Action Buttons */}
                          <div className="flex gap-2">
                            {/* Delete Button - only for deletable submissions */}
                            {isDeletable(submission.status) && (
                              <Button
                                onClick={(e) => handleDeleteClick(e, submission)}
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-[10px] border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                aria-label="Delete submission"
                                title="Delete submission"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {/* Edit Button - only for editable submissions */}
                            {(submission.status === "PENDING_MANAGER" || submission.status === "REJECTED_CONTRACTOR") && onEditSubmission && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSubmission(submission);
                                }}
                                variant="outline"
                                className="h-10 rounded-[10px] border-blue-600 text-blue-600 hover:bg-blue-50 px-4"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Submission Detail Drawer */}
      <ContractorSubmissionDrawer
        submission={selectedSubmission}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

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
    </>
  );
}
