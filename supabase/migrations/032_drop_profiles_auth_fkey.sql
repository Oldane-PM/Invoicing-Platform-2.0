-- Remove foreign key constraint from profiles.id to auth.users
-- This allows us to create profiles with generated UUIDs without requiring auth.users entries
-- Better Auth handles authentication separately, so we don't need this constraint

-- Drop the foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    RAISE NOTICE 'Dropped foreign key constraint profiles_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint profiles_id_fkey does not exist, skipping';
  END IF;
END $$;

-- Add comment explaining why we removed it
COMMENT ON TABLE public.profiles IS 'User profiles - authentication handled by Better Auth, not Supabase auth.users';
