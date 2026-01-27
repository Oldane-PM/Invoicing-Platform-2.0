-- Query to check what banking data exists in the contractor_profiles table
-- This will help us understand if the data exists or was never saved

SELECT 
  user_id,
  bank_name,
  bank_address,
  swift_code,
  bank_routing_number,
  bank_account_number,
  bank_account_name
FROM public.contractor_profiles
WHERE user_id = auth.uid();
