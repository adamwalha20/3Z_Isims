import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdminEmail } from '@/lib/permissions/roles';
import { canEditProject, canDeleteProject, canRestoreRecord } from '@/lib/permissions/permission-checks';
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

    const db = supabase;

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

    // 1. Fetch current project
    const { data: existingProject, error: fetchErr } = await db
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingProject) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // 2. Validate edit permission
    if (!canEditProject(permCtx, existingProject)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to edit this project.' },
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
      'name',
      'description',
      'status',
      'budget_tnd',
      'start_date',
      'due_date',
      'department_id',
      'owner_id',
    ];

    const safeUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    const now = new Date().toISOString();
    safeUpdates.updated_at = now;
    safeUpdates.version = (existingProject.version || 1) + 1;

    const { data: updatedProject, error: updateErr } = await db
      .from('projects')
      .update(safeUpdates)
      .eq('id', id)
      .select('*, department:departments(*), owner:profiles!projects_owner_id_fkey(*)')
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
        action: 'PROJECT_EDIT',
        entityType: 'projects',
        entityId: id,
        entityLabelSnapshot: existingProject.name,
        oldValues: existingProject,
        newValues: updatedProject,
        reason: reason || 'Project parameters updated by authorized lead.',
        details: `Project "${existingProject.name}" was updated.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Project "${updatedProject.name}" was successfully updated.`,
      project: updatedProject,
    });
  } catch (err: any) {
    console.error('Project PATCH error:', err);
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

    const db = supabase;

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

    const { data: existingProject, error: fetchErr } = await db
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingProject) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Permission check
    if (!canDeleteProject(permCtx, existingProject)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to delete this project.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason?.trim();

    if (!reason) {
      return NextResponse.json({ success: false, error: 'A deletion reason is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Soft Delete: Preserves child tasks, progress records, and team assignments!
    const { error: deleteErr } = await db
      .from('projects')
      .update({
        is_deleted: true,
        deleted_at: now,
        deleted_by: user.id,
        deletion_reason: reason,
        updated_at: now,
        version: (existingProject.version || 1) + 1,
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
        action: 'PROJECT_DELETE',
        entityType: 'projects',
        entityId: id,
        entityLabelSnapshot: existingProject.name,
        oldValues: existingProject,
        newValues: {
          ...existingProject,
          is_deleted: true,
          deleted_at: now,
          deleted_by: user.id,
          deletion_reason: reason,
        },
        reason,
        details: `Project "${existingProject.name}" was soft-deleted to Recycle Bin. Linked tasks and team data are preserved.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Project "${existingProject.name}" was moved to the Recycle Bin.`,
    });
  } catch (err: any) {
    console.error('Project DELETE error:', err);
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

    const db = supabase;

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

    const { data: existingProject, error: fetchErr } = await db
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingProject) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { data: restoredProject, error: restoreErr } = await db
      .from('projects')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        updated_at: now,
        version: (existingProject.version || 1) + 1,
      })
      .eq('id', id)
      .select('*, department:departments(*), owner:profiles!projects_owner_id_fkey(*)')
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
        action: 'PROJECT_RESTORE',
        entityType: 'projects',
        entityId: id,
        entityLabelSnapshot: existingProject.name,
        oldValues: existingProject,
        newValues: restoredProject,
        reason: 'Restored from Recycle Bin by Administrator.',
        details: `Project "${existingProject.name}" was restored to active incubation.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Project "${restoredProject.name}" was successfully restored.`,
      project: restoredProject,
    });
  } catch (err: any) {
    console.error('Project RESTORE error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
