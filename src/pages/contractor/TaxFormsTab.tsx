import * as React from "react";
import { Button } from "../../components/ui/button";

import { Loader2, Download, CheckCircle2, AlertTriangle, Upload, FileText, Eye, X } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { toast } from "sonner";

export function TaxFormsTab() {
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);

  const [formData, setFormData] = React.useState<any>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const sessionResponse = await supabase?.auth.getSession();
      if (!sessionResponse?.data?.session?.user?.id) return;
      const token = sessionResponse.data.session.access_token;

      const baseUrl = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/api/w8ben/${sessionResponse.data.session.user.id}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`
        }
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
    fetchForm();
  }, []);

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file first.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('w8ben', selectedFile);

      const sessionResponse = await supabase?.auth.getSession();
      const token = sessionResponse?.data?.session?.access_token;

      const baseUrl = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "");
      const resWithCreds = await fetch(`${baseUrl}/api/w8ben/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await resWithCreds.json();

      if (data.success) {
        toast.success("W-8BEN Form uploaded successfully!");
        fetchForm();
      } else {
        toast.error(data.error || "Failed to upload W-8BEN form");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An unexpected error occurred while uploading.");
    } finally {
      setUploading(false);
    }
  };

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

        {isSubmitted && formData.signed_pdf_url && (
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Submitted on {new Date(formData.created_at).toLocaleDateString()}
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => window.open(formData.signed_pdf_url, '_blank')}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        )}
      </div>

      {/* Form Content */}
      {!isSubmitted && (
        <div className="bg-white rounded-[14px] border border-gray-200 p-8 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Upload your completed W-8BEN form</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Please ensure the form is fully filled out, signed, and saved as a PDF document.
          </p>

          <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer group ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                }`}
              >
                <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`} />
                <p className={`text-sm font-medium transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'}`}>Drag & drop your PDF here, or click to choose file</p>
                <p className="text-xs text-gray-400 mt-1">PDF format only</p>
              </div>
            ) : (
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Preview PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 rounded-lg hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={uploading || !selectedFile}
              className="bg-blue-600 hover:bg-blue-700 h-12 px-8 w-full rounded-lg"
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-5 h-5 mr-2" /> Upload W-8BEN Form</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

