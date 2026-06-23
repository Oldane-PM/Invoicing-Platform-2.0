-- Migration 061: Add in-app notifications triggers for work orders and W-8BEN forms

-- 1. Alter notifications table to make submission_id nullable and add new foreign keys
ALTER TABLE public.notifications ALTER COLUMN submission_id DROP NOT NULL;

-- Add new nullable foreign keys if they don't exist
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES public.system_work_orders(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS w8ben_id UUID REFERENCES public.w8ben_forms(id) ON DELETE CASCADE;

-- 2. Drop and recreate check constraint on event_type to support 'work_order_sent' and 'w8ben_uploaded'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_event_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_event_type_check CHECK (event_type IN (
  'submitted',
  'approved',
  'rejected',
  'needs_clarification',
  'resubmitted',
  'manager_approved',
  'manager_rejected',
  'paid',
  'work_order_sent',
  'w8ben_uploaded'
));

-- 3. Create trigger function and trigger for work orders
CREATE OR REPLACE FUNCTION public.create_work_order_notifications()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contractor_id UUID;
  v_role TEXT;
BEGIN
  -- Only trigger if status is PENDING_CONTRACTOR_SIGNATURE
  -- and it's either an INSERT or the status has changed
  IF NEW.status = 'PENDING_CONTRACTOR_SIGNATURE' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Get contractor ID (which is auth.users ID, referencing profiles.id)
    v_contractor_id := NEW.contractor_user_id;
    v_role := NEW.role;
    
    INSERT INTO public.notifications (recipient_user_id, recipient_role, work_order_id, event_type, message)
    VALUES (
      v_contractor_id,
      'contractor',
      NEW.id,
      'work_order_sent',
      'A new work order for role "' || COALESCE(v_role, 'Contractor') || '" has been sent to you for your signature.'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_order_status_change_notifications ON public.system_work_orders;

CREATE TRIGGER work_order_status_change_notifications
  AFTER INSERT OR UPDATE OF status ON public.system_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_work_order_notifications();

GRANT EXECUTE ON FUNCTION public.create_work_order_notifications() TO authenticated;

-- 4. Create trigger function and trigger for W-8BEN uploads
CREATE OR REPLACE FUNCTION public.create_w8ben_notifications()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contractor_id UUID;
  v_contractor_name TEXT;
  v_mgr_id UUID;
  v_admin_user RECORD;
BEGIN
  -- Only trigger if status is 'submitted' and it's either an INSERT or the status has changed
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Convert contractor_user_id from TEXT to UUID
    v_contractor_id := NEW.contractor_user_id::uuid;
    
    -- Get contractor name
    SELECT full_name INTO v_contractor_name
    FROM public.profiles
    WHERE id = v_contractor_id;
    
    -- Get manager ID from manager_teams
    BEGIN
      SELECT manager_id INTO v_mgr_id
      FROM public.manager_teams
      WHERE contractor_id = v_contractor_id
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_mgr_id := NULL;
    END;
    
    -- Notify all Admins
    FOR v_admin_user IN 
      SELECT id FROM public.profiles WHERE role ILIKE 'admin'
    LOOP
      INSERT INTO public.notifications (recipient_user_id, recipient_role, w8ben_id, event_type, message)
      VALUES (
        v_admin_user.id,
        'admin',
        NEW.id,
        'w8ben_uploaded',
        'Contractor ' || COALESCE(v_contractor_name, 'Contractor') || ' has uploaded a new W-8BEN tax form.'
      );
    END LOOP;
    
    -- Notify Manager (if contractor has a manager)
    IF v_mgr_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, recipient_role, w8ben_id, event_type, message)
      VALUES (
        v_mgr_id,
        'manager',
        NEW.id,
        'w8ben_uploaded',
        'Contractor ' || COALESCE(v_contractor_name, 'Contractor') || ' has uploaded a new W-8BEN tax form.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS w8ben_submission_notifications ON public.w8ben_forms;

CREATE TRIGGER w8ben_submission_notifications
  AFTER INSERT OR UPDATE OF status ON public.w8ben_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.create_w8ben_notifications();

GRANT EXECUTE ON FUNCTION public.create_w8ben_notifications() TO authenticated;
