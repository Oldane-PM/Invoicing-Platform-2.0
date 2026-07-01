-- Migration 065: Add invoice_reminder event type to notifications constraint
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
  'w8ben_uploaded',
  'invoice_reminder'
));
