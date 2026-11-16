import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdminEmail } from '@/lib/permissions/roles';
import { canAccessRecycleBin, canRestoreRecord } from '@/lib/permissions/permission-checks';
import { logAuditEvent } from '@/lib/audit/audit-logger';

export async function GET(req: NextRequest) {
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

    // Use authenticated user client for RLS compliance
    const db = supabase;

    // Verify Admin permission
    const { data: userRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', user.id);
    const isAdmin =
      isSuperAdminEmail(user.email) ||
      userRoles?.some((r: any) => r.roles?.key === 'admin');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Recycle Bin is accessible exclusively to Club Administrators.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const entityTypeFilter = searchParams.get('type') || 'all';

    const deletedItems: any[] = [];

    // Helper to fetch deleted records with deleter info
    const fetchTableDeleted = async (tableName: string, entityType: string, titleField: string = 'title') => {
      try {
        const { data, error } = await db
          .from(tableName)
          .select(`*, deleted_by_user:profiles!${tableName}_deleted_by_fkey(full_name, email)`)
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          data.forEach((row: any) => {
            deletedItems.push({
              id: row.id,
              title: row[titleField] || row.name || `Unnamed ${entityType}`,
              entityType,
              tableName,
              deletedAt: row.deleted_at || row.updated_at,
              deletedBy: row.deleted_by_user?.full_name || row.deleted_by_user?.email || 'Administrator',
              deletionReason: row.deletion_reason || 'Archived by Administrator',
              metadata: row,
            });
          });
        }
      } catch (e: any) {
        console.warn(`Recycle bin query notice on ${tableName}:`, e?.message);
      }
    };

    if (entityTypeFilter === 'all' || entityTypeFilter === 'events') {
      await fetchTableDeleted('events', 'event', 'title');
    }
    if (entityTypeFilter === 'all' || entityTypeFilter === 'meetings') {
      await fetchTableDeleted('meetings', 'meeting', 'title');
    }
    if (entityTypeFilter === 'all' || entityTypeFilter === 'tasks') {
      await fetchTableDeleted('tasks', 'task', 'title');
    }
    if (entityTypeFilter === 'all' || entityTypeFilter === 'projects') {
      await fetchTableDeleted('projects', 'project', 'title');
    }
    if (entityTypeFilter === 'all' || entityTypeFilter === 'documents') {
      await fetchTableDeleted('documents', 'document', 'title');
    }
    if (entityTypeFilter === 'all' || entityTypeFilter === 'announcements') {
      await fetchTableDeleted('announcements', 'announcement', 'title');
    }
    if (entityTypeFilter === 'all' || entityTypeFilter === 'members') {
      try {
        const { data: delProfiles } = await db
          .from('profiles')
          .select('*, deleted_by_user:profiles!profiles_deleted_by_fkey(full_name, email)')
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false });

        if (Array.isArray(delProfiles)) {
          delProfiles.forEach((p: any) => {
            deletedItems.push({
              id: p.id,
              title: `${p.full_name} (${p.student_id || p.email})`,
              entityType: 'member',
              tableName: 'profiles',
              deletedAt: p.deleted_at || p.updated_at,
              deletedBy: p.deleted_by_user?.full_name || 'HR / Admin',
              deletionReason: p.deletion_reason || 'Membership terminated',
              metadata: p,
            });
          });
        }
      } catch (e: any) {
        console.warn('Deleted profiles query notice:', e?.message);
      }
    }

    // Sort all descending by deletedAt
    deletedItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

    return NextResponse.json({ success: true, items: deletedItems });
  } catch (err: any) {
    console.error('Recycle bin GET error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

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

    // Use authenticated user client for RLS compliance
    const db = supabase;

    const { data: userRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', user.id);
    const isSuperAdmin = isSuperAdminEmail(user.email);
    const isAdmin = isSuperAdmin || userRoles?.some((r: any) => r.roles?.key === 'admin');

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Administrator access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, entityType, recordId, reason } = body;

    if (!action || !entityType || !recordId) {
      return NextResponse.json({ success: false, error: 'Action, entityType, and recordId are required.' }, { status: 400 });
    }

    const tableNameMap: Record<string, string> = {
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

    const tableName = tableNameMap[entityType.toLowerCase()];
    if (!tableName) {
      return NextResponse.json({ success: false, error: `Invalid entity type: ${entityType}` }, { status: 400 });
    }

    // 1. Fetch current deleted record
    const { data: record, error: fetchErr } = await db.from(tableName).select('*').eq('id', recordId).single();
    if (fetchErr || !record) {
      return NextResponse.json({ success: false, error: 'Record not found in database.' }, { status: 404 });
    }

    const itemTitle = record.title || record.full_name || record.name || `${entityType} ${recordId}`;
    const now = new Date().toISOString();

    // =========================================================================
    // RESTORE RECORD ACTION
    // =========================================================================
    if (action === 'restore') {
      const updatePayload: Record<string, any> = {
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        updated_at: now,
      };

      if (tableName === 'profiles') {
        updatePayload.account_status = 'active';
        // Also restore club_memberships
        await db
          .from('club_memberships')
          .update({
            is_deleted: false,
            deleted_at: null,
            membership_status: 'active',
            updated_at: now,
          })
          .eq('user_id', recordId);
      }

      const { error: restoreErr } = await db.from(tableName).update(updatePayload).eq('id', recordId);

      if (restoreErr) {
        return NextResponse.json({ success: false, error: restoreErr.message }, { status: 500 });
      }

      // Log Restoration in Audit Logs
      await logAuditEvent(
        {
          actorUserId: user.id,
          actorNameSnapshot: user.email,
          actorRoleSnapshot: isSuperAdmin ? 'Super Admin' : 'Admin',
          action: 'RESTORE_RECORD',
          entityType,
          entityId: recordId,
          entityLabelSnapshot: itemTitle,
          oldValues: { is_deleted: true, deleted_at: record.deleted_at, deletion_reason: record.deletion_reason },
          newValues: { is_deleted: false, restored_at: now },
          reason: reason || 'Restored by Administrator from Recycle Bin.',
          details: `${entityType} "${itemTitle}" was restored from the Recycle Bin.`,
          canUndo: true,
        },
        db
      );

      return NextResponse.json({
        success: true,
        message: `Successfully restored ${entityType} "${itemTitle}".`,
      });
    }

    // =========================================================================
    // PERMANENT DELETE (PURGE) ACTION - ADMINISTRATORS ONLY
    // =========================================================================
    if (action === 'permanent_delete') {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Permanent destruction requires Administrator credentials.' },
          { status: 403 }
        );
      }

      if (tableName === 'profiles') {
        const adminDb = getSupabaseAdmin();
        if (adminDb?.auth?.admin) {
          try {
            await adminDb.auth.admin.deleteUser(recordId);
          } catch (e: any) {
            console.warn('Auth admin delete notice:', e?.message);
          }
        }
        await db.from('club_memberships').delete().eq('user_id', recordId);
      }

      const { error: purgeErr } = await db.from(tableName).delete().eq('id', recordId);
      if (purgeErr) {
        return NextResponse.json({ success: false, error: purgeErr.message }, { status: 500 });
      }

      await logAuditEvent(
        {
          actorUserId: user.id,
          actorNameSnapshot: user.email,
          actorRoleSnapshot: isSuperAdmin ? 'Super Admin' : 'Admin',
          action: 'PERMANENT_PURGE',
          entityType,
          entityId: recordId,
          entityLabelSnapshot: itemTitle,
          oldValues: record,
          newValues: { purged: true },
          reason: reason || 'Permanently erased from Recycle Bin.',
          details: `Permanent destruction of ${entityType} "${itemTitle}" executed by Administrator.`,
          canUndo: false,
        },
        supabase
      );

      return NextResponse.json({
        success: true,
        message: `Record "${itemTitle}" has been permanently purged.`,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Recycle bin POST error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
