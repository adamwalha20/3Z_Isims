-- ====================================================================
-- MIGRATION: 20261116000002_fix_attendance_and_governance_rls.sql
-- Description: Unify attendance scanner RPC, fix xp_transactions reference_id,
--              sync profile emails, and grant robust admin RLS permissions.
-- ====================================================================

-- 1. Ensure reference_id column exists on xp_transactions
ALTER TABLE public.xp_transactions 
ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- 2. Update session_attendance verification_method check constraint
ALTER TABLE public.session_attendance 
DROP CONSTRAINT IF EXISTS session_attendance_verification_method_check;

ALTER TABLE public.session_attendance 
ADD CONSTRAINT session_attendance_verification_method_check 
CHECK (verification_method = ANY (ARRAY['qr'::text, 'manual'::text, 'rfid'::text, 'camera_qr'::text, 'nfc'::text]));

-- 3. Sync profile emails with auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email != u.email);

-- 4. Create trigger to keep profiles.email automatically in sync on signup/update
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_sync();

-- 5. Canonical is_admin function (strictly excludes mahdihelmin@gmail.com, includes all adamwalha accounts)
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (
    public.has_global_role(user_uuid, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = user_uuid 
      AND lower(COALESCE(email, '')) IN ('adamwalha20@gmail.com', 'adamwalha.isims@gmail.com', 'adamwalha2@gmail.com')
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = user_uuid
      AND lower(COALESCE(email, '')) IN ('adamwalha20@gmail.com', 'adamwalha.isims@gmail.com', 'adamwalha2@gmail.com')
    )
    OR lower(COALESCE(auth.jwt() ->> 'email', '')) IN ('adamwalha20@gmail.com', 'adamwalha.isims@gmail.com', 'adamwalha2@gmail.com')
    OR public.has_bureau_position(user_uuid, 'president')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
    AND lower(COALESCE(email, '')) = 'mahdihelmin@gmail.com'
  )
  AND NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_uuid
    AND lower(COALESCE(email, '')) = 'mahdihelmin@gmail.com'
  )
  AND lower(COALESCE(auth.jwt() ->> 'email', '')) != 'mahdihelmin@gmail.com';
$$;

-- 6. Ensure all Adam Walha accounts have the 'admin' role in user_roles
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
CROSS JOIN public.roles r
WHERE r.key = 'admin'
  AND (
    lower(COALESCE(p.email, '')) IN ('adamwalha20@gmail.com', 'adamwalha.isims@gmail.com', 'adamwalha2@gmail.com')
    OR p.student_id ILIKE 'ISIMS-ADMIN%'
  )
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 7. Strictly remove any admin role that might be assigned to mahdihelmin@gmail.com
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE lower(COALESCE(email, '')) = 'mahdihelmin@gmail.com'
)
AND role_id IN (
  SELECT id FROM public.roles WHERE key = 'admin'
);

-- 8. Drop overloaded register_qr_attendance signatures to avoid ambiguous candidate errors
DROP FUNCTION IF EXISTS public.register_qr_attendance(uuid, uuid, text, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.register_qr_attendance(uuid, uuid, uuid, text, timestamp with time zone);

-- 9. Single canonical register_qr_attendance implementation
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
SET search_path = public
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
    v_norm_method TEXT;
BEGIN
    -- Normalize verification method
    v_norm_method := CASE 
      WHEN p_verification_method IN ('qr', 'manual', 'rfid', 'camera_qr', 'nfc') THEN p_verification_method
      ELSE 'qr'
    END;

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
        v_norm_method,
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
            'method', v_norm_method
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
