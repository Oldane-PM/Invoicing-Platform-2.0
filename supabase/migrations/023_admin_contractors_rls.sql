-- Migration: Add RLS policies for admins to manage contractors table
-- This allows admins to update contract information (rates, dates) for any contractor

-- =============================================
-- 1. ADD ADMIN UPDATE POLICY FOR CONTRACTORS
-- =============================================
DROP POLICY IF EXISTS "contractors_update_admin" ON public.contractors;

-- Admins can update any contractor record
CREATE POLICY "contractors_update_admin" ON public.contractors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- =============================================
-- 2. ADD ADMIN INSERT POLICY FOR CONTRACTORS
-- =============================================
DROP POLICY IF EXISTS "contractors_insert_admin" ON public.contractors;

-- Admins can insert contractor records (for cases where contractor doesn't exist yet)
CREATE POLICY "contractors_insert_admin" ON public.contractors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- =============================================
-- 3. COMMENTS
-- =============================================
COMMENT ON POLICY "contractors_update_admin" ON public.contractors IS 
  'Allows admin users to update any contractor record (rates, dates, etc.)';
COMMENT ON POLICY "contractors_insert_admin" ON public.contractors IS 
  'Allows admin users to insert contractor records';
