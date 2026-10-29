-- ==============================================================================
-- ZEC Campus Hub — Security Fixes & RLS Policies for Links and Participants
-- ZERO EXCLUSION CARBON POVERTY - Campus Club ISIMS
-- ==============================================================================

-- 1. Meeting Participants RLS Policies
DROP POLICY IF EXISTS "Meeting participants viewable by active members" ON public.meeting_participants;
CREATE POLICY "Meeting participants viewable by active members"
ON public.meeting_participants FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "Meeting participants manageable by bureau" ON public.meeting_participants;
CREATE POLICY "Meeting participants manageable by bureau"
ON public.meeting_participants FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()))
WITH CHECK (public.is_bureau(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own meeting participation" ON public.meeting_participants;
CREATE POLICY "Users can update their own meeting participation"
ON public.meeting_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Document Links RLS Policies
DROP POLICY IF EXISTS "Document links viewable by active members" ON public.document_links;
CREATE POLICY "Document links viewable by active members"
ON public.document_links FOR SELECT
TO authenticated
USING (
  public.is_active_member(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id
  )
);

DROP POLICY IF EXISTS "Document links manageable by bureau" ON public.document_links;
CREATE POLICY "Document links manageable by bureau"
ON public.document_links FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()))
WITH CHECK (public.is_bureau(auth.uid()));

-- 3. Function Search Path Hardening
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.award_xp(UUID, INT, TEXT, TEXT, UUID, TEXT, UUID) SET search_path = public;
ALTER FUNCTION public.submit_task_for_verification(UUID) SET search_path = public;
ALTER FUNCTION public.verify_task(UUID, BOOLEAN, TEXT) SET search_path = public;
ALTER FUNCTION public.admin_adjust_xp(UUID, INT, TEXT) SET search_path = public;
ALTER FUNCTION public.check_member_achievements(UUID) SET search_path = public;

-- 4. Revoke anonymous access on sensitive security definer RPC functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.award_xp(UUID, INT, TEXT, TEXT, UUID, TEXT, UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_xp(UUID, INT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_task_for_verification(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_task(UUID, BOOLEAN, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_member_achievements(UUID) FROM anon;
