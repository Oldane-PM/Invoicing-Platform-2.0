-- Migration: Create contractor_profiles table for Personal + Banking info
-- Contract info is read from the contracts table (read-only for contractors)

-- =============================================
-- 1. CREATE CONTRACTOR_PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.contractor_profiles (
  -- Primary key: references the user's auth ID
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  
  -- Personal Information
  full_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  state_parish TEXT,
  country TEXT,
  postal_code TEXT,
  email TEXT,
  phone TEXT,
  
  -- Banking Details
  bank_name TEXT,
  bank_address TEXT,
  bank_account_name TEXT,
  swift_code TEXT,
  routing_number TEXT,
  account_type TEXT DEFAULT 'Checking',
  currency TEXT DEFAULT 'USD',
  account_number TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if table already exists but is missing columns
DO $$
BEGIN
  -- Personal fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'full_name') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN full_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'state_parish') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN state_parish TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'postal_code') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN postal_code TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'email') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN phone TEXT;
  END IF;
  
  -- Banking fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'bank_address') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN bank_address TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'swift_code') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN swift_code TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'routing_number') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN routing_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'account_type') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN account_type TEXT DEFAULT 'Checking';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'currency') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Rename old column if exists (parish -> state_parish for consistency)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'parish') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_profiles' AND column_name = 'state_parish') THEN
    ALTER TABLE public.contractor_profiles RENAME COLUMN parish TO state_parish;
  END IF;
END $$;

-- =============================================
-- 2. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "contractor_profiles_select_own" ON public.contractor_profiles;
DROP POLICY IF EXISTS "contractor_profiles_insert_own" ON public.contractor_profiles;
DROP POLICY IF EXISTS "contractor_profiles_update_own" ON public.contractor_profiles;
DROP POLICY IF EXISTS "contractor_profiles_select_for_admins" ON public.contractor_profiles;

-- Contractors can read their own profile
CREATE POLICY "contractor_profiles_select_own" ON public.contractor_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Contractors can insert their own profile
CREATE POLICY "contractor_profiles_insert_own" ON public.contractor_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Contractors can update their own profile
CREATE POLICY "contractor_profiles_update_own" ON public.contractor_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Admins can read all profiles (for admin portal)
CREATE POLICY "contractor_profiles_select_for_admins" ON public.contractor_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- =============================================
-- 3. TRIGGER FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_contractor_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contractor_profiles_updated_at ON public.contractor_profiles;
CREATE TRIGGER trg_contractor_profiles_updated_at
BEFORE UPDATE ON public.contractor_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_contractor_profile_updated_at();

-- =============================================
-- 4. GRANTS
-- =============================================
GRANT SELECT, INSERT, UPDATE ON public.contractor_profiles TO authenticated;

-- =============================================
-- 5. COMMENTS
-- =============================================
COMMENT ON TABLE public.contractor_profiles IS 'Stores contractor personal and banking information (editable by contractor)';
COMMENT ON COLUMN public.contractor_profiles.user_id IS 'References auth.users - the contractor this profile belongs to';
COMMENT ON COLUMN public.contractor_profiles.state_parish IS 'State or Parish depending on country';
