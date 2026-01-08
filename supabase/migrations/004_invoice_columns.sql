-- Migration: Add invoice generation columns to submissions table
-- These columns track invoice PDF generation status and location

-- Invoice status: PENDING (not yet generated), GENERATED (PDF exists), FAILED (generation failed)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'PENDING';

-- Invoice number in format INV-YYYYMM-XXXXXX
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Path to the PDF in Supabase Storage (bucket: invoices)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS invoice_path TEXT;

-- Timestamp when invoice was generated
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ;

-- Error message if invoice generation failed
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS invoice_error TEXT;

-- Create index on invoice_status for filtering
CREATE INDEX IF NOT EXISTS idx_submissions_invoice_status ON public.submissions(invoice_status);

-- Create unique index on invoice_number to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_invoice_number ON public.submissions(invoice_number)
WHERE invoice_number IS NOT NULL;

-- =============================================
-- STORAGE BUCKET SETUP (run manually in Supabase Dashboard)
-- =============================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named "invoices"
-- 3. Set it to PRIVATE (not public)
-- 4. The backend will use signed URLs for secure access

-- =============================================
-- RLS POLICY FOR STORAGE (optional, for extra security)
-- =============================================
-- These policies can be added via Supabase Dashboard > Storage > Policies

-- Example policy for the invoices bucket:
-- INSERT: Allow authenticated users to upload their own invoices
-- SELECT: Allow users to read only their own invoices (path starts with their user ID)

COMMENT ON COLUMN public.submissions.invoice_status IS 'Invoice generation status: PENDING, GENERATED, or FAILED';
COMMENT ON COLUMN public.submissions.invoice_number IS 'Invoice number in format INV-YYYYMM-XXXXXX';
COMMENT ON COLUMN public.submissions.invoice_path IS 'Path to PDF in Supabase Storage invoices bucket';
COMMENT ON COLUMN public.submissions.invoice_generated_at IS 'Timestamp when invoice PDF was generated';
COMMENT ON COLUMN public.submissions.invoice_error IS 'Error message if invoice generation failed';
