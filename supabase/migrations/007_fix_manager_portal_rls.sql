-- =============================================
-- FIX MANAGER PORTAL: PROFILES, MANAGER_TEAMS, RLS
-- Run this in Supabase SQL Editor
-- =============================================
-- This migration fixes:
-- 1. Profiles table RLS policies (non-recursive)
-- 2. Manager_teams table with proper FKs
-- 3. Contractors table FK
-- 4. Simple, non-recursive RLS policies

-- =============================================
-- 1. ENSURE PROFILES TABLE EXISTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CONTRACTOR')) DEFAULT 'CONTRACTOR',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add role column if missing (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'CONTRACTOR';
  END IF;
END $$;

-- =============================================
-- 2. ENSURE CONTRACTORS TABLE EXISTS WITH FK
-- =============================================
CREATE TABLE IF NOT EXISTS public.contractors (
  contractor_id UUID PRIMARY KEY,
  hourly_rate NUMERIC(10,2) DEFAULT 75.00,
  overtime_rate NUMERIC(10,2) DEFAULT 112.50,
  default_project_name TEXT,
  contract_start DATE,
  contract_end DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'contractors_contractor_id_fkey'
    AND table_name = 'contractors'
  ) THEN
    ALTER TABLE public.contractors
      ADD CONSTRAINT contractors_contractor_id_fkey
      FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================
-- 3. ENSURE MANAGER_TEAMS TABLE EXISTS WITH FKs
-- =============================================
CREATE TABLE IF NOT EXISTS public.manager_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, contractor_id)
);

-- Add FKs with explicit names for PostgREST relationship resolution
DO $$
BEGIN
  -- FK for manager_id -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'manager_teams_manager_id_fkey'
    AND table_name = 'manager_teams'
  ) THEN
    ALTER TABLE public.manager_teams
      ADD CONSTRAINT manager_teams_manager_id_fkey
      FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- FK for contractor_id -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'manager_teams_contractor_id_fkey'
    AND table_name = 'manager_teams'
  ) THEN
    ALTER TABLE public.manager_teams
      ADD CONSTRAINT manager_teams_contractor_id_fkey
      FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_manager_teams_manager ON public.manager_teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_contractor ON public.manager_teams(contractor_id);

-- =============================================
-- 4. DROP ALL EXISTING RLS POLICIES (clean slate)
-- =============================================

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_team" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;

-- Contractors policies
DROP POLICY IF EXISTS "contractors_select_own" ON public.contractors;
DROP POLICY IF EXISTS "contractors_select_team" ON public.contractors;
DROP POLICY IF EXISTS "contractors_select_all" ON public.contractors;

-- Manager_teams policies
DROP POLICY IF EXISTS "manager_teams_select_manager" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_insert_manager" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_delete_manager" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_select_contractor" ON public.manager_teams;

-- =============================================
-- 5. ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_teams ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. SIMPLE NON-RECURSIVE RLS POLICIES
-- =============================================

-- PROFILES: Simple policies that don't recurse
-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can read all profiles (needed for managers to see contractor names)
-- This is safe because profiles only contain name/email, not sensitive data
CREATE POLICY "profiles_select_all_authenticated" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own profile (for signup)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- CONTRACTORS: Allow authenticated users to read (non-sensitive rate info)
CREATE POLICY "contractors_select_authenticated" ON public.contractors
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Contractors can update their own record
CREATE POLICY "contractors_update_own" ON public.contractors
  FOR UPDATE USING (auth.uid() = contractor_id);

-- MANAGER_TEAMS: Manager-based access
-- Managers can read their own team assignments
CREATE POLICY "manager_teams_select_manager" ON public.manager_teams
  FOR SELECT USING (manager_id = auth.uid());

-- Contractors can see which teams they belong to
CREATE POLICY "manager_teams_select_contractor" ON public.manager_teams
  FOR SELECT USING (contractor_id = auth.uid());

-- Managers can add contractors to their team
CREATE POLICY "manager_teams_insert_manager" ON public.manager_teams
  FOR INSERT WITH CHECK (manager_id = auth.uid());

-- Managers can remove contractors from their team
CREATE POLICY "manager_teams_delete_manager" ON public.manager_teams
  FOR DELETE USING (manager_id = auth.uid());

-- =============================================
-- 7. GRANT PERMISSIONS
-- =============================================
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.contractors TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.manager_teams TO authenticated;

-- =============================================
-- 8. VERIFICATION QUERIES (run to test)
-- =============================================
-- After running this migration, verify with:
--
-- Check profiles table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles';
--
-- Check foreign keys:
-- SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.table_name = 'manager_teams' AND tc.constraint_type = 'FOREIGN KEY';
--
-- Check RLS policies:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- =============================================
-- IMPORTANT: After running this migration:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Database → API
-- 3. Click "Reload Schema" to refresh PostgREST's schema cache
-- =============================================
