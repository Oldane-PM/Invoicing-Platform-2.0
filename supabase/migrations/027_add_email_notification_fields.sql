-- =====================================================
-- Migration: Add Email Delivery Fields to Notifications
-- =====================================================
-- Adds columns to track email delivery status for each in-app notification.
-- Backend worker uses service role to update these fields.

-- =====================================================
-- 1. ADD EMAIL DELIVERY COLUMNS
-- =====================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'PENDING';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_error TEXT;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Add check constraint for email_status (separate statement for IF NOT EXISTS workaround)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_email_status_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_email_status_check
      CHECK (email_status IN ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED'));
  END IF;
END $$;

-- =====================================================
-- 2. ADD INDEXES FOR EMAIL PROCESSING
-- =====================================================

-- Index for worker polling: efficiently find pending notifications
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending 
  ON public.notifications(email_status, created_at) 
  WHERE email_status = 'PENDING';

-- Index for email_status queries
CREATE INDEX IF NOT EXISTS idx_notifications_email_status 
  ON public.notifications(email_status, created_at);

-- Unique index for deduplication (prevents duplicate notifications for same event)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe 
  ON public.notifications(recipient_user_id, dedupe_key) 
  WHERE dedupe_key IS NOT NULL;

-- =====================================================
-- 3. ADD COMMENTS
-- =====================================================

COMMENT ON COLUMN public.notifications.email_enabled IS 'Whether to send email for this notification';
COMMENT ON COLUMN public.notifications.email_status IS 'Email delivery status: PENDING, SENDING, SENT, FAILED, SKIPPED';
COMMENT ON COLUMN public.notifications.email_error IS 'Error message if email delivery failed';
COMMENT ON COLUMN public.notifications.emailed_at IS 'Timestamp when email was successfully sent';
COMMENT ON COLUMN public.notifications.action_url IS 'Optional URL for user action in email';
COMMENT ON COLUMN public.notifications.dedupe_key IS 'Optional key to prevent duplicate notifications (e.g., SUBMISSION_APPROVED:uuid)';

-- =====================================================
-- 4. RLS POLICIES (Service role bypasses RLS)
-- =====================================================
-- Note: The backend uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- No additional policies needed for email field updates.
-- Users can still only SELECT their own notifications (existing policy).
-- Users can only UPDATE is_read on their own notifications (existing policy).
