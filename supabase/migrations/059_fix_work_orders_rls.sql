-- Fix the RLS policy for system_work_orders to use lowercase 'admin'

DROP POLICY IF EXISTS "system_work_orders_all_for_admins" ON public.system_work_orders;

CREATE POLICY "system_work_orders_all_for_admins" ON public.system_work_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.role) = 'admin'
    )
  );
