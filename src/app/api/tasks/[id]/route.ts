import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdminEmail } from '@/lib/permissions/roles';
import { canEditTask, canDeleteTask, canRestoreRecord } from '@/lib/permissions/permission-checks';
import { logAuditEvent } from '@/lib/audit/audit-logger';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const adminDb = getSupabaseAdmin();
    const db = adminDb || supabase;

    // Construct permission context
    const { data: userProfile } = await db.from('profiles').select('*').eq('id', user.id).single();
    const { data: userRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', user.id);
    const { data: userPositions } = await db.from('user_bureau_positions').select('bureau_positions(key)').eq('user_id', user.id);

    const isSuperAdmin = isSuperAdminEmail(user.email);
    const permCtx = {
      userId: user.id,
      email: user.email,
      role: isSuperAdmin || userRoles?.some((r: any) => r.roles?.key === 'admin') ? 'admin' : 'bureau',
      bureauPositions: (userPositions || []).map((p: any) => p.bureau_positions?.key).filter(Boolean),
      departmentId: userProfile?.department_id,
    };

    // 1. Fetch current task
    const { data: existingTask, error: fetchErr } = await db
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingTask) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // 2. Validate edit permission
    if (!canEditTask(permCtx, existingTask)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to edit this task.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { updates, reason } = body;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'No update payload provided' }, { status: 400 });
    }

    // Allowed fields
    const allowedFields = [
      'title',
      'description',
      'priority',
      'status',
      'due_at',
      'department_id',
      'project_id',
      'requires_verification',
      'xp_awarded',
    ];

    const safeUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    const now = new Date().toISOString();
    safeUpdates.updated_at = now;
    safeUpdates.version = (existingTask.version || 1) + 1;

    const { data: updatedTask, error: updateErr } = await db
      .from('tasks')
      .update(safeUpdates)
      .eq('id', id)
      .select('*, department:departments(*), project:projects(*)')
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // Log Audit Record
    await logAuditEvent(
      {
        actorUserId: user.id,
        actorNameSnapshot: userProfile?.full_name || user.email,
        actorRoleSnapshot: permCtx.bureauPositions[0] || permCtx.role,
        action: 'TASK_EDIT',
        entityType: 'tasks',
        entityId: id,
        entityLabelSnapshot: existingTask.title,
        oldValues: existingTask,
        newValues: updatedTask,
        reason: reason || 'Task parameters updated by authorized lead.',
        details: `Task "${existingTask.title}" was updated.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Task "${updatedTask.title}" was successfully updated.`,
      task: updatedTask,
    });
  } catch (err: any) {
    console.error('Task PATCH error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const adminDb = getSupabaseAdmin();
    const db = adminDb || supabase;

    const { data: userProfile } = await db.from('profiles').select('*').eq('id', user.id).single();
    const { data: userRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', user.id);
    const { data: userPositions } = await db.from('user_bureau_positions').select('bureau_positions(key)').eq('user_id', user.id);

    const isSuperAdmin = isSuperAdminEmail(user.email);
    const permCtx = {
      userId: user.id,
      email: user.email,
      role: isSuperAdmin || userRoles?.some((r: any) => r.roles?.key === 'admin') ? 'admin' : 'bureau',
      bureauPositions: (userPositions || []).map((p: any) => p.bureau_positions?.key).filter(Boolean),
      departmentId: userProfile?.department_id,
    };

    const { data: existingTask, error: fetchErr } = await db
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingTask) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Permission check
    if (!canDeleteTask(permCtx, existingTask)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to delete this task.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason?.trim();

    if (!reason) {
      return NextResponse.json({ success: false, error: 'A deletion reason is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Soft Delete: Preserves task completions & verified XP transactions!
    const { error: deleteErr } = await db
      .from('tasks')
      .update({
        is_deleted: true,
        deleted_at: now,
        deleted_by: user.id,
        deletion_reason: reason,
        updated_at: now,
        version: (existingTask.version || 1) + 1,
      })
      .eq('id', id);

    if (deleteErr) {
      return NextResponse.json({ success: false, error: deleteErr.message }, { status: 500 });
    }

    // Log Audit Record
    await logAuditEvent(
      {
        actorUserId: user.id,
        actorNameSnapshot: userProfile?.full_name || user.email,
        actorRoleSnapshot: permCtx.bureauPositions[0] || permCtx.role,
        action: 'TASK_DELETE',
        entityType: 'tasks',
        entityId: id,
        entityLabelSnapshot: existingTask.title,
        oldValues: existingTask,
        newValues: {
          ...existingTask,
          is_deleted: true,
          deleted_at: now,
          deleted_by: user.id,
          deletion_reason: reason,
        },
        reason,
        details: `Task "${existingTask.title}" was soft-deleted to Recycle Bin. XP and submission history are preserved.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Task "${existingTask.title}" was moved to the Recycle Bin.`,
    });
  } catch (err: any) {
    console.error('Task DELETE error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const adminDb = getSupabaseAdmin();
    const db = adminDb || supabase;

    const { data: userProfile } = await db.from('profiles').select('*').eq('id', user.id).single();
    const { data: userRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', user.id);
    const { data: userPositions } = await db.from('user_bureau_positions').select('bureau_positions(key)').eq('user_id', user.id);

    const isSuperAdmin = isSuperAdminEmail(user.email);
    const permCtx = {
      userId: user.id,
      email: user.email,
      role: isSuperAdmin || userRoles?.some((r: any) => r.roles?.key === 'admin') ? 'admin' : 'bureau',
      bureauPositions: (userPositions || []).map((p: any) => p.bureau_positions?.key).filter(Boolean),
    };

    if (!canRestoreRecord(permCtx)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only administrators can restore records from the Recycle Bin.' },
        { status: 403 }
      );
    }

    const { data: existingTask, error: fetchErr } = await db
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingTask) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { data: restoredTask, error: restoreErr } = await db
      .from('tasks')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        updated_at: now,
        version: (existingTask.version || 1) + 1,
      })
      .eq('id', id)
      .select('*, department:departments(*), project:projects(*)')
      .single();

    if (restoreErr) {
      return NextResponse.json({ success: false, error: restoreErr.message }, { status: 500 });
    }

    // Log Audit Record
    await logAuditEvent(
      {
        actorUserId: user.id,
        actorNameSnapshot: userProfile?.full_name || user.email,
        actorRoleSnapshot: permCtx.bureauPositions[0] || permCtx.role,
        action: 'TASK_RESTORE',
        entityType: 'tasks',
        entityId: id,
        entityLabelSnapshot: existingTask.title,
        oldValues: existingTask,
        newValues: restoredTask,
        reason: 'Restored from Recycle Bin by Administrator.',
        details: `Task "${existingTask.title}" was restored to active sprint.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Task "${restoredTask.title}" was successfully restored.`,
      task: restoredTask,
    });
  } catch (err: any) {
    console.error('Task RESTORE error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
