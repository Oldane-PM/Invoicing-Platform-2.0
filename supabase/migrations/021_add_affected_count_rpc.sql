-- Add RPC function to calculate affected contractor count for time-off entries
-- This function computes how many contractors are affected based on scope type

-- Function to get affected contractor count
-- Works with both 'All'/'Contractors'/'Employees' (old schema) and 'ALL'/'ROLES' (new schema)
CREATE OR REPLACE FUNCTION public.get_time_off_affected_count(
  p_applies_to TEXT,
  p_team TEXT[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Handle both old and new schema values
  IF p_applies_to IN ('All', 'ALL') THEN
    -- Count all contractors (users with role = 'CONTRACTOR')
    SELECT COUNT(*) INTO v_count
    FROM public.profiles
    WHERE role = 'CONTRACTOR';
  ELSIF p_applies_to = 'Contractors' THEN
    -- Count only contractors
    SELECT COUNT(*) INTO v_count
    FROM public.profiles
    WHERE role = 'CONTRACTOR';
  ELSIF p_applies_to = 'Employees' THEN
    -- For employees, return 0 as this scope doesn't apply to contractors
    v_count := 0;
  ELSIF p_applies_to = 'ROLES' THEN
    -- Role-based scope (from new schema if migration 020 is applied)
    -- If no team/roles specified, return 0
    IF p_team IS NULL OR array_length(p_team, 1) IS NULL THEN
      v_count := 0;
    ELSE
      -- For role-based matching, count all contractors (approximation)
      SELECT COUNT(*) INTO v_count
      FROM public.profiles
      WHERE role = 'CONTRACTOR';
    END IF;
  ELSE
    v_count := 0;
  END IF;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_time_off_affected_count(TEXT, TEXT[]) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_time_off_affected_count IS 
  'Calculates the number of contractors affected by a time-off entry based on applies_to scope';

-- Create a view that includes affected count for each holiday
-- Uses the applies_to column from the base holidays table (migration 017)
CREATE OR REPLACE VIEW public.holidays_with_affected_count AS
SELECT 
  h.*,
  public.get_time_off_affected_count(h.applies_to, h.team) as computed_affected_count
FROM public.holidays h;

-- Grant select on the view
GRANT SELECT ON public.holidays_with_affected_count TO authenticated;

-- Add comment
COMMENT ON VIEW public.holidays_with_affected_count IS 
  'Holidays view with computed affected contractor count based on applies_to scope';
