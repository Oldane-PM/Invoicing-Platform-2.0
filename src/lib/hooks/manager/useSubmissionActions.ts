/**
 * useSubmissionActions Hook
 *
 * Provides actions for managing submissions (approve, reject, mark paid).
 * Uses repos for data access - NEVER imports supabase client directly.
 */

import { useState, useCallback } from "react";
import {
  approveSubmission,
  rejectSubmission,
  markSubmissionPaid,
} from "../../supabase/repos/managerSubmissions.repo";
import { useAuth } from "../useAuth";

interface ActionState {
  loading: boolean;
  error: Error | null;
}

interface UseSubmissionActionsResult {
  approving: ActionState;
  rejecting: ActionState;
  markingPaid: ActionState;
  approve: (submissionId: string) => Promise<boolean>;
  reject: (submissionId: string, reason: string) => Promise<boolean>;
  markPaid: (submissionId: string) => Promise<boolean>;
}

const initialActionState: ActionState = {
  loading: false,
  error: null,
};

export function useSubmissionActions(): UseSubmissionActionsResult {
  const { user } = useAuth();
  const [approving, setApproving] = useState<ActionState>(initialActionState);
  const [rejecting, setRejecting] = useState<ActionState>(initialActionState);
  const [markingPaid, setMarkingPaid] = useState<ActionState>(initialActionState);

  const approve = useCallback(
    async (submissionId: string): Promise<boolean> => {
      if (!user?.id) {
        setApproving({ loading: false, error: new Error("Not authenticated") });
        return false;
      }

      setApproving({ loading: true, error: null });

      try {
        await approveSubmission(submissionId, user.id);
        setApproving({ loading: false, error: null });
        return true;
      } catch (err) {
        console.error("[useSubmissionActions] Error approving:", err);
        const error = err instanceof Error ? err : new Error("Failed to approve submission");
        setApproving({ loading: false, error });
        return false;
      }
    },
    [user?.id]
  );

  const reject = useCallback(
    async (submissionId: string, reason: string): Promise<boolean> => {
      if (!user?.id) {
        setRejecting({ loading: false, error: new Error("Not authenticated") });
        return false;
      }

      setRejecting({ loading: true, error: null });

      try {
        await rejectSubmission(submissionId, user.id, reason);
        setRejecting({ loading: false, error: null });
        return true;
      } catch (err) {
        console.error("[useSubmissionActions] Error rejecting:", err);
        const error = err instanceof Error ? err : new Error("Failed to reject submission");
        setRejecting({ loading: false, error });
        return false;
      }
    },
    [user?.id]
  );

  const markPaid = useCallback(
    async (submissionId: string): Promise<boolean> => {
      if (!user?.id) {
        setMarkingPaid({ loading: false, error: new Error("Not authenticated") });
        return false;
      }

      setMarkingPaid({ loading: true, error: null });

      try {
        await markSubmissionPaid(submissionId, user.id);
        setMarkingPaid({ loading: false, error: null });
        return true;
      } catch (err) {
        console.error("[useSubmissionActions] Error marking paid:", err);
        const error = err instanceof Error ? err : new Error("Failed to mark submission as paid");
        setMarkingPaid({ loading: false, error });
        return false;
      }
    },
    [user?.id]
  );

  return {
    approving,
    rejecting,
    markingPaid,
    approve,
    reject,
    markPaid,
  };
}
