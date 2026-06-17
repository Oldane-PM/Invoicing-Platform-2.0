-- Reset the demo contractor's onboarding so it can be tested from scratch.
--
-- Run this in the Supabase SQL Editor whenever you want to re-do onboarding as
-- the demo contractor (contractor@demo.local). It:
--   1. Clears the onboarding fields on contractor_profiles
--   2. Deletes the work-order audit rows
--   3. Removes uploaded work-order files from storage
--   4. (optional) Clears generated invoice numbers so the sequence preview
--      starts fresh from whatever you enter next
--
-- Safe to run repeatedly. Scoped ONLY to the demo contractor id.

DO $$
DECLARE
  contractor_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- 1. Clear onboarding fields (keeps personal/banking info intact).
  UPDATE public.contractor_profiles
  SET
    onboarding_role         = NULL,
    onboarding_rate         = NULL,
    contract_start_date     = NULL,
    contract_end_date       = NULL,
    last_invoice_number     = NULL,
    work_order_path         = NULL,
    work_order_filename     = NULL,
    work_order_uploaded_at  = NULL,
    onboarding_completed_at = NULL
  WHERE user_id = contractor_id;

  -- 2. Remove the work-order audit trail.
  DELETE FROM public.vendor_work_orders
  WHERE user_id = contractor_id;

  -- 3. Remove uploaded work-order files from storage (folder = {contractor_id}/...).
  DELETE FROM storage.objects
  WHERE bucket_id = 'work-orders'
    AND (storage.foldername(name))[1] = contractor_id::text;

  -- 4. OPTIONAL — clear invoice numbers already generated for this contractor so
  --    the per-vendor sequence restarts from your next entered "last invoice
  --    number". Comment this out if you want to keep issued invoice numbers.
  UPDATE public.submissions
  SET invoice_number = NULL,
      invoice_url = NULL,
      invoice_generated_at = NULL
  WHERE contractor_user_id = contractor_id;

  RAISE NOTICE 'Demo contractor onboarding reset.';
END $$;
