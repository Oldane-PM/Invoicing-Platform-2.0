-- Migration: Fix infinite recursion in projects/project_assignments RLS policies
-- Created: 2026-02-02
-- Problem: Circular RLS dependency between projects and project_assignments tables
-- Solution: Use SECURITY DEFINER functions to break the recursion cycle

-- =============================================
-- 1. CREATE HELPER FUNCTIONS WITH SECURITY DEFINER
-- These functions bypass RLS internally to avoid recursion
-- =============================================

-- Check if a user has admin role (case-insensitive)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND UPPER(role) = 'ADMIN'
  );
$$;

-- Check if a user is a manager of a specific project
CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND manager_id = p_user_id
  );
$$;

-- Check if a contractor is assigned to a specific project
CREATE OR REPLACE FUNCTION public.is_contractor_assigned(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_assignments 
    WHERE project_id = p_project_id AND contractor_id = p_user_id
  );
$$;

-- =============================================
-- 2. DROP ALL EXISTING PROJECTS POLICIES
-- =============================================

DROP POLICY IF EXISTS "projects_select_all_roles" ON public.projects;
DROP POLICY IF EXISTS "projects_select_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_select_contractor" ON public.projects;
DROP POLICY IF EXISTS "projects_select_manager" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_update_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_debug_all" ON public.projects;

-- =============================================
-- 3. DROP ALL EXISTING PROJECT_ASSIGNMENTS POLICIES
-- =============================================

DROP POLICY IF EXISTS "project_assignments_admin_all" ON public.project_assignments;
DROP POLICY IF EXISTS "project_assignments_contractor_select" ON public.project_assignments;
DROP POLICY IF EXISTS "project_assignments_manager_select" ON public.project_assignments;

-- =============================================
-- 4. RECREATE PROJECTS POLICIES (NO RECURSION)
-- =============================================

-- SELECT: Admin, manager of project, or assigned contractor
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR manager_id = auth.uid()
    OR public.is_contractor_assigned(id, auth.uid())
  );

-- INSERT: Admin only
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
  );

-- UPDATE: Admin only  
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (
    public.is_admin(auth.uid())
  );

-- DELETE: Admin only
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (
    public.is_admin(auth.uid())
  );

-- =============================================
-- 5. RECREATE PROJECT_ASSIGNMENTS POLICIES (NO RECURSION)
-- =============================================

-- SELECT: Admin, the contractor themselves, or manager of the project
CREATE POLICY "project_assignments_select" ON public.project_assignments
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR contractor_id = auth.uid()
    OR public.is_project_manager(project_id, auth.uid())
  );

-- INSERT: Admin only
CREATE POLICY "project_assignments_insert" ON public.project_assignments
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
  );

-- UPDATE: Admin only
CREATE POLICY "project_assignments_update" ON public.project_assignments
  FOR UPDATE USING (
    public.is_admin(auth.uid())
  );

-- DELETE: Admin only
CREATE POLICY "project_assignments_delete" ON public.project_assignments
  FOR DELETE USING (
    public.is_admin(auth.uid())
  );

-- =============================================
-- 6. GRANT EXECUTE ON HELPER FUNCTIONS
-- =============================================

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_manager TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_contractor_assigned TO authenticated;
