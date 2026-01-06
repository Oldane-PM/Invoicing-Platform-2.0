import * as React from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ContractorSubmissionDrawer } from "./ContractorSubmissionDrawer";
import { PDFInvoiceViewer } from "./PDFInvoiceViewer";
import { Plus, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export interface ContractorSubmission {
  id: string;
  submissionDate: Date;
  project: string;
  status: "Paid" | "Approved" | "Pending" | "Rejected";
  regularHours: number;
  overtimeHours: number;
  totalAmount: number;
  description: string;
  workPeriodStart: Date;
  workPeriodEnd: Date;
}

const mockSubmissions: ContractorSubmission[] = [
  {
    id: "SUB-001",
    submissionDate: new Date(2026, 0, 15),
    project: "E-Commerce Platform",
    status: "Approved",
    regularHours: 160,
    overtimeHours: 8,
    totalAmount: 8600,
    description: "Regular development work including overtime for critical deployment phase.",
    workPeriodStart: new Date(2025, 11, 1),
    workPeriodEnd: new Date(2025, 11, 31),
  },
  {
    id: "SUB-002",
    submissionDate: new Date(2026, 0, 1),
    project: "E-Commerce Platform",
    status: "Paid",
    regularHours: 168,
    overtimeHours: 0,
    totalAmount: 8400,
    description: "November work period - standard hours.",
    workPeriodStart: new Date(2025, 10, 1),
    workPeriodEnd: new Date(2025, 10, 30),
  },
  {
    id: "SUB-003",
    submissionDate: new Date(2025, 11, 15),
    project: "E-Commerce Platform",
    status: "Paid",
    regularHours: 160,
    overtimeHours: 5,
    totalAmount: 8250,
    description: "October work period with additional hours for Q4 prep.",
    workPeriodStart: new Date(2025, 9, 1),
    workPeriodEnd: new Date(2025, 9, 31),
  },
];

const statusStyles: Record<ContractorSubmission["status"], string> = {
  Paid: "bg-purple-600 text-white border-purple-600",
  Approved: "bg-green-600 text-white border-green-600",
  Pending: "bg-gray-400 text-white border-gray-400",
  Rejected: "bg-red-600 text-white border-red-600",
};

interface ContractorDashboardProps {
  onNavigateToSubmit?: () => void;
}

export function ContractorDashboard({ onNavigateToSubmit }: ContractorDashboardProps) {
  const [selectedSubmission, setSelectedSubmission] = React.useState<ContractorSubmission | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = React.useState(false);
  const [pdfInvoiceData, setPdfInvoiceData] = React.useState<any>(null);

  const handleCardClick = (submission: ContractorSubmission) => {
    setSelectedSubmission(submission);
    setDrawerOpen(true);
  };

  const handleViewPDF = (e: React.MouseEvent, submission: ContractorSubmission) => {
    e.stopPropagation(); // Prevent card click
    
    // Mock contractor profile data - in real app, fetch from backend
    const hasBankingDetails = true; // Check if banking info is complete
    
    if (!hasBankingDetails) {
      toast.error("Banking details required to generate invoice.", {
        description: "Please complete your banking details in your profile.",
      });
      return;
    }

    // Generate invoice data dynamically
    const invoiceData = {
      // Submission Data
      submissionId: submission.id,
      submissionDate: submission.submissionDate,
      workPeriodStart: submission.workPeriodStart,
      workPeriodEnd: submission.workPeriodEnd,
      regularHours: submission.regularHours,
      overtimeHours: submission.overtimeHours,
      regularDescription: submission.description,
      overtimeDescription: submission.overtimeHours > 0 
        ? "Additional hours for critical deployment phase" 
        : undefined,
      
      // Contractor Personal Info (live from profile)
      contractorName: "Sarah Johnson",
      contractorAddress: "123 Main Street, Apartment 4B, California 90210",
      contractorCountry: "United States",
      contractorEmail: "sarah.johnson@email.com",
      
      // Contract Info
      hourlyRate: 50,
      overtimeRate: 75,
      position: "Senior Developer",
      
      // Banking Details (live from profile)
      bankName: "First National Bank",
      bankAddress: "456 Banking Boulevard, Financial District, New York, NY 10004",
      swiftCode: "FNBAUS33",
      routingNumber: "021000021",
      accountType: "Checking",
      accountNumber: "9876543210",
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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Recent Submissions
          </h2>

          {/* Submission Cards */}
          <div className="space-y-6">
            {mockSubmissions.length === 0 ? (
              <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No submissions yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Click "Submit Hours" above to create your first submission
                </p>
              </div>
            ) : (
              mockSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  onClick={() => handleCardClick(submission)}
                  className="bg-white rounded-[14px] border border-[#EFEFEF] p-5 cursor-pointer transition-all hover:shadow-md"
                >
                  {/* Row 1: Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {format(submission.submissionDate, "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge className={`${statusStyles[submission.status]} border`}>
                      {submission.status}
                    </Badge>
                  </div>

                  {/* Row 2: Project Context */}
                  <p className="text-sm font-medium text-gray-600 mb-4">
                    {submission.project}
                  </p>

                  {/* Row 3: Work Description */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Work Description</p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {submission.description}
                    </p>
                  </div>

                  {/* Row 4: Hours & Amount Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Regular Hours</p>
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
                      <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${submission.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Row 5: View Invoice Button */}
                  <div className="mt-4">
                    <Button
                      onClick={(e) => handleViewPDF(e, submission)}
                      className="h-10 bg-blue-600 hover:bg-blue-700 rounded-[10px] px-4"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Invoice
                    </Button>
                  </div>
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

      {/* PDF Invoice Viewer */}
      <PDFInvoiceViewer
        invoiceData={pdfInvoiceData}
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
      />
    </>
  );
}