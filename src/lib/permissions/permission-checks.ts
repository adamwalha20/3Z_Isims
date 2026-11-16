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

  // Super Admin can access all pages
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') {
    return { allowed: true };
  }

  const path = pagePath.toLowerCase();

  // Admin routes
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

export function canAssignRoles(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  return hasPermission(ctx, 'members:assign_roles');
}

export function canUndoAuditLog(ctx: UserPermissionContext | null | undefined): boolean {
  if (!ctx) return false;
  // Strictly restricted to Club Administrator
  return isSuperAdminEmail(ctx.email) || ctx.role === 'admin';
}
