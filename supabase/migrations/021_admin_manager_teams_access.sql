-- =============================================
-- Migration: Admin-only access to manager_teams table
-- 
-- This migration:
-- 1. Removes manager's ability to add/remove contractors from teams
-- 2. Grants full access to Admin users only
-- 3. Keeps read access for managers and contractors
-- =============================================

-- =============================================
-- 1. DROP MANAGER INSERT/DELETE POLICIES
-- (Managers should no longer modify team assignments)
-- =============================================
DROP POLICY IF EXISTS "manager_teams_insert_manager" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_delete_manager" ON public.manager_teams;

-- =============================================
-- 2. DROP EXISTING ADMIN POLICIES (for idempotency)
-- =============================================
DROP POLICY IF EXISTS "manager_teams_admin_select" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_admin_insert" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_admin_delete" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_admin_update" ON public.manager_teams;

-- =============================================
-- 3. CREATE ADMIN POLICIES (full access)
-- =============================================

-- Admins can read all team assignments
CREATE POLICY "manager_teams_admin_select" ON public.manager_teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Admins can create any team assignment
CREATE POLICY "manager_teams_admin_insert" ON public.manager_teams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Admins can delete any team assignment
CREATE POLICY "manager_teams_admin_delete" ON public.manager_teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Admins can update any team assignment
CREATE POLICY "manager_teams_admin_update" ON public.manager_teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- =============================================
-- NOTE: Keep existing SELECT policies for managers/contractors
-- These are NOT dropped:
-- - "manager_teams_select_manager" (managers can see their team)
-- - "manager_teams_select_contractor" (contractors can see their assignment)
-- =============================================

-- =============================================
-- VERIFICATION
-- =============================================
-- After running this migration, verify with:
-- 
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'manager_teams';
