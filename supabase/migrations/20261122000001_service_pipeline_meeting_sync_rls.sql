-- ==============================================================================
-- Migration: Service Pipeline Meeting Sync RLS & Intelligence Authorization Fix
-- Description: Enables background sync, webhooks, and intelligence workers
--              operating via getSupabaseAdmin() to safely SELECT confidential
--              meetings, ingest AI decisions/action items, and update status.
--              Also ensures meeting organizers can always access their own
--              confidential meeting intelligence.
-- ==============================================================================

-- 1. Meetings service pipeline SELECT policy
DROP POLICY IF EXISTS "Allow service pipeline to read meetings" ON public.meetings;
CREATE POLICY "Allow service pipeline to read meetings"
ON public.meetings FOR SELECT
USING (true);

-- 2. Meeting decisions service pipeline policy
DROP POLICY IF EXISTS "Allow service pipeline decisions" ON public.meeting_decisions;
CREATE POLICY "Allow service pipeline decisions"
ON public.meeting_decisions FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Meeting action items service pipeline policy
DROP POLICY IF EXISTS "Allow service pipeline action items" ON public.meeting_action_items;
CREATE POLICY "Allow service pipeline action items"
ON public.meeting_action_items FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Meeting processing jobs service pipeline policy
DROP POLICY IF EXISTS "Allow service pipeline processing jobs" ON public.meeting_processing_jobs;
CREATE POLICY "Allow service pipeline processing jobs"
ON public.meeting_processing_jobs FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Notifications service pipeline insert policy
DROP POLICY IF EXISTS "Allow service pipeline to insert notifications" ON public.notifications;
CREATE POLICY "Allow service pipeline to insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- 6. Update can_view_meeting function to explicitly allow meeting organizers
CREATE OR REPLACE FUNCTION public.can_view_meeting(p_user_id uuid, p_meeting_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_visibility TEXT;
  v_dept_id UUID;
  v_organizer_id UUID;
  v_created_by UUID;
BEGIN
  IF public.is_bureau(p_user_id) THEN
    RETURN TRUE;
  END IF;

  IF NOT public.is_active_member(p_user_id) THEN
    RETURN FALSE;
  END IF;

  SELECT visibility, department_id, organizer_id, created_by 
  INTO v_visibility, v_dept_id, v_organizer_id, v_created_by
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Organizers can always view their own meeting
  IF p_user_id = v_organizer_id OR p_user_id = v_created_by THEN
    RETURN TRUE;
  END IF;

  IF v_visibility = 'club' OR v_visibility = 'public' THEN
    RETURN TRUE;
  END IF;

  IF v_visibility = 'department' THEN
    IF v_dept_id IS NOT NULL AND public.is_department_member(p_user_id, v_dept_id) THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;

  IF v_visibility = 'confidential' OR v_visibility = 'restricted' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.meeting_participants
      WHERE meeting_id = p_meeting_id AND user_id = p_user_id
    );
  END IF;

  RETURN FALSE;
END;
$function$;
