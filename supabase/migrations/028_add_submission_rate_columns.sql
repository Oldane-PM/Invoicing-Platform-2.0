-- Add rate storage columns to submissions table
-- This ensures invoice totals always match submission totals by storing the rates used at submission time
-- BUSINESS RULE: Total = (regular_hours × regular_rate) + (overtime_hours × overtime_rate)

-- Add columns to store the rates used when calculating total_amount
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS regular_rate NUMERIC,
ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC,
ADD COLUMN IF NOT EXISTS rate_type TEXT DEFAULT 'hourly';

-- Add comments
COMMENT ON COLUMN public.submissions.regular_rate IS 'Hourly rate used to calculate total (stored at submission time for consistency)';
COMMENT ON COLUMN public.submissions.overtime_rate IS 'Overtime rate used to calculate total (stored at submission time for consistency)';
COMMENT ON COLUMN public.submissions.rate_type IS 'Type of rate: hourly or fixed';

-- Create an index on rate_type for filtering
CREATE INDEX IF NOT EXISTS idx_submissions_rate_type ON public.submissions(rate_type);

-- Note: Existing submissions will have NULL rates. These will use fallback to contractor's current rates.
-- New submissions will store the rates at the time of creation for guaranteed consistency.
