import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdminEmail, RESTRICTED_NON_ADMIN_EMAILS } from '@/lib/constants/auth';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
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
        { success: false, error: 'Unauthorized: Only club administrators can revert actions.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ success: false, error: 'Audit log ID is required' }, { status: 400 });
    }

    // Determine database client
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
      return NextResponse.json({ success: false, error: 'This action cannot be undone.' }, { status: 400 });
    }

    const { action, previous_state, entity_type, entity_id } = log;
    let revertSuccess = false;
    let revertMessage = '';

    // 2. Perform the reversal according to action type
    if (action === 'ASSIGN_BUREAU_POSITION' && previous_state) {
      const { position_id, user_id: prevUserId } = previous_state as any;

      if (position_id) {
        // Clear current assignment
        await db
          .from('user_bureau_positions')
          .delete()
          .eq('position_id', position_id);

        // If there was a previous user assigned, restore them
        if (prevUserId) {
          await db
            .from('user_bureau_positions')
            .insert({
              position_id,
              user_id: prevUserId,
            });
        }

        revertSuccess = true;
        revertMessage = prevUserId
          ? 'Restored previous bureau officer assignment.'
          : 'Vacated bureau position back to unassigned.';
      }
    } else if (action === 'ASSIGN_USER_ROLE' && previous_state) {
      const { user_id, role: prevRole } = previous_state as any;
      if (user_id && prevRole) {
        const { data: roleRow } = await db.from('roles').select('id').eq('key', prevRole).single();
        if (roleRow) {
          await db.from('user_roles').delete().eq('user_id', user_id);
          await db.from('user_roles').insert({
            user_id,
            role_id: roleRow.id,
          });
          revertSuccess = true;
          revertMessage = `Restored user role to ${prevRole.toUpperCase()}.`;
        }
      }
    } else if (action === 'CORRECT_ATTENDANCE' && previous_state) {
      const { attendance_id, attendance_status, xp_awarded } = previous_state as any;
      if (attendance_id) {
        await db
          .from('session_attendance')
          .update({
            attendance_status,
            xp_awarded,
          })
          .eq('id', attendance_id);
        revertSuccess = true;
        revertMessage = 'Reverted attendance status to previous record.';
      }
    } else {
      // Generic reversal: update the entity directly if possible
      if (entity_type && entity_id && previous_state) {
        await db
          .from(entity_type)
          .update(previous_state)
          .eq('id', entity_id);
        revertSuccess = true;
        revertMessage = `Reverted changes for ${entity_type}.`;
      }
    }

    if (!revertSuccess) {
      return NextResponse.json({ success: false, error: 'Could not automatically reverse this action.' }, { status: 400 });
    }

    // 3. Mark the log as undone
    await db
      .from('audit_logs')
      .update({
        is_undone: true,
        undone_at: new Date().toISOString(),
        undone_by: user.id,
      })
      .eq('id', logId);

    // 4. Log the UNDO action in the audit log
    await db.from('audit_logs').insert({
      action: 'UNDO_ACTION',
      actor_id: user.id,
      entity_type,
      entity_id,
      details: `Reverted action "${action}": ${revertMessage}`,
      previous_state: { reverted_log_id: logId, previous_action: action },
      new_state: { undone: true },
      can_undo: false,
    });

    return NextResponse.json({
      success: true,
      message: revertMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to revert action' },
      { status: 500 }
    );
  }
}
