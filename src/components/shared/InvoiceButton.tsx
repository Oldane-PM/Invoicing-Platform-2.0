import { Button } from "../ui/button";
import { FileText } from "lucide-react";

interface InvoiceButtonProps {
  invoiceUrl?: string | null;
  onClick?: (e: React.MouseEvent) => void;
}

export function InvoiceButton({ invoiceUrl, onClick }: InvoiceButtonProps) {
  const isDisabled = !invoiceUrl;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
      return;
    }
    if (invoiceUrl) {
      window.open(invoiceUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      className="h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-[10px] px-4"
    >
      <FileText className="w-4 h-4 mr-2" />
      View Invoice
    </Button>
  );
}
