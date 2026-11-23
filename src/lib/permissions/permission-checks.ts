import { hasPermission, type UserPermissionContext } from './access-control.ts';
import { isSuperAdminEmail } from './roles.ts';
import { canAccessDepartment } from './department-access.ts';

/**
 * High-level business permission checks for the application.
 */

export function canAccessPage(
  ctx: UserPermissionContext | null | undefined,
  pagePath: string
): { allowed: boolean; redirectPath?: string; reason?: string } {
  if (!ctx) {
    return { allowed: false, redirectPath: '/login', reason: 'Authentication required' };
  }

  // Super Admin can access all pages ONLY when in active admin role
  const effectiveRole = ctx.role || (isSuperAdminEmail(ctx.email) ? 'admin' : 'member');
  if (effectiveRole === 'admin' && (isSuperAdminEmail(ctx.email) || ctx.role === 'admin')) {
    return { allowed: true };
  }

  const path = pagePath.toLowerCase();

  // Admin routes: audit logs are viewable by HR and Secretary General too
  if (path.startsWith('/admin/audit-logs')) {
    if (hasPermission(ctx, 'audit:view')) {
      return { allowed: true };
    }
  }

  // Member applications / approvals
  if (path.startsWith('/admin/members')) {
    if (hasPermission(ctx, 'members:manage') || hasPermission(ctx, 'hr:review_applications')) {
      return { allowed: true };
    }
  }

  // Other admin routes (roles, health, recycle-bin) strictly require Admin
  if (path.startsWith('/admin')) {
    return {
      allowed: false,
      redirectPath: '/',
      reason: 'Access Restricted: Administrator governance portal requires elevated privileges.',
    };
  }

  // Attendance scanner
  if (path.startsWith('/attendance/scanner')) {
    const canScan = hasPermission(ctx, 'attendance:scan');
    if (!canScan) {
      return {
        allowed: false,
        redirectPath: '/attendance',
        reason: 'Access Restricted: Only the Secretary General, President, Vice President, or Admin can operate the attendance scanner.',
      };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

export function canAccessAdminPanel(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  const effectiveRole = ctx.role || (isSuperAdminEmail(ctx.email) ? 'admin' : 'member');
  return effectiveRole === 'admin' && (isSuperAdminEmail(ctx.email) || ctx.role === 'admin');
}

export function canViewTask(ctx: UserPermissionContext | null | undefined, task?: any): boolean {
  if (!ctx) return false;
  const effectiveRole = ctx.role || (isSuperAdminEmail(ctx.email) ? 'admin' : 'member');
  if (effectiveRole === 'admin') return true;

  // If task has a department, check department isolation
  if (task?.department_id || task?.department_slug) {
    return canAccessDepartment(ctx, task.department_slug || task.department_id);
  }

  // Club-wide task
  return true;
}

export function canManageTask(ctx: UserPermissionContext | null | undefined, task?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;

  // Ordinary member cannot create or manage official tasks
  if (ctx.role === 'member' && (!ctx.bureauPositions || ctx.bureauPositions.length === 0)) {
    return false;
  }

  // If task has a department, check department isolation
  if (task?.department_id || task?.department_slug) {
    return canAccessDepartment(ctx, task.department_slug || task.department_id);
  }

  return hasPermission(ctx, 'tasks:create');
}

export function canVerifyTask(ctx: UserPermissionContext | null | undefined, task?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;

  // Conflict of Interest: A user cannot verify their own task!
  if (task?.assigned_user_id && ctx.userId && task.assigned_user_id === ctx.userId) {
    return false;
  }

  return hasPermission(ctx, 'tasks:verify');
}

export function canViewMeeting(ctx: UserPermissionContext | null | undefined, meeting: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;

  const vis = meeting?.visibility || 'club';
  if (vis === 'public' || vis === 'club') return true;

  // Restricted or confidential meeting
  if (meeting?.organizer_id && ctx.userId && meeting.organizer_id === ctx.userId) return true;
  if (meeting?.created_by && ctx.userId && meeting.created_by === ctx.userId) return true;
  if (Array.isArray(meeting?.participant_ids) && ctx.userId && meeting.participant_ids.includes(ctx.userId)) {
    return true;
  }

  return hasPermission(ctx, 'meetings:view_confidential');
}

export function canViewFinancialData(ctx: UserPermissionContext | null | undefined, detailed = false): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, detailed ? 'finance:view_ledger' : 'finance:view_overview');
}

export function canManageFinances(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'finance:disburse');
}

