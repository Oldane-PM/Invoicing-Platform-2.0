"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { X, Download } from "lucide-react";
import { format } from "date-fns";

interface InvoiceData {
  // Submission Data
  submissionId: string;
  submissionDate: Date;
  workPeriodStart: Date;
  workPeriodEnd: Date;
  regularHours: number;
  overtimeHours: number;
  regularDescription: string;
  overtimeDescription?: string;
  
  // Contractor Personal Info
  contractorName: string;
  contractorAddress: string;
  contractorCountry: string;
  contractorEmail: string;
  
  // Contract Info
  hourlyRate: number;
  overtimeRate: number;
  position: string;
  
  // Banking Details
  bankName?: string;
  bankAddress?: string;
  swiftCode?: string;
  routingNumber?: string;
  accountType?: string;
  accountNumber?: string;
  currency?: string;
  
  // Company/Client Info
  companyName: string;
  companyAddress: string;
}

interface PDFInvoiceViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceData | null;
}

export function PDFInvoiceViewer({ open, onOpenChange, invoiceData }: PDFInvoiceViewerProps) {
  if (!invoiceData) return null;

  // Calculate amounts
  const regularAmount = invoiceData.regularHours * invoiceData.hourlyRate;
  const overtimeAmount = invoiceData.overtimeHours * invoiceData.overtimeRate;
  const totalAmount = regularAmount + overtimeAmount;

  // Generate invoice number (in real app, this would come from backend)
  const invoiceNumber = `INV-${invoiceData.submissionId}`;
  const invoiceDate = format(invoiceData.submissionDate, "MMM d, yyyy");
  const dueDate = format(new Date(invoiceData.submissionDate.getTime() + 30 * 24 * 60 * 60 * 1000), "MMM d, yyyy");

  const handleDownload = () => {
    // In a real app, this would trigger a PDF download
    console.log("Download PDF:", invoiceNumber);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] h-[90vh] p-0 bg-white overflow-hidden flex flex-col">
        <DialogDescription className="sr-only">
          Preview and download invoice for submission {invoiceNumber}
        </DialogDescription>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-9 px-4 rounded-lg border-gray-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* PDF Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
          {/* A4-like Paper Container */}
          <div className="max-w-[210mm] mx-auto bg-white shadow-lg" style={{ minHeight: "297mm" }}>
            <div className="p-12">
              {/* Invoice Header */}
              <div className="flex items-start justify-between mb-12">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-8">Invoice</h1>
                  
                  {/* FROM Section */}
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      FROM
                    </div>
                    <div className="text-sm text-gray-900 space-y-1">
                      <div className="font-semibold">{invoiceData.contractorName}</div>
                      <div>{invoiceData.contractorAddress}</div>
                      <div>{invoiceData.contractorCountry}</div>
                      <div>{invoiceData.contractorEmail}</div>
                    </div>
                  </div>
                </div>

                {/* Invoice Meta (Right-aligned) */}
                <div className="text-right">
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Invoice No
                      </div>
                      <div className="text-sm font-semibold text-gray-900">{invoiceNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Invoice Date
                      </div>
                      <div className="text-sm text-gray-900">{invoiceDate}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Due Date
                      </div>
                      <div className="text-sm text-gray-900">{dueDate}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BILL TO Section */}
              <div className="mb-8">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  BILL TO
                </div>
                <div className="text-sm text-gray-900 space-y-1">
                  <div className="font-semibold">{invoiceData.companyName}</div>
                  <div>{invoiceData.companyAddress}</div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="text-left py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Description
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">
                        Hours
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide w-24">
                        Rate
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide w-28">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Regular Hours Line */}
                    <tr className="border-b border-gray-200">
                      <td className="py-4 text-sm text-gray-900">
                        <div className="font-medium mb-1">
                          {invoiceData.position} Services
                        </div>
                        <div className="text-xs text-gray-600">
                          {format(invoiceData.workPeriodStart, "MMM d")} – {format(invoiceData.workPeriodEnd, "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {invoiceData.regularDescription}
                        </div>
                      </td>
                      <td className="py-4 text-sm text-gray-900 text-right align-top">
                        {invoiceData.regularHours}
                      </td>
                      <td className="py-4 text-sm text-gray-900 text-right align-top">
                        ${invoiceData.hourlyRate.toFixed(2)}
                      </td>
                      <td className="py-4 text-sm text-gray-900 text-right align-top font-semibold">
                        ${regularAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Overtime Line (if applicable) */}
                    {invoiceData.overtimeHours > 0 && (
                      <tr className="border-b border-gray-200">
                        <td className="py-4 text-sm text-gray-900">
                          <div className="font-medium mb-1">
                            Overtime – {invoiceData.position}
                          </div>
                          {invoiceData.overtimeDescription && (
                            <div className="text-xs text-gray-600 mt-1">
                              {invoiceData.overtimeDescription}
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-sm text-gray-900 text-right align-top">
                          {invoiceData.overtimeHours}
                        </td>
                        <td className="py-4 text-sm text-gray-900 text-right align-top">
                          ${invoiceData.overtimeRate.toFixed(2)}
                        </td>
                        <td className="py-4 text-sm text-gray-900 text-right align-top font-semibold">
                          ${overtimeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Total */}
                <div className="flex justify-end mt-6">
                  <div className="w-64">
                    <div className="flex justify-between items-center py-3 border-t-2 border-gray-900">
                      <div className="text-base font-bold text-gray-900">Total</div>
                      <div className="text-xl font-bold text-gray-900">
                        ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payable To (Banking Section) */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">
                  PAYABLE TO
                </div>
                
                {invoiceData.bankName ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Beneficiary Name</div>
                      <div className="text-gray-900 font-medium">{invoiceData.contractorName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Bank Name</div>
                      <div className="text-gray-900 font-medium">{invoiceData.bankName}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-600 mb-1">Bank Address</div>
                      <div className="text-gray-900">{invoiceData.bankAddress}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">SWIFT Code</div>
                      <div className="text-gray-900 font-mono">{invoiceData.swiftCode}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Routing Number</div>
                      <div className="text-gray-900 font-mono">{invoiceData.routingNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Account Type</div>
                      <div className="text-gray-900">{invoiceData.accountType}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Account Number</div>
                      <div className="text-gray-900 font-mono">{invoiceData.accountNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Currency</div>
                      <div className="text-gray-900">{invoiceData.currency}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900">
                      Banking details are not available for this invoice.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Note */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Payment is due within 30 days of invoice date. Please reference invoice number {invoiceNumber} when making payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}