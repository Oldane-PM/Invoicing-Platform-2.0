-- Migration: Create user_invitations table for pre-registration system
-- Allows admins to pre-register users before they sign in with Google OAuth

-- =============================================
-- 1. CREATE USER_INVITATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User information
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('UNASSIGNED', 'CONTRACTOR', 'MANAGER', 'ADMIN')),
  
  -- Contract information (for contractors)
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_contract_dates CHECK (
    (role != 'CONTRACTOR') OR 
    (contract_start_date IS NOT NULL AND contract_end_date IS NOT NULL AND contract_end_date > contract_start_date)
  )
);

-- =============================================
-- 2. CREATE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_used_at ON public.user_invitations(used_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_created_by ON public.user_invitations(created_by);

-- =============================================
-- 3. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "invitations_select_admin" ON public.user_invitations;
DROP POLICY IF EXISTS "invitations_insert_admin" ON public.user_invitations;
DROP POLICY IF EXISTS "invitations_update_admin" ON public.user_invitations;
DROP POLICY IF EXISTS "invitations_delete_admin" ON public.user_invitations;

-- Admins can read all invitations
CREATE POLICY "invitations_select_admin" ON public.user_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Admins can create invitations
CREATE POLICY "invitations_insert_admin" ON public.user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Admins can update invitations (e.g., mark as used)
CREATE POLICY "invitations_update_admin" ON public.user_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Admins can delete invitations
CREATE POLICY "invitations_delete_admin" ON public.user_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- =============================================
-- 4. GRANTS
-- =============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invitations TO authenticated;

-- =============================================
-- 5. COMMENTS
-- =============================================
COMMENT ON TABLE public.user_invitations IS 'Pre-registered users awaiting first Google OAuth sign-in';
COMMENT ON COLUMN public.user_invitations.email IS 'Email address of the invited user (must match Google account)';
COMMENT ON COLUMN public.user_invitations.role IS 'Role to be assigned when user first signs in';
COMMENT ON COLUMN public.user_invitations.used_at IS 'Timestamp when invitation was used (user signed in)';
COMMENT ON COLUMN public.user_invitations.used_by_user_id IS 'auth.users.id of the user who claimed this invitation';
