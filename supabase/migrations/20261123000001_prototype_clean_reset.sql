-- Migration: Prototype Clean Reset
-- Purges all mock/test operational data while retaining only adamwalha20@gmail.com as Super Admin.

ALTER TABLE public.audit_logs DISABLE TRIGGER trg_prevent_audit_log_deletion;

TRUNCATE TABLE 
  public.meeting_action_items,
  public.meeting_decisions,
  public.meeting_transcript_segments,
  public.meeting_transcripts,
  public.meeting_recordings,
  public.meeting_summaries,
  public.meeting_bot_sessions,
  public.meeting_processing_jobs,
  public.meeting_webhook_events,
  public.meeting_participants,
  public.meetings,
  public.event_registrations,
  public.events,
  public.task_activity,
  public.task_comments,
  public.task_assignees,
  public.tasks,
  public.project_members,
  public.projects,
  public.announcement_reads,
  public.announcements,
  public.document_links,
  public.documents,
  public.financial_transactions,
  public.budgets,
  public.partners,
  public.marketing_campaigns,
  public.sustainability_initiatives,
  public.decisions,
  public.recruitment_applications,
  public.session_attendance,
  public.sessions,
  public.attendance_audit_logs,
  public.notifications,
  public.email_delivery_logs,
  public.scheduled_email_reminders,
  public.xp_transactions,
  public.audit_logs
CASCADE;

ALTER TABLE public.audit_logs ENABLE TRIGGER trg_prevent_audit_log_deletion;

DELETE FROM public.member_achievements WHERE user_id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM public.member_qr_credentials WHERE user_id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM public.email_preferences WHERE user_id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM public.department_members WHERE user_id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM public.user_bureau_positions WHERE user_id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM public.user_roles WHERE user_id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM public.club_memberships WHERE user_id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM public.member_xp WHERE user_id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM public.profiles WHERE id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';
DELETE FROM auth.users WHERE id != '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0';

INSERT INTO public.user_roles (user_id, role_id)
SELECT '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0', id FROM public.roles WHERE key = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO public.club_memberships (user_id, membership_status)
VALUES ('8b4defa0-21fa-410a-82c8-8b42f5fcf6d0', 'active')
ON CONFLICT (user_id) DO UPDATE SET membership_status = 'active';

INSERT INTO public.member_xp (user_id, total_xp, completed_tasks_count)
VALUES ('8b4defa0-21fa-410a-82c8-8b42f5fcf6d0', 0, 0)
ON CONFLICT (user_id) DO NOTHING;
