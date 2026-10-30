-- ==============================================================================
-- ZEC Campus Hub — Smart Meeting Center Migration
-- Integrated Meeting Bot, Automatic Recording, Transcription & Meeting Archive
-- ZERO EXCLUSION CARBON POVERTY - Campus Club ISIMS
-- ==============================================================================

-- 1. Extend Meetings Table
ALTER TABLE public.meetings 
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS meeting_platform TEXT NOT NULL DEFAULT 'google_meet',
  ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'bureau',
  ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recording_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recording_consent_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'club',
  ADD COLUMN IF NOT EXISTS agenda TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Ensure check constraints
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS chk_meeting_type;
ALTER TABLE public.meetings ADD CONSTRAINT chk_meeting_type 
  CHECK (meeting_type IN ('bureau', 'department', 'general', 'project', 'event_prep', 'other'));

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS chk_recording_status;
ALTER TABLE public.meetings ADD CONSTRAINT chk_recording_status 
  CHECK (recording_status IN ('none', 'requested', 'live', 'processing', 'available', 'failed'));

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS chk_recording_consent_status;
ALTER TABLE public.meetings ADD CONSTRAINT chk_recording_consent_status 
  CHECK (recording_consent_status IN ('pending', 'obtained', 'exempt', 'declined'));

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS chk_meeting_visibility;
ALTER TABLE public.meetings ADD CONSTRAINT chk_meeting_visibility 
  CHECK (visibility IN ('club', 'department', 'confidential'));

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS chk_meeting_status;
ALTER TABLE public.meetings ADD CONSTRAINT chk_meeting_status 
  CHECK (status IN ('scheduled', 'live', 'processing', 'completed', 'cancelled'));

-- 2. Meeting Recordings Table
CREATE TABLE IF NOT EXISTS public.meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'upload' CHECK (provider IN ('upload', 'google_drive', 'recall_ai', 'meeting_baas', 'custom_bot')),
  provider_recording_id TEXT UNIQUE,
  storage_path TEXT,
  duration_seconds INT NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  file_size BIGINT DEFAULT 0 CHECK (file_size >= 0),
  mime_type TEXT DEFAULT 'video/mp4',
  processing_status TEXT NOT NULL DEFAULT 'completed' CHECK (processing_status IN ('uploading', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recordings_meeting ON public.meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_recordings_provider ON public.meeting_recordings(provider, provider_recording_id);

-- 3. Meeting Transcripts Table
CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES public.meeting_recordings(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  content TEXT NOT NULL DEFAULT '',
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  processing_status TEXT NOT NULL DEFAULT 'completed' CHECK (processing_status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON public.meeting_transcripts(meeting_id);
CREATE TRIGGER update_meeting_transcripts_updated_at
BEFORE UPDATE ON public.meeting_transcripts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Meeting Transcript Segments Table (Fine-grained timestamped segments for seek & search)
CREATE TABLE IF NOT EXISTS public.meeting_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.meeting_transcripts(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL DEFAULT 'Speaker 1',
  start_seconds NUMERIC(8,2) NOT NULL CHECK (start_seconds >= 0),
  end_seconds NUMERIC(8,2) NOT NULL CHECK (end_seconds >= start_seconds),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcript_segments_meeting ON public.meeting_transcript_segments(meeting_id, start_seconds);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_tx ON public.meeting_transcript_segments(transcript_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_content ON public.meeting_transcript_segments USING gin(to_tsvector('french', content));

-- 5. Meeting Summaries Table
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  summary_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_status TEXT NOT NULL DEFAULT 'completed' CHECK (processing_status IN ('generating', 'completed', 'failed', 'unavailable')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summaries_meeting ON public.meeting_summaries(meeting_id);
CREATE TRIGGER update_meeting_summaries_updated_at
BEFORE UPDATE ON public.meeting_summaries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Meeting Recording Jobs (Bot dispatch and webhook idempotency)
CREATE TABLE IF NOT EXISTS public.meeting_recording_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'recall_ai',
  external_job_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'bot_joining', 'recording', 'processing', 'completed', 'failed', 'cancelled')),
  idempotency_key TEXT UNIQUE NOT NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recording_jobs_meeting ON public.meeting_recording_jobs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_recording_jobs_external ON public.meeting_recording_jobs(external_job_id);

-- 7. Ensure private bucket 'meeting-recordings' exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-recordings',
  'meeting-recordings',
  false,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'];

-- 8. Security Helper Function for Meeting Visibility
CREATE OR REPLACE FUNCTION public.can_view_meeting(p_user_id UUID, p_meeting_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_visibility TEXT;
  v_dept_id UUID;
BEGIN
  -- Bureau officers and admins can view any meeting
  IF public.is_bureau(p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- User must be an active club member
  IF NOT public.is_active_member(p_user_id) THEN
    RETURN FALSE;
  END IF;

  SELECT visibility, department_id INTO v_visibility, v_dept_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Club-wide public to active members
  IF v_visibility = 'club' THEN
    RETURN TRUE;
  END IF;

  -- Department meetings
  IF v_visibility = 'department' THEN
    IF v_dept_id IS NOT NULL AND public.is_department_member(p_user_id, v_dept_id) THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;

  -- Confidential meetings: only explicit participants
  IF v_visibility = 'confidential' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.meeting_participants
      WHERE meeting_id = p_meeting_id AND user_id = p_user_id
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.can_view_meeting(UUID, UUID) FROM anon;

-- 9. Database-Backed Full-Text Search Function for Transcripts
CREATE OR REPLACE FUNCTION public.search_meeting_transcripts(p_meeting_id UUID, p_query TEXT)
RETURNS TABLE (
  segment_id UUID,
  start_seconds NUMERIC(8,2),
  end_seconds NUMERIC(8,2),
  speaker_label TEXT,
  content TEXT,
  rank REAL
) AS $$
BEGIN
  IF NOT public.can_view_meeting(auth.uid(), p_meeting_id) THEN
    RAISE EXCEPTION 'Access denied to meeting archive';
  END IF;

  RETURN QUERY
  SELECT 
    s.id AS segment_id,
    s.start_seconds,
    s.end_seconds,
    s.speaker_label,
    s.content,
    ts_rank(to_tsvector('french', s.content), plainto_tsquery('french', p_query)) AS rank
  FROM public.meeting_transcript_segments s
  WHERE s.meeting_id = p_meeting_id
    AND (
      to_tsvector('french', s.content) @@ plainto_tsquery('french', p_query)
      OR s.content ILIKE ('%' || p_query || '%')
    )
  ORDER BY rank DESC, s.start_seconds ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.search_meeting_transcripts(UUID, TEXT) FROM anon;

-- 10. Row Level Security Policies
ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_recording_jobs ENABLE ROW LEVEL SECURITY;

-- 10.1 Update meetings policy to respect visibility
DROP POLICY IF EXISTS "Meetings viewable by active members" ON public.meetings;
CREATE POLICY "Meetings viewable according to visibility"
ON public.meetings FOR SELECT
TO authenticated
USING (public.can_view_meeting(auth.uid(), id));

DROP POLICY IF EXISTS "Meetings manageable by bureau and leads" ON public.meetings;
CREATE POLICY "Meetings manageable by bureau and leads"
ON public.meetings FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)))
WITH CHECK (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)));

-- 10.2 Meeting Recordings Policies
DROP POLICY IF EXISTS "Meeting recordings viewable according to meeting visibility" ON public.meeting_recordings;
CREATE POLICY "Meeting recordings viewable according to meeting visibility"
ON public.meeting_recordings FOR SELECT
TO authenticated
USING (public.can_view_meeting(auth.uid(), meeting_id));

DROP POLICY IF EXISTS "Meeting recordings manageable by bureau" ON public.meeting_recordings;
CREATE POLICY "Meeting recordings manageable by bureau"
ON public.meeting_recordings FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()))
WITH CHECK (public.is_bureau(auth.uid()));

