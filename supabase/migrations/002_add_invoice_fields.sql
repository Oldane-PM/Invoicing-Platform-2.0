-- Migration: Add invoice generation fields to submissions table
-- Run this in Supabase SQL Editor

-- Add invoice-related columns to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'PENDING' CHECK (invoice_status IN ('PENDING', 'GENERATED', 'FAILED')),
ADD COLUMN IF NOT EXISTS invoice_path TEXT,
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_error TEXT,
ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ;

-- Add project_name if not exists (for invoice content)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Add total_amount if not exists (calculated field stored for invoice)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);

-- Add regular_hours and overtime_hours summary fields
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS regular_hours NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(8, 2);

-- Add description fields for invoice
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS overtime_description TEXT;

-- Create index on invoice_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_invoice_number ON public.submissions(invoice_number);

-- Create index on invoice_status for filtering
CREATE INDEX IF NOT EXISTS idx_submissions_invoice_status ON public.submissions(invoice_status);

-- Create Supabase Storage bucket for invoices (run via Supabase Dashboard or API)
-- This creates a PRIVATE bucket - files are not publicly accessible
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- RLS Policy for storage bucket (ensure only owners can access their invoices)
-- This should be configured in Supabase Dashboard under Storage > Policies

COMMENT ON COLUMN public.submissions.invoice_number IS 'Unique invoice number in format INV-YYYYMM-XXXXXX';
COMMENT ON COLUMN public.submissions.invoice_status IS 'PDF generation status: PENDING, GENERATED, or FAILED';
COMMENT ON COLUMN public.submissions.invoice_path IS 'Storage path like contractorId/workPeriod/invoiceNumber.pdf';
COMMENT ON COLUMN public.submissions.invoice_url IS 'Optional cached URL (prefer signed URLs)';
COMMENT ON COLUMN public.submissions.invoice_error IS 'Error message if generation failed';
COMMENT ON COLUMN public.submissions.invoice_generated_at IS 'Timestamp when invoice PDF was generated';
