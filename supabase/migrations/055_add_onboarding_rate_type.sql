-- Migration: Onboarding rate type (hourly rate vs fixed rate)
--
-- The onboarding form lets a contractor enter EITHER an hourly rate OR a fixed
-- rate. onboarding_rate stores the amount; onboarding_rate_type records which
-- kind it is so the value is interpreted/displayed correctly. Values mirror the
-- existing contract rate_type convention ('hourly' / 'fixed').

ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS onboarding_rate_type TEXT DEFAULT 'hourly';

-- Constrain to known values (drop first so the migration is re-runnable).
ALTER TABLE public.contractor_profiles
  DROP CONSTRAINT IF EXISTS contractor_profiles_onboarding_rate_type_check;

ALTER TABLE public.contractor_profiles
  ADD CONSTRAINT contractor_profiles_onboarding_rate_type_check
  CHECK (onboarding_rate_type IS NULL OR onboarding_rate_type IN ('hourly', 'fixed'));

COMMENT ON COLUMN public.contractor_profiles.onboarding_rate_type IS 'How onboarding_rate is interpreted: hourly (per-hour rate) or fixed (fixed rate).';
