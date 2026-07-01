-- Migration 066: Dynamic Validation Schema and Seed Data

-- 1. Create admin_verification_rules table
CREATE TABLE IF NOT EXISTS public.admin_verification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL CHECK (document_type IN ('work_order', 'w8ben')),
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('layout', 'signature', 'text_match', 'field_check')),
    weight INTEGER NOT NULL DEFAULT 10 CHECK (weight >= 0 AND weight <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create admin_reference_samples table
CREATE TABLE IF NOT EXISTS public.admin_reference_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL UNIQUE CHECK (document_type IN ('work_order', 'w8ben')),
    sample_pdf_url TEXT,
    reference_image_urls JSONB DEFAULT '[]'::jsonb,
    instruction_doc_link TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create admin_extraction_fields table
CREATE TABLE IF NOT EXISTS public.admin_extraction_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL CHECK (document_type IN ('work_order', 'w8ben')),
    field_name TEXT NOT NULL,
    field_description TEXT,
    field_format TEXT NOT NULL CHECK (field_format IN ('string', 'number', 'date', 'boolean')),
    mapping_key TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(document_type, mapping_key)
);

-- 4. Create document_validation_findings table
CREATE TABLE IF NOT EXISTS public.document_validation_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_user_id TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('work_order', 'w8ben')),
    pdf_url TEXT,
    findings_json JSONB NOT NULL,
    confidence_score INTEGER NOT NULL DEFAULT 0,
    validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'invalid', 'needs_manual_review')),
    reasons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create document_extracted_data table
CREATE TABLE IF NOT EXISTS public.document_extracted_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_user_id TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('work_order', 'w8ben')),
    pdf_url TEXT,
    extracted_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_verification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_reference_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_extraction_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_validation_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extracted_data ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if exist
DROP POLICY IF EXISTS "Anyone authenticated can read validation rules" ON public.admin_verification_rules;
DROP POLICY IF EXISTS "Admins and managers can write validation rules" ON public.admin_verification_rules;
DROP POLICY IF EXISTS "Anyone authenticated can read reference samples" ON public.admin_reference_samples;
DROP POLICY IF EXISTS "Admins and managers can write reference samples" ON public.admin_reference_samples;
DROP POLICY IF EXISTS "Anyone authenticated can read extraction fields" ON public.admin_extraction_fields;
DROP POLICY IF EXISTS "Admins and managers can write extraction fields" ON public.admin_extraction_fields;

DROP POLICY IF EXISTS "Contractors can view their own findings" ON public.document_validation_findings;
DROP POLICY IF EXISTS "Admins and managers can view all findings" ON public.document_validation_findings;
DROP POLICY IF EXISTS "Contractors can insert their own findings" ON public.document_validation_findings;
DROP POLICY IF EXISTS "Contractors can view their own extracted data" ON public.document_extracted_data;
DROP POLICY IF EXISTS "Admins and managers can view all extracted data" ON public.document_extracted_data;
DROP POLICY IF EXISTS "Contractors can insert their own extracted data" ON public.document_extracted_data;

-- Authenticated select, Admin/Manager CRUD policies
CREATE POLICY "Anyone authenticated can read validation rules"
    ON public.admin_verification_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can write validation rules"
    ON public.admin_verification_rules FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')));

CREATE POLICY "Anyone authenticated can read reference samples"
    ON public.admin_reference_samples FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can write reference samples"
    ON public.admin_reference_samples FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')));

CREATE POLICY "Anyone authenticated can read extraction fields"
    ON public.admin_extraction_fields FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can write extraction fields"
    ON public.admin_extraction_fields FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')));

-- Findings policies
CREATE POLICY "Contractors can view their own findings"
    ON public.document_validation_findings FOR SELECT TO authenticated
    USING (contractor_user_id = auth.uid()::text);

CREATE POLICY "Contractors can insert their own findings"
    ON public.document_validation_findings FOR INSERT TO authenticated
    WITH CHECK (contractor_user_id = auth.uid()::text);

