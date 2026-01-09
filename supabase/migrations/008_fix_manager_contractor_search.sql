-- =============================================
-- FIX MANAGER CONTRACTOR SEARCH RLS POLICIES
-- Run this in Supabase SQL Editor
-- =============================================
-- This migration fixes:
-- 1. Allows managers to search/read contractor profiles (role='CONTRACTOR')
-- 2. Ensures manager_teams select policy exists
-- 3. Adds profile auto-creation trigger for new signups

-- =============================================
-- 1. DROP CONFLICTING PROFILES POLICIES
-- =============================================
-- Remove the overly-permissive "all authenticated" policy
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;

-- =============================================
-- 2. CREATE SPECIFIC PROFILES SELECT POLICIES
-- =============================================

-- Users can read their own profile (keep this)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Managers can read profiles where role='CONTRACTOR' (needed for add-to-team search)
DROP POLICY IF EXISTS "profiles_select_contractors_for_managers" ON public.profiles;
CREATE POLICY "profiles_select_contractors_for_managers" ON public.profiles
  FOR SELECT USING (
    -- Allow managers to read contractor profiles
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'MANAGER'
    )
    AND role = 'CONTRACTOR'
  );

-- Admins can read all profiles
DROP POLICY IF EXISTS "profiles_select_all_for_admins" ON public.profiles;
CREATE POLICY "profiles_select_all_for_admins" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- =============================================
-- 3. ENSURE MANAGER_TEAMS SELECT POLICIES EXIST
-- =============================================
DROP POLICY IF EXISTS "manager_teams_select_manager" ON public.manager_teams;
CREATE POLICY "manager_teams_select_manager" ON public.manager_teams
  FOR SELECT USING (manager_id = auth.uid());

DROP POLICY IF EXISTS "manager_teams_select_contractor" ON public.manager_teams;
CREATE POLICY "manager_teams_select_contractor" ON public.manager_teams
  FOR SELECT USING (contractor_id = auth.uid());

-- =============================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- =============================================
-- Function to create profile when auth.users row is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'CONTRACTOR'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 5. ENSURE EXISTING AUTH USERS HAVE PROFILES
-- =============================================
-- Insert missing profiles for existing auth users
INSERT INTO public.profiles (id, email, role, full_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'CONTRACTOR'),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 6. VERIFICATION QUERIES
-- =============================================
-- After running this migration, verify with:
--
-- Check RLS policies on profiles:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
--
-- Test as manager (replace UUID with actual manager ID):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims = '{"sub": "manager-uuid-here"}';
-- SELECT * FROM public.profiles WHERE role = 'CONTRACTOR';
--
-- Check profile trigger exists:
-- SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;

-- =============================================
-- IMPORTANT: After running this migration:
-- 1. Go to Supabase Dashboard -> Database -> API
-- 2. Click "Reload Schema" to refresh PostgREST's schema cache
-- =============================================
