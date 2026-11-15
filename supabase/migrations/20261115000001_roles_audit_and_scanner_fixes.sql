-- ==============================================================================
-- Migration: Roles, Bureau Positions (President & Training/Innovation),
-- Admin Audit Logs with Undo Functionality, and Attendance Scanner Stability
-- ==============================================================================

-- 1. Update check constraint on bureau_positions to include 'president' and 'training_innovation'
ALTER TABLE public.bureau_positions DROP CONSTRAINT IF EXISTS bureau_positions_key_check;
ALTER TABLE public.bureau_positions ADD CONSTRAINT bureau_positions_key_check CHECK (
  key = ANY (ARRAY[
    'president'::text,
    'vice_president'::text,
    'secretary_general'::text,
    'treasurer'::text,
    'training_innovation'::text,
    'hr_manager'::text,
    'marketing_design_manager'::text,
    'sustainable_campus_manager'::text,
    'communication_engagement_manager'::text,
    'events_manager'::text,
    'project_manager'::text,
    'partnerships_sponsorship_manager'::text
  ])
);

-- 2. Add order_index column to bureau_positions for deterministic hierarchy display
ALTER TABLE public.bureau_positions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 100;

-- 3. Upsert President & Training and Innovation Manager positions
INSERT INTO public.bureau_positions (key, display_name, description, order_index)
VALUES 
(
  'president',
  'President',
  'Executive club leadership, institutional university representation, general club strategy, and official approvals.',
  1
),
(
  'training_innovation',
  'Training & Innovation Manager',
  'Directs technical workshops, AI & green IoT bootcamps, innovation hackathons, and member skill certification.',
  5
)
ON CONFLICT (key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Update order_index for all official positions
UPDATE public.bureau_positions SET order_index = 1 WHERE key = 'president';
UPDATE public.bureau_positions SET order_index = 2 WHERE key = 'vice_president';
UPDATE public.bureau_positions SET order_index = 3 WHERE key = 'secretary_general';
UPDATE public.bureau_positions SET order_index = 4 WHERE key = 'treasurer';
UPDATE public.bureau_positions SET order_index = 5 WHERE key = 'training_innovation';
UPDATE public.bureau_positions SET order_index = 6 WHERE key = 'hr_manager';
UPDATE public.bureau_positions SET order_index = 7 WHERE key = 'marketing_design_manager';
UPDATE public.bureau_positions SET order_index = 8 WHERE key = 'sustainable_campus_manager';
UPDATE public.bureau_positions SET order_index = 9 WHERE key = 'communication_engagement_manager';
UPDATE public.bureau_positions SET order_index = 10 WHERE key = 'events_manager';
UPDATE public.bureau_positions SET order_index = 11 WHERE key = 'project_manager';
UPDATE public.bureau_positions SET order_index = 12 WHERE key = 'partnerships_sponsorship_manager';

-- 4. Ensure admin role exists and grant to administrators
INSERT INTO public.roles (key, display_name, description)
VALUES ('admin', 'Club Administrator', 'Full administrative access to governance, roles, audits, and club controls')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
CROSS JOIN public.roles r
WHERE r.key = 'admin'
  AND (
    lower(p.email) = 'adamwalha20@gmail.com'
    OR p.student_id ILIKE 'ISIMS-ADMIN-%'
  )
  AND lower(p.email) != 'mahdihelmin@gmail.com'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Revoke admin role from mahdihelmin@gmail.com if present
DELETE FROM public.user_roles 
WHERE user_id IN (SELECT id FROM public.profiles WHERE lower(email) = 'mahdihelmin@gmail.com')
  AND role_id IN (SELECT id FROM public.roles WHERE key = 'admin');

-- 5. Strengthen public.is_admin function (excluding mahdihelmin@gmail.com)
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.has_global_role(user_uuid, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = user_uuid 
      AND (
        lower(email) = 'adamwalha20@gmail.com'
        OR student_id ILIKE 'ISIMS-ADMIN-%'
      )
    )
    OR public.has_bureau_position(user_uuid, 'president')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
    AND lower(email) = 'mahdihelmin@gmail.com'
  );
$$;

-- 6. Configure RLS policy on user_bureau_positions
DROP POLICY IF EXISTS "Only admins can assign bureau positions" ON public.user_bureau_positions;
CREATE POLICY "Only admins can assign bureau positions"
ON public.user_bureau_positions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 7. Add undo capabilities and columns to public.audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS previous_state JSONB DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_state JSONB DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS is_undone BOOLEAN DEFAULT FALSE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS undone_by UUID REFERENCES public.profiles(id) DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS can_undo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details TEXT;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update audit logs" ON public.audit_logs;
CREATE POLICY "Admins can update audit logs"
ON public.audit_logs FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and system can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins and system can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. Fix xp_transactions schema and constraints for physical attendance scanning
ALTER TABLE public.xp_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;

ALTER TABLE public.xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_source_type_check;
ALTER TABLE public.xp_transactions ADD CONSTRAINT xp_transactions_source_type_check CHECK (
  source_type = ANY (ARRAY[
    'task'::text,
    'milestone'::text,
    'event'::text,
    'initiative'::text,
    'adjustment'::text,
    'session_attendance'::text,
    'session_checkout'::text,
    'attendance_adjustment'::text,
    'meeting'::text
  ])
);

-- 9. Ensure notifications table allows default type
ALTER TABLE public.notifications ALTER COLUMN type SET DEFAULT 'general';
ALTER TABLE public.notifications ALTER COLUMN type DROP NOT NULL;

