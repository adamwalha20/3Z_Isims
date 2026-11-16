import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdminEmail } from '@/lib/permissions/roles';
import { canRemoveMember, canSuspendMember, canReactivateMember, canDeleteMemberAccount } from '@/lib/permissions/permission-checks';
import { logAuditEvent } from '@/lib/audit/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    if (!caller) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { action, userId, reason, permanent } = body;

    if (!action || !userId) {
      return NextResponse.json({ success: false, error: 'Action and target userId are required' }, { status: 400 });
    }

    const adminDb = getSupabaseAdmin();
    const db = supabase;

    // Fetch caller profile & roles to construct permission context
    const { data: callerProfile } = await db.from('profiles').select('*').eq('id', caller.id).single();
    const { data: callerRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', caller.id);
    const { data: callerPositions } = await db.from('user_bureau_positions').select('bureau_positions(key)').eq('user_id', caller.id);

    const callerGlobalRole = callerRoles?.some((r: any) => r.roles?.key === 'admin')
      ? 'admin'
      : callerPositions && callerPositions.length > 0
      ? 'bureau'
      : 'member';

    const callerPositionKeys = (callerPositions || []).map((p: any) => p.bureau_positions?.key).filter(Boolean);

    const permCtx = {
      userId: caller.id,
      email: caller.email,
      role: callerGlobalRole,
      bureauPositions: callerPositionKeys,
    };

    // Fetch target member profile & membership
    const { data: targetProfile, error: targetErr } = await db.from('profiles').select('*').eq('id', userId).single();
    if (targetErr || !targetProfile) {
      return NextResponse.json({ success: false, error: 'Target member not found' }, { status: 404 });
    }

    const { data: targetMembership } = await db.from('club_memberships').select('*').eq('user_id', userId).single();

    // Check if target is an administrator
    const { data: targetRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', userId);
    const isTargetAdmin =
      isSuperAdminEmail(targetProfile.email) ||
      targetRoles?.some((r: any) => r.roles?.key === 'admin');

    const targetLabel = `${targetProfile.full_name} (${targetProfile.email || targetProfile.student_id})`;

    // =========================================================================
    // 1. ACTION: REMOVE FROM CLUB
    // =========================================================================
    if (action === 'remove') {
      if (!canRemoveMember(permCtx, { id: userId, email: targetProfile.email, role: isTargetAdmin ? 'admin' : 'member' })) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: You do not have permission to remove this member.' },
          { status: 403 }
        );
      }

      if (!reason || !reason.trim()) {
        return NextResponse.json({ success: false, error: 'A removal reason is required.' }, { status: 400 });
      }

      const prevMembership = targetMembership || {};
      const now = new Date().toISOString();

      // Update club_memberships
      await db
        .from('club_memberships')
        .update({
          membership_status: 'removed',
          removed_at: now,
          removed_by: caller.id,
          removal_reason: reason.trim(),
          updated_at: now,
        })
        .eq('user_id', userId);

      // Update profile status
      await db
        .from('profiles')
        .update({
          account_status: 'removed',
          updated_at: now,
        })
        .eq('id', userId);

      // Record in Audit Log
      await logAuditEvent(
        {
          actorUserId: caller.id,
          actorNameSnapshot: callerProfile?.full_name || caller.email,
          actorRoleSnapshot: callerPositionKeys[0] || callerGlobalRole,
          action: 'MEMBER_REMOVE',
          entityType: 'members',
          entityId: userId,
          entityLabelSnapshot: targetLabel,
          oldValues: {
            membership_status: prevMembership.membership_status || 'active',
            account_status: targetProfile.account_status || 'active',
          },
          newValues: {
            membership_status: 'removed',
            account_status: 'removed',
            removed_at: now,
            removal_reason: reason.trim(),
          },
          reason: reason.trim(),
          details: `Member ${targetProfile.full_name} was removed from the club by ${callerProfile?.full_name || caller.email}.`,
          canUndo: true,
        },
        db
      );

      return NextResponse.json({
        success: true,
        message: `Member ${targetProfile.full_name} was successfully removed from the club.`,
      });
    }

    // =========================================================================
    // 2. ACTION: SUSPEND ACCESS
    // =========================================================================
    if (action === 'suspend') {
      if (!canSuspendMember(permCtx, { id: userId, email: targetProfile.email, role: isTargetAdmin ? 'admin' : 'member' })) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Administrators cannot be suspended, or insufficient permissions.' },
          { status: 403 }
        );
      }

      if (!reason || !reason.trim()) {
        return NextResponse.json({ success: false, error: 'A suspension reason is required.' }, { status: 400 });
      }

      const prevMembership = targetMembership || {};
      const now = new Date().toISOString();

      await db
        .from('club_memberships')
        .update({
          membership_status: 'suspended',
          suspended_at: now,
          suspended_by: caller.id,
          suspension_reason: reason.trim(),
          updated_at: now,
        })
        .eq('user_id', userId);

      await db
        .from('profiles')
        .update({
          account_status: 'suspended',
          updated_at: now,
        })
        .eq('id', userId);

      await logAuditEvent(
        {
          actorUserId: caller.id,
          actorNameSnapshot: callerProfile?.full_name || caller.email,
          actorRoleSnapshot: callerPositionKeys[0] || callerGlobalRole,
          action: 'MEMBER_SUSPEND',
          entityType: 'members',
          entityId: userId,
          entityLabelSnapshot: targetLabel,
          oldValues: {
            membership_status: prevMembership.membership_status || 'active',
            account_status: targetProfile.account_status || 'active',
          },
          newValues: {
            membership_status: 'suspended',
            account_status: 'suspended',
            suspended_at: now,
            suspension_reason: reason.trim(),
          },
          reason: reason.trim(),
          details: `Member ${targetProfile.full_name} was suspended by ${callerProfile?.full_name || caller.email}.`,
          canUndo: true,
        },
        db
      );

      return NextResponse.json({
        success: true,
        message: `Member ${targetProfile.full_name}'s access was suspended.`,
      });
    }

    // =========================================================================
    // 3. ACTION: REACTIVATE MEMBER
    // =========================================================================
    if (action === 'reactivate') {
      if (!canReactivateMember(permCtx, { id: userId, email: targetProfile.email, role: isTargetAdmin ? 'admin' : 'member' })) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: You do not have permission to reactivate this member.' },
          { status: 403 }
        );
      }

      const prevMembership = targetMembership || {};
      const now = new Date().toISOString();

      await db
        .from('club_memberships')
        .update({
          membership_status: 'active',
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
          removed_at: null,
          removed_by: null,
          removal_reason: null,
          is_deleted: false,
          deleted_at: null,
          updated_at: now,
        })
        .eq('user_id', userId);

      await db
        .from('profiles')
        .update({
          account_status: 'active',
          is_deleted: false,
          deleted_at: null,
          updated_at: now,
        })
        .eq('id', userId);

      await logAuditEvent(
        {
          actorUserId: caller.id,
          actorNameSnapshot: callerProfile?.full_name || caller.email,
          actorRoleSnapshot: callerPositionKeys[0] || callerGlobalRole,
          action: 'MEMBER_REACTIVATE',
          entityType: 'members',
          entityId: userId,
          entityLabelSnapshot: targetLabel,
          oldValues: {
            membership_status: prevMembership.membership_status || 'suspended',
            account_status: targetProfile.account_status || 'suspended',
          },
          newValues: {
            membership_status: 'active',
            account_status: 'active',
          },
          reason: reason || 'Account reinstated by HR / Administration.',
          details: `Member ${targetProfile.full_name} was reactivated.`,
          canUndo: true,
        },
        db
      );

      return NextResponse.json({
        success: true,
        message: `Member ${targetProfile.full_name} has been successfully reactivated.`,
      });
    }

    // =========================================================================
    // 4. ACTION: DELETE ACCOUNT (SOFT DELETE OR PERMANENT FOR SUPER ADMIN)
    // =========================================================================
    if (action === 'delete_account') {
      if (!canDeleteMemberAccount(permCtx, { id: userId, email: targetProfile.email, role: isTargetAdmin ? 'admin' : 'member' })) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Cannot delete administrator accounts or insufficient privileges.' },
          { status: 403 }
        );
      }

      if (!reason || !reason.trim()) {
        return NextResponse.json({ success: false, error: 'A deletion reason is required.' }, { status: 400 });
      }

      const prevMembership = targetMembership || {};
      const now = new Date().toISOString();

      if (permanent && isSuperAdminEmail(caller.email)) {
        // Permanent deletion (Super Admin only)
        if (adminDb?.auth?.admin) {
          try {
            await adminDb.auth.admin.deleteUser(userId);
          } catch (e: any) {
            console.warn('Permanent auth deletion warning:', e?.message);
          }
        }

        await db.from('club_memberships').delete().eq('user_id', userId);
        await db.from('profiles').delete().eq('id', userId);

        await logAuditEvent(
          {
            actorUserId: caller.id,
            actorNameSnapshot: callerProfile?.full_name || caller.email,
            actorRoleSnapshot: 'Super Admin',
            action: 'MEMBER_PERMANENT_DELETE',
            entityType: 'members',
            entityId: userId,
            entityLabelSnapshot: targetLabel,
            oldValues: { profile: targetProfile, membership: prevMembership },
            newValues: { deleted: true, permanent: true },
            reason: reason.trim(),
            details: `Account for ${targetProfile.full_name} was permanently erased by Super Admin.`,
            canUndo: false,
          },
          db
        );

        return NextResponse.json({
          success: true,
          message: `Account for ${targetProfile.full_name} has been permanently deleted.`,
        });
      }

      // Standard Soft-Delete (Move to Recycle Bin)
      await db
        .from('profiles')
        .update({
          is_deleted: true,
          deleted_at: now,
          deleted_by: caller.id,
          deletion_reason: reason.trim(),
          account_status: 'deleted',
          updated_at: now,
        })
        .eq('id', userId);

      await db
        .from('club_memberships')
        .update({
          is_deleted: true,
          deleted_at: now,
          deleted_by: caller.id,
          deletion_reason: reason.trim(),
          membership_status: 'removed',
          updated_at: now,
        })
        .eq('user_id', userId);

      await logAuditEvent(
        {
          actorUserId: caller.id,
          actorNameSnapshot: callerProfile?.full_name || caller.email,
          actorRoleSnapshot: callerPositionKeys[0] || callerGlobalRole,
          action: 'MEMBER_DELETE_ACCOUNT',
          entityType: 'members',
          entityId: userId,
          entityLabelSnapshot: targetLabel,
          oldValues: {
            is_deleted: false,
            account_status: targetProfile.account_status || 'active',
          },
          newValues: {
            is_deleted: true,
            account_status: 'deleted',
            deleted_at: now,
            deletion_reason: reason.trim(),
          },
          reason: reason.trim(),
          details: `Member ${targetProfile.full_name} was soft-deleted and moved to Recycle Bin.`,
          canUndo: true,
        },
        db
      );

      return NextResponse.json({
        success: true,
        message: `Account for ${targetProfile.full_name} was moved to Recycle Bin. Historical task and attendance data is preserved.`,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Member management API error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
