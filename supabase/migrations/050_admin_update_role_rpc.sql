-- =============================================
-- CREATE RPC FUNCTION FOR ADMIN ROLE UPDATES
-- This function uses SECURITY DEFINER to bypass RLS
-- Only admins can call it (checked inside the function)
-- =============================================

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
  -- 1. Verify the caller is an admin
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role IS NULL OR UPPER(caller_role) != 'ADMIN' THEN
    RAISE EXCEPTION 'Forbidden: Only admins can update user roles';
  END IF;

  -- 2. Validate the new role
  IF LOWER(new_role) NOT IN ('admin', 'manager', 'contractor', 'unassigned') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be admin, manager, contractor, or unassigned', new_role;
  END IF;

  -- 3. Update profiles table (primary source of truth)
  UPDATE public.profiles
  SET role = LOWER(new_role)
  WHERE id = target_user_id
  RETURNING id, role INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', target_user_id;
  END IF;

  -- 4. Sync app_users table (non-fatal if it fails)
  BEGIN
    UPDATE public.app_users
    SET role = LOWER(new_role)
    WHERE id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal: app_users sync is best-effort
    RAISE NOTICE 'Failed to sync app_users: %', SQLERRM;
  END;

  -- 5. Return result
  RETURN jsonb_build_object(
    'success', true,
    'userId', updated_profile.id,
    'role', updated_profile.role
  );
END;
$$;

-- Grant execute to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;
