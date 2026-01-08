-- =============================================
-- FIX INFINITE RECURSION IN PROFILES RLS
-- Run this in Supabase SQL Editor
-- =============================================
-- This migration fixes:
-- 1. Removes ALL recursive policies on profiles
-- 2. Creates simple, non-recursive policies
-- 3. Allows contractors to be read by anyone authenticated (for search)

-- =============================================
-- 1. DROP ALL EXISTING PROFILES POLICIES
-- =============================================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_contractors_for_managers" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_for_admins" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_team" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;

-- =============================================
-- 2. CREATE NON-RECURSIVE PROFILES POLICIES
-- =============================================
-- Key insight: We CANNOT query profiles inside a profiles policy (causes recursion)
-- Solution: Use simple conditions that don't reference profiles table

-- Policy 1: Users can read their own profile
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Policy 2: Anyone authenticated can read CONTRACTOR profiles (for directory/search)
-- This is safe because contractor profiles only contain name/email
CREATE POLICY "profiles_read_contractors" ON public.profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND role = 'CONTRACTOR'
  );

-- Policy 3: Users can insert their own profile (signup)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Policy 4: Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- =============================================
-- 3. DROP AND RECREATE MANAGER_TEAMS POLICIES
-- =============================================
DROP POLICY IF EXISTS "manager_teams_select_manager" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_select_contractor" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_insert_manager" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_delete_manager" ON public.manager_teams;

-- Managers can read their own team
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
-- 4. CONTRACTORS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "contractors_select_own" ON public.contractors;
DROP POLICY IF EXISTS "contractors_select_team" ON public.contractors;
DROP POLICY IF EXISTS "contractors_select_all" ON public.contractors;
DROP POLICY IF EXISTS "contractors_select_authenticated" ON public.contractors;
DROP POLICY IF EXISTS "contractors_update_own" ON public.contractors;

-- Anyone authenticated can read contractor info (rates are not sensitive for this app)
CREATE POLICY "contractors_read_authenticated" ON public.contractors
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Contractors can update their own record
CREATE POLICY "contractors_update_own" ON public.contractors
  FOR UPDATE USING (contractor_id = auth.uid());

-- Contractors can insert their own record
CREATE POLICY "contractors_insert_own" ON public.contractors
  FOR INSERT WITH CHECK (contractor_id = auth.uid());

-- =============================================
-- 5. ENSURE RLS IS ENABLED
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_teams ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contractors TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.manager_teams TO authenticated;

-- =============================================
-- VERIFICATION: Check policies are non-recursive
-- =============================================
-- Run this to verify:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
--
-- Should see:
-- profiles_read_own      | SELECT | (id = auth.uid())
-- profiles_read_contractors | SELECT | ((auth.uid() IS NOT NULL) AND (role = 'CONTRACTOR'))
-- profiles_insert_own    | INSERT | (id = auth.uid())
-- profiles_update_own    | UPDATE | (id = auth.uid())
--
-- IMPORTANT: After running, go to Supabase Dashboard -> Database -> API -> Reload Schema
