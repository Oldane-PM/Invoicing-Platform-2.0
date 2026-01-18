/**
 * Manager Hooks Exports
 *
 * All hooks for the Manager portal.
 * Pages/components should import from this index.
 */

export { useManagerDashboard } from "./useManagerDashboard";
export { useManagerSubmissions, MANAGER_SUBMISSIONS_QUERY_KEY } from "./useManagerSubmissions";
export { useSubmissionDetails, MANAGER_SUBMISSION_DETAILS_QUERY_KEY } from "./useSubmissionDetails";
export { 
  useSubmissionActions,
  useManagerApprove,
  useManagerReject,
  useManagerMarkPaid,
  useManagerRespondClarification,
} from "./useSubmissionActions";
export { useTeam } from "./useTeam";
export { useAvailableContractors } from "./useAvailableContractors";