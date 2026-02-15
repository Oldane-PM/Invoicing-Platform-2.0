-- Migration: Allow admins to read all profiles (for assignments dropdown)
-- Run this in Supabase SQL Editor

-- 1. Create policy for admins to read ALL profiles
-- Using SECURITY DEFINER function to avoid recursion
CREATE POLICY "profiles_read_admin" ON public.profiles
  FOR SELECT USING (
    public.is_admin(auth.uid())
  );

-- 2. Also allow reading MANAGER profiles by authenticated users
-- (So the manager dropdown can be populated)
CREATE POLICY "profiles_read_managers" ON public.profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND UPPER(role) = 'MANAGER'
  );

-- Verify policies:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