CREATE POLICY "Admins and managers can view all findings"
    ON public.document_validation_findings FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')));

-- Extracted data policies
CREATE POLICY "Contractors can view their own extracted data"
    ON public.document_extracted_data FOR SELECT TO authenticated
    USING (contractor_user_id = auth.uid()::text);

CREATE POLICY "Contractors can insert their own extracted data"
    ON public.document_extracted_data FOR INSERT TO authenticated
    WITH CHECK (contractor_user_id = auth.uid()::text);

CREATE POLICY "Admins and managers can view all extracted data"
    ON public.document_extracted_data FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')));

-- Seed Work Order configurations
INSERT INTO public.admin_verification_rules (document_type, rule_name, rule_description, rule_type, weight, is_active) VALUES
('work_order', 'Intellibus Branding & Layout', 'Verify presence of Intellibus header logos, document headers, and section structure', 'layout', 50, true),
('work_order', 'Part III Sign-off & Certification', 'Checks if the document contains sign-off certification blocks and representative name fields', 'signature', 20, true),
('work_order', 'Contractor Signature Presence', 'Detects whether the contractor or resource signature is present in the signature block', 'signature', 30, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_extraction_fields (document_type, field_name, field_description, field_format, mapping_key, is_required) VALUES
('work_order', 'Role Name', 'Contractor role title assigned in the contract', 'string', 'role', true),
('work_order', 'Billing Rate', 'Hourly or flat rate of compensation', 'number', 'rate', true),
('work_order', 'Rate Type', 'Whether compensation is hourly, weekly, monthly, etc.', 'string', 'rateType', true),
('work_order', 'Start Date', 'Start date of the work order', 'date', 'startDate', true),
('work_order', 'End Date', 'Expiry or end date of the work order', 'date', 'endDate', true)
ON CONFLICT (document_type, mapping_key) DO NOTHING;

-- Seed W-8BEN configurations
INSERT INTO public.admin_verification_rules (document_type, rule_name, rule_description, rule_type, weight, is_active) VALUES
('w8ben', 'IRS W-8BEN Layout & Header', 'Verifies that structure matching the standard IRS Form W-8BEN is present', 'layout', 50, true),
('w8ben', 'Certification Block Presence', 'Checks for Part III certification text blocks and sign-off guidelines', 'signature', 20, true),
('w8ben', 'Contractor Signature Check', 'Detects the physical or digital signature of the beneficial owner in Part III', 'signature', 30, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_extraction_fields (document_type, field_name, field_description, field_format, mapping_key, is_required) VALUES
('w8ben', 'Beneficial Owner Name', 'First and last name of the beneficial owner', 'string', 'name', true),
('w8ben', 'Citizenship Country', 'Country of citizenship', 'string', 'citizenship', true),
('w8ben', 'Permanent Residence Address', 'Physical street address of residence', 'string', 'residenceAddress', true),
('w8ben', 'Typed Signature Name', 'Typed name of the signatory beneficial owner', 'string', 'signatureName', true)
ON CONFLICT (document_type, mapping_key) DO NOTHING;

-- Seed reference samples placeholders
INSERT INTO public.admin_reference_samples (document_type, sample_pdf_url, reference_image_urls, instruction_doc_link, is_active) VALUES
('work_order', 'tax-forms/samples/intellibus_sample_work_order.pdf', '[]'::jsonb, 'https://intellibus.atlassian.net/wiki/spaces/IN/pages/work_orders', true),
('w8ben', 'tax-forms/samples/w8ben_sample.pdf', '[]'::jsonb, 'https://www.irs.gov/pub/irs-pdf/iw8ben.pdf', true)
ON CONFLICT (document_type) DO NOTHING;

-- Grant permissions to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_verification_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_reference_samples TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_extraction_fields TO authenticated;
GRANT SELECT, INSERT ON public.document_validation_findings TO authenticated;
GRANT SELECT, INSERT ON public.document_extracted_data TO authenticated;
