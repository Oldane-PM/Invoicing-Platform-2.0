import * as React from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Sheet, SheetContent, SheetHeader } from "../ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, Mail, Briefcase, DollarSign, Clock } from "lucide-react";

interface ManagerSubmission {
  id: string;
  employeeName: string;
  employeeEmail: string;
  contractorType: string;
  project: string;
  dateSubmitted: Date;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  invoiceAmount: number;
  status: "Pending" | "Approved" | "Rejected" | "Clarification" | "Paid";
  rate: number;
  notes?: string;
  rejectionReason?: string | null;
  adminNote?: string | null; // Admin's clarification request
  managerNote?: string | null; // Manager's response
}

interface ManagerSubmissionDrawerProps {
  submission: ManagerSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (submissionId: string, status: "Approved" | "Rejected", reason?: string) => void;
  /** Handler for responding to admin clarification request */
  onClarificationResponse?: (
    submissionId: string,
    action: "RESUBMIT" | "REJECT_TO_CONTRACTOR",
    note: string
  ) => void;
}

export function ManagerSubmissionDrawer({
  submission,
  open,
  onOpenChange,
  onStatusUpdate,
  onClarificationResponse,
}: ManagerSubmissionDrawerProps) {
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [clarificationResponseModalOpen, setClarificationResponseModalOpen] = React.useState(false);
  const [clarificationResponseType, setClarificationResponseType] = React.useState<"RESUBMIT" | "REJECT_TO_CONTRACTOR">("RESUBMIT");
  const [clarificationNote, setClarificationNote] = React.useState("");

  const isResolved = submission?.status === "Approved" || submission?.status === "Rejected" || submission?.status === "Paid";
  const needsClarificationResponse = submission?.status === "Clarification";
  const isPaid = submission?.status === "Paid";

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "Clarification":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Paid":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "Pending":
        return "Pending Manager Approval";
      case "Approved":
        return "Awaiting Admin Payment";
      case "Rejected":
        return "Rejected (Contractor Action Required)";
      case "Clarification":
        return "Admin Requested Clarification";
      case "Paid":
        return "Paid";
      default:
        return status || "Unknown";
    }
  };

  const handleApprove = () => {
    if (!submission) return;
    onStatusUpdate(submission.id, "Approved");
    toast.success(`${submission.employeeName}'s submission approved`, {
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    });
  };

  const handleReject = () => {
    if (!submission) return;

    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    onStatusUpdate(submission.id, "Rejected", rejectReason);
    setRejectModalOpen(false);
    setRejectReason("");
    toast.error(`${submission.employeeName}'s submission rejected`, {
      icon: <XCircle className="w-4 h-4 text-red-600" />,
    });
  };

  const handleClarificationResponse = () => {
    if (!submission || !onClarificationResponse) return;

    if (!clarificationNote.trim()) {
      toast.error("Please provide a note");
      return;
    }

    onClarificationResponse(submission.id, clarificationResponseType, clarificationNote);
    setClarificationResponseModalOpen(false);
    setClarificationNote("");

    if (clarificationResponseType === "RESUBMIT") {
      toast.success("Response sent to admin", {
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      });
    } else {
      toast.error("Submission rejected to contractor", {
        icon: <XCircle className="w-4 h-4 text-red-600" />,
      });
    }
  };

  const openClarificationModal = (type: "RESUBMIT" | "REJECT_TO_CONTRACTOR") => {
    setClarificationResponseType(type);
    setClarificationResponseModalOpen(true);
  };

  return (
    <>
      {/* Always mount the Sheet so it can open even while submission is loading/null */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:w-[720px] lg:w-[860px] sm:max-w-[60vw] p-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="mb-3">
              <div className="text-lg font-semibold text-gray-900 mb-1">Review Submission</div>
              <div className="text-sm text-gray-600">
                Evaluate and approve contractor hours
              </div>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {!submission ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">Loading submission…</div>
                <div className="h-24 rounded-lg bg-gray-50 border border-gray-200 animate-pulse" />
                <div className="h-24 rounded-lg bg-gray-50 border border-gray-200 animate-pulse" />
                <div className="h-24 rounded-lg bg-gray-50 border border-gray-200 animate-pulse" />
              </div>
            ) : (
              <>
                {/* Section 1: Contractor Info */}
                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Contractor Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-purple-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 mb-0.5">Email</div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {submission.employeeEmail}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-blue-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 mb-0.5">Project</div>
                        <div className="text-sm font-medium text-gray-900">
                          {submission.project}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-green-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 mb-0.5">Contract Type & Rate</div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-700 border-gray-200"
                          >
                            {submission.contractorType}
                          </Badge>
                          <span className="text-sm font-medium text-gray-900">
                            ${submission.rate}/hr
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Time Breakdown */}
                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Time Breakdown
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Regular Hours</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {submission.regularHours}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Overtime</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {submission.overtimeHours}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Total Hours</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {submission.totalHours}
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-purple-700 mb-1">Invoice Amount</div>
                        <div className="text-2xl font-bold text-purple-900">
                          ${submission.invoiceAmount.toLocaleString()}
                        </div>
                      </div>
                      <Clock className="w-8 h-8 text-purple-300" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Contractor Notes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Contractor Notes
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[80px]">
                    {submission.notes ? (
                      <p className="text-sm text-gray-700 leading-relaxed">{submission.notes}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No notes provided</p>
                    )}
                  </div>
                </div>

                {/* Current Status */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 uppercase tracking-wide">
                      Current Status
                    </span>
                    <Badge className={`${getStatusColor(submission.status)} border`}>
                      {getStatusLabel(submission.status)}
                    </Badge>
                  </div>
                </div>

                {/* Admin Clarification Request (only shown when status is Clarification) */}
                {submission.status === "Clarification" && submission.adminNote && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                      Admin Clarification Request
                    </h3>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <p className="text-sm text-orange-900 leading-relaxed">
                        {submission.adminNote}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason (only shown when status is Rejected) */}
                {submission.status === "Rejected" && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                      Rejection Reason
                    </h3>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-red-900 leading-relaxed">
                        {submission.rejectionReason?.trim()
                          ? submission.rejectionReason
                          : "No reason provided"}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            {!submission ? (
              <div className="flex gap-3">
                <Button disabled className="flex-1 h-11 rounded-lg">
                  Approve
                </Button>
                <Button disabled variant="outline" className="flex-1 h-11 rounded-lg">
                  Reject
                </Button>
              </div>
            ) : isPaid ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-600">
                  This submission has been paid.
                </p>
              </div>
            ) : isResolved ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-600">
                  This submission has been {submission.status.toLowerCase()}.
                </p>
              </div>
            ) : needsClarificationResponse ? (
              // Clarification response buttons
              <div className="flex gap-3">
                <Button
                  onClick={() => openClarificationModal("RESUBMIT")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resubmit to Admin
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openClarificationModal("REJECT_TO_CONTRACTOR")}
                  className="flex-1 h-11 rounded-lg border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject to Contractor
                </Button>
              </div>
            ) : (
              // Standard approve/reject buttons for pending submissions
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700 h-11 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectModalOpen(true)}
                  className="flex-1 h-11 rounded-lg border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
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
                This will be sent to the contractor.
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700"
            >
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clarification Response Modal */}
      <Dialog open={clarificationResponseModalOpen} onOpenChange={setClarificationResponseModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white p-0" aria-describedby="clarification-response-description">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {clarificationResponseType === "RESUBMIT" ? "Resubmit to Admin" : "Reject to Contractor"}
            </DialogTitle>
            <DialogDescription id="clarification-response-description" className="sr-only">
              {clarificationResponseType === "RESUBMIT"
                ? "Provide clarification response for the admin"
                : "Provide instructions for the contractor"}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-4">
            {/* Show the admin's original request */}
            {submission?.adminNote && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-xs text-orange-700 mb-1">Admin asked:</div>
                <p className="text-sm text-orange-900">{submission.adminNote}</p>
              </div>
            )}
            <div>
              <Label htmlFor="clarification-note" className="text-sm font-medium text-gray-900 mb-2 block">
                {clarificationResponseType === "RESUBMIT" ? "Your Response" : "Instructions for Contractor"}{" "}
                <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="clarification-note"
                value={clarificationNote}
                onChange={(e) => setClarificationNote(e.target.value)}
                placeholder={
                  clarificationResponseType === "RESUBMIT"
                    ? "Explain or provide additional details…"
                    : "Provide instructions for the contractor to fix their submission…"
                }
                rows={5}
                className="bg-gray-50 border-gray-200 rounded-lg resize-none"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                {clarificationResponseType === "RESUBMIT"
                  ? "This will be sent to the admin along with the submission."
                  : "This will be sent to the contractor with the rejection."}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setClarificationResponseModalOpen(false);
                setClarificationNote("");
              }}
              className="flex-1 h-10 rounded-lg border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClarificationResponse}
              disabled={!clarificationNote.trim()}
              className={`flex-1 h-10 rounded-lg ${
                clarificationResponseType === "RESUBMIT"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {clarificationResponseType === "RESUBMIT" ? "Send to Admin" : "Reject to Contractor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
