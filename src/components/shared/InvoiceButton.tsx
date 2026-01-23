import { Button } from "../ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useInvoiceButton } from "../../lib/hooks/invoices";

interface InvoiceButtonProps {
  submissionId: string;
  /** Legacy prop - ignored when submissionId is provided */
  invoiceUrl?: string | null;
  /** Custom click handler - overrides default behavior */
  onClick?: (e: React.MouseEvent) => void;
}

export function InvoiceButton({ submissionId, onClick }: InvoiceButtonProps) {
  const { onClick: openInvoice, isLoading, label, error } = useInvoiceButton(submissionId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Allow custom handler to override
    if (onClick) {
      onClick(e);
      return;
    }

    try {
      await openInvoice();
    } catch (err) {
      console.error('[InvoiceButton] Error opening invoice:', err);
      toast.error('Unable to load invoice', {
        description: err instanceof Error ? err.message : 'Please try again later.',
      });
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className="h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait rounded-[10px] px-4"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <FileText className="w-4 h-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
