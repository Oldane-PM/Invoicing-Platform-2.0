-- Migration 049: Enable Realtime for Notifications
-- Adds public.notifications to the supabase_realtime publication 
-- so frontend clients can subscribe to live updates via WebSockets.

BEGIN;

-- Create publication if it doesn't exist (Supabase standard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add notifications table to the publication
-- This allows Supabase to broadcast INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMIT;
