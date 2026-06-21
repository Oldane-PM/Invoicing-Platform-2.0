import * as React from "react";
import { Button } from "../../components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useWorkOrder, useSignWorkOrderContractor } from "../../lib/hooks/useSystemWorkOrders";
import { WorkOrderDocument } from "../../components/shared/WorkOrderDocument";
import { SignaturePad } from "../../components/shared/SignaturePad";

interface SignWorkOrderProps {
  workOrderId: string;
  onClose: () => void;
}

export function SignWorkOrder({
  workOrderId,
  onClose,
}: SignWorkOrderProps) {
  const { data: workOrder, isLoading } = useWorkOrder(workOrderId);
  const signMutation = useSignWorkOrderContractor();
  
  const [isSigning, setIsSigning] = React.useState(false);

  const handleSign = (signatureData: string, signatureName: string) => {
    if (!workOrderId) return;
    
    signMutation.mutate(
      { id: workOrderId, signatureName, signatureData },
      {
        onSuccess: () => {
          setIsSigning(false);
          onClose();
        }
      }
    );
  };

  const handlePrint = async () => {
    const element = document.getElementById("work-order-document-container");
    if (!element) return;
    
    try {
      // @ts-ignore
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      const opt = {
        margin:       0.5,
        filename:     `Work_Order_${workOrder?.contractor_name?.replace(/\s+/g, '_') || 'Contractor'}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
      };
      
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Failed to generate PDF", error);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full bg-gray-50/50 -mx-8 px-8 py-4 print:p-0 print:m-0 print:bg-white">
      <div className="flex justify-between items-center h-10 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Work Order</h2>
            <p className="text-sm text-gray-600">Review your work order details.</p>
          </div>
        </div>
        {workOrder?.status === "COMPLETED" && (
          <Button variant="outline" onClick={handlePrint}>
            Download PDF
          </Button>
        )}
      </div>

      <div className="flex-1 pb-12 print:p-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : workOrder ? (
          <div className="flex flex-col items-center gap-8 print:block w-full">
            {/* The Document */}
            <div className="w-full max-w-4xl bg-white" id="work-order-document-container">
              <WorkOrderDocument workOrder={workOrder} />
            </div>

            {/* Signature Action Section (Hidden when printing) */}
            <div className="print:hidden w-full max-w-3xl flex justify-center pb-12 mt-4">
              {workOrder.status === "PENDING_CONTRACTOR_SIGNATURE" ? (
                isSigning ? (
                  <SignaturePad 
                    onSign={handleSign} 
                    onCancel={() => setIsSigning(false)} 
                  />
                ) : (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 w-full text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Signature Required</h3>
                    <p className="text-gray-600 mb-6">
                      Please review the terms above carefully. Once you are ready to accept, click the button below to provide your digital signature.
                    </p>
                    <Button 
                      size="lg"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => setIsSigning(true)}
                    >
                      Sign Work Order
                    </Button>
                  </div>
                )
              ) : workOrder.status === "PENDING_FINANCE_SIGNATURE" ? (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 w-full text-center">
                  <h3 className="text-lg font-semibold text-blue-900 mb-1">Awaiting Counter-Signature</h3>
                  <p className="text-blue-700">You have successfully signed this document. It is now awaiting the Finance Officer's counter-signature.</p>
                </div>
              ) : workOrder.status === "COMPLETED" ? (
                <div className="bg-green-50 p-6 rounded-xl border border-green-200 w-full text-center">
                  <h3 className="text-lg font-semibold text-green-900 mb-1">Work Order Completed</h3>
                  <p className="text-green-700">Both parties have successfully signed this document.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64 text-gray-500">
            Work order not found.
          </div>
        )}
      </div>
    </div>
  );
}
