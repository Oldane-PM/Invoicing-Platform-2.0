-- Create holidays table for Admin Calendar
-- This table stores holidays and special time off entries

-- Drop table if exists (for clean re-run)
DROP TABLE IF EXISTS public.holidays CASCADE;

-- Create the table
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  country TEXT,
  team_id UUID,
  applies_to_all_teams BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.holidays IS 'Holidays and special time off that affect employee submissions';
COMMENT ON COLUMN public.holidays.name IS 'Name of the holiday or time off';
COMMENT ON COLUMN public.holidays.date IS 'Date of the holiday';
COMMENT ON COLUMN public.holidays.country IS 'Country this holiday applies to (optional)';
COMMENT ON COLUMN public.holidays.team_id IS 'Specific team this applies to (optional)';
COMMENT ON COLUMN public.holidays.applies_to_all_teams IS 'Whether this applies to all teams';

-- Create index for date queries
CREATE INDEX idx_holidays_date ON public.holidays(date);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can manage holidays"
  ON public.holidays
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert sample data for testing
INSERT INTO public.holidays (name, date, applies_to_all_teams) 
VALUES
  ('New Year''s Day 2026', '2026-01-01', true),
  ('Martin Luther King Jr. Day', '2026-01-19', true),
  ('Presidents'' Day', '2026-02-16', true);
