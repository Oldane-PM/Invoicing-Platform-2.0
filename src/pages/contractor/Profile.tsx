import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import { Calendar, DollarSign, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { useContractorProfile } from "../../lib/hooks/contractor/useContractorProfile";
import { format } from "date-fns";

interface ContractorProfileProps {
  onCancel: () => void;
}

export function ContractorProfile({ onCancel }: ContractorProfileProps) {
  const { profile, contract, isLoading, isSaving, error, saveProfile } = useContractorProfile();
  
  const [activeTab, setActiveTab] = React.useState("personal");
  
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
    console.log('[Profile] useEffect triggered', { 
      hasProfile: !!profile, 
      isInitialized,
      bankName: profile?.bank_name,
      accountNumber: profile?.bank_account_number,
      fullProfile: profile
    });
    
    if (profile && !isInitialized) {
      console.log('[Profile] Initializing form with profile data:', profile);
      
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
      console.log('[Profile] Setting banking fields:', {
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
      console.log('[Profile] Form initialized');
    }
  }, [profile, isInitialized]);

  // Format contract dates for display
  const formatContractDate = (dateStr: string | null) => {
    if (!dateStr) return "Not set";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
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
      toast.error("Failed to save personal information", { description: result.error });
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
      toast.error("Failed to save banking details", { description: result.error });
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
          <TabsList className="mb-6 bg-white border-b border-gray-200 w-full justify-start h-auto p-0 rounded-none">
            <TabsTrigger
              value="personal"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Personal Information
            </TabsTrigger>
            <TabsTrigger
              value="banking"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Banking Details
            </TabsTrigger>
            <TabsTrigger
              value="contract"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Contract Information
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
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                  <Label htmlFor="addressLine1" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                  <Label htmlFor="addressLine2" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stateParish" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                    <Label htmlFor="country" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                  <Label htmlFor="postalCode" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-11 px-6 rounded-lg border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePersonal}
                  disabled={isSaving}
                  className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700"
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
            <div className="bg-white rounded-[14px] border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Banking Details
              </h2>

              <div className="space-y-5">
                {/* Name of Bank */}
                <div>
                  <Label htmlFor="bankName" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                  <Label htmlFor="bankAddress" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="swiftCode" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                    <Label htmlFor="routingNumber" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accountType" className="text-sm font-medium text-gray-900 mb-1.5 block">
                      Account Type
                    </Label>
                    <Select value={accountType} onValueChange={setAccountType}>
                      <SelectTrigger id="accountType" className="h-11 bg-white border-gray-300 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Checking">Checking</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency" className="text-sm font-medium text-gray-900 mb-1.5 block">
                      Currency
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency" className="h-11 bg-white border-gray-300 rounded-lg">
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
                  <Label htmlFor="accountNumber" className="text-sm font-medium text-gray-900 mb-1.5 block">
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
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-11 px-6 rounded-lg border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBanking}
                  disabled={isSaving}
                  className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700"
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

          {/* Contract Information Tab */}
          <TabsContent value="contract" className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Note:</span> Contract information is managed by your administrator and cannot be edited.
              </p>
            </div>

            <div className="bg-white rounded-[14px] border border-gray-200 p-6">
              <div className="space-y-6">
                {/* Start Date & End Date */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Start Date</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{formatContractDate(contract?.start_date || null)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">End Date</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{contract?.end_date ? formatContractDate(contract.end_date) : "Ongoing"}</span>
                    </div>
                  </div>
                </div>

                {/* Hourly Rate & Overtime Rate */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Hourly Rate</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>{formatRate(contract?.hourly_rate || null)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Overtime Rate</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{formatRate(contract?.overtime_rate || null)}</span>
                    </div>
                  </div>
                </div>

                {/* Project Name */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Project</div>
                  <div className="text-gray-900">{contract?.project_name || "Not assigned"}</div>
                </div>

                {/* Contract Type */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Contract Type</div>
                  <div className="text-gray-900 capitalize">{contract?.contract_type || "Not set"}</div>
                </div>

                {/* Reporting Manager */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Reporting Manager</div>
                  <div className="text-gray-900">{contract?.reporting_manager_name || "Not assigned"}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="h-11 px-6 rounded-lg border-gray-300"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