-- 10.3 Meeting Transcripts Policies
DROP POLICY IF EXISTS "Meeting transcripts viewable according to meeting visibility" ON public.meeting_transcripts;
CREATE POLICY "Meeting transcripts viewable according to meeting visibility"
ON public.meeting_transcripts FOR SELECT
TO authenticated
USING (public.can_view_meeting(auth.uid(), meeting_id));

DROP POLICY IF EXISTS "Meeting transcripts manageable by bureau" ON public.meeting_transcripts;
CREATE POLICY "Meeting transcripts manageable by bureau"
ON public.meeting_transcripts FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()))
WITH CHECK (public.is_bureau(auth.uid()));

-- 10.4 Meeting Transcript Segments Policies
DROP POLICY IF EXISTS "Transcript segments viewable according to meeting visibility" ON public.meeting_transcript_segments;
CREATE POLICY "Transcript segments viewable according to meeting visibility"
ON public.meeting_transcript_segments FOR SELECT
TO authenticated
USING (public.can_view_meeting(auth.uid(), meeting_id));

DROP POLICY IF EXISTS "Transcript segments manageable by bureau" ON public.meeting_transcript_segments;
CREATE POLICY "Transcript segments manageable by bureau"
ON public.meeting_transcript_segments FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()))
WITH CHECK (public.is_bureau(auth.uid()));

-- 10.5 Meeting Summaries Policies
DROP POLICY IF EXISTS "Meeting summaries viewable according to meeting visibility" ON public.meeting_summaries;
CREATE POLICY "Meeting summaries viewable according to meeting visibility"
ON public.meeting_summaries FOR SELECT
TO authenticated
USING (public.can_view_meeting(auth.uid(), meeting_id));

DROP POLICY IF EXISTS "Meeting summaries manageable by bureau" ON public.meeting_summaries;
CREATE POLICY "Meeting summaries manageable by bureau"
ON public.meeting_summaries FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()))
WITH CHECK (public.is_bureau(auth.uid()));

-- 10.6 Meeting Recording Jobs Policies (Internal / Bureau Only)
DROP POLICY IF EXISTS "Meeting recording jobs manageable by bureau" ON public.meeting_recording_jobs;
CREATE POLICY "Meeting recording jobs manageable by bureau"
ON public.meeting_recording_jobs FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()))
WITH CHECK (public.is_bureau(auth.uid()));

-- 10.7 Supabase Storage Policies for 'meeting-recordings'
DROP POLICY IF EXISTS "Meeting recordings storage viewable" ON storage.objects;
CREATE POLICY "Meeting recordings storage viewable"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-recordings' AND
  (
    public.is_bureau(auth.uid()) OR
    -- Path convention: {meeting_id}/{filename}
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id::text = (storage.foldername(name))[1]
        AND public.can_view_meeting(auth.uid(), m.id)
    )
  )
);

DROP POLICY IF EXISTS "Meeting recordings storage uploadable by bureau" ON storage.objects;
CREATE POLICY "Meeting recordings storage uploadable by bureau"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-recordings' AND
  public.is_bureau(auth.uid())
);

