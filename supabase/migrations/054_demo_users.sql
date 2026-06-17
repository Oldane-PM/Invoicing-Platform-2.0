-- Migration: Seed demo users for the demo login flow
--
-- Creates three real Supabase auth users so the demo login (Admin / Manager /
-- Contractor) signs in with an actual session instead of being bypassed. Once a
-- real session exists, every role-scoped screen (and the onboarding feature)
-- works through the normal Supabase + RLS path.
--
-- Shared password for all three: Demo123!
--   admin@demo.local      / Demo123!   -> role: admin
--   manager@demo.local    / Demo123!   -> role: manager
--   contractor@demo.local / Demo123!   -> role: contractor
--
-- Idempotent: safe to re-run. Targets the current Supabase GoTrue auth schema
-- (auth.users + auth.identities with provider_id). If your GoTrue is older and
-- auth.identities has no provider_id column, remove it from the identities insert.
--
-- NOTE: PL/pgSQL variables are prefixed v_ so they don't collide with table
-- column names like contractors.contractor_id / manager_teams.manager_id.

DO $$
DECLARE
  v_admin_id      UUID := '11111111-1111-1111-1111-111111111111';
  v_manager_id    UUID := '22222222-2222-2222-2222-222222222222';
  v_contractor_id UUID := '33333333-3333-3333-3333-333333333333';
  v_demo_pw       TEXT := 'Demo123!';
  u               RECORD;
BEGIN
  FOR u IN
    SELECT * FROM (VALUES
      (v_admin_id,      'admin@demo.local',      'Demo Admin',      'admin'),
      (v_manager_id,    'manager@demo.local',    'Demo Manager',    'manager'),
      (v_contractor_id, 'contractor@demo.local', 'Demo Contractor', 'contractor')
    ) AS t(id, email, full_name, role)
  LOOP
    -- auth.users — token columns are set to '' (not NULL) to satisfy GoTrue.
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      crypt(v_demo_pw, gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', u.full_name),
      '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      email              = EXCLUDED.email,
      email_confirmed_at = EXCLUDED.email_confirmed_at;

    -- auth.identities — required for email/password sign-in.
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    VALUES (
      u.id::text, u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email),
      'email', NOW(), NOW(), NOW()
    )
    ON CONFLICT DO NOTHING;

    -- public.profiles — role drives portal routing (stored lowercase).
    INSERT INTO public.profiles (id, role, full_name, email, is_active)
    VALUES (u.id, u.role, u.full_name, u.email, true)
    ON CONFLICT (id) DO UPDATE SET
      role      = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      email     = EXCLUDED.email,
      is_active = true;
  END LOOP;

  -- Contractor: rates + active flag so contractor/admin screens have data.
  INSERT INTO public.contractors (
    contractor_id, hourly_rate, overtime_rate, default_project_name,
    contract_start, contract_end, is_active
  )
  VALUES (
    v_contractor_id, 75.00, 112.50, 'Demo Project',
    '2026-01-01', '2026-12-31', true
  )
  ON CONFLICT (contractor_id) DO UPDATE SET
    is_active            = true,
    hourly_rate          = EXCLUDED.hourly_rate,
    overtime_rate        = EXCLUDED.overtime_rate,
    default_project_name = EXCLUDED.default_project_name;

  -- Manager owns the contractor (so they appear in the manager's team).
  INSERT INTO public.manager_teams (manager_id, contractor_id)
  VALUES (v_manager_id, v_contractor_id)
  ON CONFLICT (manager_id, contractor_id) DO NOTHING;

  -- Active contract (needed to submit hours). The contracts table predates these
  -- migrations and its required columns can vary, so this is best-effort and
  -- won't abort the seed if the schema differs.
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contractor_user_id = v_contractor_id AND is_active = true
    ) THEN
      INSERT INTO public.contracts (
        contractor_user_id, project_name, contract_type,
        start_date, end_date, is_active
      )
      VALUES (
        v_contractor_id, 'Demo Project', 'hourly',
        '2026-01-01', '2026-12-31', true
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped contracts insert (schema mismatch): %', SQLERRM;
  END;

  RAISE NOTICE 'Demo users seeded. Sign in with admin/manager/contractor @demo.local, password: %', v_demo_pw;
END $$;
