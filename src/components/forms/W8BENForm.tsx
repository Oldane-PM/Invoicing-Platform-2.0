import * as React from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Eye } from "lucide-react";
import { supabase } from "../../lib/supabase/client";

interface W8BENFormProps {
  onSuccess?: () => void;
  isReadOnly?: boolean;
  initialData?: any;
}

export function W8BENForm({ onSuccess, isReadOnly = false }: W8BENFormProps) {
  const [loading, setLoading] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF document");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10MB.");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!selectedFile) {
      toast.error("Please upload a PDF document of your W-8BEN form.");
      return;
    }

    setLoading(true);

    try {
      const pdfBase64 = await toBase64(selectedFile);

      const payload = {
        pdfBase64,
        filename: selectedFile.name,
      };

      const sessionResponse = await supabase?.auth.getSession();
      const token = sessionResponse?.data?.session?.access_token;

      const resWithCreds = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/w8ben/submit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      let data;
      try {
        const text = await resWithCreds.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Non-JSON response:", text);
          throw new Error(`Server returned an invalid response (Status ${resWithCreds.status}).`);
        }
      } catch (e: any) {
        throw new Error(e.message || "Failed to parse server response.");
      }

      if (resWithCreds.ok && data.success) {
        toast.success("W-8BEN Form uploaded successfully!");
        setSelectedFile(null);
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || "Failed to upload W-8BEN document");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "An unexpected error occurred while uploading.");
    } finally {
      setLoading(false);
    }
  };

  if (isReadOnly) {
    return (
      <div className="bg-white rounded-[14px] border border-gray-200 p-6">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">W-8BEN Document</h2>
        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Document Uploaded</p>
            <p className="text-xs text-gray-500">Your W-8BEN form has been submitted and is currently on file.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <div className="bg-white rounded-[14px] border border-gray-200 p-6">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Upload W-8BEN Form</h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please upload a completed and signed PDF copy of your Form W-8BEN.
          </p>

          {!selectedFile ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-900 mb-1">
                Drag & drop your W-8BEN PDF here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                PDF up to 10MB
              </p>
            </div>
          ) : (
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.open(URL.createObjectURL(selectedFile), '_blank')}
                    className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    title="Preview Document"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedFile(null)} 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Remove Document"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={loading || !selectedFile} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 rounded-lg">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Submit W-8BEN</>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
