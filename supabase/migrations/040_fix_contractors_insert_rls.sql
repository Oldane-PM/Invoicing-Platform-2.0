-- Migration: Fix case-sensitive role check in contractors insert policy

-- 1. Drop the old case-sensitive policies
DROP POLICY IF EXISTS "contractors_insert_admin" ON public.contractors;
DROP POLICY IF EXISTS "contractors_update_admin" ON public.contractors;

-- 2. Create the case-insensitive insert policy for admins
CREATE POLICY "contractors_insert_all_for_admins" ON public.contractors
  FOR INSERT WITH CHECK (public.is_admin());
