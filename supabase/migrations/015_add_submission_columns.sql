-- Add missing columns to submissions table
-- This migration adds columns needed for the submission workflow

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS work_period TEXT,
ADD COLUMN IF NOT EXISTS regular_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_description TEXT,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS clarification_message TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id);

-- Add comments
COMMENT ON COLUMN public.submissions.project_name IS 'Name of the project for this submission';
COMMENT ON COLUMN public.submissions.description IS 'Description of work completed';
COMMENT ON COLUMN public.submissions.work_period IS 'Work period in YYYY-MM format';
COMMENT ON COLUMN public.submissions.regular_hours IS 'Regular hours worked';
COMMENT ON COLUMN public.submissions.overtime_hours IS 'Overtime hours worked';
COMMENT ON COLUMN public.submissions.overtime_description IS 'Description of overtime work';
COMMENT ON COLUMN public.submissions.total_amount IS 'Total amount for this submission';
COMMENT ON COLUMN public.submissions.rejection_reason IS 'Reason for rejection if status is rejected';
COMMENT ON COLUMN public.submissions.clarification_message IS 'Message requesting clarification';
COMMENT ON COLUMN public.submissions.approved_by IS 'User who approved this submission';
COMMENT ON COLUMN public.submissions.rejected_by IS 'User who rejected this submission';
