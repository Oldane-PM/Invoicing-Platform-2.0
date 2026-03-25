-- Migration 048: Fix Variable Ambiguity
-- In PL/pgSQL, if a variable has the exact same name as a column (like contractor_id),
-- the column takes precedence. This caused the manager query to return the wrong manager.
-- Renaming variables with a v_ prefix resolves this conflict.

CREATE OR REPLACE FUNCTION public.create_submission_notifications()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contractor_id UUID;
  v_contractor_name TEXT;
  v_mgr_id UUID;
  v_mgr_name TEXT;
  v_period_month TEXT;
  v_admin_user RECORD;
  v_action_word TEXT;
  v_old_status TEXT;
  v_old_paid_at TIMESTAMPTZ;
BEGIN
  -- Wrap back in exception handler so we don't break production actions
  BEGIN
    -- Safely get old status and old paid_at for UPDATE vs INSERT
    IF TG_OP = 'UPDATE' THEN
      v_old_status := OLD.status::text;
      v_old_paid_at := OLD.paid_at;
    ELSE
      v_old_status := NULL;
      v_old_paid_at := NULL;
    END IF;

    -- Only process if status changed OR paid_at changed
    IF TG_OP = 'UPDATE' AND v_old_status IS NOT DISTINCT FROM NEW.status::text AND v_old_paid_at IS NOT DISTINCT FROM NEW.paid_at THEN
      RETURN NEW;
    END IF;

    -- Get contractor details directly from profiles
    v_contractor_id := NEW.contractor_user_id;
    
    SELECT full_name
    INTO v_contractor_name
    FROM public.profiles
    WHERE id = v_contractor_id;

    -- Format work period for display (if missing, defaults to 'the period')
    v_period_month := NEW.work_period;

    -- Safely get manager details using manager_teams
    BEGIN
      SELECT mt.manager_id, mp.full_name
      INTO v_mgr_id, v_mgr_name
      FROM public.manager_teams mt
      JOIN public.profiles mp ON mt.manager_id = mp.id
      WHERE mt.contractor_id = v_contractor_id
      LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
          v_mgr_id := NULL;
          v_mgr_name := NULL;
    END;

    -- Manager: New submission from contractor (initial submission)
    IF (NEW.status::text = 'submitted' OR NEW.status::text = 'PENDING_MANAGER') AND (TG_OP = 'INSERT' OR v_old_status IS NULL OR (v_old_status != 'submitted' AND v_old_status != 'PENDING_MANAGER')) THEN
      -- Only notify manager if one exists
      IF v_mgr_id IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          v_mgr_id,
          'manager',
          NEW.id,
          'submitted',
          'New submission received from ' || COALESCE(v_contractor_name, 'contractor') || '.'
        );
      END IF;
    END IF;

    -- Admin: Manager approved/rejected submission
    IF ((NEW.status::text = 'approved' OR NEW.status::text = 'AWAITING_ADMIN_PAYMENT') OR (NEW.status::text = 'rejected' OR NEW.status::text = 'REJECTED_CONTRACTOR')) AND (TG_OP = 'INSERT' OR (v_old_status != NEW.status::text)) THEN
      
      IF (NEW.status::text = 'approved' OR NEW.status::text = 'AWAITING_ADMIN_PAYMENT') THEN
        v_action_word := 'approved';
      ELSE
        v_action_word := 'rejected';
      END IF;

      FOR v_admin_user IN 
        SELECT id FROM public.profiles WHERE role ILIKE 'admin'
      LOOP
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          v_admin_user.id,
          'admin',
          NEW.id,
          v_action_word,
          'Submission ' || v_action_word || ' by ' || COALESCE(v_mgr_name, 'manager') || ' for ' || COALESCE(v_contractor_name, 'contractor') || '.'
        );
      END LOOP;
    END IF;

    -- Contractor: Submission approved (Awaiting Payment)
    IF (NEW.status::text = 'approved' OR NEW.status::text = 'AWAITING_ADMIN_PAYMENT') AND (TG_OP = 'INSERT' OR v_old_status != NEW.status::text) THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        v_contractor_id,
        'contractor',
        NEW.id,
        'approved',
        'Your timesheet for ' || COALESCE(v_period_month, 'the period') || ' has been approved.'
      );
    END IF;

    -- Contractor: Submission rejected
    IF (NEW.status::text = 'rejected' OR NEW.status::text = 'REJECTED_CONTRACTOR') AND (TG_OP = 'INSERT' OR v_old_status != NEW.status::text) THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        v_contractor_id,
        'contractor',
        NEW.id,
        'rejected',
        'Your timesheet was rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided.')
      );
    END IF;

    -- Clarification requested
    IF (NEW.status::text = 'needs_clarification' OR NEW.status::text = 'CLARIFICATION_REQUESTED') AND (TG_OP = 'INSERT' OR v_old_status != NEW.status::text) THEN
      
      -- Notify Contractor
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        v_contractor_id,
        'contractor',
        NEW.id,
        'needs_clarification',
        'Clarification requested on your submission. ' || COALESCE(NEW.clarification_message, 'Please review and resubmit.')
      );

      -- Notify Manager
      IF v_mgr_id IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          v_mgr_id,
          'manager',
          NEW.id,
          'needs_clarification',
          'Admin requested clarification on ' || COALESCE(v_contractor_name, 'contractor') || '''s submission.'
        );
      END IF;
    END IF;

    -- Contractor & Manager: Submission Paid
    IF NEW.paid_at IS NOT NULL AND (TG_OP = 'INSERT' OR v_old_paid_at IS NULL) THEN
      -- Notify Contractor
      INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
      VALUES (
        v_contractor_id,
        'contractor',
        NEW.id,
        'paid',
        'Your timesheet for ' || COALESCE(v_period_month, 'the period') || ' has been paid!'
      );
      
      -- Notify Manager
      IF v_mgr_id IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_user_id, recipient_role, submission_id, event_type, message)
        VALUES (
          v_mgr_id,
          'manager',
          NEW.id,
          'paid',
          'Invoice for ' || COALESCE(v_contractor_name, 'contractor') || ' (' || COALESCE(v_period_month, 'the period') || ') has been marked as paid.'
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