export function canManageHR(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'hr:review_applications');
}

export function canManagePartnerships(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'partnerships:manage_pipeline');
}

export function canManageAttendance(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'attendance:manage_sessions');
}

export function canAccessAttendanceScanner(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'attendance:scan');
}

export function canManageMembers(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'members:manage');
}

export function canRemoveMember(ctx: UserPermissionContext | null | undefined, targetUser?: any): boolean {
  if (!ctx) return false;
  if (targetUser?.id && ctx.userId && targetUser.id === ctx.userId) return false; // Cannot remove self
  const targetEmail = targetUser?.email || '';
  if (isSuperAdminEmail(targetEmail) || targetUser?.role === 'admin') {
    return isSuperAdminEmail(ctx.email); // Only Super Admin can remove an admin
  }
  return hasPermission(ctx, 'members:remove');
}

export function canSuspendMember(ctx: UserPermissionContext | null | undefined, targetUser?: any): boolean {
  if (!ctx) return false;
  if (targetUser?.id && ctx.userId && targetUser.id === ctx.userId) return false; // Cannot suspend self
  const targetEmail = targetUser?.email || '';
  if (isSuperAdminEmail(targetEmail) || targetUser?.role === 'admin') {
    return false; // Cannot suspend an administrator
  }
  return hasPermission(ctx, 'members:suspend');
}

export function canReactivateMember(ctx: UserPermissionContext | null | undefined, targetUser?: any): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'members:reactivate');
}

export function canDeleteMemberAccount(ctx: UserPermissionContext | null | undefined, targetUser?: any): boolean {
  if (!ctx) return false;
  if (targetUser?.id && ctx.userId && targetUser.id === ctx.userId) return false; // Cannot delete self
  const targetEmail = targetUser?.email || '';
  if (isSuperAdminEmail(targetEmail) || targetUser?.role === 'admin') {
    return isSuperAdminEmail(ctx.email); // Only Super Admin can delete an admin account
  }
  return hasPermission(ctx, 'members:delete_account');
}

export function canViewEvent(ctx: UserPermissionContext | null | undefined, event?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;

  const vis = event?.visibility || 'club';
  if (vis === 'public' || vis === 'club') return true;

  if (event?.organizer_id && ctx.userId && event.organizer_id === ctx.userId) return true;
  if (event?.department_id && canAccessDepartment(ctx, event.department_id)) return true;

  return hasPermission(ctx, 'events:view');
}

export function canManageEvent(ctx: UserPermissionContext | null | undefined, event?: any): boolean {
  if (!ctx) return false;
  return canEditEvent(ctx, event);
}

export function canEditEvent(ctx: UserPermissionContext | null | undefined, event?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;
  if (hasPermission(ctx, 'events:edit_all')) return true;

  // Organizer can edit their own event
  if (event?.organizer_id && ctx.userId && event.organizer_id === ctx.userId) {
    return hasPermission(ctx, 'events:edit_own');
  }

  // Events Manager can edit events in Events & Logistics
  const positions = new Set((ctx.bureauPositions || []).map((p) => String(p).toLowerCase()));
  if (positions.has('events_manager')) {
    return true;
  }

  return false;
}

export function canDeleteEvent(ctx: UserPermissionContext | null | undefined, event?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;
  if (hasPermission(ctx, 'events:delete_all')) return true;

  const positions = new Set((ctx.bureauPositions || []).map((p) => String(p).toLowerCase()));
  if (positions.has('events_manager')) {
    return true;
  }

  if (event?.organizer_id && ctx.userId && event.organizer_id === ctx.userId) {
    return hasPermission(ctx, 'events:delete_own');
  }

  return false;
}

export function canRestoreRecord(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return isSuperAdminEmail(ctx.email) || ctx.role === 'admin' || hasPermission(ctx, 'recycle_bin:restore');
}

export function canAccessRecycleBin(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return isSuperAdminEmail(ctx.email) || ctx.role === 'admin' || hasPermission(ctx, 'recycle_bin:view');
}

