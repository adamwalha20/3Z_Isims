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
    lower(p.email) IN ('adamwalha20@gmail.com', 'mahdihelmin@gmail.com')
    OR p.student_id ILIKE 'ISIMS-ADMIN-%'
  )
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 5. Strengthen public.is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_global_role(user_uuid, 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uuid 
    AND (
      lower(email) IN ('adamwalha20@gmail.com', 'mahdihelmin@gmail.com')
      OR student_id ILIKE 'ISIMS-ADMIN-%'
    )
  )
  OR public.has_bureau_position(user_uuid, 'president');
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
