import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdminEmail, RESTRICTED_NON_ADMIN_EMAILS } from '@/lib/constants/auth';
import { logAuditEvent } from '@/lib/audit/audit-logger';

export async function POST(req: NextRequest) {
  try {
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

    const callerEmail = user.email?.toLowerCase().trim() || '';

    if (RESTRICTED_NON_ADMIN_EMAILS.some((r) => r.toLowerCase() === callerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: This account does not have administrative privileges.' },
        { status: 403 }
      );
    }

    const isSuperAdmin = isSuperAdminEmail(callerEmail);
    let isDbAdmin = false;

    if (!isSuperAdmin) {
      const { data: roleRecords } = await supabase
        .from('user_roles')
        .select('roles(key)')
        .eq('user_id', user.id);
      isDbAdmin = roleRecords?.some((r: any) => r.roles?.key === 'admin') || false;
    }

    if (!isSuperAdmin && !isDbAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only club administrators can reverse actions.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { logId, dryRun, force, reason } = body;

    if (!logId) {
      return NextResponse.json({ success: false, error: 'Audit log ID is required' }, { status: 400 });
    }

    let db = supabase;
    try {
      const adminClient = getSupabaseAdmin();
      if (adminClient) db = adminClient as any;
    } catch {}

    // 1. Fetch audit log entry
    const { data: log, error: fetchErr } = await db
      .from('audit_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (fetchErr || !log) {
      return NextResponse.json({ success: false, error: 'Audit log record not found' }, { status: 404 });
    }

    if (log.is_undone) {
      return NextResponse.json({ success: false, error: 'This action has already been undone.' }, { status: 400 });
    }

    if (log.can_undo === false) {
      return NextResponse.json(
        { success: false, error: 'This action cannot be undone automatically (e.g. permanently purged data or external emails).' },
        { status: 400 }
      );
    }

    const previousState = log.previous_state || log.old_values;
    if (!previousState) {
      return NextResponse.json(
        { success: false, error: 'Cannot undo: No previous state snapshot was captured for this record.' },
        { status: 400 }
      );
    }

    const { action, entity_type, entity_id } = log;
    const now = new Date().toISOString();

    // Map entity type to table name
    const tableMap: Record<string, string> = {
      event: 'events',
      events: 'events',
      meeting: 'meetings',
      meetings: 'meetings',
      task: 'tasks',
      tasks: 'tasks',
      project: 'projects',
      projects: 'projects',
      document: 'documents',
      documents: 'documents',
      announcement: 'announcements',
      announcements: 'announcements',
      member: 'profiles',
      members: 'profiles',
    };

    const tableName = tableMap[entity_type?.toLowerCase() || ''];

    // 2. Fetch current record if table exists to check for conflicts
    let currentRecord: any = null;
    let hasConflict = false;
    let conflictDetails = '';

    if (tableName && entity_id) {
      const { data: rec } = await db.from(tableName).select('*').eq('id', entity_id).single();
      currentRecord = rec;

      if (rec && rec.updated_at && log.created_at) {
        const recordUpdated = new Date(rec.updated_at).getTime();
        const logTime = new Date(log.created_at).getTime();
        // If record was modified more than 2 seconds after the action, trigger conflict check
        if (recordUpdated > logTime + 2000) {
          hasConflict = true;
          conflictDetails = `Record was updated at ${rec.updated_at} after this audit action was recorded at ${log.created_at}.`;
        }
      }
    }

    // 3. Dry run mode for conflict inspection
    if (dryRun) {
      return NextResponse.json({
        success: true,
        canUndo: true,
        hasConflict,
        conflictDetails,
        currentRecord,
        restoreState: previousState,
        action,
        entityType: entity_type,
        entityLabel: log.entity_label_snapshot || log.details,
      });
    }

    if (hasConflict && !force) {
      return NextResponse.json(
        {
          success: false,
          conflict: true,
          error: 'Conflict detected: This record has been updated since this action occurred. Inspect changes and confirm force undo to overwrite.',
          conflictDetails,
          currentRecord,
          restoreState: previousState,
        },
        { status: 409 }
      );
    }

    let revertSuccess = false;
    let revertMessage = '';

    // =========================================================================
    // EXECUTE SPECIFIC REVERSAL
    // =========================================================================

    // 1. Revert Bureau Position Assignment
    if (action === 'ASSIGN_BUREAU_POSITION') {
      const { position_id, user_id: prevUserId } = previousState as any;
      if (position_id) {
        await db.from('user_bureau_positions').delete().eq('position_id', position_id);
        if (prevUserId) {
          await db.from('user_bureau_positions').insert({ position_id, user_id: prevUserId });
        }
        revertSuccess = true;
        revertMessage = 'Bureau position assignment reverted successfully.';
      }
    }

    // 2. Revert User Role Assignment
    else if (action === 'ASSIGN_USER_ROLE') {
      const { role_id, user_id: prevUserId } = previousState as any;
      if (prevUserId) {
        await db.from('user_roles').delete().eq('user_id', prevUserId);
        if (role_id) {
          await db.from('user_roles').insert({ user_id: prevUserId, role_id });
        }
        revertSuccess = true;
        revertMessage = 'User role restored to previous configuration.';
      }
    }

    // 3. Revert Member Removal / Suspension
    else if (action === 'MEMBER_REMOVE' || action === 'MEMBER_SUSPEND' || action === 'MEMBER_REACTIVATE') {
      if (entity_id) {
        const targetStatus = previousState.membership_status || 'active';
        await db
          .from('club_memberships')
          .update({
            membership_status: targetStatus,
            suspended_at: targetStatus === 'suspended' ? now : null,
            removed_at: targetStatus === 'removed' ? now : null,
            is_deleted: false,
            updated_at: now,
          })
          .eq('user_id', entity_id);

        await db
          .from('profiles')
          .update({
            account_status: targetStatus === 'active' ? 'active' : targetStatus,
            is_deleted: false,
            updated_at: now,
          })
          .eq('id', entity_id);

        revertSuccess = true;
        revertMessage = `Member status reverted to "${targetStatus}".`;
      }
    }

    // 4. Revert Member Account Deletion (Restore Account)
    else if (action === 'MEMBER_DELETE_ACCOUNT') {
      if (entity_id) {
        await db
          .from('profiles')
          .update({
            is_deleted: false,
            deleted_at: null,
            deleted_by: null,
            deletion_reason: null,
            account_status: 'active',
            updated_at: now,
          })
          .eq('id', entity_id);

        await db
          .from('club_memberships')
          .update({
            is_deleted: false,
            deleted_at: null,
            membership_status: 'active',
            updated_at: now,
          })
          .eq('user_id', entity_id);

        revertSuccess = true;
        revertMessage = 'Member account restored from deletion.';
      }
    }

    // 5. Revert Event Edit
    else if (action === 'EVENT_EDIT' && entity_id) {
      const updateData: Record<string, any> = {
        title: previousState.title,
        description: previousState.description,
        starts_at: previousState.starts_at,
        ends_at: previousState.ends_at,
        location: previousState.location,
        capacity: previousState.capacity,
        department_id: previousState.department_id,
        status: previousState.status || 'published',
        visibility: previousState.visibility || 'club',
        updated_at: now,
        version: (currentRecord?.version || 1) + 1,
      };

      const { error: updErr } = await db.from('events').update(updateData).eq('id', entity_id);
      if (!updErr) {
        revertSuccess = true;
        revertMessage = `Event "${previousState.title}" restored to previous values.`;
      }
    }

    // 6. Revert Event Delete (Restore Event)
    else if (action === 'EVENT_DELETE' && entity_id) {
      const { error: updErr } = await db
        .from('events')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null,
          updated_at: now,
        })
        .eq('id', entity_id);

      if (!updErr) {
        revertSuccess = true;
        revertMessage = 'Event restored from Recycle Bin.';
      }
    }

    // 7. Generic Entity Restore for Soft Deletes (Tasks, Projects, Documents, Announcements)
    else if (action.endsWith('_DELETE') && tableName && entity_id) {
      const { error: updErr } = await db
        .from(tableName)
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null,
          updated_at: now,
        })
        .eq('id', entity_id);

      if (!updErr) {
        revertSuccess = true;
        revertMessage = `${entity_type} restored from Recycle Bin.`;
      }
    }

    // 8. Generic Entity Edit Restore (Tasks, Projects, Documents, Announcements)
    else if (action.endsWith('_EDIT') && tableName && entity_id) {
      const cleanPrev = { ...previousState };
      delete cleanPrev.id;
      cleanPrev.updated_at = now;

      const { error: updErr } = await db.from(tableName).update(cleanPrev).eq('id', entity_id);
      if (!updErr) {
        revertSuccess = true;
        revertMessage = `${entity_type} parameters restored to prior state.`;
      }
    }

    // Fallback if action type not recognized
    else {
      return NextResponse.json(
        { success: false, error: `Automated undo for action "${action}" is not supported.` },
        { status: 400 }
      );
    }

    if (!revertSuccess) {
      return NextResponse.json({ success: false, error: 'Failed to execute database reversal.' }, { status: 500 });
    }

    // 4. Mark the original audit record as undone
    await db
      .from('audit_logs')
      .update({
        is_undone: true,
        undone_at: now,
        undone_by: user.id,
      })
      .eq('id', logId);

    // 5. Create a brand NEW audit entry recording the undo reversal
    await logAuditEvent(
      {
        actorUserId: user.id,
        actorNameSnapshot: user.email,
        actorRoleSnapshot: isSuperAdmin ? 'Super Admin' : 'Admin',
        action: 'UNDO_REVERSAL',
        entityType: entity_type,
        entityId: entity_id,
        entityLabelSnapshot: log.entity_label_snapshot || log.details,
        oldValues: currentRecord || log.new_state,
        newValues: previousState,
        reason: reason || `Reversed previous action "${action}" (Audit Log ID: ${logId}).`,
        details: `Reversed audit action "${action}" on ${entity_type}.`,
        metadata: { undone_log_id: logId, original_action: action },
        canUndo: false, // Undo events themselves are terminal
      },
      db
    );

    return NextResponse.json({
      success: true,
      message: revertMessage || 'Action successfully undone.',
    });
  } catch (err: any) {
    console.error('Audit logs undo API error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
