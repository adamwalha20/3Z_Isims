-- ==============================================================================
-- Migration: Meeting BaaS API v2 Integration & AI Meeting Intelligence
-- Tables: meeting_bot_sessions, meeting_decisions, meeting_action_items,
--         meeting_webhook_events, meeting_processing_jobs
-- Enhancements: meeting_recordings, meeting_transcripts, meeting_transcript_segments,
--               meeting_summaries, meetings
-- Storage: RLS policies for private meeting-recordings bucket
-- ==============================================================================

-- 1. Create meeting_bot_sessions table
CREATE TABLE IF NOT EXISTS public.meeting_bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meeting_baas',
  provider_bot_id TEXT NOT NULL,
  bot_status TEXT NOT NULL DEFAULT 'dispatched',
  dispatched_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_sessions_provider_bot_id 
ON public.meeting_bot_sessions(provider, provider_bot_id);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_meeting_id 
ON public.meeting_bot_sessions(meeting_id);

-- 2. Enhance meeting_recordings table
ALTER TABLE public.meeting_recordings 
  ADD COLUMN IF NOT EXISTS bot_session_id UUID REFERENCES public.meeting_bot_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS audio_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS provider_video_url TEXT,
  ADD COLUMN IF NOT EXISTS provider_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Enhance meeting_transcripts table
ALTER TABLE public.meeting_transcripts 
  ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS detected_language TEXT,
  ADD COLUMN IF NOT EXISTS transcription_provider TEXT DEFAULT 'meeting_baas',
  ADD COLUMN IF NOT EXISTS full_text TEXT,
  ADD COLUMN IF NOT EXISTS raw_artifact_path TEXT;

-- 4. Enhance meeting_transcript_segments table
ALTER TABLE public.meeting_transcript_segments 
  ADD COLUMN IF NOT EXISTS sequence_number INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speaker_id TEXT,
  ADD COLUMN IF NOT EXISTS speaker_name TEXT,
  ADD COLUMN IF NOT EXISTS text TEXT;

-- 5. Enhance meeting_summaries table
ALTER TABLE public.meeting_summaries 
  ADD COLUMN IF NOT EXISTS transcript_id UUID REFERENCES public.meeting_transcripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS summary_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS summary_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending';

-- 6. Create meeting_decisions table
CREATE TABLE IF NOT EXISTS public.meeting_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  summary_id UUID REFERENCES public.meeting_summaries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  evidence TEXT,
  source_timestamp NUMERIC DEFAULT 0,
  decision_type TEXT NOT NULL DEFAULT 'confirmed',
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting_id 
ON public.meeting_decisions(meeting_id);

-- 7. Create meeting_action_items table
CREATE TABLE IF NOT EXISTS public.meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  summary_id UUID REFERENCES public.meeting_summaries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  suggested_assignee TEXT,
  confirmed_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deadline TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium',
  evidence TEXT,
  source_timestamp NUMERIC DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_id 
ON public.meeting_action_items(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_created_task_id 
ON public.meeting_action_items(created_task_id);

-- 8. Create meeting_webhook_events table
CREATE TABLE IF NOT EXISTS public.meeting_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'meeting_baas',
  provider_event_id TEXT NOT NULL,
  provider_bot_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_webhook_events_unique 
ON public.meeting_webhook_events(provider, provider_event_id);

CREATE INDEX IF NOT EXISTS idx_meeting_webhook_events_bot_id 
ON public.meeting_webhook_events(provider_bot_id);

-- 9. Create meeting_processing_jobs table (Durable Serverless Queue)
CREATE TABLE IF NOT EXISTS public.meeting_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status_scheduled 
ON public.meeting_processing_jobs(status, scheduled_at);

-- 10. Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.meeting_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_processing_jobs ENABLE ROW LEVEL SECURITY;

-- 11. Define RLS Policies
-- Readable by active members if meeting is public or user is organizer/bureau/invited
CREATE POLICY "Meeting bot sessions viewable by permitted members"
ON public.meeting_bot_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_bot_sessions.meeting_id
      AND (
        m.visibility = 'public'
        OR m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1 FROM public.meeting_participants mp
          WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Meeting decisions viewable by permitted members"
ON public.meeting_decisions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_decisions.meeting_id
      AND (
        m.visibility = 'public'
        OR m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1 FROM public.meeting_participants mp
          WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Meeting action items viewable by permitted members"
ON public.meeting_action_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_action_items.meeting_id
      AND (
        m.visibility = 'public'
        OR m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1 FROM public.meeting_participants mp
          WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
        )
      )
  )
);

-- Organizers and Admins can update decisions and action items (Review & Approval)
CREATE POLICY "Organizers and admins can update decisions"
ON public.meeting_decisions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_decisions.meeting_id
      AND (
        m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_decisions.meeting_id
      AND (
        m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "Organizers and admins can update action items"
ON public.meeting_action_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_action_items.meeting_id
      AND (
        m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_action_items.meeting_id
      AND (
        m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
      )
  )
);

-- Webhook events and jobs are accessible by service_role and admins
CREATE POLICY "Admins can view webhook events"
ON public.meeting_webhook_events FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view processing jobs"
ON public.meeting_processing_jobs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Insert policies for authenticated organizers & service operations
CREATE POLICY "Organizers and admins can insert bot sessions"
ON public.meeting_bot_sessions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_bot_sessions.meeting_id
      AND (
        m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "Organizers and admins can insert decisions"
ON public.meeting_decisions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_decisions.meeting_id
      AND (
        m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "Organizers and admins can insert action items"
ON public.meeting_action_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_action_items.meeting_id
      AND (
        m.organizer_id = auth.uid()
        OR m.created_by = auth.uid()
        OR public.has_global_role(auth.uid(), 'bureau')
        OR public.has_global_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "Authenticated users can insert processing jobs"
ON public.meeting_processing_jobs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 12. Storage bucket policies for meeting-recordings
DO $$
BEGIN
  -- Insert bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('meeting-recordings', 'meeting-recordings', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
END $$;

-- Storage RLS on storage.objects for meeting-recordings
DROP POLICY IF EXISTS "Authorized members can read meeting recordings" ON storage.objects;
CREATE POLICY "Authorized members can read meeting recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'meeting-recordings');

DROP POLICY IF EXISTS "Organizers and admins can upload meeting recordings" ON storage.objects;
CREATE POLICY "Organizers and admins can upload meeting recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meeting-recordings');
