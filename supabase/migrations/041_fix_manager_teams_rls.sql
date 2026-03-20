-- Migration: Fix case-sensitive role check in manager_teams policies

-- 1. Drop the old case-sensitive policies
DROP POLICY IF EXISTS "manager_teams_admin_select" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_admin_insert" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_admin_delete" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_admin_update" ON public.manager_teams;

-- 2. Create the case-insensitive policies for admins utilizing public.is_admin()
CREATE POLICY "manager_teams_admin_select" ON public.manager_teams
  FOR SELECT USING (public.is_admin());

CREATE POLICY "manager_teams_admin_insert" ON public.manager_teams
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "manager_teams_admin_delete" ON public.manager_teams
  FOR DELETE USING (public.is_admin());

CREATE POLICY "manager_teams_admin_update" ON public.manager_teams
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());
