import { Badge } from "../ui/badge";
import type { SubmissionStatus } from "../../lib/types";
import { CONTRACTOR_STATUS_LABELS } from "../../lib/types";

// Status config for styling and display
const statusConfig: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  PENDING_MANAGER: {
    label: CONTRACTOR_STATUS_LABELS.PENDING_MANAGER,
    className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100",
  },
  AWAITING_ADMIN_PAYMENT: {
    label: CONTRACTOR_STATUS_LABELS.AWAITING_ADMIN_PAYMENT,
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  REJECTED_CONTRACTOR: {
    label: CONTRACTOR_STATUS_LABELS.REJECTED_CONTRACTOR,
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
  CLARIFICATION_REQUESTED: {
    label: CONTRACTOR_STATUS_LABELS.CLARIFICATION_REQUESTED,
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  PAID: {
    label: CONTRACTOR_STATUS_LABELS.PAID,
    className: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
};

interface SubmissionStatusPillProps {
  status: SubmissionStatus;
}

export function SubmissionStatusPill({ status }: SubmissionStatusPillProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={`${config.className} border font-medium`}>
      {config.label}
    </Badge>
  );
}
