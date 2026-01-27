-- Add is_active column to profiles table
-- This allows admins to enable/disable any user account (admin, manager, contractor)

DO $$
BEGIN
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN public.profiles.is_active IS 'Whether the user account is active and can log in';
  END IF;
END $$;

-- Set all existing users to active by default
UPDATE public.profiles SET is_active = TRUE WHERE is_active IS NULL;
