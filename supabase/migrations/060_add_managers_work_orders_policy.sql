-- Migration: Allow managers to select system work orders
-- Run this in the Supabase SQL Editor to allow managers to read contractors' work orders.

DROP POLICY IF EXISTS "system_work_orders_select_for_managers" ON public.system_work_orders;

CREATE POLICY "system_work_orders_select_for_managers" ON public.system_work_orders
  FOR SELECT USING (public.is_manager());
