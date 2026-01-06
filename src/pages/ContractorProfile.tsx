import * as React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Calendar, DollarSign, Clock, ArrowLeft } from "lucide-react";

interface ContractorProfileProps {
  onCancel: () => void;
}

export function ContractorProfile({ onCancel }: ContractorProfileProps) {
  const [activeTab, setActiveTab] = React.useState("personal");
  
  // Personal Information State
  const [fullName, setFullName] = React.useState("Sarah Johnson");
  const [address, setAddress] = React.useState("123 Main Street, Apartment 4B");
  const [state, setState] = React.useState("California");
  const [country, setCountry] = React.useState("United States");
  const [zipCode, setZipCode] = React.useState("90210");
  const [email, setEmail] = React.useState("sarah.johnson@email.com");
  const [phone, setPhone] = React.useState("+1 (555) 123-4567");

  // Banking Details State
  const [bankName, setBankName] = React.useState("First National Bank");
  const [bankAddress, setBankAddress] = React.useState("456 Banking Boulevard, Financial District, New York, NY 10004");
  const [swiftCode, setSwiftCode] = React.useState("FNBAUS33");
  const [routingNumber, setRoutingNumber] = React.useState("021000021");
  const [accountType, setAccountType] = React.useState("Checking");
  const [currency, setCurrency] = React.useState("USD");
  const [accountNumber, setAccountNumber] = React.useState("9876543210");

  // Contract Information (Read-only)
  const contractInfo = {
    startDate: "Jan 14, 2023",
    endDate: "Ongoing",
    hourlyRate: "$50.00/hour",
    overtimeRate: "$75.00/hour",
    position: "Senior Developer",
    department: "Engineering",
    reportingManager: "John Smith",
  };

  const handleSavePersonal = () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email address is required");
      return;
    }

    toast.success("Personal information saved successfully");
    setActiveTab("banking");
  };

  const handleSaveBanking = () => {
    if (!bankName.trim()) {
      toast.error("Bank name is required");
      return;
    }
    if (!accountNumber.trim()) {
      toast.error("Account number is required");
      return;
    }

    toast.success("Profile saved successfully");
    onCancel();
  };

  const handleCancel = () => {
    onCancel();
  };

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

                {/* Address */}
                <div>
                  <Label htmlFor="address" className="text-sm font-medium text-gray-900 mb-1.5 block">
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="bg-white border-gray-300 rounded-lg resize-none"
                  />
                </div>

                {/* State/Parish & Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="state" className="text-sm font-medium text-gray-900 mb-1.5 block">
                      State / Parish <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-11 bg-white border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-sm font-medium text-gray-900 mb-1.5 block">
                      Country <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-11 bg-white border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Zip Code */}
                <div>
                  <Label htmlFor="zipCode" className="text-sm font-medium text-gray-900 mb-1.5 block">
                    Zip / Postal Code <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="zipCode"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
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
                      Phone Number <span className="text-red-600">*</span>
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
                  className="h-11 px-6 rounded-lg border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePersonal}
                  className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  Save & Continue
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
                    Bank Address <span className="text-red-600">*</span>
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
                      SWIFT Code <span className="text-red-600">*</span>
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
                      ABA / Wire Routing <span className="text-red-600">*</span>
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
                      Account Type <span className="text-red-600">*</span>
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
                      Currency <span className="text-red-600">*</span>
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
                  className="h-11 px-6 rounded-lg border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBanking}
                  className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  Save Profile
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
                      <span>{contractInfo.startDate}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">End Date</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{contractInfo.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* Hourly Rate & Overtime Rate */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Hourly Rate</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>{contractInfo.hourlyRate}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Overtime Rate</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{contractInfo.overtimeRate}</span>
                    </div>
                  </div>
                </div>

                {/* Position */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Position</div>
                  <div className="text-gray-900">{contractInfo.position}</div>
                </div>

                {/* Department */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Department</div>
                  <div className="text-gray-900">{contractInfo.department}</div>
                </div>

                {/* Reporting Manager */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Reporting Manager</div>
                  <div className="text-gray-900">{contractInfo.reportingManager}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="h-11 px-6 rounded-lg border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  disabled
                  className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 opacity-50 cursor-not-allowed"
                >
                  Save Profile
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}