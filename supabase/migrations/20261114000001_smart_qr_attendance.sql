-- ==============================================================================
-- ZEC CAMPUS HUB — SMART QR ATTENDANCE, SESSION CHECK-IN & XP SYSTEM MIGRATION
-- Migration: 20261114000001_smart_qr_attendance.sql
-- ==============================================================================

-- 1. MEMBER QR CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS public.member_qr_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    token_salt TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_qr_cred_user_active ON public.member_qr_credentials(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_qr_cred_token_hash ON public.member_qr_credentials(token_hash);

-- 2. SESSIONS TABLE (Physical in-person sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    session_type TEXT NOT NULL DEFAULT 'workshop' CHECK (
        session_type IN (
            'training', 'workshop', 'conference', 'event',
            'general_meeting', 'bureau_meeting', 'department_meeting',
            'project_meeting', 'other'
        )
    ),
    date DATE NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    location TEXT NOT NULL,
    organizer_id UUID REFERENCES public.profiles(id),
    department_id UUID REFERENCES public.departments(id),
    attendance_open_at TIMESTAMPTZ,
    attendance_close_at TIMESTAMPTZ,
    late_threshold_minutes INT NOT NULL DEFAULT 10,
    attendance_status TEXT NOT NULL DEFAULT 'draft' CHECK (
        attendance_status IN ('draft', 'open', 'paused', 'closed', 'finalized')
    ),
    xp_on_time INT NOT NULL DEFAULT 15,
    xp_late INT NOT NULL DEFAULT 10,
    xp_full_session INT NOT NULL DEFAULT 5,
    requires_checkout BOOLEAN NOT NULL DEFAULT false,
    requires_manual_verification BOOLEAN NOT NULL DEFAULT false,
    visibility TEXT NOT NULL DEFAULT 'club' CHECK (
        visibility IN ('club', 'bureau', 'department', 'confidential')
    ),
    opened_by UUID REFERENCES public.profiles(id),
    closed_by UUID REFERENCES public.profiles(id),
    finalized_by UUID REFERENCES public.profiles(id),
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(attendance_status);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON public.sessions(session_type);

-- 3. SESSION ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.session_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_out_at TIMESTAMPTZ,
    attendance_status TEXT NOT NULL DEFAULT 'present' CHECK (
        attendance_status IN ('present', 'late', 'pending_verification', 'excused', 'absent')
    ),
    verification_method TEXT NOT NULL DEFAULT 'qr' CHECK (
        verification_method IN ('qr', 'manual', 'rfid')
    ),
    verified_by UUID REFERENCES public.profiles(id),
    check_in_idempotency_key TEXT UNIQUE,
    xp_awarded INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_session_member_attendance UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_sess_att_session ON public.session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_sess_att_member ON public.session_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_sess_att_status ON public.session_attendance(attendance_status);

-- 4. ATTENDANCE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_att_audit_session ON public.attendance_audit_logs(session_id);

-- ==============================================================================
-- 5. ATOMIC RPC FUNCTIONS FOR ATTENDANCE AND XP AWARDING
-- ==============================================================================

-- Atomic Check-in function
CREATE OR REPLACE FUNCTION public.register_qr_attendance(
    p_session_id UUID,
    p_member_id UUID,
    p_verified_by UUID,
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
            reference_id,
            idempotency_key,
            created_at
        ) VALUES (
            p_member_id,
            v_xp_to_award,
            'Physical Attendance: ' || v_session.title || ' (' || v_punctuality || ')',
            'session_attendance',
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

-- Atomic Check-out function
CREATE OR REPLACE FUNCTION public.checkout_qr_attendance(
    p_session_id UUID,
    p_member_id UUID,
    p_verified_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_att RECORD;
    v_now TIMESTAMPTZ := now();
    v_bonus_xp INT := 0;
    v_bonus_idempotency TEXT;
BEGIN
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    SELECT * INTO v_att FROM public.session_attendance
    WHERE session_id = p_session_id AND member_id = p_member_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member has not checked in to this session');
    END IF;

    IF v_att.checked_out_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_checked_out', true,
            'message', 'Member already checked out at ' || to_char(v_att.checked_out_at, 'HH24:MI:SS')
        );
    END IF;

    -- Award checkout bonus XP if session requires checkout
    IF v_session.requires_checkout AND v_session.xp_full_session > 0 THEN
        v_bonus_xp := v_session.xp_full_session;
        v_bonus_idempotency := 'xp_att_out_' || p_session_id || '_' || p_member_id;

        -- Update member XP
        UPDATE public.member_xp
        SET total_xp = total_xp + v_bonus_xp,
            updated_at = now()
        WHERE user_id = p_member_id;

        -- Insert transaction
        INSERT INTO public.xp_transactions (
            user_id,
            points,
            reason,
            source_type,
            reference_id,
            idempotency_key,
            created_at
        ) VALUES (
            p_member_id,
            v_bonus_xp,
            'Full Session Checkout Bonus: ' || v_session.title,
            'session_checkout',
            v_att.id::text,
            v_bonus_idempotency,
            now()
        )
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    -- Update attendance
    UPDATE public.session_attendance
    SET checked_out_at = v_now,
        xp_awarded = xp_awarded + v_bonus_xp,
        updated_at = now()
    WHERE id = v_att.id;

    -- Audit log
    INSERT INTO public.attendance_audit_logs (
        session_id,
        member_id,
        action,
        old_value,
        new_value,
        performed_by
    ) VALUES (
        p_session_id,
        p_member_id,
        'check_out',
        jsonb_build_object('checked_in_at', v_att.checked_in_at),
        jsonb_build_object('checked_out_at', v_now, 'bonus_xp', v_bonus_xp),
        p_verified_by
    );

    RETURN jsonb_build_object(
        'success', true,
        'checked_out_at', v_now,
        'bonus_xp_awarded', v_bonus_xp
    );
END;
$$;

-- Atomic Status Correction Function (Admin & Secretary General)
CREATE OR REPLACE FUNCTION public.correct_attendance_record(
    p_attendance_id UUID,
    p_new_status TEXT,
    p_reason TEXT,
    p_performed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_att RECORD;
    v_session RECORD;
    v_old_status TEXT;
    v_old_xp INT;
    v_new_xp INT := 0;
    v_delta_xp INT := 0;
BEGIN
    SELECT * INTO v_att FROM public.session_attendance WHERE id = p_attendance_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance record not found');
    END IF;

    SELECT * INTO v_session FROM public.sessions WHERE id = v_att.session_id;

    v_old_status := v_att.attendance_status;
    v_old_xp := v_att.xp_awarded;

    IF p_new_status = 'present' THEN
        v_new_xp := v_session.xp_on_time;
    ELSIF p_new_status = 'late' THEN
        v_new_xp := v_session.xp_late;
    ELSE
        v_new_xp := 0;
    END IF;

    v_delta_xp := v_new_xp - v_old_xp;

    -- Update attendance
    UPDATE public.session_attendance
    SET attendance_status = p_new_status,
        xp_awarded = v_new_xp,
        notes = COALESCE(notes, '') || ' [Status updated to ' || p_new_status || ': ' || p_reason || ']',
        updated_at = now()
    WHERE id = p_attendance_id;

    -- Adjust XP if delta != 0
    IF v_delta_xp != 0 THEN
        UPDATE public.member_xp
        SET total_xp = total_xp + v_delta_xp,
            updated_at = now()
        WHERE user_id = v_att.member_id;

        INSERT INTO public.xp_transactions (
            user_id,
            points,
            reason,
            source_type,
            reference_id,
            created_at
        ) VALUES (
            v_att.member_id,
            v_delta_xp,
            'Attendance Correction: ' || v_session.title || ' (' || v_old_status || ' -> ' || p_new_status || ') - ' || p_reason,
            'attendance_adjustment',
            p_attendance_id::text,
            now()
        );
    END IF;

    -- Audit log
    INSERT INTO public.attendance_audit_logs (
        session_id,
        member_id,
        action,
        old_value,
        new_value,
        performed_by
    ) VALUES (
        v_att.session_id,
        v_att.member_id,
        'status_corrected',
        jsonb_build_object('status', v_old_status, 'xp', v_old_xp),
        jsonb_build_object('status', p_new_status, 'xp', v_new_xp, 'reason', p_reason),
        p_performed_by
    );

    RETURN jsonb_build_object('success', true, 'new_status', p_new_status, 'delta_xp', v_delta_xp);
END;
$$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.member_qr_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- A. member_qr_credentials
CREATE POLICY "Users can view their own QR credentials"
ON public.member_qr_credentials FOR SELECT
USING (auth.uid() = user_id OR public.is_bureau_or_admin(auth.uid()));

CREATE POLICY "Users or bureau officers can manage QR credentials"
ON public.member_qr_credentials FOR ALL
USING (auth.uid() = user_id OR public.is_bureau_or_admin(auth.uid()));

-- B. sessions
CREATE POLICY "Active members can view non-confidential sessions"
ON public.sessions FOR SELECT
USING (
    visibility = 'club'
    OR (visibility = 'bureau' AND public.is_bureau_or_admin(auth.uid()))
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Bureau and admin can manage sessions"
ON public.sessions FOR ALL
USING (public.is_bureau_or_admin(auth.uid()));

-- C. session_attendance
CREATE POLICY "Members can view their own attendance records"
ON public.session_attendance FOR SELECT
USING (auth.uid() = member_id OR public.is_bureau_or_admin(auth.uid()));

CREATE POLICY "Bureau and admin can manage attendance records"
ON public.session_attendance FOR ALL
USING (public.is_bureau_or_admin(auth.uid()));

-- D. attendance_audit_logs
CREATE POLICY "Bureau and admin can view attendance audit logs"
ON public.attendance_audit_logs FOR SELECT
USING (public.is_bureau_or_admin(auth.uid()));

-- ==============================================================================
-- 7. ENABLE SUPABASE REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_attendance;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

