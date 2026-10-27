-- ==============================================================================
-- ZEC Campus Hub — Security & Row-Level Security (RLS) Policies
-- ZERO EXCLUSION CARBON POVERTY - Campus Club ISIMS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Centralized Security Helper Functions (SECURITY DEFINER to avoid recursion)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_member(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE user_id = user_uuid AND membership_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_global_role(user_uuid UUID, target_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.key = target_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_global_role(user_uuid, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_bureau(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_global_role(user_uuid, 'bureau') OR public.has_global_role(user_uuid, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_department_lead(user_uuid UUID, dept_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_members
    WHERE user_id = user_uuid AND department_id = dept_id AND department_role = 'lead'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_department_member(user_uuid UUID, dept_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_members
    WHERE user_id = user_uuid AND department_id = dept_id
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. Enable RLS on All Tables
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Profiles Policies
-- ------------------------------------------------------------------------------

-- Active club members can view authorized profile directories
CREATE POLICY "Profiles are viewable by active members"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()) OR auth.uid() = id);

-- Users can only update their own profile fields
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Profiles are inserted on signup
CREATE POLICY "Profiles can be inserted for authenticated user"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 4. Club Memberships Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "Memberships viewable by active members and self"
ON public.club_memberships FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_bureau(auth.uid()));

CREATE POLICY "Only admins and bureau can update memberships"
ON public.club_memberships FOR UPDATE
TO authenticated
USING (public.is_bureau(auth.uid()))
WITH CHECK (public.is_bureau(auth.uid()));

CREATE POLICY "Users can create pending membership on onboarding"
ON public.club_memberships FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. Roles and User Roles
-- ------------------------------------------------------------------------------

CREATE POLICY "Roles are readable by authenticated users"
ON public.roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "User roles readable by active members"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Only admins can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 6. Departments and Department Members
-- ------------------------------------------------------------------------------

CREATE POLICY "Departments are readable by active members"
ON public.departments FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Only admins can manage departments"
ON public.departments FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Department members viewable by active members"
ON public.department_members FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Bureau and Department Leads can manage department members"
ON public.department_members FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()) OR public.is_department_lead(auth.uid(), department_id))
WITH CHECK (public.is_bureau(auth.uid()) OR public.is_department_lead(auth.uid(), department_id));

-- ------------------------------------------------------------------------------
-- 7. Projects & Tasks Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "Projects viewable by active members"
ON public.projects FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Projects manageable by bureau, lead, or owner"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)));

CREATE POLICY "Projects editable by owner, lead or bureau"
ON public.projects FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id OR public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)));

CREATE POLICY "Project members viewable by active members"
ON public.project_members FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Tasks viewable by active members"
ON public.tasks FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Tasks creatable by active members"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (public.is_active_member(auth.uid()) AND auth.uid() = creator_id);

CREATE POLICY "Tasks updatable by assignees, leads, bureau, or creator"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  public.is_bureau(auth.uid()) OR
  creator_id = auth.uid() OR
  (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)) OR
  EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = id AND user_id = auth.uid())
);

CREATE POLICY "Task assignees viewable by active members"
ON public.task_assignees FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Task comments viewable by active members"
ON public.task_comments FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Task comments insertable by active members"
ON public.task_comments FOR INSERT
TO authenticated
WITH CHECK (public.is_active_member(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Task activity viewable by active members"
ON public.task_activity FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

-- ------------------------------------------------------------------------------
-- 8. Events & Registrations Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "Events viewable by active members"
ON public.events FOR SELECT
TO authenticated
USING (
  public.is_active_member(auth.uid()) AND
  (status != 'draft' OR organizer_id = auth.uid() OR public.is_bureau(auth.uid()))
);

CREATE POLICY "Events manageable by bureau and leads"
ON public.events FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)))
WITH CHECK (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)));

CREATE POLICY "Event registrations viewable by active members"
ON public.event_registrations FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Users can register or cancel own registration"
ON public.event_registrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_active_member(auth.uid()));

CREATE POLICY "Users can update own registration status"
ON public.event_registrations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_bureau(auth.uid()));

-- ------------------------------------------------------------------------------
-- 9. Meetings & Minutes Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "Meetings viewable by active members"
ON public.meetings FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Meetings manageable by bureau and leads"
ON public.meetings FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)))
WITH CHECK (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)));

CREATE POLICY "Meeting minutes viewable by active members"
ON public.meeting_minutes FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Meeting actions viewable by active members"
ON public.meeting_actions FOR SELECT
TO authenticated
USING (public.is_active_member(auth.uid()));

CREATE POLICY "Meeting actions updatable by assignee or bureau"
ON public.meeting_actions FOR UPDATE
TO authenticated
USING (public.is_bureau(auth.uid()) OR assigned_user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 10. Announcements & Notifications Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "Announcements viewable by audience"
ON public.announcements FOR SELECT
TO authenticated
USING (
  public.is_active_member(auth.uid()) AND
  (
    status = 'published' OR
    author_id = auth.uid() OR
    public.is_bureau(auth.uid())
  ) AND
  (
    audience_type = 'club' OR
    (department_id IS NOT NULL AND public.is_department_member(auth.uid(), department_id)) OR
    public.is_bureau(auth.uid())
  )
);

CREATE POLICY "Announcements manageable by bureau and leads"
ON public.announcements FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)))
WITH CHECK (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)));

CREATE POLICY "Announcement reads manage by self"
ON public.announcement_reads FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Notifications viewable and manageable strictly by recipient"
ON public.notifications FOR ALL
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- ------------------------------------------------------------------------------
-- 11. Documents & Handover Vault Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "Documents viewable according to visibility"
ON public.documents FOR SELECT
TO authenticated
USING (
  public.is_active_member(auth.uid()) AND (
    visibility = 'club' OR
    (visibility = 'department' AND department_id IS NOT NULL AND public.is_department_member(auth.uid(), department_id)) OR
    public.is_bureau(auth.uid()) OR
    uploaded_by = auth.uid()
  )
);

CREATE POLICY "Documents uploadable by active members"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (public.is_active_member(auth.uid()) AND auth.uid() = uploaded_by);

CREATE POLICY "Documents updatable by uploader or bureau"
ON public.documents FOR UPDATE
TO authenticated
USING (public.is_bureau(auth.uid()) OR uploaded_by = auth.uid());

CREATE POLICY "Handover records viewable by bureau and department leads"
ON public.handover_records FOR SELECT
TO authenticated
USING (
  public.is_bureau(auth.uid()) OR
  (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id))
);

CREATE POLICY "Handover records manageable by bureau and leads"
ON public.handover_records FOR ALL
TO authenticated
USING (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)))
WITH CHECK (public.is_bureau(auth.uid()) OR (department_id IS NOT NULL AND public.is_department_lead(auth.uid(), department_id)));

-- ------------------------------------------------------------------------------
-- 12. Audit Logs Policies (Append-only, strictly immutable)
-- ------------------------------------------------------------------------------

CREATE POLICY "Audit logs viewable only by admins and bureau"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_bureau(auth.uid()));

CREATE POLICY "Audit logs insertable by system/actors"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Disallow updates and deletes on audit logs completely
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, public;
