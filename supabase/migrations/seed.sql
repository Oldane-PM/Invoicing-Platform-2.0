-- Seed data for Invoicing Platform (Normalized Schema)
-- Run this in the Supabase SQL Editor after creating the schema
-- This script creates test data for a contractor user

-- ============================================================
-- STEP 1: Create auth user first (run this separately if needed)
-- ============================================================
-- This creates a user in auth.users table
-- Password: TestPassword123!
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'sarah.johnson@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Sarah Johnson"}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 2: Create app data
-- ============================================================

DO $$
DECLARE
  -- This UUID must match the auth.users.id created above
  test_user_id UUID := 'e7e9c80f-57e8-4636-a167-6576defe89fd';
  test_org_id UUID;
  test_contract_id UUID;
  test_rate_id UUID;
  submission_1_id UUID;
  submission_2_id UUID;
  submission_3_id UUID;
  submission_4_id UUID;
  submission_5_id UUID;
  d DATE;
BEGIN
  -- ============================================================
  -- 1) Create Organization
  -- ============================================================
  INSERT INTO public.organizations (id, name)
  VALUES (gen_random_uuid(), 'Test Company Inc.')
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_org_id;

  IF test_org_id IS NULL THEN
    SELECT id INTO test_org_id FROM public.organizations LIMIT 1;
  END IF;

  -- ============================================================
  -- 2) Create App User (contractor)
  -- ============================================================
  INSERT INTO public.app_users (id, organization_id, role, full_name, email, is_active)
  VALUES (
    test_user_id,
    test_org_id,
    'contractor',
    'Sarah Johnson',
    'sarah.johnson@email.com',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  -- ============================================================
  -- 3) Create Contractor Profile
  -- ============================================================
  INSERT INTO public.contractor_profiles (
    user_id,
    organization_id,
    address_line1,
    address_line2,
    parish,
    country,
    bank_name,
    bank_account_name,
    bank_account_number,
    bank_routing_number
  )
  VALUES (
    test_user_id,
    test_org_id,
    '123 Main Street',
    'Apartment 4B',
    'Kingston',
    'Jamaica',
    'First National Bank',
    'Sarah Johnson',
    '9876543210',
    '021000021'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    address_line1 = EXCLUDED.address_line1;

  -- ============================================================
  -- 4) Create Contract
  -- ============================================================
  INSERT INTO public.contracts (
    id,
    organization_id,
    contractor_user_id,
    project_name,
    contract_type,
    start_date,
    end_date,
    is_active
  )
  VALUES (
    gen_random_uuid(),
    test_org_id,
    test_user_id,
    'E-Commerce Platform Redesign',
    'hourly',
    '2025-01-01',
    '2026-12-31',
    true
  )
  RETURNING id INTO test_contract_id;

  -- ============================================================
  -- 5) Create Rate for Contract
  -- ============================================================
  INSERT INTO public.rates (
    id,
    organization_id,
    contract_id,
    currency_code,
    hourly_rate,
    overtime_multiplier,
    effective_from,
    effective_to
  )
  VALUES (
    gen_random_uuid(),
    test_org_id,
    test_contract_id,
    'USD',
    75.00,
    1.5,
    '2025-01-01',
    NULL
  )
  RETURNING id INTO test_rate_id;

  -- ============================================================
  -- 6) Create Submissions with Line Items and Overtime
  -- ============================================================

  -- Submission 1: January 2026 - APPROVED
  INSERT INTO public.submissions (
    id,
    organization_id,
    contractor_user_id,
    contract_id,
    period_start,
    period_end,
    status,
    submitted_at
  )
  VALUES (
    gen_random_uuid(),
    test_org_id,
    test_user_id,
    test_contract_id,
    '2026-01-01',
    '2026-01-31',
    'approved',
    '2026-01-15 10:30:00+00'
  )
  RETURNING id INTO submission_1_id;

  -- Line items for Submission 1 (January 2026)
  FOR d IN SELECT generate_series('2026-01-01'::date, '2026-01-31'::date, '1 day'::interval)::date LOOP
    INSERT INTO public.submission_line_items (
      submission_id,
      work_date,
      hours,
      is_non_working_day,
      note
    )
    VALUES (
      submission_1_id,
      d,
      CASE
        WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 0
        ELSE 8
      END,
      EXTRACT(DOW FROM d) IN (0, 6),
      CASE
        WHEN EXTRACT(DOW FROM d) NOT IN (0, 6) THEN 'Frontend development for checkout flow, payment integration, and responsive design.'
        ELSE NULL
      END
    );
  END LOOP;

  -- Overtime entry for Submission 1
  INSERT INTO public.overtime_entries (submission_id, work_date, overtime_hours, description)
  VALUES (submission_1_id, '2026-01-15', 8, 'Critical bug fixes for payment processing module');

  -- Submission 2: January 2026 (early) - PENDING
  INSERT INTO public.submissions (
    id,
    organization_id,
    contractor_user_id,
    contract_id,
    period_start,
    period_end,
    status,
    submitted_at
  )
  VALUES (
    gen_random_uuid(),
    test_org_id,
    test_user_id,
    test_contract_id,
    '2026-01-01',
    '2026-01-31',
    'submitted',
    '2026-01-03 14:20:00+00'
  )
  RETURNING id INTO submission_2_id;

  -- Line items for Submission 2
  FOR d IN SELECT generate_series('2026-01-01'::date, '2026-01-31'::date, '1 day'::interval)::date LOOP
    INSERT INTO public.submission_line_items (
      submission_id,
      work_date,
      hours,
      is_non_working_day,
      note
    )
    VALUES (
      submission_2_id,
      d,
      CASE
        WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 0
        ELSE 8
      END,
      EXTRACT(DOW FROM d) IN (0, 6),
      CASE
        WHEN EXTRACT(DOW FROM d) NOT IN (0, 6) THEN 'Backend API development for inventory management system.'
        ELSE NULL
      END
    );
  END LOOP;

  -- Overtime entry for Submission 2
  INSERT INTO public.overtime_entries (submission_id, work_date, overtime_hours, description)
  VALUES (submission_2_id, '2026-01-03', 12, 'Emergency deployment support for warehouse API integration');

  -- Submission 3: December 2025 - APPROVED (will show as PAID when invoice exists)
  INSERT INTO public.submissions (
    id,
    organization_id,
    contractor_user_id,
    contract_id,
    period_start,
    period_end,
    status,
    submitted_at
  )
  VALUES (
    gen_random_uuid(),
    test_org_id,
    test_user_id,
    test_contract_id,
    '2025-12-01',
    '2025-12-31',
    'approved',
    '2025-12-20 09:15:00+00'
  )
  RETURNING id INTO submission_3_id;

  -- Line items for Submission 3
  FOR d IN SELECT generate_series('2025-12-01'::date, '2025-12-31'::date, '1 day'::interval)::date LOOP
    INSERT INTO public.submission_line_items (
      submission_id,
      work_date,
      hours,
      is_non_working_day,
      note
    )
    VALUES (
      submission_3_id,
      d,
      CASE
        WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 0
        ELSE 8
      END,
      EXTRACT(DOW FROM d) IN (0, 6),
      CASE
        WHEN EXTRACT(DOW FROM d) NOT IN (0, 6) THEN 'Push notification system and authentication flow for iOS app.'
        ELSE NULL
      END
    );
  END LOOP;

  -- Create invoice for Submission 3 (PAID)
  INSERT INTO public.invoices (
    organization_id,
    submission_id,
    contractor_user_id,
    contract_id,
    invoice_number,
    currency_code,
    subtotal,
    overtime_total,
    total,
    status,
    issued_at,
    paid_at,
    pdf_url
  )
  VALUES (
    test_org_id,
    submission_3_id,
    test_user_id,
    test_contract_id,
    'INV-2025-12-001',
    'USD',
    12000.00,
    0.00,
    12000.00,
    'paid',
    '2025-12-22 10:00:00+00',
    '2025-12-28 15:30:00+00',
    '/invoices/INV-2025-12-001.pdf'
  );

  -- Submission 4: December 2025 (early) - PAID
  INSERT INTO public.submissions (
    id,
    organization_id,
    contractor_user_id,
    contract_id,
    period_start,
    period_end,
    status,
    submitted_at
  )
  VALUES (
    gen_random_uuid(),
    test_org_id,
    test_user_id,
    test_contract_id,
    '2025-12-01',
    '2025-12-31',
    'approved',
    '2025-12-05 16:45:00+00'
  )
  RETURNING id INTO submission_4_id;

  -- Line items for Submission 4
  FOR d IN SELECT generate_series('2025-12-01'::date, '2025-12-31'::date, '1 day'::interval)::date LOOP
    INSERT INTO public.submission_line_items (
      submission_id,
      work_date,
      hours,
      is_non_working_day,
      note
    )
    VALUES (
      submission_4_id,
      d,
      CASE
        WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 0
        ELSE 7.6  -- 152 hours / 20 working days
      END,
      EXTRACT(DOW FROM d) IN (0, 6),
      CASE
        WHEN EXTRACT(DOW FROM d) NOT IN (0, 6) THEN 'Data visualization components using D3.js and React with WebSocket integration.'
        ELSE NULL
      END
    );
  END LOOP;

  -- Overtime entry for Submission 4
  INSERT INTO public.overtime_entries (submission_id, work_date, overtime_hours, description)
  VALUES (submission_4_id, '2025-12-05', 4, 'Dashboard optimization and performance tuning');

  -- Create invoice for Submission 4 (PAID)
  INSERT INTO public.invoices (
    organization_id,
    submission_id,
    contractor_user_id,
    contract_id,
    invoice_number,
    currency_code,
    subtotal,
    overtime_total,
    total,
    status,
    issued_at,
    paid_at,
    pdf_url
  )
  VALUES (
    test_org_id,
    submission_4_id,
    test_user_id,
    test_contract_id,
    'INV-2025-12-002',
    'USD',
    11400.00,
    450.00,
    11850.00,
    'paid',
    '2025-12-08 10:00:00+00',
    '2025-12-15 14:00:00+00',
    '/invoices/INV-2025-12-002.pdf'
  );

  -- Submission 5: November 2025 - PAID
  INSERT INTO public.submissions (
    id,
    organization_id,
    contractor_user_id,
    contract_id,
    period_start,
    period_end,
    status,
    submitted_at
  )
  VALUES (
    gen_random_uuid(),
    test_org_id,
    test_user_id,
    test_contract_id,
    '2025-11-01',
    '2025-11-30',
    'approved',
    '2025-11-18 11:00:00+00'
  )
  RETURNING id INTO submission_5_id;

  -- Line items for Submission 5
  FOR d IN SELECT generate_series('2025-11-01'::date, '2025-11-30'::date, '1 day'::interval)::date LOOP
    INSERT INTO public.submission_line_items (
      submission_id,
      work_date,
      hours,
      is_non_working_day,
      note
    )
    VALUES (
      submission_5_id,
      d,
      CASE
        WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 0
        ELSE 8
      END,
      EXTRACT(DOW FROM d) IN (0, 6),
      CASE
        WHEN EXTRACT(DOW FROM d) NOT IN (0, 6) THEN 'Database optimization and query performance improvements. Migrated legacy stored procedures.'
        ELSE NULL
      END
    );
  END LOOP;

  -- Create invoice for Submission 5 (PAID)
  INSERT INTO public.invoices (
    organization_id,
    submission_id,
    contractor_user_id,
    contract_id,
    invoice_number,
    currency_code,
    subtotal,
    overtime_total,
    total,
    status,
    issued_at,
    paid_at,
    pdf_url
  )
  VALUES (
    test_org_id,
    submission_5_id,
    test_user_id,
    test_contract_id,
    'INV-2025-11-001',
    'USD',
    12600.00,
    0.00,
    12600.00,
    'paid',
    '2025-11-20 10:00:00+00',
    '2025-11-28 12:00:00+00',
    '/invoices/INV-2025-11-001.pdf'
  );

  RAISE NOTICE 'Seed data created successfully!';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Contract ID: %', test_contract_id;
  RAISE NOTICE 'Submissions created: 5';

END $$;

-- ============================================================
-- Verify the seeded data
-- ============================================================
SELECT
  s.id,
  s.period_start,
  s.period_end,
  s.status,
  c.project_name,
  COALESCE(SUM(li.hours), 0) as total_hours,
  COALESCE(SUM(ot.overtime_hours), 0) as overtime_hours,
  i.status as invoice_status
FROM public.submissions s
LEFT JOIN public.contracts c ON s.contract_id = c.id
LEFT JOIN public.submission_line_items li ON li.submission_id = s.id
LEFT JOIN public.overtime_entries ot ON ot.submission_id = s.id
LEFT JOIN public.invoices i ON i.submission_id = s.id
GROUP BY s.id, s.period_start, s.period_end, s.status, c.project_name, i.status
ORDER BY s.submitted_at DESC;
