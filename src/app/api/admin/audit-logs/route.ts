import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdminEmail } from '@/lib/permissions/roles';

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

    const adminDb = getSupabaseAdmin();
    const db = adminDb || supabase;

    // Check authorization: Admin, President, Secretary General, HR Manager
    const { data: userRoles } = await db.from('user_roles').select('roles(key)').eq('user_id', user.id);
    const { data: userPositions } = await db.from('user_bureau_positions').select('bureau_positions(key)').eq('user_id', user.id);

    const isSuperAdmin = isSuperAdminEmail(user.email);
    const isAdmin = isSuperAdmin || userRoles?.some((r: any) => r.roles?.key === 'admin');
    const positionKeys = new Set((userPositions || []).map((p: any) => p.bureau_positions?.key?.toLowerCase()).filter(Boolean));
    const isAuthorized = isAdmin || positionKeys.has('president') || positionKeys.has('secretary_general') || positionKeys.has('hr_manager');

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Audit trail inspection requires administrative or executive bureau clearance.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const entityType = searchParams.get('entityType') || searchParams.get('category') || 'all';
    const actionFilter = searchParams.get('action') || 'all';
    const actorId = searchParams.get('actorId') || '';
    const reversibleOnly = searchParams.get('reversible') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '20', 10)));

    let query = db
      .from('audit_logs')
      .select(
        `
        *,
        actor:profiles!audit_logs_actor_id_fkey(id, full_name, email, avatar_path, student_id)
      `,
        { count: 'exact' }
      );

    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType);
    }

    if (actionFilter && actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    if (actorId) {
      query = query.eq('actor_id', actorId);
    }

    if (reversibleOnly) {
      query = query.eq('can_undo', true).eq('is_undone', false);
    }

    if (search) {
      query = query.or(
        `action.ilike.%${search}%,details.ilike.%${search}%,reason.ilike.%${search}%,entity_label_snapshot.ilike.%${search}%,actor_name_snapshot.ilike.%${search}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: logs, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.warn('Error fetching audit logs:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Compute Summary Statistics
    const todayIso = new Date().toISOString().split('T')[0];

    const { count: totalActions } = await db.from('audit_logs').select('*', { count: 'exact', head: true });
    const { count: actionsToday } = await db.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', `${todayIso}T00:00:00Z`);
    const { count: memberRemovals } = await db.from('audit_logs').select('*', { count: 'exact', head: true }).in('action', ['MEMBER_REMOVE', 'MEMBER_SUSPEND', 'MEMBER_DELETE_ACCOUNT']);
    const { count: accountDeletions } = await db.from('audit_logs').select('*', { count: 'exact', head: true }).in('action', ['MEMBER_DELETE_ACCOUNT', 'MEMBER_PERMANENT_DELETE']);
    const { count: eventModifications } = await db.from('audit_logs').select('*', { count: 'exact', head: true }).in('action', ['EVENT_EDIT', 'EVENT_DELETE', 'EVENT_RESTORE']);
    const { count: permissionChanges } = await db.from('audit_logs').select('*', { count: 'exact', head: true }).in('action', ['ASSIGN_BUREAU_POSITION', 'ASSIGN_USER_ROLE']);
    const { count: reversibleActions } = await db.from('audit_logs').select('*', { count: 'exact', head: true }).eq('can_undo', true).eq('is_undone', false);

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
      page,
      pageSize,
      stats: {
        totalActions: totalActions || 0,
        actionsToday: actionsToday || 0,
        memberRemovals: memberRemovals || 0,
        accountDeletions: accountDeletions || 0,
        eventModifications: eventModifications || 0,
        permissionChanges: permissionChanges || 0,
        reversibleActions: reversibleActions || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
