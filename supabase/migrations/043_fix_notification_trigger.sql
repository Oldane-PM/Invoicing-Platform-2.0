-- Migration 043: Fix Notification Trigger Constraints & Joins

-- 1. Drop the restrictive event_type constraint that blocks 'paid' notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_event_type_check;

-- Add it back with the correctly expanded list
ALTER TABLE public.notifications ADD CONSTRAINT notifications_event_type_check 
  CHECK (event_type IN (
    'submitted',
    'approved',
    'rejected',
    'needs_clarification',
    'resubmitted',
    'manager_approved',
    'manager_rejected',
    'paid'
  ));

-- 2. Update trigger to query from manager_teams instead of deprecated contracts table
CREATE OR REPLACE FUNCTION public.create_submission_notifications()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  contractor_id UUID;
  contractor_name TEXT;
  mgr_id UUID;
  mgr_name TEXT;
  period_month TEXT;
  admin_user RECORD;
  action_word TEXT;
BEGIN
  -- Wrap in exception handler to prevent blocking inserts
  BEGIN
    -- Only process status changes on UPDATE
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;

    -- Get contractor details
    SELECT 
      s.contractor_user_id,
      cp.full_name,
      TO_CHAR(s.period_start, 'Month YYYY')
    INTO 
      contractor_id,
      contractor_name,
      period_month
    FROM public.submissions s
    JOIN public.profiles cp ON s.contractor_user_id = cp.id
    WHERE s.id = NEW.id;

    -- Safely get manager details using manager_teams
    BEGIN
      SELECT mt.manager_id, mp.full_name
      INTO mgr_id, mgr_name
      FROM public.manager_teams mt
      JOIN public.profiles mp ON mt.manager_id = mp.id
      WHERE mt.contractor_id = contractor_id
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        mgr_id := NULL;
        mgr_name := NULL;
    END;

    -- Manager: New submission from contractor (initial submission)
    IF (NEW.status = 'submitted' OR NEW.status = 'PENDING_MANAGER') AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR (OLD.status != 'submitted' AND OLD.status != 'PENDING_MANAGER')) THEN
      -- Only notify manager if one exists
      IF mgr_id IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          mgr_id,
          'manager',
          NEW.id,
          'submitted',
          'New submission received from ' || COALESCE(contractor_name, 'contractor') || '.'
        );
      END IF;
    END IF;

    -- Admin: Manager approved/rejected submission
    IF ((NEW.status = 'approved' OR NEW.status = 'AWAITING_ADMIN_PAYMENT') OR (NEW.status = 'rejected' OR NEW.status = 'REJECTED_CONTRACTOR')) AND (TG_OP = 'INSERT' OR (OLD.status != NEW.status)) THEN
      
      IF (NEW.status = 'approved' OR NEW.status = 'AWAITING_ADMIN_PAYMENT') THEN
        action_word := 'approved';
      ELSE
        action_word := 'rejected';
      END IF;

      FOR admin_user IN 
        SELECT id FROM public.profiles WHERE role ILIKE 'admin'
      LOOP
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          admin_user.id,
          'admin',
          NEW.id,
          action_word,
          'Submission ' || action_word || ' by ' || COALESCE(mgr_name, 'manager') || ' for ' || COALESCE(contractor_name, 'contractor') || '.'
        );
      END LOOP;
    END IF;

    -- Contractor: Submission approved (Awaiting Payment)
    IF (NEW.status = 'approved' OR NEW.status = 'AWAITING_ADMIN_PAYMENT') AND (TG_OP = 'INSERT' OR OLD.status != NEW.status) THEN
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
    IF (NEW.status = 'rejected' OR NEW.status = 'REJECTED_CONTRACTOR') AND (TG_OP = 'INSERT' OR OLD.status != NEW.status) THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        contractor_id,
        'contractor',
        NEW.id,
        'rejected',
        'Your timesheet was rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided.')
      );
    END IF;

    -- Contractor: Clarification requested
    IF (NEW.status = 'needs_clarification' OR NEW.status = 'CLARIFICATION_REQUESTED') AND (TG_OP = 'INSERT' OR OLD.status != NEW.status) THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        contractor_id,
        'contractor',
        NEW.id,
        'needs_clarification',
        'Clarification requested on your submission. ' || COALESCE(NEW.clarification_message, 'Please review and resubmit.')
      );
    END IF;

    -- Contractor & Manager: Submission Paid
    IF (NEW.status = 'paid' OR NEW.status = 'PAID') AND (TG_OP = 'INSERT' OR OLD.status != NEW.status) THEN
      -- Notify Contractor
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        contractor_id,
        'contractor',
        NEW.id,
        'paid',
        'Your timesheet for ' || COALESCE(period_month, 'the period') || ' has been paid!'
      );
      
      -- Notify Manager
      IF mgr_id IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          mgr_id,
          'manager',
          NEW.id,
          'paid',
          'Invoice for ' || COALESCE(contractor_name, 'contractor') || ' (' || COALESCE(period_month, 'the period') || ') has been marked as paid.'
        );
      END IF;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't block the insert/update
      RAISE WARNING 'Error in create_submission_notifications: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
