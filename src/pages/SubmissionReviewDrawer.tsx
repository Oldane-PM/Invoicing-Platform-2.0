import * as React from "react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "../components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  useSubmissionDetails,
  useApproveSubmission,
  useRejectSubmission,
  useRequestClarification,
} from "../lib/hooks/adminDashboard";

interface SubmissionReviewDrawerProps {
  submissionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionReviewDrawer({
  submissionId,
  open,
  onOpenChange,
}: SubmissionReviewDrawerProps) {
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [clarificationModalOpen, setClarificationModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [clarificationMessage, setClarificationMessage] = React.useState("");

  // Fetch submission details
  const { data: submission, isLoading, error } = useSubmissionDetails(submissionId);

  // Mutations
  const approveMutation = useApproveSubmission();
  const rejectMutation = useRejectSubmission();
  const clarifyMutation = useRequestClarification();

  // Get admin user ID (in production, this would come from auth context)
  // For now, we'll use a placeholder - you'll need to integrate with your auth system
  const adminUserId = "admin-user-id"; // TODO: Get from auth context

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "needs_clarification":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "submitted":
        return "Pending";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "needs_clarification":
        return "Needs Clarification";
      default:
        return status;
    }
  };

  const handleApprove = () => {
    if (!submissionId) return;
    
    approveMutation.mutate(
      { submissionId, adminUserId },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleReject = () => {
    if (!submissionId || !rejectReason.trim()) return;

    rejectMutation.mutate(
      { submissionId, reason: rejectReason, adminUserId },
      {
        onSuccess: () => {
          setRejectModalOpen(false);
          setRejectReason("");
          onOpenChange(false);
        },
      }
    );
  };

  const handleClarification = () => {
    if (!submissionId || !clarificationMessage.trim()) return;

    clarifyMutation.mutate(
      { submissionId, message: clarificationMessage, adminUserId },
      {
        onSuccess: () => {
          setClarificationModalOpen(false);
          setClarificationMessage("");
          onOpenChange(false);
        },
      }
    );
  };

  const isResolved = submission?.status === "approved" || submission?.status === "rejected";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:w-[440px] sm:max-w-[40%] p-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
          {/* Drawer Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="mb-3">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                Submission Review
              </div>
              <div className="text-sm text-gray-600">
                Evaluate contractor submission for payment
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 mb-3 animate-spin text-gray-400" />
                <div className="text-sm text-gray-600">Loading submission details...</div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
                <div className="text-sm text-gray-900 font-medium mb-1">Failed to load submission</div>
                <div className="text-sm text-gray-600">
                  {error instanceof Error ? error.message : 'An error occurred'}
                </div>
              </div>
            ) : !submission ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-sm text-gray-600">No submission selected</div>
              </div>
            ) : (
              <>
                {/* Submission Summary */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900">Submission Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-600">Contractor</span>
                      <span className="text-sm font-medium text-gray-900">{submission.contractorName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-600">Email</span>
                      <span className="text-sm font-medium text-gray-900">{submission.contractorEmail}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-600">Submission Period</span>
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(submission.periodStart), "MMM d")} - {format(new Date(submission.periodEnd), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-600">Submitted On</span>
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(submission.submittedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-600">Current Status</span>
                      <Badge className={`${getStatusColor(submission.status)} border`}>
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-600">Project</span>
                      <span className="text-sm font-medium text-gray-900">{submission.projectName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-gray-600">Reporting Manager</span>
                      <span className="text-sm font-medium text-gray-900">{submission.managerName}</span>
                    </div>
                  </div>
                </div>

                {/* Time Breakdown */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900">Time Breakdown</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Regular Hours</div>
                      <div className="text-lg font-semibold text-gray-900">{submission.regularHours}h</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Overtime Hours</div>
                      <div className="text-lg font-semibold text-gray-900">{submission.overtimeHours}h</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-xs text-purple-700 mb-1">Total Amount</div>
                      <div className="text-lg font-semibold text-purple-900">${submission.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                {submission.description && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-900">Description</h3>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700">{submission.description}</p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason (if rejected) */}
                {submission.rejectionReason && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-900">Rejection Reason</h3>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-red-700">{submission.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {/* Clarification Message (if needs clarification) */}
                {submission.clarificationMessage && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-900">Clarification Request</h3>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <p className="text-sm text-yellow-700">{submission.clarificationMessage}</p>
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {submission.notes && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700">{submission.notes}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Footer with CTAs */}
          {submission && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              {isResolved ? (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600">
                    This submission has already been resolved.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={handleApprove}
                    className="w-full bg-green-600 hover:bg-green-700 h-10 rounded-lg"
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setRejectModalOpen(true)}
                      className="h-10 rounded-lg border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400"
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setClarificationModalOpen(true)}
                      className="h-10 rounded-lg border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-400"
                      disabled={clarifyMutation.isPending}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Clarify
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white p-0" aria-describedby="reject-description">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Reject Submission
            </DialogTitle>
            <DialogDescription id="reject-description" className="sr-only">
              Provide a reason for rejecting this submission
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-4">
            <div>
              <Label htmlFor="reject-reason" className="text-sm font-medium text-gray-900 mb-2 block">
                Reason for Rejection <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide reason for rejection…"
                rows={5}
                className="bg-gray-50 border-gray-200 rounded-lg resize-none"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                This will be sent to the contractor and reporting manager.
              </p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectReason("");
              }}
              className="flex-1 h-10 rounded-lg border-gray-200"
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clarification Modal */}
      <Dialog open={clarificationModalOpen} onOpenChange={setClarificationModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white p-0" aria-describedby="clarification-description">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Request Clarification
            </DialogTitle>
            <DialogDescription id="clarification-description" className="sr-only">
              Send a clarification request to the reporting manager
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-4">
            {submission && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs text-blue-700 mb-1">Recipient</div>
                <div className="font-medium text-blue-900">{submission.managerName}</div>
              </div>
            )}
            <div>
              <Label htmlFor="clarification-message" className="text-sm font-medium text-gray-900 mb-2 block">
                Message <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="clarification-message"
                value={clarificationMessage}
                onChange={(e) => setClarificationMessage(e.target.value)}
                placeholder="Describe what clarification is needed…"
                rows={5}
                className="bg-gray-50 border-gray-200 rounded-lg resize-none"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                The reporting manager will be notified to provide additional details.
              </p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setClarificationModalOpen(false);
                setClarificationMessage("");
              }}
              className="flex-1 h-10 rounded-lg border-gray-200"
              disabled={clarifyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClarification}
              disabled={!clarificationMessage.trim() || clarifyMutation.isPending}
              className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              {clarifyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}