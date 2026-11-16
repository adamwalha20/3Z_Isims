-- ==============================================================================
-- Migration: Advanced Audit Logs, Append-Only Guarantee, Soft-Delete & HR Control
-- ==============================================================================

-- 1. Enhance audit_logs with exact fields from specification
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name_snapshot TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role_snapshot TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_label_snapshot TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;

-- Prevent hard deletion of audit logs (Append-only security requirement)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are append-only and cannot be deleted or purged.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_deletion ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_deletion
BEFORE DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_deletion();

-- 2. Soft-delete columns on core entity tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['events', 'meetings', 'tasks', 'projects', 'announcements', 'documents', 'club_memberships'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;', tbl);
  END LOOP;
END $$;

-- 3. Enhance club_memberships with HR suspension and removal fields
ALTER TABLE public.club_memberships ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.club_memberships ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.club_memberships ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL;
ALTER TABLE public.club_memberships ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.club_memberships ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.club_memberships ADD COLUMN IF NOT EXISTS removal_reason TEXT DEFAULT NULL;

-- 4. Enhance profiles with soft-delete & account status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';
