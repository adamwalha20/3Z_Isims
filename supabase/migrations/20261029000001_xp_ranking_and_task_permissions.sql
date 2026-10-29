-- ==============================================================================
-- ZEC Campus Hub — XP System, Member Ranking & Strict Task Permissions Migration
-- ZERO EXCLUSION CARBON POVERTY - Campus Club ISIMS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Update Tasks Schema for Verification Workflow
-- ------------------------------------------------------------------------------

-- Update check constraint on tasks.status to include 'waiting_verification'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('todo', 'in_progress', 'waiting_verification', 'blocked', 'done'));

-- Add verification and XP tracking columns to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS xp_awarded BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------------------------
-- 2. XP Architecture Tables
-- ------------------------------------------------------------------------------

-- 2.1 Member XP Aggregate Table
CREATE TABLE IF NOT EXISTS public.member_xp (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  completed_tasks_count INT NOT NULL DEFAULT 0 CHECK (completed_tasks_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_member_xp_updated_at
BEFORE UPDATE ON public.member_xp
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.2 Immutable XP Transactions Ledger
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('task', 'milestone', 'event', 'initiative', 'adjustment')),
  source_id UUID,
  idempotency_key TEXT UNIQUE NOT NULL,
  awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Configurable XP Rules Table
CREATE TABLE IF NOT EXISTS public.xp_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT UNIQUE NOT NULL,
  points INT NOT NULL CHECK (points > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  requires_verification BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_xp_rules_updated_at
BEFORE UPDATE ON public.xp_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.4 Member Achievements Table
CREATE TABLE IF NOT EXISTS public.member_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_member_achievement UNIQUE (user_id, achievement_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_xp_total ON public.member_xp(total_xp DESC, completed_tasks_count DESC);
CREATE INDEX IF NOT EXISTS idx_xp_tx_user ON public.xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_tx_source ON public.xp_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_xp_tx_idempotency ON public.xp_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.member_achievements(user_id);

-- ------------------------------------------------------------------------------
-- 3. Default XP Rules Seeding
-- ------------------------------------------------------------------------------

INSERT INTO public.xp_rules (action_type, points, is_active, requires_verification, description)
VALUES
  ('task_standard', 10, true, true, 'Standard task completed and verified'),
  ('task_high_priority', 20, true, true, 'High-priority or urgent task completed and verified'),
  ('project_milestone', 30, true, true, 'Major project milestone completed and verified'),
  ('event_participation', 15, true, true, 'Verified participation in an eligible club event'),
  ('initiative_contribution', 10, true, true, 'Verified contribution to a campus sustainability initiative')
ON CONFLICT (action_type) DO UPDATE
SET points = EXCLUDED.points,
    description = EXCLUDED.description,
    requires_verification = EXCLUDED.requires_verification;

-- Initialize member_xp rows for all existing profiles
INSERT INTO public.member_xp (user_id, total_xp, completed_tasks_count)
SELECT id, 0, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. Secure Business Functions (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- 4.1 Achievement Evaluator
CREATE OR REPLACE FUNCTION public.check_member_achievements(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_count INT;
  v_total_xp INT;
BEGIN
  SELECT completed_tasks_count, total_xp INTO v_task_count, v_total_xp
  FROM public.member_xp
  WHERE user_id = p_user_id;

  -- 1. First Task
  IF v_task_count >= 1 THEN
    INSERT INTO public.member_achievements (user_id, achievement_key, metadata)
    VALUES (p_user_id, 'first_task', '{"title": "First Step", "description": "Completed your first verified club task"}'::jsonb)
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  -- 2. Five Tasks
  IF v_task_count >= 5 THEN
    INSERT INTO public.member_achievements (user_id, achievement_key, metadata)
    VALUES (p_user_id, 'five_tasks', '{"title": "Consistent Contributor", "description": "Completed 5 verified tasks"}'::jsonb)
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  -- 3. Ten Tasks
  IF v_task_count >= 10 THEN
    INSERT INTO public.member_achievements (user_id, achievement_key, metadata)
    VALUES (p_user_id, 'ten_tasks', '{"title": "Task Champion", "description": "Completed 10 verified tasks"}'::jsonb)
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  -- 4. Club Dedicated
  IF v_total_xp >= 300 THEN
    INSERT INTO public.member_achievements (user_id, achievement_key, metadata)
    VALUES (p_user_id, 'dedicated_member', '{"title": "Dedicated Member", "description": "Reached 300+ total XP"}'::jsonb)
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  -- 5. Club Champion
  IF v_total_xp >= 500 THEN
    INSERT INTO public.member_achievements (user_id, achievement_key, metadata)
    VALUES (p_user_id, 'club_champion', '{"title": "Club Champion", "description": "Reached 500+ total XP"}'::jsonb)
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;
END;
$$;

-- 4.2 Atomically Award XP with Idempotency Protection
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_points INT,
  p_reason TEXT,
  p_source_type TEXT,
  p_source_id UUID,
  p_idempotency_key TEXT,
  p_awarded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_tx UUID;
  v_current_xp INT;
  v_new_xp INT;
BEGIN
  -- 1. Check idempotency key to prevent duplicate awards
  SELECT id INTO v_existing_tx
  FROM public.xp_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_tx IS NOT NULL THEN
    SELECT total_xp INTO v_current_xp FROM public.member_xp WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'duplicate_ignored', true,
      'total_xp', COALESCE(v_current_xp, 0)
    );
  END IF;

  -- 2. Insert transaction record
  INSERT INTO public.xp_transactions (
    user_id, points, reason, source_type, source_id, idempotency_key, awarded_by
  ) VALUES (
    p_user_id, p_points, p_reason, p_source_type, p_source_id, p_idempotency_key, p_awarded_by
  );

  -- 3. Upsert member aggregate XP
  INSERT INTO public.member_xp (user_id, total_xp, completed_tasks_count, updated_at)
  VALUES (
    p_user_id,
    GREATEST(0, p_points),
    CASE WHEN p_source_type = 'task' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET total_xp = GREATEST(0, public.member_xp.total_xp + p_points),
      completed_tasks_count = public.member_xp.completed_tasks_count + (CASE WHEN p_source_type = 'task' THEN 1 ELSE 0 END),
      updated_at = NOW()
  RETURNING total_xp INTO v_new_xp;

  -- 4. Send in-app notification
  INSERT INTO public.notifications (
    recipient_id, type, title, body, target_type, target_id
  ) VALUES (
    p_user_id,
    'xp_awarded',
    'XP Awarded! (+' || p_points || ' XP)',
    p_reason,
    p_source_type,
    p_source_id
  );

  -- 5. Evaluate achievements
  PERFORM public.check_member_achievements(p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', p_points,
    'total_xp', v_new_xp
  );
END;
$$;

-- 4.3 Member Task Completion / Submission RPC
CREATE OR REPLACE FUNCTION public.submit_task_for_verification(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_caller UUID := auth.uid();
  v_is_assignee BOOLEAN;
  v_is_bureau_or_admin BOOLEAN;
BEGIN
  -- Validate authenticated caller
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Fetch task
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found.';
  END IF;

  -- Check authorization: caller must be an assignee, task creator, or bureau/admin
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees WHERE task_id = p_task_id AND user_id = v_caller
  ) INTO v_is_assignee;

  v_is_bureau_or_admin := public.is_bureau(v_caller) OR v_caller = v_task.creator_id;

  IF NOT (v_is_assignee OR v_is_bureau_or_admin) THEN
    RAISE EXCEPTION 'You are not assigned to this task or authorized to submit it.';
  END IF;

  -- If verification is required, move to waiting_verification
  IF v_task.requires_verification THEN
    UPDATE public.tasks
    SET status = 'waiting_verification',
        rejection_reason = NULL,
        updated_at = NOW()
    WHERE id = p_task_id;

    -- Notify creator or bureau
    INSERT INTO public.notifications (
      recipient_id, type, title, body, target_type, target_id
    ) VALUES (
      v_task.creator_id,
      'task_submitted',
      'Task Ready for Verification',
      'Task "' || v_task.title || '" was submitted for your verification.',
      'task',
      p_task_id
    );

    RETURN jsonb_build_object('success', true, 'status', 'waiting_verification');
  ELSE
    -- If no verification is required, safely mark done and award XP once
    UPDATE public.tasks
    SET status = 'done',
        completed_at = NOW(),
        xp_awarded = TRUE,
        updated_at = NOW()
    WHERE id = p_task_id;

    -- Award points to caller if not already awarded
    PERFORM public.award_xp(
      v_caller,
      10,
      'Completed task: ' || v_task.title,
      'task',
      p_task_id,
      'task_' || p_task_id || '_' || v_caller,
      v_task.creator_id
    );

    RETURN jsonb_build_object('success', true, 'status', 'done');
  END IF;
END;
$$;

-- 4.4 Task Verification Review RPC (Bureau & Admin only)
CREATE OR REPLACE FUNCTION public.verify_task(
  p_task_id UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_caller UUID := auth.uid();
  v_assignee RECORD;
  v_rule_key TEXT;
  v_points INT := 10;
  v_can_verify BOOLEAN;
  v_is_self_assignee BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found.';
  END IF;

  -- Caller must be admin, or task creator, or bureau officer with authorized scope
  v_can_verify := public.is_admin(v_caller) OR v_caller = v_task.creator_id OR public.is_bureau(v_caller);
  IF NOT v_can_verify THEN
    RAISE EXCEPTION 'You are not authorized to verify this task.';
  END IF;

  -- Anti-abuse check: A member CANNOT approve their own work when independent verification is required
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees WHERE task_id = p_task_id AND user_id = v_caller
  ) INTO v_is_self_assignee;

  IF v_is_self_assignee AND NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'Conflict of interest: You cannot verify your own assigned work.';
  END IF;

  IF p_approved THEN
    -- Determine points based on priority rule
    IF v_task.priority IN ('urgent', 'high') THEN
      v_rule_key := 'task_high_priority';
      SELECT points INTO v_points FROM public.xp_rules WHERE action_type = 'task_high_priority';
      v_points := COALESCE(v_points, 20);
    ELSE
      v_rule_key := 'task_standard';
      SELECT points INTO v_points FROM public.xp_rules WHERE action_type = 'task_standard';
      v_points := COALESCE(v_points, 10);
    END IF;

    -- Update task to completed and verified
    UPDATE public.tasks
    SET status = 'done',
        completed_at = NOW(),
        verified_by = v_caller,
        verified_at = NOW(),
        rejection_reason = NULL,
        xp_awarded = TRUE,
        updated_at = NOW()
    WHERE id = p_task_id;

    -- Award XP to all assignees
    FOR v_assignee IN (SELECT user_id FROM public.task_assignees WHERE task_id = p_task_id) LOOP
      PERFORM public.award_xp(
        v_assignee.user_id,
        v_points,
        'Verified task completion: ' || v_task.title,
        'task',
        p_task_id,
        'task_' || p_task_id || '_' || v_assignee.user_id,
        v_caller
      );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'status', 'done', 'points_awarded', v_points);
  ELSE
    -- Rejection / Revision requested
    UPDATE public.tasks
    SET status = 'todo',
        rejection_reason = COALESCE(p_rejection_reason, 'Verification failed. Please revise and resubmit.'),
        updated_at = NOW()
    WHERE id = p_task_id;

    -- Notify assignees
    FOR v_assignee IN (SELECT user_id FROM public.task_assignees WHERE task_id = p_task_id) LOOP
      INSERT INTO public.notifications (
        recipient_id, type, title, body, target_type, target_id
      ) VALUES (
        v_assignee.user_id,
        'task_rejected',
        'Task Needs Revision',
        'Verification note for "' || v_task.title || '": ' || COALESCE(p_rejection_reason, 'Please revise.'),
        'task',
        p_task_id
      );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'status', 'todo', 'rejection_reason', p_rejection_reason);
  END IF;
END;
$$;

-- 4.5 Admin Manual XP Adjustment RPC
CREATE OR REPLACE FUNCTION public.admin_adjust_xp(
  p_user_id UUID,
  p_points INT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_res JSONB;
BEGIN
  IF NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'Only administrators can make manual XP adjustments.';
  END IF;

  v_res := public.award_xp(
    p_user_id,
    p_points,
    'Admin Adjustment: ' || p_reason,
    'adjustment',
    NULL,
    'adj_' || gen_random_uuid(),
    v_caller
  );

  -- Log to audit_logs
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_caller,
    'ADMIN_XP_ADJUSTMENT',
    'member_xp',
    p_user_id,
    jsonb_build_object('points', p_points, 'reason', p_reason)
  );

  RETURN v_res;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Updated RLS Policies (Strict Task Permissions & XP Protection)
-- ------------------------------------------------------------------------------

-- Enable RLS on new tables
ALTER TABLE public.member_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_achievements ENABLE ROW LEVEL SECURITY;

-- 5.1 Member XP: Authenticated users can read (for ranking/profile), only system/admin can write
DROP POLICY IF EXISTS "Member XP viewable by authenticated users" ON public.member_xp;
CREATE POLICY "Member XP viewable by authenticated users"
ON public.member_xp FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Member XP manageable only by admin" ON public.member_xp;
CREATE POLICY "Member XP manageable only by admin"
ON public.member_xp FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5.2 XP Transactions: User can view own, Admin can view all
DROP POLICY IF EXISTS "Users can view own XP transactions" ON public.xp_transactions;
CREATE POLICY "Users can view own XP transactions"
ON public.xp_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "XP transactions manageable only by admin" ON public.xp_transactions;
CREATE POLICY "XP transactions manageable only by admin"
ON public.xp_transactions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5.3 XP Rules: Readable by all, manageable only by admin
DROP POLICY IF EXISTS "XP rules readable by authenticated members" ON public.xp_rules;
CREATE POLICY "XP rules readable by authenticated members"
ON public.xp_rules FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "XP rules manageable only by admin" ON public.xp_rules;
CREATE POLICY "XP rules manageable only by admin"
ON public.xp_rules FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5.4 Member Achievements: Readable by all, manageable only by admin
DROP POLICY IF EXISTS "Achievements viewable by authenticated users" ON public.member_achievements;
CREATE POLICY "Achievements viewable by authenticated users"
ON public.member_achievements FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Achievements manageable only by admin" ON public.member_achievements;
CREATE POLICY "Achievements manageable only by admin"
ON public.member_achievements FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5.5 Strict Task RLS Overhauls
-- Members CANNOT create, delete, or arbitrarily edit tasks. Only Bureau and Admin can create!
DROP POLICY IF EXISTS "Tasks creatable by active members" ON public.tasks;
DROP POLICY IF EXISTS "Tasks creatable by bureau and admin" ON public.tasks;
CREATE POLICY "Tasks creatable by bureau and admin"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.is_bureau(auth.uid()));

DROP POLICY IF EXISTS "Tasks updatable by assignees, leads, bureau, or creator" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by bureau and admin" ON public.tasks;
CREATE POLICY "Tasks updatable by bureau and admin"
ON public.tasks FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_bureau(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_bureau(auth.uid()));

DROP POLICY IF EXISTS "Tasks deletable by bureau and admin" ON public.tasks;
CREATE POLICY "Tasks deletable by bureau and admin"
ON public.tasks FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()) OR (public.is_bureau(auth.uid()) AND creator_id = auth.uid()));

-- Task Assignees: Members cannot add or remove assignees! Only Bureau or Admin can assign.
DROP POLICY IF EXISTS "Task assignees manageable by bureau and admin" ON public.task_assignees;
CREATE POLICY "Task assignees manageable by bureau and admin"
ON public.task_assignees FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_bureau(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_bureau(auth.uid()));
