-- ==============================================================================
-- ZEC CAMPUS HUB — CENTRAL NOTIFICATION & EMAIL AUTOMATION SYSTEM
-- ZERO EXCLUSION CARBON POVERTY - Campus Club ISIMS
-- Migration: 20261030000002_notifications_and_email_automation.sql
-- ==============================================================================

-- Helper function for bureau or admin check
CREATE OR REPLACE FUNCTION public.is_bureau_or_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin(user_uuid) OR public.is_bureau(user_uuid);
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Extend notifications table with production fields
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'system_alerts',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS related_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS related_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS destination_url TEXT NOT NULL DEFAULT '/',
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill / sync existing rows
UPDATE public.notifications
SET 
  recipient_user_id = COALESCE(recipient_user_id, recipient_id),
  description = COALESCE(description, body),
  related_entity_type = COALESCE(related_entity_type, target_type),
  related_entity_id = COALESCE(related_entity_id, target_id::text),
  is_read = CASE WHEN read_at IS NOT NULL THEN TRUE ELSE is_read END
WHERE recipient_user_id IS NULL OR description IS NULL;

-- Trigger to maintain column synchronization and read status
CREATE OR REPLACE FUNCTION public.sync_notifications_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recipient_user_id IS NOT NULL AND NEW.recipient_id IS NULL THEN
    NEW.recipient_id := NEW.recipient_user_id;
  ELSIF NEW.recipient_id IS NOT NULL AND NEW.recipient_user_id IS NULL THEN
    NEW.recipient_user_id := NEW.recipient_id;
  END IF;

  IF NEW.description IS NOT NULL AND NEW.body IS NULL THEN
    NEW.body := NEW.description;
  ELSIF NEW.body IS NOT NULL AND NEW.description IS NULL THEN
    NEW.description := NEW.body;
  END IF;

  IF NEW.related_entity_type IS NOT NULL AND NEW.target_type IS NULL THEN
    NEW.target_type := NEW.related_entity_type;
  END IF;

  IF NEW.is_read = TRUE AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
  ELSIF NEW.read_at IS NOT NULL THEN
    NEW.is_read := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_notifications ON public.notifications;
CREATE TRIGGER trg_sync_notifications
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.sync_notifications_columns();

-- Update indexes on notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON public.notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Update RLS for notifications
DROP POLICY IF EXISTS "Notifications viewable and manageable strictly by recipient" ON public.notifications;
CREATE POLICY "Notifications viewable and manageable strictly by recipient"
ON public.notifications FOR ALL
TO authenticated
USING (auth.uid() = recipient_id OR auth.uid() = recipient_user_id)
WITH CHECK (auth.uid() = recipient_id OR auth.uid() = recipient_user_id);

-- Allow service role and admins to insert system notifications
DROP POLICY IF EXISTS "Service and bureau can insert notifications" ON public.notifications;
CREATE POLICY "Service and bureau can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  public.is_bureau_or_admin(auth.uid()) OR auth.uid() = recipient_id OR auth.uid() = recipient_user_id
);

-- 2. Member Email Preferences Table
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  meeting_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  task_emails_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  event_emails_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  announcement_emails_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own email preferences" ON public.email_preferences;
CREATE POLICY "Users view their own email preferences"
ON public.email_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_bureau_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users manage their own email preferences" ON public.email_preferences;
CREATE POLICY "Users manage their own email preferences"
ON public.email_preferences FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON public.email_preferences(user_id);

-- 3. Scheduled Email Reminders Table
CREATE TABLE IF NOT EXISTS public.scheduled_email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('48h', 'morning_8am', '1h', 'urgent', 'cancellation', 'reschedule')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  idempotency_key TEXT UNIQUE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_email_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bureau and admin can view scheduled reminders" ON public.scheduled_email_reminders;
CREATE POLICY "Bureau and admin can view scheduled reminders"
ON public.scheduled_email_reminders FOR SELECT
TO authenticated
USING (public.is_bureau_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Bureau and admin can manage scheduled reminders" ON public.scheduled_email_reminders;
CREATE POLICY "Bureau and admin can manage scheduled reminders"
ON public.scheduled_email_reminders FOR ALL
TO authenticated
USING (public.is_bureau_or_admin(auth.uid()))
WITH CHECK (public.is_bureau_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status_time ON public.scheduled_email_reminders(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_meeting ON public.scheduled_email_reminders(meeting_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_idempotency ON public.scheduled_email_reminders(idempotency_key);

-- 4. Email Delivery Logs Table
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES public.scheduled_email_reminders(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  provider_message_id TEXT,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'bounced', 'simulated')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bureau and admin can view email delivery logs" ON public.email_delivery_logs;
CREATE POLICY "Bureau and admin can view email delivery logs"
ON public.email_delivery_logs FOR SELECT
TO authenticated
USING (public.is_bureau_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_recipient ON public.email_delivery_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_meeting ON public.email_delivery_logs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_created_at ON public.email_delivery_logs(created_at DESC);

-- 5. Function to atomically claim pending email reminders
CREATE OR REPLACE FUNCTION public.claim_pending_reminders(p_batch_size INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  meeting_id UUID,
  recipient_user_id UUID,
  reminder_type TEXT,
  scheduled_at TIMESTAMPTZ,
  idempotency_key TEXT,
  attempts INT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.scheduled_email_reminders AS r
  SET 
    status = 'processing',
    last_attempt_at = now(),
    attempts = r.attempts + 1,
    updated_at = now()
  WHERE r.id IN (
    SELECT sub.id
    FROM public.scheduled_email_reminders sub
    WHERE sub.status = 'pending'
      AND sub.scheduled_at <= now()
    ORDER BY sub.scheduled_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING r.id, r.meeting_id, r.recipient_user_id, r.reminder_type, r.scheduled_at, r.idempotency_key, r.attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable Realtime on notifications for instant client updates
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- already added
  END;
END $$;