-- 10. Drop any overloaded/ambiguous signatures of register_qr_attendance and declare single canonical RPC
DROP FUNCTION IF EXISTS public.register_qr_attendance(uuid, uuid, text, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.register_qr_attendance(uuid, uuid, uuid, text, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.register_qr_attendance(
    p_session_id UUID,
    p_member_id UUID,
    p_verified_by UUID DEFAULT NULL,
    p_verification_method TEXT DEFAULT 'qr',
    p_custom_check_in TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_member RECORD;
    v_checkin_time TIMESTAMPTZ;
    v_late_limit TIMESTAMPTZ;
    v_punctuality TEXT;
    v_xp_to_award INT := 0;
    v_idempotency_key TEXT;
    v_xp_idempotency_key TEXT;
    v_attendance_id UUID;
    v_existing RECORD;
BEGIN
    -- 1. Fetch Session
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    -- Verify session attendance state
    IF v_session.attendance_status != 'open' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Attendance is currently ' || v_session.attendance_status || '. Scans are only accepted when attendance is open.'
        );
    END IF;

    -- 2. Fetch Member
    SELECT * INTO v_member FROM public.profiles WHERE id = p_member_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found');
    END IF;

    -- 3. Check for existing attendance record
    SELECT * INTO v_existing FROM public.session_attendance
    WHERE session_id = p_session_id AND member_id = p_member_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_registered', true,
            'message', 'Member already registered for this session at ' || to_char(v_existing.checked_in_at, 'HH24:MI:SS'),
            'attendance', row_to_json(v_existing)
        );
    END IF;

    -- 4. Determine check-in timestamp and punctuality
    v_checkin_time := COALESCE(p_custom_check_in, now());
    v_late_limit := v_session.starts_at + (v_session.late_threshold_minutes || ' minutes')::INTERVAL;

    IF v_session.requires_manual_verification THEN
        v_punctuality := 'pending_verification';
        v_xp_to_award := 0;
    ELSIF v_checkin_time <= v_late_limit THEN
        v_punctuality := 'present';
        v_xp_to_award := v_session.xp_on_time;
    ELSE
        v_punctuality := 'late';
        v_xp_to_award := v_session.xp_late;
    END IF;

    -- 5. Construct idempotency keys
    v_idempotency_key := 'att_' || p_session_id || '_' || p_member_id || '_in';
    v_xp_idempotency_key := 'xp_att_' || p_session_id || '_' || p_member_id;

    -- 6. Insert attendance record
    INSERT INTO public.session_attendance (
        session_id,
        member_id,
        checked_in_at,
        attendance_status,
        verification_method,
        verified_by,
        check_in_idempotency_key,
        xp_awarded,
        notes
    ) VALUES (
        p_session_id,
        p_member_id,
        v_checkin_time,
        v_punctuality,
        p_verification_method,
        p_verified_by,
        v_idempotency_key,
        v_xp_to_award,
        CASE WHEN v_punctuality = 'late' THEN 'Late arrival by ' || round(extract(epoch from (v_checkin_time - v_session.starts_at))/60) || ' mins' ELSE 'Punctual arrival' END
    )
    RETURNING id INTO v_attendance_id;

    -- 7. Award XP atomically if applicable
    IF v_xp_to_award > 0 THEN
        -- Upsert member XP total
        INSERT INTO public.member_xp (user_id, total_xp, completed_tasks_count, updated_at)
        VALUES (p_member_id, v_xp_to_award, 0, now())
        ON CONFLICT (user_id) DO UPDATE
        SET total_xp = public.member_xp.total_xp + v_xp_to_award,
            updated_at = now();

        -- Record XP transaction with idempotency
        INSERT INTO public.xp_transactions (
            user_id,
            points,
            reason,
            source_type,
            source_id,
            reference_id,
            idempotency_key,
            created_at
        ) VALUES (
            p_member_id,
            v_xp_to_award,
            'Physical Attendance: ' || v_session.title || ' (' || v_punctuality || ')',
            'session_attendance',
            v_attendance_id,
            v_attendance_id::text,
            v_xp_idempotency_key,
            now()
        )
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    -- 8. Write audit log
    INSERT INTO public.attendance_audit_logs (
        session_id,
        member_id,
        action,
        new_value,
        performed_by
    ) VALUES (
        p_session_id,
        p_member_id,
        'check_in',
        jsonb_build_object(
            'status', v_punctuality,
            'checked_in_at', v_checkin_time,
            'xp_awarded', v_xp_to_award,
            'method', p_verification_method
        ),
        p_verified_by
    );

    -- 9. Create notification for member
    INSERT INTO public.notifications (
        recipient_user_id,
        recipient_id,
        type,
        title,
        description,
        body,
        category,
        priority,
        destination_url,
        related_entity_type,
        related_entity_id,
        is_read
    ) VALUES (
        p_member_id,
        p_member_id,
        'attendance_verified',
        'Attendance Verified: ' || v_session.title,
        'Checked in at ' || to_char(v_checkin_time, 'HH24:MI:SS') || ' (' || v_punctuality || '). +' || v_xp_to_award || ' XP awarded.',
        'Checked in at ' || to_char(v_checkin_time, 'HH24:MI:SS') || ' (' || v_punctuality || '). +' || v_xp_to_award || ' XP awarded.',
        'xp_achievements',
        'normal',
        '/attendance',
        'sessions',
        p_session_id::text,
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', v_attendance_id,
        'member_id', p_member_id,
        'member_name', v_member.full_name,
        'status', v_punctuality,
        'checked_in_at', v_checkin_time,
        'xp_awarded', v_xp_to_award
    );
END;
$$;


