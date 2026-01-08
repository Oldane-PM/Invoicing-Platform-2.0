-- Migration: Ensure ordering columns exist on submissions table
-- Run this in Supabase SQL Editor if you see 400 errors on order/filter

-- Ensure submitted_at exists (used for ordering)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Ensure created_at exists with default (for fallback ordering)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Create index on submitted_at for faster ordering
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at DESC);

-- Create index on contractor_user_id for filtering
CREATE INDEX IF NOT EXISTS idx_submissions_contractor_user_id ON public.submissions(contractor_user_id);

-- =============================================
-- IMPORTANT: After running this migration
-- =============================================
-- If you still get 400 errors, you may need to refresh Supabase's schema cache.
-- Options:
-- 1. Wait a few minutes for auto-refresh
-- 2. In Supabase Dashboard: Settings > API > Reload Schema Cache
-- 3. Restart your Supabase project (last resort)