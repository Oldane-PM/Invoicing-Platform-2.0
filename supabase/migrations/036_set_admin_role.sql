-- Quick Fix: Update is_admin function to be case-insensitive
-- Run this in Supabase SQL Editor

-- Fix the is_admin function to handle lowercase 'admin' role
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- Verify: Check if the function works (replace with your user ID)
-- First, find your user id and role:
SELECT au.id, au.email, p.role, public.is_admin(au.id) as is_admin_check
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.email;
