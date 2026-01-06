import { Button } from "../components/ui/button";
import { SubmissionCard } from "../components/SubmissionCard";
import { Clock, Plus, ArrowLeft } from "lucide-react";
import type { ContractorSubmission } from "../lib/types";

interface ContractorSubmissionsProps {
  submissions: ContractorSubmission[];
  onSubmitHours?: () => void;
  onBack?: () => void;
}

export function ContractorSubmissions({
  submissions,
  onSubmitHours,
  onBack,
}: ContractorSubmissionsProps) {
  // Sort submissions by date in reverse chronological order (most recent first)
  const sortedSubmissions = [...submissions].sort(
    (a, b) =>
      new Date(b.submissionDate).getTime() -
      new Date(a.submissionDate).getTime()
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Back Button & Page Header */}
      <div className="max-w-[1040px] mx-auto px-6 pt-6 pb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 -ml-2 h-9 md:h-10 px-2 text-sm md:text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Recent Submissions
        </h1>
        <p className="text-sm text-gray-600">
          View your submitted hours and invoice status
        </p>
      </div>

      {/* Submissions List */}
      <div className="max-w-[1040px] mx-auto px-6 pb-12">
        {sortedSubmissions.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">No submissions yet</p>
            <p className="text-sm text-gray-500 mb-6">
              Submit your work hours to get started
            </p>
            <Button
              onClick={onSubmitHours}
              className="h-11 bg-purple-600 hover:bg-purple-700 rounded-[10px] px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit Hours
            </Button>
          </div>
        ) : (
          // Submissions Grid
          <div className="space-y-6">
            {sortedSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
