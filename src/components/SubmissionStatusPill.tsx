import { Badge } from "./ui/badge";
import type { SubmissionStatus } from "../lib/types";

const statusConfig: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  APPROVED: {
    label: "Approved",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  PAID: {
    label: "Paid",
    className: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
  PENDING: {
    label: "Pending",
    className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
  NEEDS_CLARIFICATION: {
    label: "Needs Clarification",
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
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
