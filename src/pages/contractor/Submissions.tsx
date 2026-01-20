import { useEffect, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { SubmissionCard } from "../../components/shared/SubmissionCard";
import { Clock, Plus, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useSubmissions } from "../../lib/hooks/contractor/useSubmissions";
import { groupSubmissionsByWorkPeriod } from "../../lib/utils";
import type { ContractorSubmission } from "../../lib/types";

interface ContractorSubmissionsProps {
  onSubmitHours?: () => void;
  onBack?: () => void;
  onEditSubmission?: (submission: ContractorSubmission) => void;
}

export function ContractorSubmissions({
  onSubmitHours,
  onBack,
  onEditSubmission,
}: ContractorSubmissionsProps) {
  const { submissions, loading, error, refetch } = useSubmissions();

  // Refetch when component mounts (to get latest data after navigation)
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Group submissions by Work Period (e.g., "Apr 2026") instead of flat list
  const groupedSubmissions = useMemo(
    () => groupSubmissionsByWorkPeriod(submissions),
    [submissions]
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              My Invoices
            </h1>
            <p className="text-sm text-gray-600">
              View your submitted hours and invoice history
            </p>
          </div>
          <Button
            variant="outline"
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
      </div>

      {/* Submissions List */}
      <div className="max-w-[1040px] mx-auto px-6 pb-12">
        {loading && submissions.length === 0 ? (
          // Loading State
          <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center">
            <Loader2 className="w-12 h-12 text-purple-500 mx-auto mb-3 animate-spin" />
            <p className="text-gray-600 font-medium">Loading submissions...</p>
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
              Try Again
            </Button>
          </div>
        ) : groupedSubmissions.length === 0 ? (
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
          // Submissions grouped by Work Period
          <div className="space-y-8">
            {groupedSubmissions.map((group) => (
              <div key={group.key} className="space-y-4">
                {/* Work Period Header */}
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {group.periodLabel}
                  </h3>
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    {group.rows.length} {group.rows.length === 1 ? "submission" : "submissions"}
                  </span>
                </div>

                {/* Submissions for this Work Period */}
                <div className="space-y-4">
                  {group.rows.map((submission) => (
                    <SubmissionCard 
                      key={submission.id} 
                      submission={submission}
                      onEdit={onEditSubmission}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
