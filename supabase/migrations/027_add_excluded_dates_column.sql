-- Add excluded_dates column to submissions table
-- This column stores an array of dates (in YYYY-MM-DD format) that were excluded from the work period

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS excluded_dates TEXT[];

-- Add comment
COMMENT ON COLUMN public.submissions.excluded_dates IS 'Array of excluded dates in YYYY-MM-DD format that were not worked during the work period';
