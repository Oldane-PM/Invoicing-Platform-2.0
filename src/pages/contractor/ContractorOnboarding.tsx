import * as React from "react";
import { Button } from "../../components/ui/button";

import { toast } from "sonner";
import { Loader2, FileText, CheckCircle2, Upload, X } from "lucide-react";
import { useVendorOnboarding } from "../../lib/hooks/contractor/useVendorOnboarding";

// We assume these functions are added to useVendorOnboarding hook
// or we can import them from the repo directly for the sake of this component.
import { uploadW8Ben, uploadInitialInvoice } from "../../lib/data/vendorOnboarding/vendorOnboarding.repo";
import { useAuth } from "../../lib/hooks/useAuth";
import { getSupabaseClient } from "../../lib/supabase/client";

type OnboardingType = "new" | "migrating" | null;

export function ContractorOnboarding() {
  const { user } = useAuth();
  const [onboardingType, setOnboardingType] = React.useState<OnboardingType>(null);
  
  const {
    data: onboarding,
    uploadWorkOrderFile,
    saveOnboarding,
  } = useVendorOnboarding();

  const [w8BenFile, setW8BenFile] = React.useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const [workOrderFile, setWorkOrderFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    
    if (onboardingType === "new") {
      if (!workOrderFile || !w8BenFile || !invoiceFile) {
        toast.error("Please upload all required documents.");
        return;
      }
    } else if (onboardingType === "migrating") {
      if (!invoiceFile) {
        toast.error("Please upload your previous invoice.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Upload files
      let woPath = onboarding?.work_order_path || null;
      let woFilename = onboarding?.work_order_filename || null;
      let woUploadedAt = onboarding?.work_order_uploaded_at || null;

      let w8Path = null;
      let w8Filename = null;

      let invPath = null;
      let invFilename = null;

      if (workOrderFile) {
        const result = await uploadWorkOrderFile(workOrderFile);
        if (!result.ok) throw new Error(result.error || "Failed to upload Work Order");
        woPath = result.data?.work_order_path || null;
        woFilename = result.data?.work_order_filename || null;
        woUploadedAt = result.data?.work_order_uploaded_at || null;
      }

      if (w8BenFile) {
        const w8Result = await uploadW8Ben(user.id, w8BenFile);
        w8Path = w8Result.path;
        w8Filename = w8Result.filename;
      }

      if (invoiceFile) {
        const invResult = await uploadInitialInvoice(user.id, invoiceFile);
        invPath = invResult.path;
        invFilename = invResult.filename;
      }

      // 2. Save onboarding data
      const patch = {
        work_order_path: woPath,
        work_order_filename: woFilename,
        work_order_uploaded_at: woUploadedAt,
        w8_ben_path: w8Path,
        w8_ben_filename: w8Filename,
        initial_invoice_path: invPath,
        initial_invoice_filename: invFilename,
        onboarding_completed_at: new Date().toISOString(),
      };

      const result = await saveOnboarding(patch);
      if (!result.ok) throw new Error(result.error);
      
      // Also update the database directly just in case the hook didn't pick up the new types
      const supabase = getSupabaseClient();
      await supabase.from("contractor_profiles").update({
        w8_ben_path: w8Path,
        w8_ben_filename: w8Filename,
        initial_invoice_path: invPath,
        initial_invoice_filename: invFilename,
        onboarding_completed_at: patch.onboarding_completed_at
      }).eq("user_id", user.id);

      toast.success("Onboarding completed successfully!");
      // The page will automatically redirect because App.tsx routing will see onboarding_completed_at is set.
      window.location.reload();
      
    } catch (err: any) {
      toast.error(err.message || "An error occurred during onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!onboardingType) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Invoicing Platform</h1>
          <p className="text-gray-600 mb-8">To get started, tell us a bit about your status.</p>
          
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-14 text-lg justify-start px-6"
              onClick={() => setOnboardingType("new")}
            >
              <CheckCircle2 className="w-5 h-5 mr-3 text-gray-400" />
              I am a New Contractor
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-14 text-lg justify-start px-6"
              onClick={() => setOnboardingType("migrating")}
            >
              <CheckCircle2 className="w-5 h-5 mr-3 text-gray-400" />
              I am migrating from the old system
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const DocumentUploadRow = ({ 
    title, 
    description, 
    file, 
    onFileSelect, 
    accept 
  }: { 
    title: string; 
    description: string; 
    file: File | null; 
    onFileSelect: (f: File | null) => void; 
    accept: string;
  }) => {
    return (
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${file ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${file ? 'bg-blue-100' : 'bg-gray-100'}`}>
            {file ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-gray-400" />}
          </div>
          <div className="min-w-0">
            <h3 className={`text-sm font-medium ${file ? 'text-blue-900' : 'text-gray-900'}`}>{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px] sm:max-w-xs">{file ? file.name : description}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {file ? (
            <Button variant="ghost" size="sm" onClick={() => onFileSelect(null)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 w-full sm:w-auto">
              <X className="w-4 h-4 mr-1.5" />
              Remove
            </Button>
          ) : (
            <label className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-gray-100 hover:text-gray-900 h-9 px-4 w-full sm:w-auto shadow-sm">
              <Upload className="w-4 h-4 mr-2 text-gray-500" />
              Upload File
              <input type="file" className="sr-only" accept={accept} onChange={(e) => onFileSelect(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Complete Your Profile</h1>
        <p className="text-gray-600 mb-8">
          Please upload the required documents below to finish setting up your account.
        </p>

        <div className="space-y-6">
          {onboardingType === "new" && (
            <div className="space-y-4">
              <DocumentUploadRow
                title="1. Signed Work Order"
                description="Upload your signed work order (PDF, Word, or image)"
                file={workOrderFile}
                onFileSelect={setWorkOrderFile}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <DocumentUploadRow
                title="2. W8-BEN Form"
                description="Upload your completed W8-BEN form (PDF or image)"
                file={w8BenFile}
                onFileSelect={setW8BenFile}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <DocumentUploadRow
                title="3. First Invoice (Template/Draft)"
                description="Upload a template or draft of your first invoice"
                file={invoiceFile}
                onFileSelect={setInvoiceFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
            </div>
          )}

          {onboardingType === "migrating" && (
            <div className="space-y-4">
              <DocumentUploadRow
                title="Previous Invoice"
                description="Upload your most recent invoice for numbering sequence"
                file={invoiceFile}
                onFileSelect={setInvoiceFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
            </div>
          )}

          <div className="pt-8 mt-8 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button variant="outline" onClick={() => setOnboardingType(null)} disabled={isSubmitting} className="h-11 px-6 sm:w-auto w-full border-gray-300">
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="h-11 px-8 sm:w-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSubmitting ? "Submitting..." : "Submit Documents"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
