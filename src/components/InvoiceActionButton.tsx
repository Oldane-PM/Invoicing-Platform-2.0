/**
 * InvoiceActionButton Component
 *
 * A unified button for viewing/downloading invoices.
 * Key behavior: Always clickable (even for PENDING/FAILED status) to trigger on-demand generation.
 *
 * Props:
 * - submissionId: The submission ID to fetch the invoice for
 * - invoiceStatus: Current status (PENDING, GENERATED, FAILED, or undefined)
 * - className: Optional additional CSS classes
 */

import * as React from "react";
import { Button } from "./ui/button";
import { FileText, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase/client";
import type { InvoiceGenerationStatus } from "../lib/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

interface InvoiceActionButtonProps {
  submissionId: string;
  invoiceStatus?: InvoiceGenerationStatus | null;
  className?: string;
}

/**
 * Get button label based on invoice status
 */
function getButtonLabel(
  invoiceStatus?: InvoiceGenerationStatus | null,
  isLoading?: boolean
): string {
  if (isLoading) return "Loading...";

  switch (invoiceStatus) {
    case "GENERATED":
      return "View Invoice";
    case "PENDING":
      return "Generate Invoice";
    case "FAILED":
      return "Retry Invoice";
    default:
      // undefined/null means invoice columns not populated yet
      return "View Invoice";
  }
}

/**
 * Get button icon based on status
 */
function getButtonIcon(
  invoiceStatus?: InvoiceGenerationStatus | null,
  isLoading?: boolean
): React.ReactNode {
  if (isLoading) {
    return <Loader2 className="w-4 h-4 mr-2 animate-spin" />;
  }

  switch (invoiceStatus) {
    case "FAILED":
      return <RefreshCw className="w-4 h-4 mr-2" />;
    case "PENDING":
      return <AlertCircle className="w-4 h-4 mr-2" />;
    default:
      return <FileText className="w-4 h-4 mr-2" />;
  }
}

/**
 * Get button style based on status
 */
function getButtonStyle(invoiceStatus?: InvoiceGenerationStatus | null): string {
  switch (invoiceStatus) {
    case "GENERATED":
      return "bg-blue-600 hover:bg-blue-700 text-white";
    case "PENDING":
      return "bg-amber-500 hover:bg-amber-600 text-white";
    case "FAILED":
      return "bg-red-500 hover:bg-red-600 text-white";
    default:
      // For undefined status, use blue (will attempt generation)
      return "bg-blue-600 hover:bg-blue-700 text-white";
  }
}

export function InvoiceActionButton({
  submissionId,
  invoiceStatus,
  className = "",
}: InvoiceActionButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click handlers

    if (!submissionId) {
      toast.error("Cannot load invoice", {
        description: "Submission ID is missing.",
      });
      return;
    }

    // Get access token
    if (!supabase) {
      toast.error("Not authenticated", {
        description: "Please log in to view invoices.",
      });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("Session expired", {
        description: "Please log in again.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const url = `${API_BASE_URL}/submissions/${submissionId}/invoice`;

      // Log request details (excluding token value for security)
      console.log("[InvoiceActionButton] Request:", {
        url,
        method: "GET",
        headers: {
          Authorization: "Bearer [token present]",
          "Content-Type": "application/json",
        },
        tokenLength: session.access_token.length,
      });

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      // Log full response for debugging
      console.log("[InvoiceActionButton] Response:", {
        status: response.status,
        ok: response.ok,
        data,
      });

      if (response.ok && data.status === "success" && data.data?.url) {
        // Success - open PDF in new tab
        window.open(data.data.url, "_blank", "noopener,noreferrer");
        toast.success("Invoice opened", {
          description: data.data.invoiceNumber
            ? `Invoice ${data.data.invoiceNumber}`
            : undefined,
        });
        return;
      }

      // Handle error responses
      if (response.status === 401) {
        toast.error("Session expired", {
          description: "Please log in again.",
        });
        return;
      }

      if (response.status === 403) {
        toast.error("Access denied", {
          description: "You can only view your own invoices.",
        });
        return;
      }

      if (response.status === 404) {
        toast.error("Submission not found", {
          description: "This submission may have been deleted.",
        });
        return;
      }

      // For 500 errors with failed status, show the error message
      if (data.status === "failed") {
        toast.error("Invoice generation failed", {
          description: data.message || "Please try again or contact support.",
        });
        return;
      }

      // Generic error
      toast.error("Failed to load invoice", {
        description: data.message || "Please try again.",
      });
    } catch (error) {
      console.error("[InvoiceActionButton] Error:", error);
      toast.error("Network error", {
        description: "Could not connect to server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={`h-10 rounded-[10px] px-4 ${getButtonStyle(invoiceStatus)} ${className}`}
    >
      {getButtonIcon(invoiceStatus, isLoading)}
      {getButtonLabel(invoiceStatus, isLoading)}
    </Button>
  );
}
