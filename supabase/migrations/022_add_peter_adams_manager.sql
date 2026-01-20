-- =============================================
-- ADD PETER ADAMS MANAGER PROFILE
-- Run this in Supabase SQL Editor
-- =============================================
-- This migration adds Peter Adams as a manager.
-- IMPORTANT: First create the auth user in Supabase Auth Dashboard:
-- Email: Peter.Adams@example.com
-- Password: 123456
-- Then copy the UUID from Auth > Users and replace the placeholder below.

-- REPLACE THIS WITH ACTUAL AUTH USER ID FROM SUPABASE
DO $$
DECLARE
  peter_manager_id UUID := '00000000-0000-0000-0000-000000000002';  -- Replace with Peter's actual auth.users.id
BEGIN

  -- Insert manager profile
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (peter_manager_id, 'MANAGER', 'Peter Adams', 'Peter.Adams@example.com')
  ON CONFLICT (id) DO UPDATE SET
    role = 'MANAGER',
    full_name = 'Peter Adams',
    email = 'Peter.Adams@example.com';

  RAISE NOTICE 'Peter Adams manager profile added with ID: %', peter_manager_id;

END $$;

-- =============================================
-- VERIFICATION
-- =============================================
-- After running this migration, verify:
-- SELECT * FROM public.profiles WHERE email = 'Peter.Adams@example.com';
