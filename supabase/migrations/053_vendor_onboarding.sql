-- Migration: Contractor (vendor) onboarding
--
-- Adds the onboarding fields a contractor fills in during onboarding:
--   * signed work order upload (stored in a private "work-orders" bucket, with an
--     audit table linking each upload to the contractor for audit purposes)
--   * manually entered contract details: role, rate, contract start/end dates
--   * the contractor's last invoice number, which seeds a per-vendor invoice
--     sequence (each new invoice increments the numeric portion of this value).
--
-- These columns live on contractor_profiles so onboarding data sits alongside the
-- contractor's existing personal/banking profile.

-- =============================================
-- 1. ONBOARDING COLUMNS ON contractor_profiles
-- =============================================
ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS onboarding_role        TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_rate        NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS contract_start_date    DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date      DATE,
  ADD COLUMN IF NOT EXISTS last_invoice_number    TEXT,
  ADD COLUMN IF NOT EXISTS work_order_path        TEXT,
  ADD COLUMN IF NOT EXISTS work_order_filename    TEXT,
  ADD COLUMN IF NOT EXISTS work_order_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.contractor_profiles.onboarding_role IS 'Contractor role/title entered during onboarding (extracted from / typed off the work order)';
COMMENT ON COLUMN public.contractor_profiles.onboarding_rate IS 'Contract rate entered during onboarding';
COMMENT ON COLUMN public.contractor_profiles.last_invoice_number IS 'The contractor''s last invoice number. New invoices increment the numeric portion of this value (per-vendor sequence).';
COMMENT ON COLUMN public.contractor_profiles.work_order_path IS 'Storage path of the most recently uploaded signed work order (work-orders bucket)';

-- =============================================
-- 2. WORK ORDER AUDIT TABLE
-- =============================================
-- Every uploaded work order is recorded here (kept even if the profile's
-- current work_order_path is replaced) so there is an audit trail.
CREATE TABLE IF NOT EXISTS public.vendor_work_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name    TEXT,
  file_size    BIGINT,
  content_type TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_work_orders_user_id
  ON public.vendor_work_orders (user_id, uploaded_at DESC);

COMMENT ON TABLE public.vendor_work_orders IS 'Audit log of signed work orders uploaded by contractors during/after onboarding';

-- =============================================
-- 3. ROW LEVEL SECURITY (audit table)
-- =============================================
ALTER TABLE public.vendor_work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_work_orders_select_own" ON public.vendor_work_orders;
DROP POLICY IF EXISTS "vendor_work_orders_insert_own" ON public.vendor_work_orders;
DROP POLICY IF EXISTS "vendor_work_orders_select_for_admins" ON public.vendor_work_orders;

CREATE POLICY "vendor_work_orders_select_own" ON public.vendor_work_orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "vendor_work_orders_insert_own" ON public.vendor_work_orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "vendor_work_orders_select_for_admins" ON public.vendor_work_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

GRANT SELECT, INSERT ON public.vendor_work_orders TO authenticated;

-- =============================================
-- 4. STORAGE BUCKET FOR WORK ORDERS (private)
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-orders', 'work-orders', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: contractors can manage files under their own user-id folder
-- ({user_id}/...). Admins can read all work orders.
DROP POLICY IF EXISTS "work_orders_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "work_orders_select_own" ON storage.objects;
DROP POLICY IF EXISTS "work_orders_update_own" ON storage.objects;
DROP POLICY IF EXISTS "work_orders_select_for_admins" ON storage.objects;

CREATE POLICY "work_orders_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'work-orders'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "work_orders_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'work-orders'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "work_orders_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'work-orders'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "work_orders_select_for_admins" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'work-orders'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );
