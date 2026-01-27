-- Migration: Add missing banking columns to contractor_profiles
-- Adds bank_name and bank_account_number if they don't exist

DO $$
BEGIN
  -- Add bank_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractor_profiles' 
    AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN bank_name TEXT;
    COMMENT ON COLUMN public.contractor_profiles.bank_name IS 'Name of the contractor''s bank';
  END IF;
  
  -- Add bank_account_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractor_profiles' 
    AND column_name = 'bank_account_number'
  ) THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN bank_account_number TEXT;
    COMMENT ON COLUMN public.contractor_profiles.bank_account_number IS 'Contractor''s bank account number';
  END IF;
  
  -- Add bank_account_name column if it doesn't exist (for completeness)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractor_profiles' 
    AND column_name = 'bank_account_name'
  ) THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN bank_account_name TEXT;
    COMMENT ON COLUMN public.contractor_profiles.bank_account_name IS 'Name on the bank account';
  END IF;
  
  -- Add address_line1 column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractor_profiles' 
    AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN address_line1 TEXT;
  END IF;
  
  -- Add address_line2 column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractor_profiles' 
    AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN address_line2 TEXT;
  END IF;
  
  -- Add country column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractor_profiles' 
    AND column_name = 'country'
  ) THEN
    ALTER TABLE public.contractor_profiles ADD COLUMN country TEXT;
  END IF;
END $$;
