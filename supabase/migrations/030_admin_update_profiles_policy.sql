-- Add RLS policy to allow admins to update any user's profile
-- This fixes the 400 error when admins try to change user roles

-- Create a security definer function to check if current user is admin
-- This avoids recursive RLS issues by using SECURITY DEFINER
-- Uses LOWER() for case-insensitive comparison to handle both 'admin' and 'ADMIN'
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND LOWER(role) = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Drop the old update policy
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create new policy: Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create policy: Admins can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Also add a SELECT policy for admins to read all profiles
-- (needed for the User Access Management page)
DROP POLICY IF EXISTS "profiles_read_admin" ON public.profiles;

CREATE POLICY "profiles_read_admin" ON public.profiles
  FOR SELECT USING (public.is_current_user_admin());

-- Also fix the contractors read policy to use case-insensitive comparison
-- (the original policy from 009 uses uppercase 'CONTRACTOR' but roles are now lowercase)
DROP POLICY IF EXISTS "profiles_read_contractors" ON public.profiles;

CREATE POLICY "profiles_read_contractors" ON public.profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND LOWER(role) = 'contractor'
  );

-- Verification query (run manually to check):
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
