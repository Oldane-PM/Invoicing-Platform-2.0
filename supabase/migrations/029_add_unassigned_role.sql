-- Add 'unassigned' as the default role for new users
-- This migration:
-- 1. Normalizes existing roles to lowercase
-- 2. Backfills any NULL or invalid roles to 'unassigned'
-- 3. Adds a CHECK constraint for valid roles
-- 4. Updates the role column default to 'unassigned'

DO $$
BEGIN
  -- Step 1: Normalize all existing roles to lowercase
  UPDATE public.profiles SET role = LOWER(role) WHERE role IS NOT NULL;
  
  -- Step 2: Backfill any NULL roles to 'unassigned'
  UPDATE public.profiles SET role = 'unassigned' WHERE role IS NULL;
  
  -- Step 3: Convert any non-standard roles to 'unassigned'
  -- This handles edge cases where role might be something unexpected
  UPDATE public.profiles 
  SET role = 'unassigned' 
  WHERE role NOT IN ('unassigned', 'contractor', 'manager', 'admin');
  
  -- Step 4: Drop existing constraint if it exists (to allow re-running)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  -- Step 5: Add CHECK constraint for valid roles
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('unassigned', 'contractor', 'manager', 'admin'));
  
  -- Step 6: Update the default value for new users
  ALTER TABLE public.profiles 
    ALTER COLUMN role SET DEFAULT 'unassigned';
    
  -- Add comment for documentation
  COMMENT ON COLUMN public.profiles.role IS 'User role: unassigned (default), contractor, manager, or admin';
END $$;
