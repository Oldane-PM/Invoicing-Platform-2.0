-- Migration: Grant managers read access to ALL onboarding profiles and work orders
--
-- Since managers can view all contractors in the directory, they should be able
-- to see the work order details for any contractor, regardless of whether they
-- are directly assigned in manager_teams.

-- 1. Access to contractor_profiles
DROP POLICY IF EXISTS "contractor_profiles_manager_select" ON public.contractor_profiles;
CREATE POLICY "contractor_profiles_manager_select" ON public.contractor_profiles
  FOR SELECT USING (public.is_manager());

-- 2. Access to vendor_work_orders audit table
DROP POLICY IF EXISTS "vendor_work_orders_manager_select" ON public.vendor_work_orders;
CREATE POLICY "vendor_work_orders_manager_select" ON public.vendor_work_orders
  FOR SELECT USING (public.is_manager());

-- 3. Access to storage bucket 'work-orders'
DROP POLICY IF EXISTS "work_orders_manager_select" ON storage.objects;
CREATE POLICY "work_orders_manager_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'work-orders'
    AND public.is_manager()
  );
