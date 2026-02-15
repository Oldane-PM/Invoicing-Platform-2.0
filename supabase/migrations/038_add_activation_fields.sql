-- Migration: Add activation tracking fields to profiles table
-- Enables visibility of pre-registered users who haven't logged in yet

-- =============================================
-- 1. ADD ACTIVATION COLUMNS TO PROFILES
-- =============================================

-- invited_at: Timestamp when admin pre-registers the user (NOT NULL)
-- For existing users, default to their created_at or now()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN invited_at TIMESTAMPTZ;
    
    -- Backfill existing profiles with created_at timestamp
    UPDATE public.profiles SET invited_at = COALESCE(created_at, NOW()) WHERE invited_at IS NULL;
    
    -- Now make it NOT NULL with default
    ALTER TABLE public.profiles ALTER COLUMN invited_at SET DEFAULT NOW();
    ALTER TABLE public.profiles ALTER COLUMN invited_at SET NOT NULL;
  END IF;
END $$;

-- activated_at: Timestamp of user's first successful login (nullable = pending activation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN activated_at TIMESTAMPTZ;
    
    -- Backfill existing profiles as already activated (they've logged in before)
    UPDATE public.profiles SET activated_at = COALESCE(created_at, NOW()) WHERE activated_at IS NULL;
  END IF;
END $$;

-- =============================================
-- 2. CREATE INDEX FOR PENDING USERS QUERY
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_pending_activation 
  ON public.profiles(activated_at) 
  WHERE activated_at IS NULL;

-- =============================================
-- 3. RLS POLICIES FOR ACTIVATION FIELDS
-- =============================================

-- Drop existing policies if they exist (to recreate cleanly)
DROP POLICY IF EXISTS "profiles_update_own_activated" ON public.profiles;
DROP POLICY IF EXISTS "admin_manage_invited_at" ON public.profiles;

-- Users can update their own activated_at (for first login activation)
CREATE POLICY "profiles_update_own_activated" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================
-- 4. UPDATE AUTO-CREATE PROFILE TRIGGER
-- =============================================
-- The existing trigger (from migration 008) needs to include the new columns

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, invited_at, activated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'CONTRACTOR'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),  -- invited_at - when the profile was created
    NULL    -- activated_at - NULL means pending activation (user hasn't logged in yet)
  )
  ON CONFLICT (id) DO UPDATE SET
    invited_at = COALESCE(profiles.invited_at, NOW()),
    activated_at = profiles.activated_at;  -- Keep existing value
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. COMMENTS
-- =============================================
COMMENT ON COLUMN public.profiles.invited_at IS 'Timestamp when admin pre-registered this user';
COMMENT ON COLUMN public.profiles.activated_at IS 'Timestamp of first successful login. NULL means pending activation.';
