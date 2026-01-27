-- =============================================
-- MANAGER PORTAL SEED DATA
--
-- INSTRUCTIONS:
-- 1. Create users in Supabase Auth Dashboard:
--    - john.smith@email.com (Manager) password: 123456
--    - contractor1@email.com (Contractor) password: 123456
--    - contractor2@email.com (Contractor) password: 123456
--    - contractor3@email.com (Contractor) password: 123456
--
-- 2. Copy the UUIDs from Auth > Users and replace placeholders below
-- 3. Run this SQL in Supabase SQL Editor
-- =============================================

-- REPLACE THESE WITH ACTUAL AUTH USER IDs FROM SUPABASE
-- After creating users in Auth, copy their UUIDs here:
DO $$
DECLARE
  john_manager_id UUID := '00000000-0000-0000-0000-000000000001';  -- Replace with John's auth.users.id
  contractor_id_1 UUID := '00000000-0000-0000-0000-000000000002';  -- Replace with contractor1's id
  contractor_id_2 UUID := '00000000-0000-0000-0000-000000000003';  -- Replace with contractor2's id
  contractor_id_3 UUID := '00000000-0000-0000-0000-000000000004';  -- Replace with contractor3's id
BEGIN

  -- =============================================
  -- 1. INSERT PROFILES
  -- =============================================

  -- Manager profile
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (john_manager_id, 'MANAGER', 'John Smith', 'john.smith@email.com')
  ON CONFLICT (id) DO UPDATE SET role = 'MANAGER', full_name = 'John Smith';

  -- Contractor profiles
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES
    (contractor_id_1, 'CONTRACTOR', 'Sarah Johnson', 'contractor1@email.com'),
    (contractor_id_2, 'CONTRACTOR', 'Michael Chen', 'contractor2@email.com'),
    (contractor_id_3, 'CONTRACTOR', 'Emily Davis', 'contractor3@email.com')
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  -- =============================================
  -- 2. INSERT CONTRACTOR RECORDS
  -- =============================================
  INSERT INTO public.contractors (contractor_id, hourly_rate, overtime_rate, default_project_name, contract_start, contract_end, is_active)
  VALUES
    (contractor_id_1, 75.00, 112.50, 'Frontend Development', '2024-01-01', '2025-12-31', true),
    (contractor_id_2, 85.00, 127.50, 'Backend API', '2024-03-15', '2025-06-30', true),
    (contractor_id_3, 65.00, 97.50, 'UI/UX Design', '2024-06-01', '2025-05-31', true)
  ON CONFLICT (contractor_id) DO UPDATE SET
    hourly_rate = EXCLUDED.hourly_rate,
    overtime_rate = EXCLUDED.overtime_rate,
    default_project_name = EXCLUDED.default_project_name;

  -- =============================================
  -- 3. ASSIGN CONTRACTORS TO MANAGER'S TEAM
  -- =============================================
  INSERT INTO public.manager_teams (manager_id, contractor_id)
  VALUES
    (john_manager_id, contractor_id_1),
    (john_manager_id, contractor_id_2),
    (john_manager_id, contractor_id_3)
  ON CONFLICT (manager_id, contractor_id) DO NOTHING;

  -- =============================================
  -- 4. INSERT SAMPLE SUBMISSIONS
  -- NOTE: Using lowercase status values to match existing enum type
  -- (draft, submitted, pending_review, approved, rejected, needs_clarification)
  -- =============================================

  -- Sarah's submissions (various statuses)
  INSERT INTO public.submissions (
    id, contractor_user_id, project_name, description,
    period_start, period_end, work_period,
    regular_hours, overtime_hours, overtime_description,
    total_amount, status, submitted_at, created_at
  ) VALUES
  (
    gen_random_uuid(), contractor_id_1, 'Frontend Development',
    'Implemented responsive dashboard components and fixed navigation bugs.',
    '2025-01-01', '2025-01-31', '2025-01',
    160, 12, 'Emergency hotfix deployment',
    (160 * 75.00) + (12 * 112.50), 'submitted',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  (
    gen_random_uuid(), contractor_id_1, 'Frontend Development',
    'Built user authentication flow and profile management screens.',
    '2024-12-01', '2024-12-31', '2024-12',
    152, 8, 'Year-end release push',
    (152 * 75.00) + (8 * 112.50), 'approved',
    NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'
  );

  -- Michael's submissions
  INSERT INTO public.submissions (
    id, contractor_user_id, project_name, description,
    period_start, period_end, work_period,
    regular_hours, overtime_hours, overtime_description,
    total_amount, status, submitted_at, created_at
  ) VALUES
  (
    gen_random_uuid(), contractor_id_2, 'Backend API',
    'Developed REST API endpoints for invoice management and implemented caching.',
    '2025-01-01', '2025-01-31', '2025-01',
    168, 20, 'Database migration and optimization',
    (168 * 85.00) + (20 * 127.50), 'submitted',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),
  (
    gen_random_uuid(), contractor_id_2, 'Backend API',
    'Set up CI/CD pipeline and wrote integration tests.',
    '2024-12-01', '2024-12-31', '2024-12',
    160, 0, NULL,
    (160 * 85.00), 'approved',
    NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'
  );

  -- Emily's submissions
  INSERT INTO public.submissions (
    id, contractor_user_id, project_name, description,
    period_start, period_end, work_period,
    regular_hours, overtime_hours, overtime_description,
    total_amount, status, submitted_at, created_at
  ) VALUES
  (
    gen_random_uuid(), contractor_id_3, 'UI/UX Design',
    'Designed new invoice templates and contractor dashboard mockups.',
    '2025-01-01', '2025-01-31', '2025-01',
    140, 5, 'Client presentation prep',
    (140 * 65.00) + (5 * 97.50), 'submitted',
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  ),
  (
    gen_random_uuid(), contractor_id_3, 'UI/UX Design',
    'Created style guide and component library documentation.',
    '2024-11-01', '2024-11-30', '2024-11',
    120, 0, NULL,
    (120 * 65.00), 'rejected',
    NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'
  );

  RAISE NOTICE 'Seed data inserted successfully!';
  RAISE NOTICE 'Manager: John Smith (%)' , john_manager_id;
  RAISE NOTICE 'Team: Sarah Johnson, Michael Chen, Emily Davis';

END $$;

-- =============================================
-- VERIFICATION QUERIES (run after seeding)
-- =============================================

-- Check profiles
-- SELECT * FROM public.profiles;

-- Check contractors
-- SELECT c.*, p.full_name, p.email
-- FROM public.contractors c
-- JOIN public.profiles p ON c.contractor_id = p.id;

-- Check manager teams
-- SELECT mt.*, p.full_name as contractor_name
-- FROM public.manager_teams mt
-- JOIN public.profiles p ON mt.contractor_id = p.id;

-- Check submissions with contractor names
-- SELECT s.id, s.project_name, s.status, s.total_amount, p.full_name as contractor
-- FROM public.submissions s
-- JOIN public.profiles p ON s.contractor_user_id = p.id
-- ORDER BY s.created_at DESC;
