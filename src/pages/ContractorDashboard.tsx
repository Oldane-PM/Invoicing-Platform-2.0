import * as React from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ContractorSubmissionDrawer } from "./ContractorSubmissionDrawer";
import { PDFInvoiceViewer } from "./PDFInvoiceViewer";
import { Plus, Clock, FileText, Loader2, RefreshCw } from "lucide-react";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import { useSubmissions } from "../lib/hooks/useSubmissions";
import { useAuth } from "../lib/hooks/useAuth";
import type { ContractorSubmission, SubmissionStatus } from "../lib/types";

// Map SubmissionStatus to display status
type DisplayStatus = "Paid" | "Approved" | "Pending" | "Rejected";

function mapStatusToDisplay(status: SubmissionStatus): DisplayStatus {
  switch (status) {
    case "PAID":
      return "Paid";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "PENDING":
    case "NEEDS_CLARIFICATION":
    default:
      return "Pending";
  }
}

const statusStyles: Record<DisplayStatus, string> = {
  Paid: "bg-purple-600 text-white border-purple-600",
  Approved: "bg-green-600 text-white border-green-600",
  Pending: "bg-gray-400 text-white border-gray-400",
  Rejected: "bg-red-600 text-white border-red-600",
};

interface ContractorDashboardProps {
  onNavigateToSubmit?: () => void;
  onNavigateToSubmissions?: () => void;
}

export function ContractorDashboard({
  onNavigateToSubmit,
  onNavigateToSubmissions,
}: ContractorDashboardProps) {
  // Use the Supabase-backed submissions hook
  const { submissions, loading, error, refetch } = useSubmissions();
  const { profile } = useAuth(); // Get live profile data

  // Get the 3 most recent submissions for the dashboard
  const recentSubmissions = React.useMemo(() => {
    return [...submissions]
      .sort(
        (a, b) =>
          new Date(b.submissionDate).getTime() -
          new Date(a.submissionDate).getTime()
      )
      .slice(0, 3);
  }, [submissions]);

  const [selectedSubmission, setSelectedSubmission] =
    React.useState<ContractorSubmission | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = React.useState(false);
  const [pdfInvoiceData, setPdfInvoiceData] = React.useState<any>(null);

  const handleCardClick = (submission: ContractorSubmission) => {
    setSelectedSubmission(submission);
    setDrawerOpen(true);
  };

  const handleViewPDF = (
    e: React.MouseEvent,
    submission: ContractorSubmission
  ) => {
    e.stopPropagation(); // Prevent card click

    // Check if invoice URL exists
    if (!submission.invoiceUrl) {
      toast.info("Invoice not yet available.", {
        description: "Invoice will be generated once the submission is approved.",
      });
      return;
    }

    // Parse work period to get start/end dates
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

    // Generate invoice data dynamically
    const invoiceData = {
      // Submission Data
      submissionId: submission.id,
      submissionDate: new Date(submission.submissionDate),
      workPeriodStart,
      workPeriodEnd,
      regularHours: submission.regularHours,
      overtimeHours: submission.overtimeHours,
      regularDescription: submission.description,
      overtimeDescription: submission.overtimeDescription || undefined,

      // Contractor Personal Info (live from profile)
      contractorName: profile?.fullName || "Contractor Name",
      contractorAddress: "Address Not on File", // Placeholder until DB update
      contractorCountry: "United States",
      contractorEmail: profile?.email || "email@example.com",

      // Contract Info
      hourlyRate: 75, // Ideally from DB, but keeping simple for now
      overtimeRate: 112.5,
      position: profile?.role === "CONTRACTOR" ? "Contractor" : "Staff",

      // Banking Details (Placeholder until schema supports bank details)
      bankName: "Bank details on file", 
      bankAddress: "---",
      swiftCode: "---",
      routingNumber: "---",
      accountType: "---",
      accountNumber: "****",
      currency: "USD",

      // Company/Client Info
      companyName: "TechCorp Inc.",
      companyAddress: "789 Business Park, Suite 100, San Francisco, CA 94102",
    };

    setPdfInvoiceData(invoiceData);
    setPdfViewerOpen(true);
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
            <div className="flex items-center gap-2">
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
              {onNavigateToSubmissions && (
                <Button
                  variant="outline"
                  onClick={onNavigateToSubmissions}
                  className="bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                >
                  View All Invoices
                </Button>
              )}
            </div>
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
            ) : recentSubmissions.length === 0 ? (
              // Empty State
              <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No submissions yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Click "Submit Hours" above to create your first submission
                </p>
              </div>
            ) : (
              // Submissions List
              recentSubmissions.map((submission) => {
                const displayStatus = mapStatusToDisplay(submission.status);

                return (
                  <div
                    key={submission.id}
                    onClick={() => handleCardClick(submission)}
                    className="bg-white rounded-[14px] border border-[#EFEFEF] p-5 cursor-pointer transition-all hover:shadow-md"
                  >
                    {/* Row 1: Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {format(
                            new Date(submission.submissionDate),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                      <Badge
                        className={`${statusStyles[displayStatus]} border`}
                      >
                        {displayStatus}
                      </Badge>
                    </div>

                    {/* Row 2: Project Context */}
                    <p className="text-sm font-medium text-gray-600 mb-4">
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

                    {/* Row 5: View Invoice Button */}
                    <div className="mt-4">
                      <Button
                        onClick={(e) => handleViewPDF(e, submission)}
                        disabled={!submission.invoiceUrl}
                        className={`h-10 rounded-[10px] px-4 ${
                          submission.invoiceUrl
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-300 cursor-not-allowed"
                        }`}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {submission.invoiceUrl
                          ? "View Invoice"
                          : "Invoice Pending"}
                      </Button>
                    </div>
                  </div>
                );
              })
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

      {/* PDF Invoice Viewer */}
      <PDFInvoiceViewer
        invoiceData={pdfInvoiceData}
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
      />
    </>
  );
}
