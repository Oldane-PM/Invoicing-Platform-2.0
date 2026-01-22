-- Migration: Create projects table for Admin Projects management
-- Created: 2026-01-22

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text NOT NULL,
  description text NULL,
  resource_count int NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT policy
CREATE POLICY "projects_select_admin" ON public.projects
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin-only INSERT policy
CREATE POLICY "projects_insert_admin" ON public.projects
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin-only UPDATE policy
CREATE POLICY "projects_update_admin" ON public.projects
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin-only DELETE policy
CREATE POLICY "projects_delete_admin" ON public.projects
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects (name);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects (client);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON public.projects (start_date);
