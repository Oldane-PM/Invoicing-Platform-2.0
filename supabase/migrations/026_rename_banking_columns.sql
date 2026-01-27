-- Migration: Copy data from old banking columns to new ones and drop old columns
-- The database has both routing_number/account_number AND bank_routing_number/bank_account_number
-- Data is in the old columns, but code expects the new ones

DO $$
BEGIN
  -- Copy data from routing_number to bank_routing_number if routing_number exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractor_profiles' 
    AND column_name = 'routing_number'
  ) THEN
    -- Copy the data
    UPDATE public.contractor_profiles 
    SET bank_routing_number = routing_number 
    WHERE routing_number IS NOT NULL;
    
    -- Drop the old column
    ALTER TABLE public.contractor_profiles DROP COLUMN routing_number;
    
    RAISE NOTICE 'Copied data from routing_number to bank_routing_number and dropped old column';
  END IF;
  
  -- Copy data from account_number to bank_account_number if account_number exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractor_profiles' 
    AND column_name = 'account_number'
  ) THEN
    -- Copy the data
    UPDATE public.contractor_profiles 
    SET bank_account_number = account_number 
    WHERE account_number IS NOT NULL;
    
    -- Drop the old column
    ALTER TABLE public.contractor_profiles DROP COLUMN account_number;
    
    RAISE NOTICE 'Copied data from account_number to bank_account_number and dropped old column';
  END IF;
END $$;

-- Update comments for clarity
COMMENT ON COLUMN public.contractor_profiles.bank_routing_number IS 'ABA/Wire routing number for the bank account';
COMMENT ON COLUMN public.contractor_profiles.bank_account_number IS 'Contractor''s bank account number';
