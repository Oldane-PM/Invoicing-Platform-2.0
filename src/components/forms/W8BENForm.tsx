import * as React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";

interface W8BENFormProps {
  onSuccess?: () => void;
  isReadOnly?: boolean;
  initialData?: any;
}

export function W8BENForm({ onSuccess, isReadOnly = false, initialData }: W8BENFormProps) {
  const [loading, setLoading] = React.useState(false);

  // Part I
  const [name, setName] = React.useState(initialData?.form_data?.name || "");
  const [citizenship, setCitizenship] = React.useState(initialData?.form_data?.citizenship || "");
  const [residenceAddress, setResidenceAddress] = React.useState(initialData?.form_data?.residenceAddress || "");
  const [residenceCity, setResidenceCity] = React.useState(initialData?.form_data?.residenceCity || "");
  const [residenceCountry, setResidenceCountry] = React.useState(initialData?.form_data?.residenceCountry || "");
  
  const [mailingAddress, setMailingAddress] = React.useState(initialData?.form_data?.mailingAddress || "");
  const [mailingCity, setMailingCity] = React.useState(initialData?.form_data?.mailingCity || "");
  const [mailingCountry, setMailingCountry] = React.useState(initialData?.form_data?.mailingCountry || "");
  
  const [usTaxId, setUsTaxId] = React.useState(initialData?.form_data?.usTaxId || "");
  const [foreignTaxId, setForeignTaxId] = React.useState(initialData?.form_data?.foreignTaxId || "");
  const [referenceNumber, setReferenceNumber] = React.useState(initialData?.form_data?.referenceNumber || "");
  const [dob, setDob] = React.useState(initialData?.form_data?.dob || "");

  // Part II
  const [treatyCountry, setTreatyCountry] = React.useState(initialData?.form_data?.treatyCountry || "");
  const [specialRatesArticle, setSpecialRatesArticle] = React.useState(initialData?.form_data?.specialRatesArticle || "");
  const [specialRatesPercent, setSpecialRatesPercent] = React.useState(initialData?.form_data?.specialRatesPercent || "");
  const [specialRatesIncomeType, setSpecialRatesIncomeType] = React.useState(initialData?.form_data?.specialRatesIncomeType || "");
  const [specialRatesConditions, setSpecialRatesConditions] = React.useState(initialData?.form_data?.specialRatesConditions || "");

  // Part III
  const [certifyCapacity, setCertifyCapacity] = React.useState(isReadOnly);
  const [signatureName, setSignatureName] = React.useState(initialData?.form_data?.signatureName || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!name || !citizenship || !residenceAddress || !residenceCity || !residenceCountry || !signatureName) {
      toast.error("Please fill out all required fields.");
      return;
    }

    if (!certifyCapacity) {
      toast.error("You must certify capacity to sign.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name, citizenship, residenceAddress, residenceCity, residenceCountry,
        mailingAddress, mailingCity, mailingCountry,
        usTaxId, foreignTaxId, referenceNumber, dob,
        treatyCountry, specialRatesArticle, specialRatesPercent, specialRatesIncomeType, specialRatesConditions,
        signatureName
      };

      const resWithCreds = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/w8ben/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await resWithCreds.json();

      if (data.success) {
        toast.success("W-8BEN Form submitted successfully!");
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || "Failed to submit W-8BEN form");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An unexpected error occurred while submitting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-gray-900">
      
      {/* PART I */}
      <div className="bg-white rounded-[14px] border border-gray-200 p-6">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Part I: Identification of Beneficial Owner</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="col-span-1 md:col-span-2">
            <Label>1. Name of individual who is the beneficial owner <span className="text-red-500">*</span></Label>
            <Input disabled={isReadOnly} value={name} onChange={e => setName(e.target.value)} placeholder="Full legal name" />
          </div>

          <div>
            <Label>2. Country of citizenship <span className="text-red-500">*</span></Label>
            <Input disabled={isReadOnly} value={citizenship} onChange={e => setCitizenship(e.target.value)} />
          </div>

          <div className="col-span-1 md:col-span-2 mt-2">
            <Label>3. Permanent residence address <span className="text-red-500">*</span></Label>
            <Input disabled={isReadOnly} value={residenceAddress} onChange={e => setResidenceAddress(e.target.value)} placeholder="Street, apt. or suite no., or rural route" className="mb-2" />
            <div className="grid grid-cols-2 gap-4">
              <Input disabled={isReadOnly} value={residenceCity} onChange={e => setResidenceCity(e.target.value)} placeholder="City or town, state or province" />
              <Input disabled={isReadOnly} value={residenceCountry} onChange={e => setResidenceCountry(e.target.value)} placeholder="Country" />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 mt-2">
            <Label>4. Mailing address (if different from above)</Label>
            <Input disabled={isReadOnly} value={mailingAddress} onChange={e => setMailingAddress(e.target.value)} placeholder="Street, apt. or suite no., or rural route" className="mb-2" />
            <div className="grid grid-cols-2 gap-4">
              <Input disabled={isReadOnly} value={mailingCity} onChange={e => setMailingCity(e.target.value)} placeholder="City or town, state or province" />
              <Input disabled={isReadOnly} value={mailingCountry} onChange={e => setMailingCountry(e.target.value)} placeholder="Country" />
            </div>
          </div>

          <div>
            <Label>5. U.S. taxpayer identification number (if required)</Label>
            <Input disabled={isReadOnly} value={usTaxId} onChange={e => setUsTaxId(e.target.value)} placeholder="SSN or ITIN" />
          </div>
          <div>
            <Label>6a. Foreign tax identifying number</Label>
            <Input disabled={isReadOnly} value={foreignTaxId} onChange={e => setForeignTaxId(e.target.value)} />
          </div>

          <div>
            <Label>7. Reference number(s)</Label>
            <Input disabled={isReadOnly} value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
          </div>
          <div>
            <Label>8. Date of birth (MM-DD-YYYY)</Label>
            <Input disabled={isReadOnly} value={dob} onChange={e => setDob(e.target.value)} placeholder="MM-DD-YYYY" />
          </div>
        </div>
      </div>

      {/* PART II */}
      <div className="bg-white rounded-[14px] border border-gray-200 p-6">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Part II: Claim of Tax Treaty Benefits</h2>
        
        <div className="space-y-4">
          <div>
            <Label>9. I certify that the beneficial owner is a resident of...</Label>
            <Input disabled={isReadOnly} value={treatyCountry} onChange={e => setTreatyCountry(e.target.value)} placeholder="Country" className="mt-1" />
            <p className="text-sm text-gray-500 mt-1">within the meaning of the income tax treaty between the United States and that country.</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-100">
            <Label>10. Special rates and conditions (if applicable)</Label>
            <div className="text-sm text-gray-600 space-y-3">
              <p>The beneficial owner is claiming the provisions of Article and paragraph:</p>
              <Input disabled={isReadOnly} value={specialRatesArticle} onChange={e => setSpecialRatesArticle(e.target.value)} placeholder="Article/Paragraph" />
              <p>of the treaty identified on line 9 above to claim a</p>
              <div className="flex items-center gap-2">
                <Input disabled={isReadOnly} value={specialRatesPercent} onChange={e => setSpecialRatesPercent(e.target.value)} className="w-24" placeholder="%" />
                <span>% rate of withholding on (specify type of income):</span>
              </div>
              <Input disabled={isReadOnly} value={specialRatesIncomeType} onChange={e => setSpecialRatesIncomeType(e.target.value)} placeholder="Income type" />
              <p>Explain the additional conditions in the Article and paragraph the beneficial owner meets:</p>
              <Input disabled={isReadOnly} value={specialRatesConditions} onChange={e => setSpecialRatesConditions(e.target.value)} placeholder="Conditions" />
            </div>
          </div>
        </div>
      </div>

      {/* PART III */}
      <div className="bg-white rounded-[14px] border border-blue-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold border-b border-blue-100 pb-2 mb-4 text-blue-900">Part III: Certification & Digital Signature</h2>
        
        <div className="text-sm text-gray-600 mb-6 space-y-2">
          <p>Under penalties of perjury, I declare that I have examined the information on this form and to the best of my knowledge and belief it is true, correct, and complete. I further certify under penalties of perjury that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>I am the individual that is the beneficial owner (or am authorized to sign for the individual that is the beneficial owner) of all the income or proceeds to which this form relates or am using this form to document myself for chapter 4 purposes,</li>
            <li>The person named on line 1 of this form is not a U.S. person,</li>
            <li>The income to which this form relates is: (a) not effectively connected with the conduct of a trade or business in the United States, (b) effectively connected but is not subject to tax under an applicable income tax treaty, or (c) the partner's share of a partnership's effectively connected income,</li>
            <li>The person named on line 1 of this form is a resident of the treaty country listed on line 9 of the form (if any) within the meaning of the income tax treaty between the United States and that country, and</li>
            <li>For broker transactions or barter exchanges, the beneficial owner is an exempt foreign person as defined in the instructions.</li>
          </ul>
          <p className="font-medium mt-4">Furthermore, I authorize this form to be provided to any withholding agent that has control, receipt, or custody of the income of which I am the beneficial owner or any withholding agent that can disburse or make payments of the income of which I am the beneficial owner. I agree that I will submit a new form within 30 days if any certification made on this form becomes incorrect.</p>
        </div>

        <div className="space-y-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              disabled={isReadOnly}
              checked={certifyCapacity}
              onChange={e => setCertifyCapacity(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
            />
            <span className="text-sm font-medium text-gray-900">
              I certify that I have the capacity to sign for the person identified on line 1 of this form. <span className="text-red-500">*</span>
            </span>
          </label>

          <div className="bg-[#F8FAFC] border border-blue-100 rounded-xl p-5">
            <Label className="text-blue-900 mb-2 block">Digital Signature (Type your full legal name) <span className="text-red-500">*</span></Label>
            <Input 
              disabled={isReadOnly}
              value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              placeholder="e.g. John Doe"
              className="font-serif text-lg py-6"
            />
            {isReadOnly && initialData?.signature_data?.date && (
              <p className="text-sm text-gray-500 mt-2">
                Digitally signed on: {new Date(initialData.signature_data.date).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-lg">
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><FileText className="w-5 h-5 mr-2" /> Submit Form W-8BEN</>
              )}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
