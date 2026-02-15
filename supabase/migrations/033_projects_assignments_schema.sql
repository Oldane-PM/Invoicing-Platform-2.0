-- Migration: Add project assignments and enhance projects table
-- Created: 2026-02-02
-- Purpose: Enable project-contractor/manager assignments and enable/disable functionality

-- =============================================
-- 1. EXTEND PROJECTS TABLE
-- =============================================

-- Add manager_id column (nullable FK to profiles)
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add is_enabled column (defaults to true for existing projects)
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

-- Create index for manager lookup
CREATE INDEX IF NOT EXISTS idx_projects_manager ON public.projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_enabled ON public.projects(is_enabled);

-- =============================================
-- 2. CREATE PROJECT_ASSIGNMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, contractor_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON public.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_contractor ON public.project_assignments(contractor_id);

-- =============================================
-- 3. ADD PROJECT_ID TO SUBMISSIONS
-- =============================================

-- Add project_id column (nullable for backwards compatibility)
ALTER TABLE public.submissions 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for project lookup
CREATE INDEX IF NOT EXISTS idx_submissions_project ON public.submissions(project_id);

-- =============================================
-- 4. ENABLE RLS ON PROJECT_ASSIGNMENTS
-- =============================================

ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. RLS POLICIES FOR PROJECT_ASSIGNMENTS
-- =============================================

-- Admin can do everything
CREATE POLICY "project_assignments_admin_all" ON public.project_assignments
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );

-- Contractors can view their own assignments
CREATE POLICY "project_assignments_contractor_select" ON public.project_assignments
  FOR SELECT USING (
    contractor_id = auth.uid()
  );

-- Managers can view assignments for projects they manage
CREATE POLICY "project_assignments_manager_select" ON public.project_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_assignments.project_id
      AND p.manager_id = auth.uid()
    )
  );

-- =============================================
-- 6. UPDATE PROJECTS RLS TO ALLOW CONTRACTOR/MANAGER READ
-- =============================================

-- Drop existing select policy to recreate with broader access
DROP POLICY IF EXISTS "projects_select_admin" ON public.projects;

-- Admin can view all projects
CREATE POLICY "projects_select_admin" ON public.projects
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );

-- Contractors can view projects they are assigned to
CREATE POLICY "projects_select_contractor" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_assignments pa
      WHERE pa.project_id = projects.id
      AND pa.contractor_id = auth.uid()
    )
  );

-- Managers can view projects they manage
CREATE POLICY "projects_select_manager" ON public.projects
  FOR SELECT USING (
    manager_id = auth.uid()
  );

-- =============================================
-- 7. COMMENTS
-- =============================================

COMMENT ON TABLE public.project_assignments IS 'Maps contractors to projects they are assigned to work on';
COMMENT ON COLUMN public.projects.manager_id IS 'The manager responsible for this project (nullable)';
COMMENT ON COLUMN public.projects.is_enabled IS 'Whether this project is active and available for hour submissions';
COMMENT ON COLUMN public.submissions.project_id IS 'Reference to the project this submission is for (nullable for legacy data)';
