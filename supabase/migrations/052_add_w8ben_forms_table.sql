-- Drop existing table if it exists (to fix column type from UUID to TEXT)
DROP TABLE IF EXISTS public.w8ben_forms CASCADE;

-- Create w8ben_forms table
CREATE TABLE IF NOT EXISTS public.w8ben_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_user_id TEXT NOT NULL,
    form_data JSONB NOT NULL,
    signature_data JSONB NOT NULL,
    pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure one form per contractor (can be modified later if multiple versions are needed, but for now 1 is good)
    UNIQUE(contractor_user_id)
);

-- Add RLS policies
ALTER TABLE public.w8ben_forms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Contractors can view their own W8BEN forms" ON public.w8ben_forms;
DROP POLICY IF EXISTS "Contractors can insert their own W8BEN forms" ON public.w8ben_forms;
DROP POLICY IF EXISTS "Admins and Managers can view all W8BEN forms" ON public.w8ben_forms;

-- Contractors can view their own forms
CREATE POLICY "Contractors can view their own W8BEN forms"
    ON public.w8ben_forms FOR SELECT
    USING (auth.uid()::text = contractor_user_id);

-- Contractors can insert their own forms
CREATE POLICY "Contractors can insert their own W8BEN forms"
    ON public.w8ben_forms FOR INSERT
    WITH CHECK (auth.uid()::text = contractor_user_id);

-- Managers and Admins can view all forms
CREATE POLICY "Admins and Managers can view all W8BEN forms"
    ON public.w8ben_forms FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- Admins and Managers can update any form (for returning forms for review)
DROP POLICY IF EXISTS "Admins and Managers can update W8BEN forms" ON public.w8ben_forms;
CREATE POLICY "Admins and Managers can update W8BEN forms"
    ON public.w8ben_forms FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- Contractors can update their own forms (for re-submission after return)
DROP POLICY IF EXISTS "Contractors can update their own W8BEN forms" ON public.w8ben_forms;
CREATE POLICY "Contractors can update their own W8BEN forms"
    ON public.w8ben_forms FOR UPDATE
    USING (auth.uid()::text = contractor_user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.w8ben_forms TO authenticated;
