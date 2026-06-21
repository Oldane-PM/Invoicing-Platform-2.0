-- Migration: Fix RLS for work orders storage bucket and audit table
--
-- The previous policies used p.role = 'ADMIN' which evaluates to false
-- if the role is stored in lowercase ('admin').

-- Fix storage bucket policy
DROP POLICY IF EXISTS "work_orders_select_for_admins" ON storage.objects;

CREATE POLICY "work_orders_select_for_admins" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'work-orders'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (p.role = 'ADMIN' OR p.role = 'admin')
    )
  );

-- Fix audit table policy
DROP POLICY IF EXISTS "vendor_work_orders_select_for_admins" ON public.vendor_work_orders;

CREATE POLICY "vendor_work_orders_select_for_admins" ON public.vendor_work_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (p.role = 'ADMIN' OR p.role = 'admin')
    )
  );
