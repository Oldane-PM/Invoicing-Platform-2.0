-- Migration 045: Remove Exception Swallowing for Debugging
-- This migration removes the BEGIN..EXCEPTION block so that any PL/pgSQL
-- errors will surface in the frontend/console instead of failing silently.

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
  old_status TEXT;
  old_paid_at TIMESTAMPTZ;
BEGIN
  -- We removed the EXCEPTION block so that runtime errors will throw 500s 
  -- and become visible in the application logs or network tab.

  -- Safely get old status and old paid_at for UPDATE vs INSERT
  IF TG_OP = 'UPDATE' THEN
    old_status := OLD.status;
    old_paid_at := OLD.paid_at;
  ELSE
    old_status := NULL;
    old_paid_at := NULL;
  END IF;

  -- Only process if status changed OR paid_at changed
  IF TG_OP = 'UPDATE' AND old_status IS NOT DISTINCT FROM NEW.status AND old_paid_at IS NOT DISTINCT FROM NEW.paid_at THEN
    RETURN NEW;
  END IF;

  -- Get contractor details directly from profiles
  contractor_id := NEW.contractor_user_id;
  
  SELECT full_name
  INTO contractor_name
  FROM public.profiles
  WHERE id = contractor_id;

  -- Format work period for display (if missing, defaults to 'the period')
  period_month := NEW.work_period;

  -- Safely get manager details using manager_teams
  -- Using a tight block here just for NO_DATA_FOUND, though SELECT INTO doesn't throw strictly
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
  IF (NEW.status = 'submitted' OR NEW.status = 'PENDING_MANAGER') AND (TG_OP = 'INSERT' OR old_status IS NULL OR (old_status != 'submitted' AND old_status != 'PENDING_MANAGER')) THEN
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
  IF ((NEW.status = 'approved' OR NEW.status = 'AWAITING_ADMIN_PAYMENT') OR (NEW.status = 'rejected' OR NEW.status = 'REJECTED_CONTRACTOR')) AND (TG_OP = 'INSERT' OR (old_status != NEW.status)) THEN
    
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
  IF (NEW.status = 'approved' OR NEW.status = 'AWAITING_ADMIN_PAYMENT') AND (TG_OP = 'INSERT' OR old_status != NEW.status) THEN
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
  IF (NEW.status = 'rejected' OR NEW.status = 'REJECTED_CONTRACTOR') AND (TG_OP = 'INSERT' OR old_status != NEW.status) THEN
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
  IF (NEW.status = 'needs_clarification' OR NEW.status = 'CLARIFICATION_REQUESTED') AND (TG_OP = 'INSERT' OR old_status != NEW.status) THEN
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
  IF NEW.paid_at IS NOT NULL AND (TG_OP = 'INSERT' OR old_paid_at IS NULL) THEN
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

  RETURN NEW;
END;
$$;
