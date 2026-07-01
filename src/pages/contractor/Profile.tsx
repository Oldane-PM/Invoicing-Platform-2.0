import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase/client";
import {
  Calendar,
  DollarSign,
  Clock,
  ArrowLeft,
  Loader2,
  Upload,
  FileText,
  ExternalLink,
  Hash,
  Trash2,
  ChevronDown,
  Edit,
  DownloadCloud,
  RefreshCw,
} from "lucide-react";
import { useContractorProfile } from "../../lib/hooks/contractor/useContractorProfile";
import { useVendorOnboarding } from "../../lib/hooks/contractor/useVendorOnboarding";
import { incrementInvoiceNumber } from "../../lib/invoiceSequence";
import { format } from "date-fns";
import { TaxFormsTab } from "./TaxFormsTab";

// Accepted work order file types and max size (10MB).
const WORK_ORDER_ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
const WORK_ORDER_MAX_BYTES = 10 * 1024 * 1024;

interface ContractorProfileProps {
  onCancel: () => void;
  initialTab?: string;
}

export function ContractorProfile({
  onCancel,
  initialTab,
}: ContractorProfileProps) {
  const { profile, contract, isLoading, isSaving, error, saveProfile, reload: reloadProfile } =
    useContractorProfile();

  // Onboarding (work order + contract details + invoice sequence)
  const {
    data: onboarding,
    isSaving: isSavingOnboarding,
    isUploading,
    isExtracting,
    saveOnboarding,
    uploadWorkOrderFile,
    getWorkOrderUrl,
    extractWorkOrder,
    extractPreviousInvoice,
    reload,
  } = useVendorOnboarding();

  const [activeTab, setActiveTab] = React.useState(initialTab || "personal");

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Onboarding form state (manually entered / reviewed before submission)
  const [woRole, setWoRole] = React.useState("");
  const [woRate, setWoRate] = React.useState("");
  const [woRateType, setWoRateType] = React.useState<"hourly" | "fixed">(
    "hourly",
  );
  const [woStart, setWoStart] = React.useState("");
  const [woEnd, setWoEnd] = React.useState("");
  const [lastInvoiceNumber, setLastInvoiceNumber] = React.useState("");
  const [onboardingInitialized, setOnboardingInitialized] =
    React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [invoiceUploadError, setInvoiceUploadError] = React.useState<string | null>(null);
  const [woMenuOpen, setWoMenuOpen] = React.useState(false);

  const handleDownloadWorkOrder = async () => {
    try {
      if (!onboarding?.work_order_path) return;
      const { data, error } = await supabase?.storage
        .from('invoices')
        .createSignedUrl(onboarding.work_order_path, 3600) || {};
      if (error || !data) throw error || new Error("Failed to get signed URL");
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      toast.error("Failed to generate download link.");
    }
  };

  const handleEditWorkOrderMetadata = async () => {
    if (!profile) return;
    const currentName = onboarding?.work_order_filename || "Work order";
    const newName = prompt("Rename work order file:", currentName);
    if (newName === null || newName.trim() === "") return;

    try {
      const response = await supabase
        ?.from('vendor_onboarding')
        .update({ work_order_filename: newName })
        .eq('contractor_id', profile.user_id);
      if (response?.error) throw response.error;
      toast.success("Filename updated successfully!");
      reload();
    } catch (err) {
      toast.error("Failed to rename document.");
    }
  };
  const invoiceFileInputRef = React.useRef<HTMLInputElement>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize onboarding form from stored data once it loads
  React.useEffect(() => {
    if (onboarding && !onboardingInitialized) {
      setWoRole(onboarding.onboarding_role || "");
      setWoRate(
        onboarding.onboarding_rate != null
          ? String(onboarding.onboarding_rate)
          : "",
      );
      setWoRateType(
        onboarding.onboarding_rate_type === "fixed" ? "fixed" : "hourly",
      );
      setWoStart(onboarding.contract_start_date || "");
      setWoEnd(onboarding.contract_end_date || "");
      setLastInvoiceNumber(onboarding.last_invoice_number || "");
      setOnboardingInitialized(true);
    }
  }, [onboarding, onboardingInitialized]);

  const handleWorkOrderSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later
    e.target.value = "";
    if (!file) return;

    // Check if the file is a PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const msg = "Invalid file type. Only PDF work orders are supported.";
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    if (file.size > WORK_ORDER_MAX_BYTES) {
      const msg = "File is too large. Maximum size is 10MB.";
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    const result = await uploadWorkOrderFile(file);
    if (result.ok) {
      toast.success("Work order uploaded");

      const nextOnboarding = result.data;
      const workOrderPath = nextOnboarding?.work_order_path;
      if (workOrderPath) {
        toast.promise(
          async () => {
            const extractResult = await extractWorkOrder(workOrderPath);
            if (extractResult.ok && extractResult.data) {
              const ext = extractResult.data;

              // Check validation result
              if (ext.isValid === false) {
                const reasonsList = ext.reasons && ext.reasons.length > 0
                  ? ext.reasons.join(" ")
                  : "Work order validation failed.";
                throw new Error(reasonsList);
              }

              if (ext.role) setWoRole(ext.role);
              if (ext.rate != null) setWoRate(String(ext.rate));
              if (ext.rateType === "fixed" || ext.rateType === "hourly") {
                setWoRateType(ext.rateType);
              }
               if (ext.startDate) setWoStart(ext.startDate);
              if (ext.endDate) setWoEnd(ext.endDate);
              
              if (ext.personalInfo) {
                const p = ext.personalInfo;
                if (p.fullName) setFullName(p.fullName);
                if (p.addressLine1) setAddressLine1(p.addressLine1);
                if (p.addressLine2) setAddressLine2(p.addressLine2);
                if (p.stateParish) setStateParish(p.stateParish);
                if (p.country) setCountry(p.country);
                if (p.postalCode) setPostalCode(p.postalCode);
                if (p.email) setEmail(p.email);
                if (p.phone) setPhone(p.phone);
              }
              
              // Trigger reload of cached contractor profile personal info from DB
              setIsInitialized(false);
              reloadProfile();
              
              return extractResult.data;
            } else {
              throw new Error(
                extractResult.error || "Could not parse document details.",
              );
            }
          },
          {
            loading: "AI is extracting and validating contract details from the document...",
            success: "AI successfully verified work order details! Please review and save.",
            error: (err) => `Validation Error: ${err.message || err}`,
          },
        );
      }
    } else {
      const msg =
        result.error ||
        "We couldn't process that document. Please try a different file.";
      setUploadError(msg);
      toast.error("Upload failed", { description: msg });
    }
  };

  const handlePreviousInvoiceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceUploadError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > WORK_ORDER_MAX_BYTES) {
      const msg = "File is too large. Maximum size is 10MB.";
      setInvoiceUploadError(msg);
      toast.error(msg);
      return;
    }

    const result = await uploadWorkOrderFile(file);
    if (result.ok) {
      toast.success("Previous invoice uploaded successfully");

      const storagePath = result.data?.work_order_path;
      if (storagePath) {
        toast.promise(
          async () => {
            const extractResult = await extractPreviousInvoice(storagePath);
            if (extractResult.ok && extractResult.data) {
              const ext = extractResult.data;
              
              if (ext.bankName) setBankName(ext.bankName);
              if (ext.bankAddress) setBankAddress(ext.bankAddress);
              if (ext.swiftCode) setSwiftCode(ext.swiftCode);
              if (ext.routingNumber) setRoutingNumber(ext.routingNumber);
              if (ext.accountType === "Checking" || ext.accountType === "Savings") {
                setAccountType(ext.accountType);
              }
              if (ext.currency) setCurrency(ext.currency);
              if (ext.accountNumber) setAccountNumber(ext.accountNumber);
              if (ext.invoiceNumber) setLastInvoiceNumber(ext.invoiceNumber);

              return ext;
            } else {
              throw new Error(extractResult.error || "Could not parse invoice details.");
            }
          },
          {
            loading: "AI is extracting banking and invoice numbering details from the document...",
            success: "AI successfully extracted banking details! Please review them below.",
            error: (err) => `Extraction Error: ${err.message || err}`,
          }
        );
      }
    } else {
      const msg = result.error || "We couldn't process that document. Please try a different file.";
      setInvoiceUploadError(msg);
      toast.error("Upload failed", { description: msg });
    }
  };

  const handleViewWorkOrder = async () => {
    if (!onboarding?.work_order_path) return;
    try {
      const ref = await getWorkOrderUrl(
        onboarding.work_order_path,
        onboarding.work_order_filename,
      );
      if (ref.url) {
        window.open(ref.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Work order file is not available");
      }
    } catch (err) {
      toast.error("Could not open work order", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleRemoveWorkOrder = async () => {
    try {
      const result = await saveOnboarding({
        work_order_path: null,
        work_order_filename: null,
        work_order_uploaded_at: null,
        onboarding_role: null,
        onboarding_rate: null,
        onboarding_rate_type: "hourly",
        contract_start_date: null,
        contract_end_date: null,
      });

      if (result.ok) {
        setWoRole("");
        setWoRate("");
        setWoRateType("hourly");
        setWoStart("");
        setWoEnd("");
        toast.success("Work order document removed successfully");
      } else {
        toast.error(result.error || "Failed to remove work order");
      }
    } catch (error) {
      toast.error("An unexpected error occurred while removing the work order");
    }
  };

  const handleSaveOnboarding = async () => {
    const rateValue = woRate.trim() === "" ? null : Number(woRate);
    if (rateValue != null && (Number.isNaN(rateValue) || rateValue < 0)) {
      toast.error("Rate must be a valid number");
      return;
    }
    if (woStart && woEnd && woEnd < woStart) {
      toast.error("Contract expiry date cannot be before the start date");
      return;
    }

    const result = await saveOnboarding({
      onboarding_role: woRole.trim() || null,
      onboarding_rate: rateValue,
      onboarding_rate_type: woRateType,
      contract_start_date: woStart || null,
      contract_end_date: woEnd || null,
      last_invoice_number: lastInvoiceNumber.trim() || null,
      onboarding_completed_at: new Date().toISOString(),
    });

    if (result.ok) {
      toast.success("Work order details saved");
    } else {
      toast.error("Failed to save work order details", {
        description: result.error,
      });
    }
  };

  // The next invoice number that will be generated for this vendor.
  const nextInvoiceNumber = lastInvoiceNumber.trim()
    ? incrementInvoiceNumber(lastInvoiceNumber.trim())
    : null;

  // Contract Information tab reflects onboarding-entered values when present,
  // falling back to the admin-managed contract data.
  const displayStartDate =
    onboarding?.contract_start_date || contract?.start_date || null;
  const displayEndDate =
    onboarding?.contract_end_date || contract?.end_date || null;
  const displayRole = onboarding?.onboarding_role || contract?.position || null;
  const onboardingRate = onboarding?.onboarding_rate ?? null;
  const isFixedRate =
    onboardingRate != null && onboarding?.onboarding_rate_type === "fixed";
  const displayHourlyRate =
    onboardingRate != null && onboarding?.onboarding_rate_type !== "fixed"
      ? onboardingRate
      : (contract?.hourly_rate ?? null);
  const displayOvertimeRate =
    displayHourlyRate != null
      ? displayHourlyRate * 1.5
      : (contract?.overtime_rate ?? null);

  // Personal Information State (local form state)
  const [fullName, setFullName] = React.useState("");
  const [addressLine1, setAddressLine1] = React.useState("");
  const [addressLine2, setAddressLine2] = React.useState("");
  const [stateParish, setStateParish] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  // Banking Details State (local form state)
  const [bankName, setBankName] = React.useState("");
  const [bankAddress, setBankAddress] = React.useState("");
  const [swiftCode, setSwiftCode] = React.useState("");
  const [routingNumber, setRoutingNumber] = React.useState("");
  const [accountType, setAccountType] = React.useState("Checking");
  const [currency, setCurrency] = React.useState("USD");
  const [accountNumber, setAccountNumber] = React.useState("");

  // Track if form has been initialized from profile data
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize form from profile data when it loads (only once)
  React.useEffect(() => {
    console.log("[Profile] useEffect triggered", {
      hasProfile: !!profile,
      isInitialized,
      bankName: profile?.bank_name,
      accountNumber: profile?.bank_account_number,
      fullProfile: profile,
    });

    if (profile && !isInitialized) {
      console.log("[Profile] Initializing form with profile data:", profile);

      // Personal
      setFullName(profile.full_name || "");
      setAddressLine1(profile.address_line1 || "");
      setAddressLine2(profile.address_line2 || "");
      setStateParish(profile.state_parish || "");
      setCountry(profile.country || "");
      setPostalCode(profile.postal_code || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");

      // Banking
      console.log("[Profile] Setting banking fields:", {
        bank_name: profile.bank_name,
        bank_address: profile.bank_address,
        bank_account_number: profile.bank_account_number,
      });
      setBankName(profile.bank_name || "");
      setBankAddress(profile.bank_address || "");
      setSwiftCode(profile.swift_code || "");
      setRoutingNumber(profile.bank_routing_number || "");
      setAccountType(profile.account_type || "Checking");
      setCurrency(profile.currency || "USD");
      setAccountNumber(profile.bank_account_number || "");

      setIsInitialized(true);
      console.log("[Profile] Form initialized");
    }
  }, [profile, isInitialized]);

  // Format contract dates for display
  const formatContractDate = (dateStr: string | null) => {
    if (!dateStr) return "Not set";
    try {
      // Append T00:00:00 for simple YYYY-MM-DD strings to ensure local timezone parsing
      const parsedDate = dateStr.includes("T")
        ? new Date(dateStr)
        : new Date(`${dateStr}T00:00:00`);
      return format(parsedDate, "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  // Format currency for display
  const formatRate = (rate: number | null) => {
    if (rate === null) return "Not set";
    return `$${rate.toFixed(2)}/hour`;
  };

  const handleSavePersonal = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email address is required");
      return;
    }

    const result = await saveProfile({
      full_name: fullName.trim(),
      address_line1: addressLine1.trim() || null,
      address_line2: addressLine2.trim() || null,
      state_parish: stateParish.trim() || null,
      country: country.trim() || null,
      postal_code: postalCode.trim() || null,
      email: email.trim(),
      phone: phone.trim() || null,
    });

    if (result.ok) {
      toast.success("Personal information saved");
      // Sync local state with saved data to ensure consistency
      if (result.profile) {
        setFullName(result.profile.full_name || "");
        setAddressLine1(result.profile.address_line1 || "");
        setAddressLine2(result.profile.address_line2 || "");
        setStateParish(result.profile.state_parish || "");
        setCountry(result.profile.country || "");
        setPostalCode(result.profile.postal_code || "");
        setEmail(result.profile.email || "");
        setPhone(result.profile.phone || "");
      }
      setActiveTab("banking");
    } else {
      toast.error("Failed to save personal information", {
        description: result.error,
      });
    }
  };

  const handleSaveBanking = async () => {
    if (!bankName.trim()) {
      toast.error("Bank name is required");
      return;
    }
    if (!accountNumber.trim()) {
      toast.error("Account number is required");
      return;
    }

    const result = await saveProfile({
      bank_name: bankName.trim(),
      bank_address: bankAddress.trim() || null,
      swift_code: swiftCode.trim() || null,
      bank_routing_number: routingNumber.trim() || null,
      account_type: accountType,
      currency: currency,
      bank_account_number: accountNumber.trim(),
    });

    if (result.ok) {
      toast.success("Banking details saved");
      // Sync local state with saved data to ensure consistency
      if (result.profile) {
        setBankName(result.profile.bank_name || "");
        setBankAddress(result.profile.bank_address || "");
        setSwiftCode(result.profile.swift_code || "");
        setRoutingNumber(result.profile.bank_routing_number || "");
        setAccountType(result.profile.account_type || "Checking");
        setCurrency(result.profile.currency || "USD");
        setAccountNumber(result.profile.bank_account_number || "");
      }
      // Stay on banking tab - don't navigate away
    } else {
      toast.error("Failed to save banking details", {
        description: result.error,
      });
    }
  };

  const handleCancel = () => {
    // Revert to saved values
    if (profile) {
      setFullName(profile.full_name || "");
      setAddressLine1(profile.address_line1 || "");
      setAddressLine2(profile.address_line2 || "");
      setStateParish(profile.state_parish || "");
      setCountry(profile.country || "");
      setPostalCode(profile.postal_code || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setBankName(profile.bank_name || "");
      setBankAddress(profile.bank_address || "");
      setSwiftCode(profile.swift_code || "");
      setRoutingNumber(profile.bank_routing_number || "");
      setAccountType(profile.account_type || "Checking");
      setCurrency(profile.currency || "USD");
      setAccountNumber(profile.bank_account_number || "");
    }
    onCancel();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load profile</p>
          <p className="text-sm text-gray-500 mb-4">{error.message}</p>
          <Button onClick={onCancel} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onCancel}
          className="mb-4 md:mb-6 -ml-2 h-9 md:h-10 px-2 text-sm md:text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
          Back to Dashboard
        </Button>

        {/* Page Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
            Contractor Profile
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Manage your personal and banking information
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white border-b border-gray-200 w-full justify-start h-auto p-0 rounded-none overflow-x-auto">
            <TabsTrigger
              value="personal"
              className="px-4 py-3 whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Personal Information
            </TabsTrigger>
            <TabsTrigger
              value="banking"
              className="px-4 py-3 whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Banking Details
            </TabsTrigger>
            <TabsTrigger
              value="onboarding"
              className="px-4 py-3 whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Work Order
            </TabsTrigger>
            <TabsTrigger
              value="contract"
              className="px-4 py-3 whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Contract Information
            </TabsTrigger>
            <TabsTrigger
              value="tax"
              className="px-4 py-3 whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Tax Forms
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <div className="bg-white rounded-[14px] border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Personal Information
              </h2>

              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <Label
                    htmlFor="fullName"
                    className="text-sm font-medium text-gray-900 mb-1.5 block"
                  >
                    Full Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 bg-white border-gray-300 rounded-lg"
                  />
                </div>

                {/* Address Line 1 */}
                <div>
                  <Label
                    htmlFor="addressLine1"
                    className="text-sm font-medium text-gray-900 mb-1.5 block"
                  >
                    Address Line 1
                  </Label>
                  <Input
                    id="addressLine1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street address"
                    className="h-11 bg-white border-gray-300 rounded-lg"
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <Label
                    htmlFor="addressLine2"
                    className="text-sm font-medium text-gray-900 mb-1.5 block"
                  >
                    Address Line 2
                  </Label>
                  <Input
                    id="addressLine2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, etc."
                    className="h-11 bg-white border-gray-300 rounded-lg"
                  />
                </div>

                {/* State/Parish & Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="stateParish"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      State / Parish
                    </Label>
                    <Input
                      id="stateParish"
                      value={stateParish}
                      onChange={(e) => setStateParish(e.target.value)}
                      className="h-11 bg-white border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="country"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-11 bg-white border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Postal Code */}
                <div>
                  <Label
                    htmlFor="postalCode"
                    className="text-sm font-medium text-gray-900 mb-1.5 block"
                  >
                    Zip / Postal Code
                  </Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="h-11 bg-white border-gray-300 rounded-lg"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Email Address <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 bg-white border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="phone"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 bg-white border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-11 px-6 w-full sm:w-auto rounded-lg border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePersonal}
                  disabled={isSaving}
                  className="h-11 px-6 w-full sm:w-auto rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Continue"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Banking Details Tab */}
          <TabsContent value="banking" className="space-y-6">
            {/* Previous Invoice Upload for Senior Contractors */}
            <div className="bg-white rounded-[14px] border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Senior Contractor Auto-Fill
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Been collecting via bank transfer? Upload your previous invoice (PDF, Word, or image — max 10MB) to automatically populate your banking details and last invoice number.
              </p>

              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Upload your previous invoice (PDF, Word, or image)
                </p>
              </div>

              {invoiceUploadError && (
                <p className="mt-3 text-sm text-red-600">{invoiceUploadError}</p>
              )}

              <input
                ref={invoiceFileInputRef}
                type="file"
                accept={WORK_ORDER_ACCEPT}
                className="hidden"
                onChange={handlePreviousInvoiceSelect}
              />

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => invoiceFileInputRef.current?.click()}
                  disabled={isUploading || isExtracting}
                  className="h-11 px-6 rounded-lg border-gray-300"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting Details...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Previous Invoice
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-[14px] border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Banking Details
              </h2>

              <div className="space-y-5">
                {/* Name of Bank */}
                <div>
                  <Label
                    htmlFor="bankName"
                    className="text-sm font-medium text-gray-900 mb-1.5 block"
                  >
                    Name of Bank <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="h-11 bg-white border-gray-300 rounded-lg"
                  />
                </div>

                {/* Bank Address */}
                <div>
                  <Label
                    htmlFor="bankAddress"
                    className="text-sm font-medium text-gray-900 mb-1.5 block"
                  >
                    Bank Address
                  </Label>
                  <Textarea
                    id="bankAddress"
                    value={bankAddress}
                    onChange={(e) => setBankAddress(e.target.value)}
                    rows={3}
                    className="bg-white border-gray-300 rounded-lg resize-none"
                  />
                </div>

                {/* SWIFT Code & ABA/Wire Routing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="swiftCode"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      SWIFT Code
                    </Label>
                    <Input
                      id="swiftCode"
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value)}
                      className="h-11 bg-white border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="routingNumber"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      ABA / Wire Routing
                    </Label>
                    <Input
                      id="routingNumber"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className="h-11 bg-white border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Account Type & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="accountType"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Account Type
                    </Label>
                    <Select value={accountType} onValueChange={setAccountType}>
                      <SelectTrigger
                        id="accountType"
                        className="h-11 bg-white border-gray-300 rounded-lg"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Checking">Checking</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="currency"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Currency
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger
                        id="currency"
                        className="h-11 bg-white border-gray-300 rounded-lg"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="JMD">JMD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <Label
                    htmlFor="accountNumber"
                    className="text-sm font-medium text-gray-900 mb-1.5 block"
                  >
                    Account Number <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="h-11 bg-white border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-11 px-6 w-full sm:w-auto rounded-lg border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBanking}
                  disabled={isSaving}
                  className="h-11 px-6 w-full sm:w-auto rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Onboarding Tab */}
          <TabsContent value="onboarding" className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Work Order:</span> Upload your
                signed work order for our records, then enter your contract
                details and your last invoice number. Review the values below
                before saving — new invoices will continue from the number you
                provide.
              </p>
            </div>

            {/* Work Order Upload */}
            <div className="bg-white rounded-[14px] border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Signed Work Order
              </h2>

              {onboarding?.work_order_path ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                    onClick={handleViewWorkOrder}
                  >
                    <FileText className="w-5 h-5 text-blue-600 shrink-0 group-hover:scale-105 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 group-hover:underline">
                        {onboarding.work_order_filename || "Work order"}
                      </p>
                      {onboarding.work_order_uploaded_at && (
                        <p className="text-xs text-gray-500">
                          Uploaded{" "}
                          {formatContractDate(
                            onboarding.work_order_uploaded_at,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      onClick={() => setWoMenuOpen(!woMenuOpen)}
                      className="h-9 w-9 p-0 text-gray-500 hover:bg-gray-100 shrink-0 cursor-pointer rounded-lg"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${woMenuOpen ? 'rotate-180' : ''}`} />
                    </Button>

                    {woMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setWoMenuOpen(false)} />
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-40 animate-fadeIn">
                          <button
                            onClick={() => {
                              setWoMenuOpen(false);
                              handleViewWorkOrder();
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            View Document
                          </button>
                          
                          <button
                            onClick={() => {
                              setWoMenuOpen(false);
                              handleDownloadWorkOrder();
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                          >
                            <DownloadCloud className="w-3.5 h-3.5 text-gray-400" />
                            Download Document
                          </button>

                          <button
                            onClick={() => {
                              setWoMenuOpen(false);
                              handleEditWorkOrderMetadata();
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-gray-400" />
                            Edit Metadata (Rename)
                          </button>

                          <button
                            onClick={() => {
                              setWoMenuOpen(false);
                              fileInputRef.current?.click();
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                            Replace PDF File
                          </button>

                          <div className="border-t border-gray-100 my-1" />

                          <button
                            onClick={() => {
                              setWoMenuOpen(false);
                              handleRemoveWorkOrder();
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            Delete Work Order
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Upload your signed work order (PDF, Word, or image — max
                    10MB)
                  </p>
                </div>
              )}

              {uploadError && (
                <p className="mt-3 text-sm text-red-600">{uploadError}</p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={WORK_ORDER_ACCEPT}
                className="hidden"
                onChange={handleWorkOrderSelect}
              />

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isExtracting}
                  className="h-11 px-6 rounded-lg border-gray-300"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting Details...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {onboarding?.work_order_path
                        ? "Replace Work Order"
                        : "Upload Work Order"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Contract Details (manually entered) */}
            <div className="bg-white rounded-[14px] border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Contract Details
                </h2>
                {isExtracting && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI Extracting...
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                These fields are extracted automatically by AI from your uploaded signed work order and are read-only.
              </p>

              <div className="space-y-5">
                {/* Role */}
                <div>
                  <Label
                    htmlFor="woRole"
                    className="text-sm font-medium text-gray-900 mb-1.5 block"
                  >
                    Role
                  </Label>
                  <Input
                    id="woRole"
                    value={woRole}
                    onChange={(e) => setWoRole(e.target.value)}
                    placeholder="Extracted role will appear here"
                    disabled
                    className="h-11 bg-gray-50 border-gray-300 rounded-lg cursor-not-allowed"
                  />
                </div>

                {/* Rate type + amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="woRateType"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Rate Type
                    </Label>
                    <Select
                      value={woRateType}
                      onValueChange={(value) => setWoRateType(value as "hourly" | "fixed")}
                      disabled
                    >
                      <SelectTrigger id="woRateType" className="h-11 bg-gray-50 border-gray-300 rounded-lg cursor-not-allowed">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="fixed">Fixed Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="woRate"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      {woRateType === "fixed" ? "Fixed Rate" : "Hourly Rate"}
                    </Label>
                    <Input
                      id="woRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={woRate}
                      onChange={(e) => setWoRate(e.target.value)}
                      placeholder="Extracted rate will appear here"
                      disabled
                      className="h-11 bg-gray-50 border-gray-300 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Start & End dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="woStart"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Contract Start Date
                    </Label>
                    <Input
                      id="woStart"
                      type="date"
                      value={woStart}
                      onChange={(e) => setWoStart(e.target.value)}
                      disabled
                      className="h-11 bg-gray-50 border-gray-300 rounded-lg cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="woEnd"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Contract Expiry Date
                    </Label>
                    <Input
                      id="woEnd"
                      type="date"
                      value={woEnd}
                      onChange={(e) => setWoEnd(e.target.value)}
                      disabled
                      className="h-11 bg-gray-50 border-gray-300 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Sequence */}
            <div className="bg-white rounded-[14px] border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Invoice Numbering
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter your last invoice number if you have one. New invoices
                will continue from it. Leave this blank if you're a new
                contractor — numbering will start automatically.
              </p>

              <div>
                <Label
                  htmlFor="lastInvoiceNumber"
                  className="text-sm font-medium text-gray-900 mb-1.5 block"
                >
                  Last Invoice Number{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="lastInvoiceNumber"
                  value={lastInvoiceNumber}
                  onChange={(e) => setLastInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-0042"
                  className="h-11 bg-white border-gray-300 rounded-lg"
                />
              </div>

              {nextInvoiceNumber && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Next invoice number will be
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {nextInvoiceNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-[14px] border border-gray-200 p-4">
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSavingOnboarding}
                  className="h-11 px-6 w-full sm:w-auto rounded-lg border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveOnboarding}
                  disabled={isSavingOnboarding}
                  className="h-11 px-6 w-full sm:w-auto rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  {isSavingOnboarding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Work Order"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Contract Information Tab */}
          <TabsContent value="contract" className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Note:</span> Rate and contract
                dates reflect what you entered in the Work Order tab. Project,
                contract type, and reporting manager are managed by your
                administrator.
              </p>
            </div>

            <div className="bg-white rounded-[14px] border border-gray-200 p-6">
              <div className="space-y-6">
                {/* Role */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Role</div>
                  <div className="text-gray-900">
                    {displayRole || "Not set"}
                  </div>
                </div>

                {/* Start Date & End Date */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Start Date</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{formatContractDate(displayStartDate)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">End Date</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>
                        {displayEndDate
                          ? formatContractDate(displayEndDate)
                          : "Ongoing"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rate (hourly: rate + overtime; fixed: single fixed rate) */}
                {isFixedRate ? (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Fixed Rate</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>
                        {onboardingRate != null
                          ? `$${onboardingRate.toFixed(2)}/monthly`
                          : "Not set"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        Hourly Rate
                      </div>
                      <div className="flex items-center gap-2 text-gray-900">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span>{formatRate(displayHourlyRate)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        Overtime Rate
                      </div>
                      <div className="flex items-center gap-2 text-gray-900">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{formatRate(displayOvertimeRate)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Project Name */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Project</div>
                  <div className="text-gray-900">
                    {contract?.project_name || "Not assigned"}
                  </div>
                </div>

                {/* Contract Type — driven by the onboarding rate type (source of
                    truth) so it matches the rate shown above, falling back to the
                    admin-managed contract. */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">
                    Contract Type
                  </div>
                  <div className="text-gray-900 capitalize">
                    {onboardingRate != null
                      ? isFixedRate
                        ? "Fixed"
                        : "Hourly"
                      : contract?.contract_type || "Not set"}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="h-11 px-6 w-full sm:w-auto rounded-lg border-gray-300"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tax Forms Tab */}
          <TabsContent value="tax" className="space-y-6">
            <TaxFormsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
