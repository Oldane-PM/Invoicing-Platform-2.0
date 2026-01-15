-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing holidays table and all dependencies
DROP TABLE IF EXISTS public.holidays CASCADE;

-- Create holidays table with correct schema
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  country TEXT[] DEFAULT ARRAY['all'],  -- 'all', 'us', 'uk', 'ca', 'au', 'jm'
  team TEXT[] DEFAULT ARRAY['all'],     -- 'all', 'engineering', 'design', 'marketing', 'operations'
  applies_to TEXT NOT NULL CHECK (applies_to IN ('All', 'Contractors', 'Employees')),
  affected_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can do everything on holidays"
  ON public.holidays
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Authenticated users can view holidays"
  ON public.holidays
  FOR SELECT
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
