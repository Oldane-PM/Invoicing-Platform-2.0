import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

import { toast } from "sonner";
import {
  Loader2,
  FileText,
  CheckCircle2,
  Upload,
  X,
  HelpCircle,
  User,
  ChevronRight,
  Headset,
  Plus,
  Info,
  Lock,
  Shield,
} from "lucide-react";
import { useVendorOnboarding } from "../../lib/hooks/contractor/useVendorOnboarding";

// We assume these functions are added to useVendorOnboarding hook
// or we can import them from the repo directly for the sake of this component.
import {
  uploadW8Ben,
  uploadInitialInvoice,
} from "../../lib/data/vendorOnboarding/vendorOnboarding.repo";
import { useAuth } from "../../lib/hooks/useAuth";
import { getSupabaseClient } from "../../lib/supabase/client";

type OnboardingType = "new" | "migrating" | null;

export function ContractorOnboarding() {
  const { user, profile } = useAuth();
  const [onboardingType, setOnboardingType] =
    React.useState<OnboardingType>(null);

  const {
    data: onboarding,
    uploadWorkOrderFile,
    saveOnboarding,
    extractWorkOrder,
    extractPreviousInvoice,
  } = useVendorOnboarding();

  const [w8BenFile, setW8BenFile] = React.useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const [workOrderFile, setWorkOrderFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // New Step navigation
  const [step, setStep] = React.useState<"welcome" | "upload" | "review">("welcome");

  // Extracted values state
  const [contractorName, setContractorName] = React.useState("");
  const [workOrderNumber, setWorkOrderNumber] = React.useState("");
  const [role, setRole] = React.useState("");
  const [department, setDepartment] = React.useState("Information Technology");
  const [rate, setRate] = React.useState<number | "">("");
  const [rateType, setRateType] = React.useState<"hourly" | "fixed">("hourly");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // W-8BEN form extracted values
  const [taxName, setTaxName] = React.useState("");
  const [taxStatus, setTaxStatus] = React.useState("Non-U.S. Individual");
  const [taxResidence, setTaxResidence] = React.useState("Jamaica");
  const [taxAddress, setTaxAddress] = React.useState("123 Main Street, Kingston 10, Kingston, Jamaica");
  const [taxIdNum, setTaxIdNum] = React.useState("123-456-789");
  const [exemptions, setExemptions] = React.useState("No");

  // Editing state for review cards
  const [editContract, setEditContract] = React.useState(false);
  const [editW8, setEditW8] = React.useState(false);

  // Storing the file upload details to submit in the final confirm step
  const [uploadedPatch, setUploadedPatch] = React.useState<any>(null);

  const handleSubmit = async () => {
    if (!user) return;

    if (onboardingType === "new") {
      if (!workOrderFile || !w8BenFile) {
        toast.error("Please upload all required documents.");
        return;
      }
    } else if (onboardingType === "migrating") {
      if (!invoiceFile || !workOrderFile || !w8BenFile) {
        toast.error("Please upload all required documents.");
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

      const patch: any = {
        work_order_path: woPath,
        work_order_filename: woFilename,
        work_order_uploaded_at: woUploadedAt,
        w8_ben_path: w8Path,
        w8_ben_filename: w8Filename,
        initial_invoice_path: invPath,
        initial_invoice_filename: invFilename,
      };

      // Set Contractor Name and Tax Name to profile name
      const nameVal = profile?.fullName || user.user_metadata?.full_name || user.email || "";
      setContractorName(nameVal);
      setTaxName(nameVal);

      if (workOrderFile) {
        const result = await uploadWorkOrderFile(workOrderFile);
        if (!result.ok)
          throw new Error(result.error || "Failed to upload Work Order");
        woPath = result.data?.work_order_path || null;
        woFilename = result.data?.work_order_filename || null;
        woUploadedAt = result.data?.work_order_uploaded_at || null;
        patch.work_order_path = woPath;
        patch.work_order_filename = woFilename;
        patch.work_order_uploaded_at = woUploadedAt;

        // Extract Work Order details
        if (woPath) {
          const extractResult = await extractWorkOrder(woPath);
          if (extractResult.ok && extractResult.data) {
            const ext = extractResult.data;
            if (ext.role) {
              patch.onboarding_role = ext.role;
              setRole(ext.role);
            }
            if (ext.rate != null) {
              patch.onboarding_rate = Number(ext.rate);
              setRate(Number(ext.rate));
            }
            if (ext.rateType === "fixed" || ext.rateType === "hourly") {
              patch.onboarding_rate_type = ext.rateType;
              setRateType(ext.rateType);
            }
            if (ext.startDate) {
              patch.contract_start_date = ext.startDate;
              setStartDate(ext.startDate);
            }
            if (ext.endDate) {
              patch.contract_end_date = ext.endDate;
              setEndDate(ext.endDate);
            }
          }
        }
      }

      if (w8BenFile) {
        const w8Result = await uploadW8Ben(user.id, w8BenFile);
        w8Path = w8Result.path;
        w8Filename = w8Result.filename;
        patch.w8_ben_path = w8Path;
        patch.w8_ben_filename = w8Filename;

        // Call the backend API so it shows as 'Submitted' in the Tax Forms tab
        try {
          const sessionResponse = await getSupabaseClient().auth.getSession();
          const token = sessionResponse?.data?.session?.access_token;
          const baseUrl = (
            import.meta.env.VITE_AUTH_BASE_URL ||
            import.meta.env.VITE_API_URL ||
            "http://localhost:5001"
          ).replace(/\/+$/, "");

          const formData = new FormData();
          formData.append("w8ben", w8BenFile);

          await fetch(`${baseUrl}/api/w8ben/upload`, {
            method: "POST",
            body: formData,
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (e) {
          console.error("Failed to call w8ben upload API:", e);
        }
      }

      if (invoiceFile) {
        const invResult = await uploadInitialInvoice(user.id, invoiceFile);
        invPath = invResult.path;
        invFilename = invResult.filename;
        patch.initial_invoice_path = invPath;
        patch.initial_invoice_filename = invFilename;

        // Extract Invoice details
        if (invPath && onboardingType === "migrating") {
          const extractResult = await extractPreviousInvoice(invPath);
          if (extractResult.ok && extractResult.data) {
            const ext = extractResult.data;
            if (ext.invoiceNumber) {
              patch.last_invoice_number = ext.invoiceNumber;
              setWorkOrderNumber(ext.invoiceNumber);
            }
            if (ext.bankName) patch.bank_name = ext.bankName;
            if (ext.bankAddress) patch.bank_address = ext.bankAddress;
            if (ext.swiftCode) patch.swift_code = ext.swiftCode;
            if (ext.routingNumber) patch.routing_number = ext.routingNumber;
            if (ext.accountType) patch.account_type = ext.accountType;
            if (ext.currency) patch.currency = ext.currency;
            if (ext.accountNumber)
              patch.bank_account_number = ext.accountNumber;
          }
        }
      }

      setUploadedPatch(patch);
      setStep("review");
      toast.success("Documents uploaded and verified successfully!");
    } catch (err: any) {
      toast.error(err.message || "An error occurred during onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAndFinish = async () => {
    setIsSubmitting(true);
    try {
      const finalPatch = {
        ...uploadedPatch,
        onboarding_role: role || uploadedPatch.onboarding_role,
        onboarding_rate: rate !== "" ? Number(rate) : uploadedPatch.onboarding_rate,
        onboarding_rate_type: rateType || uploadedPatch.onboarding_rate_type,
        contract_start_date: startDate || uploadedPatch.contract_start_date,
        contract_end_date: endDate || uploadedPatch.contract_end_date,
        onboarding_completed_at: new Date().toISOString(),
      };

      const result = await saveOnboarding(finalPatch);
      if (!result.ok) throw new Error(result.error);

      // Save w8ben form fields to DB as well!
      const supabase = getSupabaseClient();
      
      const { data: currentForm } = await supabase
        .from("w8ben_forms")
        .select("form_data")
        .eq("contractor_user_id", user?.id)
        .maybeSingle();
      
      const newFormData = {
        ...(currentForm?.form_data || {}),
        extracted_fields: {
          fullName: taxName,
          taxpayerStatus: taxStatus,
          countryOfResidence: taxResidence,
          address: taxAddress,
          tin: taxIdNum,
          exemptionsClaimed: exemptions
        }
      };

      await supabase
        .from("w8ben_forms")
        .update({ form_data: newFormData })
        .eq("contractor_user_id", user?.id);

      // Also ensure profile columns are fully synced
      await supabase
        .from("contractor_profiles")
        .update({
          onboarding_completed_at: finalPatch.onboarding_completed_at,
          onboarding_role: finalPatch.onboarding_role,
          onboarding_rate: finalPatch.onboarding_rate,
          onboarding_rate_type: finalPatch.onboarding_rate_type,
          contract_start_date: finalPatch.contract_start_date,
          contract_end_date: finalPatch.contract_end_date,
        })
        .eq("user_id", user?.id);

      toast.success("Profile onboarding completed successfully!");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "An error occurred during final save.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "welcome" || !onboardingType) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        {/* Top Navbar */}
        <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="border-[2.5px] border-blue-600 text-blue-600 w-7 h-9 rounded-md flex items-center justify-center text-lg relative before:content-[''] before:absolute before:-top-[2.5px] before:-right-[2.5px] before:border-t-8 before:border-r-8 before:border-t-transparent before:border-r-white before:w-0 before:h-0 bg-blue-50/30">
              <span className="mt-0.5">$</span>
            </div>
            <span className="text-gray-900 ml-1">Invoice</span> <span className="text-blue-600 font-medium">Portal</span>
          </div>
          <button className="text-blue-600 flex items-center gap-2 text-[15px] font-medium hover:text-blue-700 transition-colors">
            <HelpCircle className="w-4 h-4" /> Need help?
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-[850px] w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 md:p-12 text-center mt-6 mb-8">
            <div className="flex justify-center mb-5">
              <span className="text-[44px] drop-shadow-sm">👋</span>
            </div>
            <h1 className="text-[28px] font-bold text-gray-900 mb-4 tracking-tight">
              Welcome to the Invoice Platform!
            </h1>
            <p className="text-gray-600 mb-10 max-w-lg mx-auto text-[15px] leading-relaxed">
              This platform makes it easy to submit invoices, track payments,
              and manage your contracts—all in one place.
            </p>

            <h2 className="text-[19px] font-bold text-gray-900 mb-8">
              Which best describes you?
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
              {/* New Contractor Card */}
              <div 
                className="border-[1.5px] border-blue-200 rounded-2xl p-8 flex flex-col items-center text-center hover:border-blue-400 transition-all bg-white shadow-sm hover:shadow-md cursor-pointer group" 
                onClick={() => {
                  setOnboardingType("new");
                  setStep("upload");
                }}
              >
                <div className="w-20 h-20 rounded-full bg-[#EBF3FF] flex items-center justify-center mb-6 relative group-hover:scale-105 transition-transform duration-300">
                  <User className="w-8 h-8 text-[#1A61D5]" strokeWidth={1.5} />
                  <div className="absolute bottom-0 right-0 bg-[#1A61D5] rounded-full w-7 h-7 flex items-center justify-center border-2 border-white">
                    <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#1A61D5] mb-3">I'm a New Contractor</h3>
                <p className="text-gray-600 mb-8 text-[15px] leading-relaxed">
                  I have never submitted an invoice
                  or received a payment through
                  this platform.
                </p>
                <Button 
                  className="w-full bg-[#1A61D5] hover:bg-[#154db0] text-white h-12 rounded-lg mt-auto text-[15px] font-medium"
                >
                  Start New Contractor Setup <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>

              {/* Existing Contractor Card */}
              <div 
                className="border-[1.5px] border-[#c3e6cb] rounded-2xl p-8 flex flex-col items-center text-center hover:border-[#a3d6b0] transition-all bg-[#fcfdfc] shadow-sm hover:shadow-md cursor-pointer group" 
                onClick={() => {
                  setOnboardingType("migrating");
                  setStep("upload");
                }}
              >
                <div className="w-20 h-20 rounded-full bg-[#EAF7ED] flex items-center justify-center mb-6 relative group-hover:scale-105 transition-transform duration-300">
                  <User className="w-8 h-8 text-[#2E7D32]" strokeWidth={1.5} />
                  <div className="absolute bottom-0 right-0 bg-[#2E7D32] rounded-full w-7 h-7 flex items-center justify-center border-2 border-white">
                    <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#2E7D32] mb-3">I'm an Existing Contractor</h3>
                <p className="text-gray-600 mb-8 text-[15px] leading-relaxed">
                  I have submitted invoices before
                  and have already received
                  payment.
                </p>
                <Button 
                  className="w-full bg-[#357a38] hover:bg-[#2c662e] text-white h-12 rounded-lg mt-auto text-[15px] font-medium"
                >
                  Continue as Existing Contractor <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100 flex items-center justify-center gap-2.5 text-[15px] text-gray-600">
              <Headset className="w-5 h-5 text-gray-700" />
              Need help getting started? <button className="text-[#1A61D5] font-medium hover:underline">Contact Support</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const StepProgressBar = ({ currentStep }: { currentStep: "welcome" | "upload" | "review" }) => {
    const isWelcomeDone = currentStep !== "welcome";
    const isUploadDone = currentStep === "review";
    const isReviewActive = currentStep === "review";
    const isUploadActive = currentStep === "upload";
    const isWelcomeActive = currentStep === "welcome";

    return (
      <div className="w-full flex items-center justify-center gap-4 mb-10 max-w-lg mx-auto">
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
            isWelcomeDone 
              ? "bg-green-500 border-green-500 text-white" 
              : "bg-blue-600 border-blue-600 text-white"
          }`}>
            {isWelcomeDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : "1"}
          </div>
          <span className={`text-xs mt-1.5 font-medium ${isWelcomeActive ? "text-blue-600 font-semibold" : "text-gray-500"}`}>Welcome</span>
          <span className={`text-[10px] text-gray-400 mt-0.5`}>{isWelcomeDone ? "Completed" : "In Progress"}</span>
        </div>

        <div className={`flex-1 h-0.5 -mt-6 transition-colors ${isWelcomeDone ? "bg-green-500" : "bg-gray-200"}`} />

        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
            isUploadDone 
              ? "bg-green-500 border-green-500 text-white" 
              : isUploadActive
                ? "bg-blue-600 border-blue-600 text-white animate-pulse"
                : "bg-white border-gray-300 text-gray-400"
          }`}>
            {isUploadDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : "2"}
          </div>
          <span className={`text-xs mt-1.5 font-medium ${isUploadActive ? "text-blue-600 font-semibold" : "text-gray-500"}`}>Upload Documents</span>
          <span className={`text-[10px] text-gray-400 mt-0.5`}>{isUploadDone ? "Completed" : isUploadActive ? "In Progress" : "Upcoming"}</span>
        </div>

        <div className={`flex-1 h-0.5 -mt-6 transition-colors ${isUploadDone ? "bg-green-500" : "bg-gray-200"}`} />

        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
            isReviewActive 
              ? "bg-blue-600 border-blue-600 text-white" 
              : "bg-white border-gray-300 text-gray-400"
          }`}>
            3
          </div>
          <span className={`text-xs mt-1.5 font-medium ${isReviewActive ? "text-blue-600 font-semibold" : "text-gray-500"}`}>Review & Confirm</span>
          <span className={`text-[10px] text-gray-400 mt-0.5`}>{isReviewActive ? "In Progress" : "Upcoming"}</span>
        </div>
      </div>
    );
  };

  const DocumentUploadRow = ({
    title,
    description,
    formats,
    file,
    onFileSelect,
    accept,
    isW8 = false,
    isInv = false,
  }: {
    title: string;
    description: string;
    formats: string;
    file: File | null;
    onFileSelect: (f: File | null) => void;
    accept: string;
    isW8?: boolean;
    isInv?: boolean;
  }) => {
    return (
      <div className="border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isW8 ? "bg-[#EAF7ED] text-[#2E7D32]" : isInv ? "bg-[#FFF4E5] text-[#B76E00]" : "bg-[#EBF3FF] text-[#1A61D5]"}`}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              {title}
              <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>
            </h4>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
            <p className="text-xs text-gray-400 mt-1">{formats}</p>
          </div>
        </div>

        {file ? (
          <div className="flex items-center gap-6 w-full md:w-[260px] bg-[#F8FAFC] border border-gray-100 p-4 rounded-xl justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-green-100 text-green-700 p-1.5 rounded-full shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{file.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Replace
                <input
                  type="file"
                  className="sr-only"
                  accept={accept}
                  onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
                />
              </label>
              <button onClick={() => onFileSelect(null)} className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 hover:border-blue-300 transition-colors w-full md:w-[260px] h-[130px] text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) onFileSelect(droppedFile);
            }}
          >
            <Upload className="w-7 h-7 text-blue-500 mb-1" />
            <p className="text-xs text-gray-500">Drag & drop your file here</p>
            <span className="text-[10px] text-gray-400 my-0.5">or</span>
            <label className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-50/50 transition-colors">
              Browse Files
              <input
                type="file"
                className="sr-only"
                accept={accept}
                onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="border-[2.5px] border-blue-600 text-blue-600 w-7 h-9 rounded-md flex items-center justify-center text-lg relative before:content-[''] before:absolute before:-top-[2.5px] before:-right-[2.5px] before:border-t-8 before:border-r-8 before:border-t-transparent before:border-r-white before:w-0 before:h-0 bg-blue-50/30">
            <span className="mt-0.5">$</span>
          </div>
          <span className="text-gray-900 ml-1">Invoice</span> <span className="text-blue-600 font-medium">Portal</span>
        </div>
        <button className="text-blue-600 flex items-center gap-2 text-[15px] font-medium hover:text-blue-700 transition-colors">
          <HelpCircle className="w-4 h-4" /> Need help?
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-[850px] w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 text-center mt-6 mb-8">
          
          <StepProgressBar currentStep={step} />

          {step === "upload" && (
            <div>
              <h1 className="text-[28px] font-bold text-gray-900 mb-3 tracking-tight">
                Upload Required Documents
              </h1>
              <p className="text-gray-600 mb-10 max-w-lg mx-auto text-[15px] leading-relaxed">
                {onboardingType === "new" 
                  ? "Upload your Work Order and completed W-8BEN form."
                  : "Upload your Previous Invoice, Work Order, and completed W-8BEN form."
                } We'll automatically extract your contract information to speed up setup.
              </p>

              <div className="space-y-6 text-left">
                {onboardingType === "new" && (
                  <>
                    <DocumentUploadRow
                      title="Work Order"
                      description="Upload the work order or contract issued for this engagement."
                      formats="PDF, DOCX up to 25MB"
                      file={workOrderFile}
                      onFileSelect={setWorkOrderFile}
                      accept=".pdf,.doc,.docx"
                    />
                    <DocumentUploadRow
                      title="W-8BEN Form"
                      description="Upload your completed W-8BEN tax form."
                      formats="PDF up to 25MB"
                      file={w8BenFile}
                      onFileSelect={setW8BenFile}
                      accept=".pdf"
                      isW8={true}
                    />
                  </>
                )}

                {onboardingType === "migrating" && (
                  <>
                    <DocumentUploadRow
                      title="Previous Invoice"
                      description="Upload your most recent invoice to track your numbering sequence."
                      formats="PDF, DOCX up to 25MB"
                      file={invoiceFile}
                      onFileSelect={setInvoiceFile}
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      isInv={true}
                    />
                    <DocumentUploadRow
                      title="Work Order"
                      description="Upload the work order or contract issued for this engagement."
                      formats="PDF, DOCX up to 25MB"
                      file={workOrderFile}
                      onFileSelect={setWorkOrderFile}
                      accept=".pdf,.doc,.docx"
                    />
                    <DocumentUploadRow
                      title="W-8BEN Form"
                      description="Upload your completed W-8BEN tax form."
                      formats="PDF up to 25MB"
                      file={w8BenFile}
                      onFileSelect={setW8BenFile}
                      accept=".pdf"
                      isW8={true}
                    />
                  </>
                )}

                {/* Bottom Info Alert */}
                <div className="border border-blue-100 bg-[#F5F8FF] rounded-xl p-4 flex gap-3 text-sm text-blue-800 items-start mt-6">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    After all documents are uploaded, we'll automatically extract your role, contract rate,
                    contract dates, and other details for review.
                  </span>
                </div>
              </div>

              {/* Bottom Navigation Buttons */}
              <div className="pt-8 mt-8 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOnboardingType(null);
                    setStep("welcome");
                  }}
                  disabled={isSubmitting}
                  className="h-11 px-6 sm:w-auto w-full border-gray-300"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="h-11 px-8 sm:w-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {isSubmitting ? "Processing..." : "Continue"}
                  {!isSubmitting && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div>
              <h1 className="text-[28px] font-bold text-gray-900 mb-3 tracking-tight">
                Review & Confirm Your Information
              </h1>
              <p className="text-gray-600 mb-10 max-w-lg mx-auto text-[15px] leading-relaxed">
                We've extracted the information from your documents. 
                Please review and confirm that everything is correct before you continue.
              </p>

              {/* Edit / View Review fields */}
              <div className="space-y-6 text-left">
                {/* Contract Details Card */}
                <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Contract Details
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEditContract(!editContract)} 
                      className="text-blue-600 border-blue-200 hover:bg-blue-50/50 flex items-center gap-1.5"
                    >
                      {editContract ? "Save View" : "Edit"}
                    </Button>
                  </div>

                  {editContract ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Contractor Name</Label>
                        <Input value={contractorName} onChange={(e) => setContractorName(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Work Order / PO Number</Label>
                        <Input value={workOrderNumber} onChange={(e) => setWorkOrderNumber(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Role / Position</Label>
                        <Input value={role} onChange={(e) => setRole(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Department</Label>
                        <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Contract Rate</Label>
                        <Input type="number" value={rate} onChange={(e) => setRate(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Rate Type</Label>
                        <select 
                          value={rateType} 
                          onChange={(e) => setRateType(e.target.value as "hourly" | "fixed")} 
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="hourly">Hourly</option>
                          <option value="fixed">Fixed (Monthly)</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Contract Start Date</Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Contract End Date</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Contractor Name</span>
                        <span className="text-[15px] font-bold text-gray-900">{contractorName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Work Order / PO Number</span>
                        <span className="text-[15px] font-bold text-gray-900">{workOrderNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Role / Position</span>
                        <span className="text-[15px] font-bold text-gray-900">{role || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Department</span>
                        <span className="text-[15px] font-bold text-gray-900">{department || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Contract Rate</span>
                        <span className="text-[15px] font-bold text-gray-900">
                          {rate ? `USD ${Number(rate).toFixed(2)} / ${rateType === "hourly" ? "hour" : "month"}` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Contract Duration</span>
                        <span className="text-[15px] font-bold text-gray-900">
                          {startDate ? `${startDate} to ${endDate || "Present"}` : "—"}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-blue-600 bg-blue-50/50 px-3 py-2.5 rounded-lg">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>Details were extracted from your Work Order.</span>
                  </div>
                </div>

                {/* W-8BEN Summary Card */}
                <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                      W-8BEN Summary
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEditW8(!editW8)} 
                      className="text-blue-600 border-blue-200 hover:bg-blue-50/50 flex items-center gap-1.5"
                    >
                      {editW8 ? "Save View" : "Edit"}
                    </Button>
                  </div>

                  {editW8 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Full Name</Label>
                        <Input value={taxName} onChange={(e) => setTaxName(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">U.S. Taxpayer Status</Label>
                        <Input value={taxStatus} onChange={(e) => setTaxStatus(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Country of Tax Residence</Label>
                        <Input value={taxResidence} onChange={(e) => setTaxResidence(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Permanent Address</Label>
                        <Input value={taxAddress} onChange={(e) => setTaxAddress(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Tax Identification Number (TIN)</Label>
                        <Input value={taxIdNum} onChange={(e) => setTaxIdNum(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500">Exemptions Claimed</Label>
                        <Input value={exemptions} onChange={(e) => setExemptions(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Full Name</span>
                        <span className="text-[15px] font-bold text-gray-900">{taxName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">U.S. Taxpayer Status</span>
                        <span className="text-[15px] font-bold text-gray-900">{taxStatus || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Country of Tax Residence</span>
                        <span className="text-[15px] font-bold text-gray-900">{taxResidence || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Permanent Address</span>
                        <span className="text-[15px] font-bold text-gray-900">{taxAddress || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Tax Identification Number (TIN)</span>
                        <span className="text-[15px] font-bold text-gray-900">{taxIdNum || "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-400 block">Exemptions Claimed</span>
                        <span className="text-[15px] font-bold text-gray-900">{exemptions || "—"}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-green-700 bg-green-50/50 px-3 py-2.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Details were extracted from your W-8BEN form.</span>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                  <div className="font-bold text-gray-900 text-lg mb-6 pb-4 border-b border-gray-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
                    Uploaded Documents
                  </div>
                  <div className="grid gap-3">
                    {workOrderFile && (
                      <div className="flex items-center justify-between border border-gray-100 rounded-xl p-4 bg-[#F8FAFC]">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px] md:max-w-[300px]">{workOrderFile.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{(workOrderFile.size / (1024 * 1024)).toFixed(1)} MB • PDF</p>
                          </div>
                        </div>
                        <div className="bg-green-100 text-green-700 p-1.5 rounded-full">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                    {w8BenFile && (
                      <div className="flex items-center justify-between border border-gray-100 rounded-xl p-4 bg-[#F8FAFC]">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px] md:max-w-[300px]">{w8BenFile.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{(w8BenFile.size / (1024 * 1024)).toFixed(1)} MB • PDF</p>
                          </div>
                        </div>
                        <div className="bg-green-100 text-green-700 p-1.5 rounded-full">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                    {invoiceFile && (
                      <div className="flex items-center justify-between border border-gray-100 rounded-xl p-4 bg-[#F8FAFC]">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#FFF4E5] text-[#B76E00] p-2 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px] md:max-w-[300px]">{invoiceFile.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{(invoiceFile.size / (1024 * 1024)).toFixed(1)} MB • PDF</p>
                          </div>
                        </div>
                        <div className="bg-green-100 text-green-700 p-1.5 rounded-full">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Banner */}
                <div className="border border-blue-100 bg-[#F5F8FF] rounded-xl p-4 flex gap-3 text-sm text-blue-800 items-start">
                  <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Your information is secure and will only be used for invoice processing and payments. You can update your information anytime from your profile settings.</span>
                </div>
              </div>

              {/* Bottom Navigation Buttons */}
              <div className="pt-8 mt-8 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("upload")}
                  disabled={isSubmitting}
                  className="h-11 px-6 sm:w-auto w-full border-gray-300 flex items-center gap-1.5"
                >
                  Back
                </Button>
                <div className="text-gray-400 text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Encrypted & secure
                </div>
                <Button
                  onClick={handleConfirmAndFinish}
                  disabled={isSubmitting}
                  className="h-11 px-8 sm:w-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {isSubmitting ? "Saving..." : "Confirm & Continue"}
                  {!isSubmitting && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
