-- Fix: Update RLS policies for projects to be more robust
-- This migration fixes potential issues with role-based access

-- =============================================
-- 1. DROP AND RECREATE PROJECTS POLICIES
-- =============================================

-- Drop all existing select policies on projects
DROP POLICY IF EXISTS "projects_select_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_select_contractor" ON public.projects;
DROP POLICY IF EXISTS "projects_select_manager" ON public.projects;

-- Create a single combined SELECT policy that handles all cases
-- Using CASE expressions to avoid subquery issues
CREATE POLICY "projects_select_all_roles" ON public.projects
  FOR SELECT USING (
    -- Allow if user is admin
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    OR
    -- Allow if user is a manager of this project
    (manager_id = auth.uid())
    OR
    -- Allow if user is a contractor assigned to this project
    EXISTS (
      SELECT 1 FROM public.project_assignments pa
      WHERE pa.project_id = projects.id
      AND pa.contractor_id = auth.uid()
    )
  );

-- =============================================
-- 2. ENSURE INSERT/UPDATE/DELETE POLICIES EXIST FOR ADMIN
-- =============================================

-- Drop and recreate to ensure they're correct
DROP POLICY IF EXISTS "projects_insert_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_update_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_admin" ON public.projects;

CREATE POLICY "projects_insert_admin" ON public.projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "projects_update_admin" ON public.projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "projects_delete_admin" ON public.projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- =============================================
-- 3. ADD TEMP DEBUG: ALLOW ALL AUTHENTICATED USERS TO READ
-- =============================================
-- Uncomment the below if still having issues for debugging:
-- DROP POLICY IF EXISTS "projects_debug_all" ON public.projects;
-- CREATE POLICY "projects_debug_all" ON public.projects FOR SELECT USING (auth.uid() IS NOT NULL);