export function canPermanentDelete(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return isSuperAdminEmail(ctx.email) || ctx.role === 'admin' || hasPermission(ctx, 'recycle_bin:permanent_delete');
}

export function canAssignRoles(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'members:assign_roles');
}

export function canUndoAuditLog(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  // Strictly restricted to Club Administrator
  return isSuperAdminEmail(ctx.email) || ctx.role === 'admin';
}

export function canEditMeeting(ctx: UserPermissionContext | null | undefined, meeting?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;
  if (hasPermission(ctx, 'meetings:edit_all')) return true;

  // Meeting organizer or creator can edit their own meeting
  if (
    (meeting?.organizer_id && ctx.userId && meeting.organizer_id === ctx.userId) ||
    (meeting?.created_by && ctx.userId && meeting.created_by === ctx.userId)
  ) {
    return hasPermission(ctx, 'meetings:edit_own');
  }

  // Department lead can edit department meetings
  if (meeting?.department_id && canAccessDepartment(ctx, meeting.department_id)) {
    return hasPermission(ctx, 'meetings:edit_own');
  }

  return false;
}

export function canDeleteMeeting(ctx: UserPermissionContext | null | undefined, meeting?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;
  if (hasPermission(ctx, 'meetings:delete_all')) return true;

  // Organizer or creator can delete their own meeting
  if (
    (meeting?.organizer_id && ctx.userId && meeting.organizer_id === ctx.userId) ||
    (meeting?.created_by && ctx.userId && meeting.created_by === ctx.userId)
  ) {
    return hasPermission(ctx, 'meetings:delete_own');
  }

  // Department lead can delete their department meeting
  if (meeting?.department_id && canAccessDepartment(ctx, meeting.department_id)) {
    return hasPermission(ctx, 'meetings:delete_own');
  }

  return false;
}

export function canEditTask(ctx: UserPermissionContext | null | undefined, task?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;
  if (hasPermission(ctx, 'tasks:edit_any')) return true;

  // Task creator can edit their task
  if (task?.creator_id && ctx.userId && task.creator_id === ctx.userId) {
    return hasPermission(ctx, 'tasks:edit_own');
  }

  // Department lead can edit tasks belonging to their department
  if (task?.department_id && canAccessDepartment(ctx, task.department_id)) {
    return hasPermission(ctx, 'tasks:edit_own');
  }

  return false;
}

export function canDeleteTask(ctx: UserPermissionContext | null | undefined, task?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;
  if (hasPermission(ctx, 'tasks:delete')) return true;

  // Task creator can delete their own task
  if (task?.creator_id && ctx.userId && task.creator_id === ctx.userId) {
    return hasPermission(ctx, 'tasks:edit_own');
  }

  // Department lead can delete tasks belonging to their department
  if (task?.department_id && canAccessDepartment(ctx, task.department_id)) {
    return true;
  }

  return false;
}

export function canEditProject(ctx: UserPermissionContext | null | undefined, project?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;
  if (hasPermission(ctx, 'projects:edit_all')) return true;

  const positions = new Set((ctx.bureauPositions || []).map((p) => String(p).toLowerCase()));
  if (positions.has('project_manager') || positions.has('sustainable_campus_manager')) {
    return true;
  }

  // Project owner or creator can edit their own project
  if (
    (project?.owner_id && ctx.userId && project.owner_id === ctx.userId) ||
    (project?.created_by && ctx.userId && project.created_by === ctx.userId)
  ) {
    return hasPermission(ctx, 'projects:edit_own');
  }

  // Department lead can edit projects in their department
  if (project?.department_id && canAccessDepartment(ctx, project.department_id)) {
    return true;
  }

  return false;
}

export function canDeleteProject(ctx: UserPermissionContext | null | undefined, project?: any): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;
  if (hasPermission(ctx, 'projects:delete_all')) return true;

  const positions = new Set((ctx.bureauPositions || []).map((p) => String(p).toLowerCase()));
  if (positions.has('project_manager')) {
    return true;
  }

  // Project owner can delete their own project
  if (
    (project?.owner_id && ctx.userId && project.owner_id === ctx.userId) ||
    (project?.created_by && ctx.userId && project.created_by === ctx.userId)
  ) {
    return hasPermission(ctx, 'projects:delete_own');
  }

  return false;
}
