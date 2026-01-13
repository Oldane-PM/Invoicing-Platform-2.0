-- Create notifications system for in-app notifications
-- This migration creates the notifications table, RLS policies, and trigger function
-- that automatically generates notifications when submission statuses change

-- =====================================================
-- 1. CREATE NOTIFICATIONS TABLE
-- =====================================================

-- Drop existing table if it exists (to handle schema changes)
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('admin', 'manager', 'contractor')),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'submitted',
    'approved',
    'rejected',
    'needs_clarification',
    'resubmitted',
    'manager_approved',
    'manager_rejected'
  )),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read 
  ON public.notifications(recipient_user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_submission 
  ON public.notifications(submission_id);

-- Add comments
COMMENT ON TABLE public.notifications IS 'In-app notifications for submission status changes';
COMMENT ON COLUMN public.notifications.recipient_user_id IS 'User who receives this notification';
COMMENT ON COLUMN public.notifications.recipient_role IS 'Role of the recipient (for filtering)';
COMMENT ON COLUMN public.notifications.submission_id IS 'Related submission';
COMMENT ON COLUMN public.notifications.event_type IS 'Type of event that triggered the notification';
COMMENT ON COLUMN public.notifications.message IS 'Notification message text';
COMMENT ON COLUMN public.notifications.is_read IS 'Whether the notification has been read';

-- =====================================================
-- 2. ENABLE RLS AND CREATE POLICIES
-- =====================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON public.notifications
  FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Users can update is_read on their own notifications
CREATE POLICY "Users can mark their notifications as read"
  ON public.notifications
  FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- =====================================================
-- 3. CREATE NOTIFICATION GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_submission_notifications()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  contractor_id UUID;
  contractor_name TEXT;
  manager_id UUID;
  period_month TEXT;
  rejection_reason_text TEXT;
  clarification_msg TEXT;
  admin_user RECORD;
BEGIN
  -- Only process if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get submission details
  SELECT 
    s.contractor_user_id,
    au.full_name,
    TO_CHAR(s.period_start, 'Month YYYY'),
    s.rejection_reason,
    s.clarification_message
  INTO 
    contractor_id,
    contractor_name,
    period_month,
    rejection_reason_text,
    clarification_msg
  FROM public.submissions s
  JOIN public.profiles au ON s.contractor_user_id = au.id
  WHERE s.id = NEW.id;

  -- Try to get manager_id from contracts table if it exists
  BEGIN
    SELECT c.manager_user_id INTO manager_id
    FROM public.contracts c
    WHERE c.id = NEW.contract_id;
  EXCEPTION
    WHEN OTHERS THEN
      manager_id := NULL;
  END;

  -- =====================================================
  -- CONTRACTOR NOTIFICATIONS
  -- =====================================================
  
  -- Contractor: Submission approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
    VALUES (
      contractor_id,
      'contractor',
      NEW.id,
      'approved',
      'Your timesheet for ' || COALESCE(period_month, 'the period') || ' has been approved.'
    );
  END IF;

  -- Contractor: Submission rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
    VALUES (
      contractor_id,
      'contractor',
      NEW.id,
      'rejected',
      'Your timesheet was rejected. Reason: ' || COALESCE(rejection_reason_text, 'No reason provided.')
    );
  END IF;

  -- Contractor: Clarification requested
  IF NEW.status = 'needs_clarification' AND OLD.status != 'needs_clarification' THEN
    INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
    VALUES (
      contractor_id,
      'contractor',
      NEW.id,
      'needs_clarification',
      'Clarification requested on your submission. ' || COALESCE(clarification_msg, '')
    );
  END IF;

  -- =====================================================
  -- MANAGER NOTIFICATIONS
  -- =====================================================
  
  -- Manager: New submission from contractor
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    IF manager_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        manager_id,
        'manager',
        NEW.id,
        'submitted',
        'New submission received from ' || COALESCE(contractor_name, 'contractor') || '.'
      );
    END IF;
  END IF;

  -- Manager: Admin requested clarification
  IF NEW.status = 'needs_clarification' AND OLD.status != 'needs_clarification' THEN
    IF manager_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        manager_id,
        'manager',
        NEW.id,
        'needs_clarification',
        'Admin requested clarification on ' || COALESCE(contractor_name, 'contractor') || '''s submission.'
      );
    END IF;
  END IF;

  -- Manager: Admin approved submission
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF manager_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        manager_id,
        'manager',
        NEW.id,
        'approved',
        'Submission for ' || COALESCE(contractor_name, 'contractor') || ' has been approved.'
      );
    END IF;
  END IF;

  -- Manager: Admin rejected submission
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    IF manager_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        manager_id,
        'manager',
        NEW.id,
        'rejected',
        'Submission for ' || COALESCE(contractor_name, 'contractor') || ' has been rejected.'
      );
    END IF;
  END IF;

  -- =====================================================
  -- ADMIN NOTIFICATIONS
  -- =====================================================
  
  -- Admin: New submission (all admins)
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    FOR admin_user IN 
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        admin_user.id,
        'admin',
        NEW.id,
        'submitted',
        'New submission awaiting review from ' || COALESCE(contractor_name, 'contractor') || '.'
      );
    END LOOP;
  END IF;

  -- Admin: Resubmitted after clarification
  IF NEW.status = 'submitted' AND OLD.status = 'needs_clarification' THEN
    FOR admin_user IN 
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        admin_user.id,
        'admin',
        NEW.id,
        'resubmitted',
        'Updated submission received after clarification from ' || COALESCE(contractor_name, 'contractor') || '.'
      );
    END LOOP;
  END IF;

  -- Admin: Manager approved submission
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.approved_by IS NOT NULL THEN
    -- Check if approved_by is a manager
    IF EXISTS (SELECT 1 FROM public.app_users WHERE id = NEW.approved_by AND role = 'manager') THEN
      FOR admin_user IN 
        SELECT id FROM public.app_users WHERE role = 'admin'
      LOOP
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          admin_user.id,
          'admin',
          NEW.id,
          'manager_approved',
          'Submission approved by Manager for ' || COALESCE(contractor_name, 'contractor') || '.'
        );
      END LOOP;
    END IF;
  END IF;

  -- Admin: Manager rejected submission
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' AND NEW.rejected_by IS NOT NULL THEN
    -- Check if rejected_by is a manager
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.rejected_by AND role = 'manager') THEN
      FOR admin_user IN 
        SELECT id FROM public.profiles WHERE role = 'admin'
      LOOP
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          admin_user.id,
          'admin',
          NEW.id,
          'manager_rejected',
          'Submission rejected by Manager for ' || COALESCE(contractor_name, 'contractor') || '.'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. CREATE TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS submission_status_change_notifications ON public.submissions;

CREATE TRIGGER submission_status_change_notifications
  AFTER INSERT OR UPDATE OF status ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_submission_notifications();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute on function to authenticated users (trigger will run as SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.create_submission_notifications() TO authenticated;
