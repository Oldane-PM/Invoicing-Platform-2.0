-- Complete notification trigger function with correct workflow
-- Workflow: Contractor → Manager → Admin
-- Run this entire file in Supabase SQL Editor

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
    IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'submitted') THEN
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
    IF (NEW.status = 'approved' OR NEW.status = 'rejected') AND (TG_OP = 'INSERT' OR (OLD.status != 'approved' AND OLD.status != 'rejected')) THEN
      FOR admin_user IN 
        SELECT id FROM public.profiles WHERE role = 'ADMIN'
      LOOP
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          admin_user.id,
          'admin',
          NEW.id,
          NEW.status,
          'Submission ' || NEW.status || ' by ' || COALESCE(manager_name, 'manager') || ' for ' || COALESCE(contractor_name, 'contractor') || '.'
        );
      END LOOP;
    END IF;

    -- Contractor: Submission approved
    IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status != 'approved') THEN
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
    IF NEW.status = 'rejected' AND (TG_OP = 'INSERT' OR OLD.status != 'rejected') THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        contractor_id,
        'contractor',
        NEW.id,
        'rejected',
        'Your timesheet was rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided.')
      );
    END IF;

    -- Contractor: Clarification requested (Admin → Contractor)
    IF NEW.status = 'needs_clarification' AND (TG_OP = 'INSERT' OR OLD.status != 'needs_clarification') THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        contractor_id,
        'contractor',
        NEW.id,
        'needs_clarification',
        'Clarification requested on your submission. ' || COALESCE(NEW.clarification_message, 'Please review and resubmit.')
      );
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't block the insert/update
      RAISE WARNING 'Error in create_submission_notifications: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS submission_status_change_notifications ON public.submissions;

CREATE TRIGGER submission_status_change_notifications
  AFTER INSERT OR UPDATE OF status ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_submission_notifications();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_submission_notifications() TO authenticated;
