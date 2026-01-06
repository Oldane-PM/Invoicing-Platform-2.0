import { useState } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";

// Type definitions
type AccountType = "CHECKING" | "SAVINGS";

interface PersonalInfo {
  fullName: string;
  address: string;
  state: string;
  country: string;
  zipCode: string;
  email: string;
  phone: string;
}

interface BankingDetails {
  bankName: string;
  bankAddress: string;
  swiftCode: string;
  routingNumber: string;
  accountType: AccountType;
  currency: string;
  accountNumber: string;
}

interface ContractInfo {
  startDate: string;
  endDate: string;
  hourlyRate: number;
  overtimeRate: number;
  position: string;
  department: string;
  reportingManager: string;
}

interface ContractorProfile {
  personal: PersonalInfo;
  banking: BankingDetails;
  contract: ContractInfo;
}

type TabId = "personal" | "banking" | "contract";

interface TabButtonProps {
  id: TabId;
  label: string;
}

// Mock data - in production this would come from API
const mockProfileData: ContractorProfile = {
  personal: {
    fullName: "Sarah Johnson",
    address: "123 Main Street, Apartment 4B",
    state: "California",
    country: "United States",
    zipCode: "90210",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
  },
  banking: {
    bankName: "First National Bank",
    bankAddress:
      "456 Banking Boulevard, Financial District, New York, NY 10004",
    swiftCode: "FNBAUS33",
    routingNumber: "021000021",
    accountType: "CHECKING",
    currency: "USD",
    accountNumber: "9876543210",
  },
  contract: {
    startDate: "2024-01-15",
    endDate: "Ongoing",
    hourlyRate: 75.0,
    overtimeRate: 112.5,
    position: "Senior Software Developer",
    department: "Engineering",
    reportingManager: "Michael Chen",
  },
};

