-- =============================================
-- UPSERT SARAH CONTRACTOR
-- Run this in Supabase SQL Editor
-- =============================================
-- Replace SARAH_UID with the actual auth.users id for sarah.johnson@email.com
-- To find Sarah's UID, run:
-- SELECT id, email FROM auth.users WHERE email = 'sarah.johnson@email.com';

-- =============================================
-- OPTION 1: If you know Sarah's UID, replace the placeholder
-- =============================================
-- SET SARAH_UID = 'e7e9c80f-57e8-4636-a167-6576defe89fd';

DO $$
DECLARE
  sarah_uid UUID;
BEGIN
  -- Try to find Sarah in auth.users
  SELECT id INTO sarah_uid FROM auth.users WHERE email = 'sarah.johnson@email.com' LIMIT 1;

  IF sarah_uid IS NULL THEN
    RAISE NOTICE 'Sarah not found in auth.users. Using placeholder UUID.';
    -- Use a placeholder - you'll need to create the auth user first
    sarah_uid := 'e7e9c80f-57e8-4636-a167-6576defe89fd'::UUID;
  ELSE
    RAISE NOTICE 'Found Sarah with UID: %', sarah_uid;
  END IF;

  -- Upsert into profiles
  INSERT INTO public.profiles (id, role, full_name, email, created_at)
  VALUES (
    sarah_uid,
    'CONTRACTOR',
    'Sarah Johnson',
    'sarah.johnson@email.com',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'CONTRACTOR',
    full_name = 'Sarah Johnson',
    email = 'sarah.johnson@email.com';

  -- Upsert into contractors
  INSERT INTO public.contractors (
    contractor_id,
    hourly_rate,
    overtime_rate,
    default_project_name,
    contract_start,
    contract_end,
    is_active,
    created_at
  )
  VALUES (
    sarah_uid,
    75.00,
    112.50,
    'Mobile App Development',
    '2024-01-15',
    '2024-12-31',
    TRUE,
    NOW()
  )
  ON CONFLICT (contractor_id) DO UPDATE SET
    hourly_rate = 75.00,
    overtime_rate = 112.50,
    default_project_name = 'Mobile App Development',
    is_active = TRUE;

  RAISE NOTICE 'Sarah contractor created/updated successfully with UID: %', sarah_uid;
END $$;

-- =============================================
-- VERIFY SARAH EXISTS
-- =============================================
-- Run these queries to verify:
--
-- SELECT * FROM public.profiles WHERE email = 'sarah.johnson@email.com';
-- SELECT * FROM public.contractors WHERE contractor_id IN (SELECT id FROM public.profiles WHERE email = 'sarah.johnson@email.com');

-- =============================================
-- ADDITIONAL TEST CONTRACTORS (Optional)
-- =============================================
-- Add more test contractors if needed

DO $$
DECLARE
  test_uid UUID;
BEGIN
  -- Create a test contractor if none exist
  SELECT id INTO test_uid FROM auth.users WHERE email ILIKE '%contractor%' LIMIT 1;

  IF test_uid IS NOT NULL THEN
    INSERT INTO public.profiles (id, role, full_name, email)
    VALUES (test_uid, 'CONTRACTOR', split_part((SELECT email FROM auth.users WHERE id = test_uid), '@', 1), (SELECT email FROM auth.users WHERE id = test_uid))
    ON CONFLICT (id) DO UPDATE SET role = 'CONTRACTOR';

    INSERT INTO public.contractors (contractor_id, hourly_rate, overtime_rate, is_active)
    VALUES (test_uid, 65.00, 97.50, TRUE)
    ON CONFLICT (contractor_id) DO NOTHING;
  END IF;
END $$;
