-- Migration: Create system_work_orders table for native generation and signature workflow

CREATE TYPE public.work_order_status AS ENUM (
  'DRAFT',
  'PENDING_CONTRACTOR_SIGNATURE',
  'PENDING_FINANCE_SIGNATURE',
  'COMPLETED'
);

CREATE TABLE IF NOT EXISTS public.system_work_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Workflow Status
  status       public.work_order_status NOT NULL DEFAULT 'DRAFT',
  
  -- Terms
  role         TEXT NOT NULL,
  pay_type     TEXT NOT NULL, -- 'Hourly' or 'Fixed'
  pay_amount   NUMERIC(12, 2) NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  work_schedule TEXT NOT NULL,
  additional_terms TEXT, -- HTML from Rich Text Editor
  
  -- Contractor Signature
  contractor_signature_name TEXT,
  contractor_signature_data TEXT, -- Base64 Data URI for drawn signature
  contractor_signed_at      TIMESTAMPTZ,
  
  -- Finance Signature
  finance_signature_name    TEXT,
  finance_signature_data    TEXT, -- Base64 Data URI for drawn signature
  finance_signed_at         TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_work_orders_contractor 
  ON public.system_work_orders(contractor_user_id);
CREATE INDEX IF NOT EXISTS idx_system_work_orders_status 
  ON public.system_work_orders(status);

COMMENT ON TABLE public.system_work_orders IS 'Tracks natively generated work orders and their signature workflow state.';

-- Row Level Security
ALTER TABLE public.system_work_orders ENABLE ROW LEVEL SECURITY;

-- Contractors can see their own work orders
CREATE POLICY "system_work_orders_select_own" ON public.system_work_orders
  FOR SELECT USING (contractor_user_id = auth.uid());

-- Contractors can update their own work orders (to sign them)
CREATE POLICY "system_work_orders_update_own" ON public.system_work_orders
  FOR UPDATE USING (contractor_user_id = auth.uid());

-- Admins can do everything
CREATE POLICY "system_work_orders_all_for_admins" ON public.system_work_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.role) = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.system_work_orders TO authenticated;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_system_work_orders_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_work_orders_updated_at
  BEFORE UPDATE ON public.system_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_system_work_orders_updated_at();
