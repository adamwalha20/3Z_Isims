import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ success: false, error: 'Audit log ID is required' }, { status: 400 });
    }

    // 1. Fetch audit log entry
    const { data: log, error: fetchErr } = await supabase
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
        await supabase
          .from('user_bureau_positions')
          .delete()
          .eq('position_id', position_id);

        // If there was a previous user assigned, restore them
        if (prevUserId) {
          await supabase
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
        const { data: roleRow } = await supabase.from('roles').select('id').eq('key', prevRole).single();
        if (roleRow) {
          await supabase.from('user_roles').delete().eq('user_id', user_id);
          await supabase.from('user_roles').insert({
            user_id,
            role_id: roleRow.id,
          });
          revertSuccess = true;
          revertMessage = `Restored user role to ${prevRole.toUpperCase()}.`;
        }
      }
    } else if (action === 'CORRECT_ATTENDANCE' && previous_state) {
      const { attendance_id, previous_status, previous_xp } = previous_state as any;
      if (attendance_id) {
        await supabase
          .from('session_attendance')
          .update({
            attendance_status: previous_status,
            xp_awarded: previous_xp || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', attendance_id);

        revertSuccess = true;
        revertMessage = `Reverted attendance record to ${previous_status}.`;
      }
    } else if (action === 'ADMIN_XP_ADJUSTMENT' && log.metadata) {
      const { points } = log.metadata as any;
      const targetUserId = entity_id;

      if (targetUserId && points) {
        // Apply inverse XP adjustment
        const delta = -Number(points);
        await supabase.rpc('award_member_xp', {
          p_user_id: targetUserId,
          p_points: delta,
          p_reason: `Undo of adjustment (Log ID: ${logId.slice(0, 8)})`,
          p_category: 'admin_adjustment',
        });

        revertSuccess = true;
        revertMessage = `Reversed XP transaction by ${delta > 0 ? '+' : ''}${delta} XP.`;
      }
    } else {
      // Generic undo fallback
      revertSuccess = true;
      revertMessage = 'Action marked as reverted.';
    }

    if (!revertSuccess) {
      return NextResponse.json({ success: false, error: 'Could not execute automated reversal for this log.' }, { status: 400 });
    }

    // 3. Mark audit log as undone
    const { error: updateErr } = await supabase
      .from('audit_logs')
      .update({
        is_undone: true,
        undone_at: new Date().toISOString(),
      })
      .eq('id', logId);

    if (updateErr) {
      console.error('Error marking audit log undone:', updateErr);
    }

    // 4. Insert an audit log of the undo event
    await supabase.from('audit_logs').insert({
      action: 'UNDO_ACTION',
      entity_type: entity_type || 'audit_logs',
      entity_id: logId,
      details: `Admin undone action ${action}: ${revertMessage}`,
      metadata: { original_log_id: logId, original_action: action },
      can_undo: false,
    });

    return NextResponse.json({
      success: true,
      message: revertMessage || 'Successfully undone change.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to undo action' }, { status: 500 });
  }
}

