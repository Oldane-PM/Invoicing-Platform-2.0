-- Add role-based scope fields to holidays table
-- This allows time-off entries to be applied to ALL employees or specific ROLES

-- Add applies_to_type column (enum-like constraint)
ALTER TABLE public.holidays 
ADD COLUMN IF NOT EXISTS applies_to_type TEXT NOT NULL DEFAULT 'ALL';

-- Add applies_to_roles column (array of role strings)
ALTER TABLE public.holidays 
ADD COLUMN IF NOT EXISTS applies_to_roles TEXT[] DEFAULT '{}';

-- Add check constraint to ensure valid applies_to_type values
ALTER TABLE public.holidays
DROP CONSTRAINT IF EXISTS holidays_applies_to_type_check;

ALTER TABLE public.holidays
ADD CONSTRAINT holidays_applies_to_type_check 
CHECK (applies_to_type IN ('ALL', 'ROLES'));

-- Add comments for documentation
COMMENT ON COLUMN public.holidays.applies_to_type IS 'Scope type: ALL = all employees, ROLES = specific roles only';
COMMENT ON COLUMN public.holidays.applies_to_roles IS 'Array of role strings this time-off applies to (only used when applies_to_type = ROLES)';

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_holidays_applies_to_type ON public.holidays(applies_to_type);
CREATE INDEX IF NOT EXISTS idx_holidays_applies_to_roles ON public.holidays USING GIN(applies_to_roles);

-- Update existing data to use new schema (set ALL for existing entries)
UPDATE public.holidays 
SET applies_to_type = 'ALL', applies_to_roles = '{}'
WHERE applies_to_type IS NULL OR applies_to_type = '';

-- Add read access for contractors to check time-off that applies to them
-- (They need to read holidays to know which days are blocked)
DROP POLICY IF EXISTS "Contractors can read applicable holidays" ON public.holidays;

CREATE POLICY "Contractors can read applicable holidays"
  ON public.holidays
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('CONTRACTOR', 'MANAGER', 'admin')
    )
  );
