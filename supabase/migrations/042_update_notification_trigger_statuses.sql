-- Migration: Update Notification Triggers to support new workflow statuses (AWAITING_ADMIN_PAYMENT, PAID, etc.)
-- Also fixes the case sensitivity issue where Admin role was hardcoded to 'ADMIN' preventing notifications.

CREATE OR REPLACE FUNCTION public.create_submission_notifications()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  contractor_id UUID;
  contractor_name TEXT;
  manager_id UUID;
  manager_name TEXT;
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

    -- Get contractor and manager details
    SELECT 
      s.contractor_user_id,
      cp.full_name,
      c.manager_user_id,
      mp.full_name,
      TO_CHAR(s.period_start, 'Month YYYY')
    INTO 
      contractor_id,
      contractor_name,
      manager_id,
      manager_name,
      period_month
    FROM public.submissions s
    JOIN public.profiles cp ON s.contractor_user_id = cp.id
    LEFT JOIN public.contracts c ON s.contract_id = c.id
    LEFT JOIN public.profiles mp ON c.manager_user_id = mp.id
    WHERE s.id = NEW.id;

    -- Manager: New submission from contractor (initial submission)
    IF (NEW.status = 'submitted' OR NEW.status = 'PENDING_MANAGER') AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR (OLD.status != 'submitted' AND OLD.status != 'PENDING_MANAGER')) THEN
      -- Only notify manager if one exists
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

    -- Admin: Manager approved/rejected submission
    IF ((NEW.status = 'approved' OR NEW.status = 'AWAITING_ADMIN_PAYMENT') OR (NEW.status = 'rejected' OR NEW.status = 'REJECTED_CONTRACTOR')) AND (TG_OP = 'INSERT' OR (OLD.status != NEW.status)) THEN
      
      IF (NEW.status = 'approved' OR NEW.status = 'AWAITING_ADMIN_PAYMENT') THEN
        action_word := 'approved';
      ELSE
        action_word := 'rejected';
      END IF;

      FOR admin_user IN 
        SELECT id FROM public.profiles WHERE role ILIKE 'admin' OR public.is_admin()
      LOOP
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          admin_user.id,
          'admin',
          NEW.id,
          action_word,
          'Submission ' || action_word || ' by ' || COALESCE(manager_name, 'manager') || ' for ' || COALESCE(contractor_name, 'contractor') || '.'
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
      IF manager_id IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          manager_id,
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
