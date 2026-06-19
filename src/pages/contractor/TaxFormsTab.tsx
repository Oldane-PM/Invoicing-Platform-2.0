import * as React from "react";
import { W8BENForm } from "../../components/forms/W8BENForm";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../lib/hooks/useAuth";

export function TaxFormsTab() {
  const [loading, setLoading] = React.useState(true);
  const [formData, setFormData] = React.useState<any>(null);
  const { user } = useAuth();

  const fetchForm = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) return;

      const sessionResponse = await supabase?.auth.getSession();
      const token = sessionResponse?.data?.session?.access_token;

      const apiBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_AUTH_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/+$/, "");
      const res = await fetch(`${apiBase}/api/w8ben/${user.id}`, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFormData(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch W-8BEN form", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user?.id) {
      fetchForm();
    }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[14px] border border-gray-200">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500">Loading tax forms...</p>
      </div>
    );
  }

  const isReturned = formData?.status === 'returned';
  const isSubmitted = formData && !isReturned;
  const returnReason = formData?.form_data?._return_reason;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-[14px] border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Form W-8BEN</h2>
            <p className="text-sm text-gray-600">
              Certificate of Foreign Status of Beneficial Owner for United States Tax Withholding and Reporting
            </p>
          </div>
          
          {isSubmitted ? (
            <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium text-sm">Submitted</span>
            </div>
          ) : isReturned ? (
            <div className="flex items-center gap-3 bg-orange-50 text-orange-700 px-4 py-2 rounded-full border border-orange-200">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium text-sm">Returned for Review</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-50 text-amber-700 px-4 py-2 rounded-full border border-amber-200">
              <span className="font-medium text-sm">Action Required</span>
            </div>
          )}
        </div>

        {/* Return reason banner */}
        {isReturned && returnReason && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm font-medium text-orange-800 mb-1">Reason for return:</p>
            <p className="text-sm text-orange-700">{returnReason}</p>
          </div>
        )}

        {isSubmitted && formData.created_at && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              Submitted on {new Date(formData.created_at).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* Form Content */}
      <W8BENForm 
        isReadOnly={isSubmitted} 
        initialData={formData} 
        onSuccess={fetchForm}
      />
    </div>
  );
}
