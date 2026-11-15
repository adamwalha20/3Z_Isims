-- ==============================================================================
-- Migration: Production Readiness, Realtime Publication, and Integrity Invariants
-- ==============================================================================

-- 1. Enable Full Replica Identity for Realtime Payloads
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.meetings REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.member_xp REPLICA IDENTITY FULL;
ALTER TABLE public.user_bureau_positions REPLICA IDENTITY FULL;
ALTER TABLE public.club_memberships REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.financial_transactions REPLICA IDENTITY FULL;

-- 2. Add all core tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.tasks,
  public.meetings,
  public.announcements,
  public.member_xp,
  public.xp_transactions,
  public.user_bureau_positions,
  public.club_memberships,
  public.user_roles,
  public.projects,
  public.events,
  public.documents,
  public.financial_transactions;

-- 3. Add composite index on session_attendance for member history lookups
CREATE INDEX IF NOT EXISTS idx_session_attendance_member_checked_in 
ON public.session_attendance(member_id, checked_in_at DESC);

-- 4. Add index on tasks for assignee lookups and status
CREATE INDEX IF NOT EXISTS idx_tasks_status_due 
ON public.tasks(status, due_at);

-- 5. Add index on scheduled_email_reminders for worker query optimization
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status_scheduled_at 
ON public.scheduled_email_reminders(status, scheduled_at);

