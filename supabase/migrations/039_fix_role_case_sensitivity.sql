-- =============================================
-- FIX CASE SENSITIVITY IN ALL RLS POLICIES
-- This migration updates all role-based RLS policies to use case-insensitive comparisons
-- =============================================

-- =============================================
-- 1. CREATE HELPER FUNCTION FOR ROLE CHECKING
-- =============================================
-- This function checks if the current user has one of the specified roles (case-insensitive)
CREATE OR REPLACE FUNCTION public.user_has_role(allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND UPPER(p.role) = ANY(SELECT UPPER(r) FROM UNNEST(allowed_roles) AS r)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Convenience functions for common role checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND UPPER(p.role) = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND UPPER(p.role) = 'MANAGER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_contractor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND UPPER(p.role) = 'CONTRACTOR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- 2. FIX PROFILES TABLE RLS POLICIES
-- =============================================
DROP POLICY IF EXISTS "profiles_select_contractors_for_managers" ON public.profiles;
CREATE POLICY "profiles_select_contractors_for_managers" ON public.profiles
  FOR SELECT USING (
    public.is_manager() AND UPPER(role) = 'CONTRACTOR'
  );

DROP POLICY IF EXISTS "profiles_select_all_for_admins" ON public.profiles;
CREATE POLICY "profiles_select_all_for_admins" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- =============================================
-- 3. FIX CONTRACTORS TABLE RLS POLICIES
-- =============================================
DROP POLICY IF EXISTS "contractors_select_all_for_admins" ON public.contractors;
CREATE POLICY "contractors_select_all_for_admins" ON public.contractors
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "contractors_update_all_for_admins" ON public.contractors;
CREATE POLICY "contractors_update_all_for_admins" ON public.contractors
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- 4. FIX USER_INVITATIONS TABLE RLS POLICIES
-- =============================================
DROP POLICY IF EXISTS "invitations_select_admin" ON public.user_invitations;
CREATE POLICY "invitations_select_admin" ON public.user_invitations
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "invitations_insert_admin" ON public.user_invitations;
CREATE POLICY "invitations_insert_admin" ON public.user_invitations
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "invitations_update_admin" ON public.user_invitations;
CREATE POLICY "invitations_update_admin" ON public.user_invitations
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "invitations_delete_admin" ON public.user_invitations;
CREATE POLICY "invitations_delete_admin" ON public.user_invitations
  FOR DELETE USING (public.is_admin());

-- =============================================
-- 5. FIX SUBMISSIONS TABLE RLS POLICIES (if exists)
-- =============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'submissions') THEN
    -- Recreate admin policies with case-insensitive role checks
    DROP POLICY IF EXISTS "submissions_select_admin" ON public.submissions;
    CREATE POLICY "submissions_select_admin" ON public.submissions
      FOR SELECT USING (public.is_admin());
      
    DROP POLICY IF EXISTS "submissions_update_admin" ON public.submissions;
    CREATE POLICY "submissions_update_admin" ON public.submissions
      FOR UPDATE USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =============================================
-- 6. FIX PAYMENTS TABLE RLS POLICIES (if exists)
-- =============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    DROP POLICY IF EXISTS "payments_select_admin" ON public.payments;
    CREATE POLICY "payments_select_admin" ON public.payments
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- =============================================
-- 7. FIX CONTRACTOR_PROFILES TABLE RLS POLICIES (if exists)
-- =============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractor_profiles') THEN
    DROP POLICY IF EXISTS "admin_full_access_contractor_profiles" ON public.contractor_profiles;
    CREATE POLICY "admin_full_access_contractor_profiles" ON public.contractor_profiles
      FOR ALL USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =============================================
-- 8. FIX HOLIDAYS/CALENDAR TABLE RLS POLICIES (if exists)
-- =============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holidays') THEN
    DROP POLICY IF EXISTS "holidays_admin_all" ON public.holidays;
    CREATE POLICY "holidays_admin_all" ON public.holidays
      FOR ALL USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =============================================
-- 9. FIX PROJECTS TABLE RLS POLICIES (if exists)
-- =============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    DROP POLICY IF EXISTS "projects_admin_all" ON public.projects;
    CREATE POLICY "projects_admin_all" ON public.projects
      FOR ALL USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =============================================
-- 10. GRANT EXECUTE ON HELPER FUNCTIONS
-- =============================================
GRANT EXECUTE ON FUNCTION public.user_has_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_contractor() TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================
-- Run these queries to verify the fix:
-- SELECT public.is_admin();  -- Should return true if you're an admin
-- SELECT * FROM public.user_invitations;  -- Should now work for admins
