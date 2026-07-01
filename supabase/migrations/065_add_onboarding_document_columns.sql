-- Migration: Add extra document columns to contractor_profiles for onboarding
--
-- Adds w8_ben_path and initial_invoice_path to support the new onboarding flow
-- where contractors upload these files.

ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS w8_ben_path TEXT,
  ADD COLUMN IF NOT EXISTS w8_ben_filename TEXT,
  ADD COLUMN IF NOT EXISTS initial_invoice_path TEXT,
  ADD COLUMN IF NOT EXISTS initial_invoice_filename TEXT;

COMMENT ON COLUMN public.contractor_profiles.w8_ben_path IS 'Storage path of the uploaded W8-BEN form during onboarding';
COMMENT ON COLUMN public.contractor_profiles.initial_invoice_path IS 'Storage path of the initial/previous invoice uploaded during onboarding';
