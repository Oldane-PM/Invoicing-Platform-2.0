-- =============================================
-- ADD JOHN SMITH MANAGER PROFILE
-- Run this in Supabase SQL Editor
-- =============================================
-- This migration adds back John Smith as a manager.
-- IMPORTANT: First create the auth user in Supabase Auth Dashboard:
-- Email: john.smith@email.com
-- Password: 123456 (or whatever you choose)
-- Then copy the UUID from Auth > Users and replace the placeholder below.

-- REPLACE THIS WITH ACTUAL AUTH USER ID FROM SUPABASE
DO $$
DECLARE
  john_manager_id UUID := '00000000-0000-0000-0000-000000000001';  -- Replace with John's actual auth.users.id
BEGIN

  -- Insert manager profile
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (john_manager_id, 'MANAGER', 'John Smith', 'john.smith@email.com')
  ON CONFLICT (id) DO UPDATE SET
    role = 'MANAGER',
    full_name = 'John Smith',
    email = 'john.smith@email.com';

  RAISE NOTICE 'John Smith manager profile added with ID: %', john_manager_id;

END $$;

-- =============================================
-- VERIFICATION
-- =============================================
-- After running this migration, verify:
-- SELECT * FROM public.profiles WHERE email = 'john.smith@email.com';