const ContractorProfile = () => {
  const [activeTab, setActiveTab] = useState<TabId>("personal");
  const [formData, setFormData] = useState<ContractorProfile>(mockProfileData);
  const [originalData, setOriginalData] =
    useState<ContractorProfile>(mockProfileData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");

  const handleInputChange = (
    section: keyof ContractorProfile,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePersonalInfo = (): boolean => {
    const newErrors: Record<string, string> = {};
    const { personal } = formData;

    if (!personal.fullName?.trim())
      newErrors.fullName = "Full name is required";
    if (!personal.state?.trim()) newErrors.state = "State/Parish is required";
    if (!personal.country?.trim()) newErrors.country = "Country is required";
    if (!personal.zipCode?.trim())
      newErrors.zipCode = "Zip/Postal code is required";
    if (!personal.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(personal.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!personal.phone?.trim()) newErrors.phone = "Phone number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBankingDetails = (): boolean => {
    const newErrors: Record<string, string> = {};
    const { banking } = formData;

    if (!banking.bankName?.trim()) newErrors.bankName = "Bank name is required";
    if (!banking.bankAddress?.trim())
      newErrors.bankAddress = "Bank address is required";
    if (!banking.swiftCode?.trim())
      newErrors.swiftCode = "SWIFT code is required";
    if (!banking.routingNumber?.trim())
      newErrors.routingNumber = "ABA/Wire routing is required";
    if (!banking.accountType)
      newErrors.accountType = "Account type is required";
    if (!banking.currency) newErrors.currency = "Currency is required";
    if (!banking.accountNumber?.trim())
      newErrors.accountNumber = "Account number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancel = (): void => {
    setFormData(originalData);
    setErrors({});
  };

  const handleSavePersonal = (): void => {
    if (validatePersonalInfo()) {
      // Mock API call
      setOriginalData(formData);
      setToastMessage("Personal information saved successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      // Optionally switch to next tab
      setActiveTab("banking");
    }
  };

  const handleSaveBanking = (): void => {
    if (validateBankingDetails()) {
      // Mock API call
      setOriginalData(formData);
      setToastMessage("Banking details saved successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const TabButton: React.FC<TabButtonProps> = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-6 py-3 font-medium text-base transition-colors ${
        activeTab === id
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <button className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="text-base">Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Contractor Profile
          </h1>
          <p className="text-gray-600 text-lg">
            Manage your personal and banking information
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex space-x-8">
            <TabButton id="personal" label="Personal Information" />
            <TabButton id="banking" label="Banking Details" />
            <TabButton id="contract" label="Contract Information" />
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Personal Information Tab */}
          {activeTab === "personal" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Personal Information
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.personal.fullName}
                    onChange={(e) =>
                      handleInputChange("personal", "fullName", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg text-base ${
                      errors.fullName ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.personal.address}
                    onChange={(e) =>
                      handleInputChange("personal", "address", e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      State / Parish <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personal.state}
                      onChange={(e) =>
                        handleInputChange("personal", "state", e.target.value)
                      }
                      className={`w-full px-4 py-3 border rounded-lg text-base ${
                        errors.state ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.state}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personal.country}
                      onChange={(e) =>
                        handleInputChange("personal", "country", e.target.value)
                      }
                      className={`w-full px-4 py-3 border rounded-lg text-base ${
                        errors.country ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.country && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.country}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Zip / Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.personal.zipCode}
                    onChange={(e) =>
                      handleInputChange("personal", "zipCode", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg text-base ${
                      errors.zipCode ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.zipCode && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.zipCode}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.personal.email}
                      onChange={(e) =>
                        handleInputChange("personal", "email", e.target.value)
                      }
                      className={`w-full px-4 py-3 border rounded-lg text-base ${
                        errors.email ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.personal.phone}
                      onChange={(e) =>
                        handleInputChange("personal", "phone", e.target.value)
                      }
                      className={`w-full px-4 py-3 border rounded-lg text-base ${
                        errors.phone ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePersonal}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Save & Continue
                </button>
              </div>
            </div>
          )}

          {/* Banking Details Tab */}
          {activeTab === "banking" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Banking Details
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Name of Bank <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.banking.bankName}
                    onChange={(e) =>
                      handleInputChange("banking", "bankName", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg text-base ${
                      errors.bankName ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.bankName && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.bankName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Bank Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.banking.bankAddress}
                    onChange={(e) =>
                      handleInputChange(
                        "banking",
                        "bankAddress",
                        e.target.value
                      )
                    }
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg text-base ${
                      errors.bankAddress ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.bankAddress && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.bankAddress}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      SWIFT Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.banking.swiftCode}
                      onChange={(e) =>
                        handleInputChange(
                          "banking",
                          "swiftCode",
                          e.target.value
                        )
                      }
                      className={`w-full px-4 py-3 border rounded-lg text-base ${
                        errors.swiftCode ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.swiftCode && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.swiftCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      ABA / Wire Routing <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.banking.routingNumber}
                      onChange={(e) =>
                        handleInputChange(
                          "banking",
                          "routingNumber",
                          e.target.value
                        )
                      }
                      className={`w-full px-4 py-3 border rounded-lg text-base ${
                        errors.routingNumber
                          ? "border-red-500"
                          : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.routingNumber && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.routingNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Account Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.banking.accountType}
                      onChange={(e) =>
                        handleInputChange(
                          "banking",
                          "accountType",
                          e.target.value
                        )
                      }
                      className={`w-full px-4 py-3 border rounded-lg text-base ${
                        errors.accountType
                          ? "border-red-500"
                          : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white`}
                    >
                      <option value="CHECKING">Checking</option>
                      <option value="SAVINGS">Savings</option>
                    </select>
                    {errors.accountType && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.accountType}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Currency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.banking.currency}
                      onChange={(e) =>
                        handleInputChange("banking", "currency", e.target.value)
                      }
                      className={`w-full px-4 py-3 border rounded-lg text-base ${
                        errors.currency ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white`}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                    {errors.currency && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.currency}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.banking.accountNumber}
                    onChange={(e) =>
                      handleInputChange(
                        "banking",
                        "accountNumber",
                        e.target.value
                      )
                    }
                    className={`w-full px-4 py-3 border rounded-lg text-base ${
                      errors.accountNumber
                        ? "border-red-500"
                        : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.accountNumber && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.accountNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBanking}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </div>
          )}

          {/* Contract Information Tab */}
          {activeTab === "contract" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Contract Information
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Contract information is managed by your
                  administrator and cannot be edited.
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-900">
                      {formData.contract.startDate}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-900">
                      {formData.contract.endDate}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-900">
                      ${formData.contract.hourlyRate.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overtime Rate
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-900">
                      ${formData.contract.overtimeRate.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-900">
                    {formData.contract.position}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-900">
                    {formData.contract.department}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reporting Manager
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-900">
                    {formData.contract.reportingManager}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center">
          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default ContractorProfile;
