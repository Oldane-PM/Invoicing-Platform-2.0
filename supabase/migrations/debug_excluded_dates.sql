-- Query to check if excluded_dates are being saved to the database
SELECT 
  id,
  work_period,
  regular_hours,
  excluded_dates,
  created_at,
  updated_at
FROM public.submissions
ORDER BY created_at DESC
LIMIT 5;
