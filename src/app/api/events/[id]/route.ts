import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdminEmail } from '@/lib/permissions/roles';
import { canEditEvent, canDeleteEvent, canRestoreRecord } from '@/lib/permissions/permission-checks';
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

    const permCtx = {
      userId: user.id,
      email: user.email,
      role: userRoles?.some((r: any) => r.roles?.key === 'admin') ? 'admin' : 'bureau',
      bureauPositions: (userPositions || []).map((p: any) => p.bureau_positions?.key).filter(Boolean),
    };

    // 1. Fetch current event
    const { data: existingEvent, error: fetchErr } = await db.from('events').select('*').eq('id', id).single();
    if (fetchErr || !existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    // 2. Validate edit permission
    if (!canEditEvent(permCtx, existingEvent)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to edit this event.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { updates, reason } = body;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'No update payload provided' }, { status: 400 });
    }

    // Filter allowed fields
    const allowedFields = [
      'title',
      'description',
      'starts_at',
      'ends_at',
      'location',
      'capacity',
      'department_id',
      'status',
      'visibility',
    ];

    const safeUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    const now = new Date().toISOString();
    safeUpdates.updated_at = now;
    safeUpdates.version = (existingEvent.version || 1) + 1;

    const { data: updatedEvent, error: updateErr } = await db
      .from('events')
      .update(safeUpdates)
      .eq('id', id)
      .select('*, department:departments(*), organizer:profiles!events_organizer_id_fkey(*)')
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
        action: 'EVENT_EDIT',
        entityType: 'events',
        entityId: id,
        entityLabelSnapshot: existingEvent.title,
        oldValues: existingEvent,
        newValues: updatedEvent,
        reason: reason || 'Event parameters updated by event organizer.',
        details: `Event "${existingEvent.title}" was updated.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Event "${updatedEvent.title}" was successfully updated.`,
      event: updatedEvent,
    });
  } catch (err: any) {
    console.error('Event PATCH error:', err);
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

    const permCtx = {
      userId: user.id,
      email: user.email,
      role: userRoles?.some((r: any) => r.roles?.key === 'admin') ? 'admin' : 'bureau',
      bureauPositions: (userPositions || []).map((p: any) => p.bureau_positions?.key).filter(Boolean),
    };

    const { data: existingEvent, error: fetchErr } = await db.from('events').select('*').eq('id', id).single();
    if (fetchErr || !existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    if (!canDeleteEvent(permCtx, existingEvent)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to delete this event.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason?.trim();

    if (!reason) {
      return NextResponse.json({ success: false, error: 'A deletion reason is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Soft Delete: Preserves event registrations & attendance history!
    const { error: deleteErr } = await db
      .from('events')
      .update({
        is_deleted: true,
        deleted_at: now,
        deleted_by: user.id,
        deletion_reason: reason,
        updated_at: now,
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
        action: 'EVENT_DELETE',
        entityType: 'events',
        entityId: id,
        entityLabelSnapshot: existingEvent.title,
        oldValues: existingEvent,
        newValues: { is_deleted: true, deleted_at: now, deletion_reason: reason },
        reason,
        details: `Event "${existingEvent.title}" was soft-deleted and moved to Recycle Bin.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Event "${existingEvent.title}" was moved to the Recycle Bin. Attendance history is preserved.`,
    });
  } catch (err: any) {
    console.error('Event DELETE error:', err);
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

    const { data: userRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', user.id);
    const isAdmin = isSuperAdminEmail(user.email) || userRoles?.some((r: any) => r.roles?.key === 'admin');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Restoring events requires administrator permissions.' },
        { status: 403 }
      );
    }

    const { data: existingEvent, error: fetchErr } = await db.from('events').select('*').eq('id', id).single();
    if (fetchErr || !existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { error: restoreErr } = await db
      .from('events')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        updated_at: now,
      })
      .eq('id', id);

    if (restoreErr) {
      return NextResponse.json({ success: false, error: restoreErr.message }, { status: 500 });
    }

    await logAuditEvent(
      {
        actorUserId: user.id,
        actorNameSnapshot: user.email,
        actorRoleSnapshot: 'Admin',
        action: 'EVENT_RESTORE',
        entityType: 'events',
        entityId: id,
        entityLabelSnapshot: existingEvent.title,
        oldValues: { is_deleted: true, deleted_at: existingEvent.deleted_at },
        newValues: { is_deleted: false, restored_at: now },
        reason: 'Restored from Recycle Bin',
        details: `Event "${existingEvent.title}" was restored to active calendar.`,
        canUndo: true,
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: `Event "${existingEvent.title}" was successfully restored.`,
    });
  } catch (err: any) {
    console.error('Event POST restore error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
