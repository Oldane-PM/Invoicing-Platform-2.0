-- Migration to add manager portal columns AND populate existing data
-- This adds columns that the manager portal expects and backfills data

-- Step 1: Add missing columns to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS work_period TEXT,
ADD COLUMN IF NOT EXISTS regular_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_description TEXT,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0;

-- Step 2: Add foreign key constraint for contractor_user_id to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'submissions_contractor_user_id_fkey'
    AND table_name = 'submissions'
  ) THEN
    ALTER TABLE public.submissions
    ADD CONSTRAINT submissions_contractor_user_id_fkey
    FOREIGN KEY (contractor_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Create index on contractor_user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_contractor_user_id ON public.submissions(contractor_user_id);

-- Step 4: Backfill existing data
-- Populate project_name from contracts table
UPDATE public.submissions s
SET project_name = c.project_name
FROM public.contracts c
WHERE s.contract_id = c.id
AND s.project_name IS NULL;

-- Populate work_period from period_start and period_end
UPDATE public.submissions
SET work_period = 
  TO_CHAR(period_start, 'Mon DD') || ' - ' || TO_CHAR(period_end, 'Mon DD, YYYY')
WHERE work_period IS NULL;

-- Populate regular_hours from submission_line_items
UPDATE public.submissions s
SET regular_hours = COALESCE((
  SELECT SUM(hours)
  FROM public.submission_line_items li
  WHERE li.submission_id = s.id
), 0)
WHERE s.regular_hours = 0 OR s.regular_hours IS NULL;

-- Populate overtime_hours from overtime_entries
UPDATE public.submissions s
SET overtime_hours = COALESCE((
  SELECT SUM(overtime_hours)
  FROM public.overtime_entries oe
  WHERE oe.submission_id = s.id
), 0)
WHERE s.overtime_hours = 0 OR s.overtime_hours IS NULL;

-- Populate overtime_description from overtime_entries (concatenate all descriptions)
UPDATE public.submissions s
SET overtime_description = (
  SELECT STRING_AGG(description, '; ')
  FROM public.overtime_entries oe
  WHERE oe.submission_id = s.id
)
WHERE s.overtime_description IS NULL;

-- Populate total_amount based on rates and hours
UPDATE public.submissions s
SET total_amount = COALESCE((
  SELECT 
    (s.regular_hours * r.hourly_rate) + 
    (s.overtime_hours * r.hourly_rate * r.overtime_multiplier)
  FROM public.rates r
  WHERE r.contract_id = s.contract_id
  AND r.effective_from <= s.period_start
  AND (r.effective_to IS NULL OR r.effective_to >= s.period_end)
  LIMIT 1
), 0)
WHERE s.total_amount = 0 OR s.total_amount IS NULL;

COMMENT ON COLUMN public.submissions.project_name IS 'Project name for this submission (denormalized for manager portal)';
COMMENT ON COLUMN public.submissions.description IS 'Description of work performed';
COMMENT ON COLUMN public.submissions.work_period IS 'Human-readable work period (e.g., "Jan 1-31, 2026")';
COMMENT ON COLUMN public.submissions.regular_hours IS 'Total regular hours worked';
COMMENT ON COLUMN public.submissions.overtime_hours IS 'Total overtime hours worked';
COMMENT ON COLUMN public.submissions.total_amount IS 'Total amount for this submission';
