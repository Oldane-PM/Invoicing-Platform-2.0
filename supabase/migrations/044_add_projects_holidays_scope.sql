-- 044_add_projects_holidays_scope.sql
-- Update holidays applies_to_type check constraint to include 'PROJECTS'
-- and refresh the postgREST schema cache to recognize new columns.

-- 1. Create the columns if they were somehow missed from migration 020
ALTER TABLE public.holidays 
ADD COLUMN IF NOT EXISTS applies_to_type TEXT NOT NULL DEFAULT 'ALL';

ALTER TABLE public.holidays 
ADD COLUMN IF NOT EXISTS applies_to_roles TEXT[] DEFAULT '{}';

-- 2. Drop existing constraint if it exists
ALTER TABLE public.holidays
DROP CONSTRAINT IF EXISTS holidays_applies_to_type_check;

-- 3. Add updated constraint
ALTER TABLE public.holidays
ADD CONSTRAINT holidays_applies_to_type_check 
CHECK (applies_to_type IN ('ALL', 'ROLES', 'PROJECTS'));

-- 4. Recreate the view so it captures the new columns (PostgreSQL SELECT * binds at creation)
DROP VIEW IF EXISTS public.holidays_with_affected_count;

CREATE VIEW public.holidays_with_affected_count AS
SELECT 
  h.*,
  public.get_time_off_affected_count(h.applies_to, h.team) as computed_affected_count
FROM public.holidays h;

-- Re-grant permissions since we dropped the view
GRANT SELECT ON public.holidays_with_affected_count TO authenticated;

-- 5. Reload schema cache for PostgREST to see new columns locally
NOTIFY pgrst, 'reload schema';
