-- Migration: Add work_period_key for sorting submissions by work period
-- This allows the dashboard to display and sort submissions by Work Period (Month/Year)
-- instead of submission timestamp.

-- 1) Add work_period_key column (first day of work month for sorting)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS work_period_key DATE;

-- 2) Backfill work_period_key from existing period_start (which is already first of month)
UPDATE public.submissions
SET work_period_key = period_start::date
WHERE work_period_key IS NULL
  AND period_start IS NOT NULL;

-- 3) Alternative backfill from work_period text field if period_start is null
-- work_period is stored as "YYYY-MM" format
UPDATE public.submissions
SET work_period_key = (work_period || '-01')::date
WHERE work_period_key IS NULL
  AND work_period IS NOT NULL
  AND work_period ~ '^\d{4}-\d{2}$';

-- 4) Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_submissions_work_period_key 
ON public.submissions (work_period_key DESC NULLS LAST);

-- 5) Create trigger to auto-set work_period_key on insert/update
CREATE OR REPLACE FUNCTION public.set_work_period_key()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Set work_period_key from period_start if available
  IF NEW.work_period_key IS NULL AND NEW.period_start IS NOT NULL THEN
    NEW.work_period_key := NEW.period_start::date;
  -- Otherwise try to parse from work_period text
  ELSIF NEW.work_period_key IS NULL AND NEW.work_period IS NOT NULL AND NEW.work_period ~ '^\d{4}-\d{2}$' THEN
    NEW.work_period_key := (NEW.work_period || '-01')::date;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_work_period_key ON public.submissions;
CREATE TRIGGER trg_set_work_period_key
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.set_work_period_key();

-- Add column comment
COMMENT ON COLUMN public.submissions.work_period_key IS 'First day of work period month for sorting (auto-populated from period_start or work_period)';
