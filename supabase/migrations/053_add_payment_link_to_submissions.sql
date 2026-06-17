-- Add payment_link column to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS payment_link TEXT;

COMMENT ON COLUMN public.submissions.payment_link IS 'Optional payment link (e.g., Payoneer, PayPal, Wise) provided by the contractor';
