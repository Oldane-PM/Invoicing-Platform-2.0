-- 0. Add superadmin to user_role enum if it exists
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 1. Helper function is_superadmin()
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND LOWER(role) = 'superadmin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- 2. Update role constraint check on public.profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('unassigned', 'contractor', 'manager', 'admin', 'superadmin'));

  COMMENT ON COLUMN public.profiles.role IS 'User role: unassigned (default), contractor, manager, admin, or superadmin';
END $$;

-- 3. Update role constraint check on public.user_invitations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_invitations_role_check' 
    AND table_name = 'user_invitations'
  ) THEN
    ALTER TABLE public.user_invitations DROP CONSTRAINT user_invitations_role_check;
  END IF;

  -- Let's check constraints dynamically or just drop and add
  ALTER TABLE public.user_invitations DROP CONSTRAINT IF EXISTS user_invitations_role_check;
  ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_role_check CHECK (role IN ('UNASSIGNED', 'CONTRACTOR', 'MANAGER', 'ADMIN', 'SUPERADMIN'));
END $$;

-- 4. Update the RPC function to only allow superadmin callers
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  updated_profile RECORD;
BEGIN
  -- Verify the caller is a superadmin (only administrators can change roles)
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role IS NULL OR UPPER(caller_role) != 'SUPERADMIN' THEN
    RAISE EXCEPTION 'Forbidden: Only administrators can update user roles';
  END IF;

  -- Validate the new role
  IF LOWER(new_role) NOT IN ('admin', 'manager', 'contractor', 'unassigned', 'superadmin') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be admin, manager, contractor, unassigned, or superadmin', new_role;
  END IF;

  -- Update profiles table (primary source of truth)
  UPDATE public.profiles
  SET role = LOWER(new_role)
  WHERE id = target_user_id
  RETURNING id, role INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', target_user_id;
  END IF;

  -- Sync app_users table (non-fatal if it fails)
  BEGIN
    UPDATE public.app_users
    SET role = LOWER(new_role)
    WHERE id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal: app_users sync is best-effort
    RAISE NOTICE 'Failed to sync app_users: %', SQLERRM;
  END;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'userId', updated_profile.id,
    'role', updated_profile.role
  );
END;
$$;

-- 5. Update Policies for profiles table update
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "profiles_read_admin" ON public.profiles;
CREATE POLICY "profiles_read_admin" ON public.profiles
  FOR SELECT USING (public.is_admin() OR public.is_superadmin());

-- 6. Update Policies for user_invitations table to use superadmin
DROP POLICY IF EXISTS "invitations_select_admin" ON public.user_invitations;
CREATE POLICY "invitations_select_admin" ON public.user_invitations
  FOR SELECT USING (public.is_superadmin());

DROP POLICY IF EXISTS "invitations_insert_admin" ON public.user_invitations;
CREATE POLICY "invitations_insert_admin" ON public.user_invitations
  FOR INSERT WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "invitations_update_admin" ON public.user_invitations;
CREATE POLICY "invitations_update_admin" ON public.user_invitations
  FOR UPDATE USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "invitations_delete_admin" ON public.user_invitations;
CREATE POLICY "invitations_delete_admin" ON public.user_invitations
  FOR DELETE USING (public.is_superadmin());

-- 7. Seed Demo Superadmin User
DO $$
DECLARE
  v_superadmin_id UUID := '44444444-4444-4444-4444-444444444444';
  v_demo_pw       TEXT := 'Demo123!';
  v_org_id        UUID;
BEGIN
  -- auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', v_superadmin_id, 'authenticated', 'authenticated', 'superadmin@demo.local',
    crypt(v_demo_pw, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name": "Demo Admin"}',
    '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email              = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at;

  -- auth.identities
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    v_superadmin_id::text, v_superadmin_id,
    jsonb_build_object('sub', v_superadmin_id::text, 'email', 'superadmin@demo.local'),
    'email', NOW(), NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- public.profiles
  INSERT INTO public.profiles (id, role, full_name, email, is_active)
  VALUES (v_superadmin_id, 'superadmin', 'Demo Admin', 'superadmin@demo.local', true)
  ON CONFLICT (id) DO UPDATE SET
    role      = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    email     = EXCLUDED.email,
    is_active = true;

  -- app_users
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'app_users'
    ) THEN
      SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
      IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (id, name)
        VALUES (gen_random_uuid(), 'Demo Organization')
        RETURNING id INTO v_org_id;
      END IF;

      INSERT INTO public.app_users (id, organization_id, role, full_name, email, is_active)
      VALUES (v_superadmin_id, v_org_id, 'superadmin', 'Demo Admin', 'superadmin@demo.local', true)
      ON CONFLICT (id) DO UPDATE SET
        role      = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        email     = EXCLUDED.email,
        is_active = true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped app_users seed for superadmin (% — %)', SQLSTATE, SQLERRM;
  END;
END $$;
