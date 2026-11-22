-- ==============================================================================
-- Migration: Cleanup Obsolete Legacy Tables
-- Description: Drops legacy, empty placeholder and duplicate tables that were
--              superseded by modern v2 tables:
--              - meeting_actions (superseded by meeting_action_items)
--              - meeting_recording_jobs (superseded by meeting_processing_jobs)
--              - meeting_minutes (superseded by meeting_summaries)
--              - handover_records (unused legacy stub)
-- ==============================================================================

DROP TABLE IF EXISTS public.meeting_actions CASCADE;
DROP TABLE IF EXISTS public.meeting_recording_jobs CASCADE;
DROP TABLE IF EXISTS public.meeting_minutes CASCADE;
DROP TABLE IF EXISTS public.handover_records CASCADE;
