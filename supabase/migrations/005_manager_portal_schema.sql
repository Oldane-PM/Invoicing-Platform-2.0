-- =============================================
-- MANAGER PORTAL SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. PROFILES TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CONTRACTOR')) DEFAULT 'CONTRACTOR',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add role column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'CONTRACTOR' CHECK (role IN ('ADMIN', 'MANAGER', 'CONTRACTOR'));
  END IF;
END $$;

-- =============================================
-- 2. CONTRACTORS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.contractors (
  contractor_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10,2) DEFAULT 75.00,
  overtime_rate NUMERIC(10,2) DEFAULT 112.50,
  default_project_name TEXT,
  contract_start DATE,
  contract_end DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. MANAGER_TEAMS TABLE (links managers to contractors)
-- =============================================
CREATE TABLE IF NOT EXISTS public.manager_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, contractor_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_teams_manager ON public.manager_teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_contractor ON public.manager_teams(contractor_id);

-- =============================================
-- 4. UPDATE SUBMISSIONS TABLE
-- =============================================
-- Add missing columns to submissions if they don't exist
DO $$
BEGIN
  -- manager_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN manager_id UUID REFERENCES public.profiles(id);
  END IF;

  -- rejection_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN rejection_reason TEXT;
  END IF;

  -- approved_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  -- paid_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- =============================================
-- UPDATE SUBMISSION_STATUS ENUM (if it exists as enum)
-- =============================================
-- First check if submission_status is an enum type and add missing values
DO $$
BEGIN
  -- Check if the type exists as an enum
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'submission_status'
  ) THEN
    -- Add PENDING if not exists
    BEGIN
      ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'pending';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'approved';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'rejected';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'paid';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'needs_clarification';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- =============================================
-- 5. PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES public.profiles(id),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT CHECK (status IN ('PENDING', 'PAID', 'FAILED')) DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_submission ON public.payments(submission_id);
CREATE INDEX IF NOT EXISTS idx_payments_contractor ON public.payments(contractor_id);

-- =============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. RLS POLICIES
-- =============================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_team" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

DROP POLICY IF EXISTS "contractors_select_own" ON public.contractors;
DROP POLICY IF EXISTS "contractors_select_team" ON public.contractors;

DROP POLICY IF EXISTS "manager_teams_select_manager" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_insert_manager" ON public.manager_teams;
DROP POLICY IF EXISTS "manager_teams_delete_manager" ON public.manager_teams;

DROP POLICY IF EXISTS "submissions_select_contractor" ON public.submissions;
DROP POLICY IF EXISTS "submissions_select_manager" ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert_contractor" ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_manager" ON public.submissions;

DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_manager" ON public.payments;

-- PROFILES POLICIES
-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Managers can read profiles of contractors in their team
CREATE POLICY "profiles_select_team" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.manager_teams mt
      WHERE mt.manager_id = auth.uid() AND mt.contractor_id = profiles.id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- CONTRACTORS POLICIES
-- Contractors can read their own contractor record
CREATE POLICY "contractors_select_own" ON public.contractors
  FOR SELECT USING (auth.uid() = contractor_id);

-- Managers can read contractors in their team
CREATE POLICY "contractors_select_team" ON public.contractors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.manager_teams mt
      WHERE mt.manager_id = auth.uid() AND mt.contractor_id = contractors.contractor_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- MANAGER_TEAMS POLICIES
-- Managers can read their own team
CREATE POLICY "manager_teams_select_manager" ON public.manager_teams
  FOR SELECT USING (manager_id = auth.uid());

-- Managers can add contractors to their team
CREATE POLICY "manager_teams_insert_manager" ON public.manager_teams
  FOR INSERT WITH CHECK (manager_id = auth.uid());

-- Managers can remove contractors from their team
CREATE POLICY "manager_teams_delete_manager" ON public.manager_teams
  FOR DELETE USING (manager_id = auth.uid());

-- SUBMISSIONS POLICIES
-- Contractors can read their own submissions
CREATE POLICY "submissions_select_contractor" ON public.submissions
  FOR SELECT USING (contractor_user_id = auth.uid());

-- Managers can read submissions from their team
CREATE POLICY "submissions_select_manager" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.manager_teams mt
      WHERE mt.manager_id = auth.uid() AND mt.contractor_id = submissions.contractor_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Contractors can create submissions for themselves
CREATE POLICY "submissions_insert_contractor" ON public.submissions
  FOR INSERT WITH CHECK (contractor_user_id = auth.uid());

-- Managers can update submissions from their team (for approve/reject)
CREATE POLICY "submissions_update_manager" ON public.submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.manager_teams mt
      WHERE mt.manager_id = auth.uid() AND mt.contractor_id = submissions.contractor_user_id
    )
  );

-- PAYMENTS POLICIES
-- Users can read payments involving them
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (
    contractor_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Managers can create payments for their team submissions
CREATE POLICY "payments_insert_manager" ON public.payments
  FOR INSERT WITH CHECK (
    manager_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.manager_teams mt
      WHERE mt.manager_id = auth.uid() AND mt.contractor_id = payments.contractor_id
    )
  );

-- =============================================
-- 8. COMMENTS
-- =============================================
COMMENT ON TABLE public.profiles IS 'User profiles with role-based access (ADMIN, MANAGER, CONTRACTOR)';
COMMENT ON TABLE public.contractors IS 'Contractor-specific details like rates and contract info';
COMMENT ON TABLE public.manager_teams IS 'Maps managers to their team of contractors';
COMMENT ON TABLE public.payments IS 'Payment records for approved submissions';
