import { isSuperAdminEmail, isExecutiveBoard, type GlobalRole, type BureauPositionKey } from './roles.ts';
import type { PermissionKey } from './permissions.ts';

export interface UserPermissionContext {
  userId?: string | null;
  email?: string | null;
  role?: GlobalRole | string | null;
  bureauPositions?: (BureauPositionKey | string)[] | null;
  activeBureauPosition?: BureauPositionKey | string | null;
  departmentId?: string | null;
  departmentSlug?: string | null;
}

/**
 * Evaluates whether a user has a specific granular permission key based on their
 * global role, bureau position(s), and super admin privileges.
 */
export function hasPermission(ctx: UserPermissionContext | null | undefined, permission: PermissionKey): boolean {
  if (!ctx) return false;

  // 1. Super Admin has all permissions
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') {
    return true;
  }

  const role = ctx.role || 'member';
  const positions = new Set<string>();
  if (ctx.activeBureauPosition) positions.add(ctx.activeBureauPosition.toLowerCase());
  (ctx.bureauPositions || []).forEach((p) => {
    if (p) positions.add(p.toLowerCase());
  });

  const isPres = positions.has('president');
  const isVP = positions.has('vice_president');
  const isSecGen = positions.has('secretary_general') || positions.has('secretary');
  const isTreas = positions.has('treasurer');
  const isHR = positions.has('hr_manager');
  const isEventsManager = positions.has('events_manager');
  const isPartnerships = positions.has('partnerships_sponsorship_manager');
  const isProjectManager = positions.has('project_manager');
  const isSustainableManager = positions.has('sustainable_campus_manager');
  const isBureau = role === 'bureau' || positions.size > 0;

  switch (permission) {
    // --- Member Management & HR ---
    case 'members:view_public':
      return true;
    case 'members:view_sensitive':
      return isPres || isVP || isSecGen || isHR;
    case 'members:manage':
    case 'members:remove':
    case 'members:suspend':
    case 'members:reactivate':
    case 'members:view_history':
      return isPres || isVP || isSecGen || isHR;
    case 'members:delete_account':
      return isPres || isHR;
    case 'members:assign_roles':
      return isPres; // Only President or Admin can assign bureau mandates

    // --- Departments ---
    case 'departments:view':
      return true;
    case 'departments:manage_own':
      return isBureau;
    case 'departments:manage_all':
      return isPres || isVP;

    // --- Tasks ---
    case 'tasks:view_assigned':
      return true;
    case 'tasks:view_department':
    case 'tasks:view_all':
      return isBureau;
    case 'tasks:create':
      return isBureau;
    case 'tasks:edit_own':
      return isBureau;
    case 'tasks:edit_any':
      return isPres || isVP || isSecGen;
    case 'tasks:delete':
      return isPres || isVP || isSecGen;
    case 'tasks:restore':
      return false; // Reserved exclusively for Club Administrator
    case 'tasks:submit_verification':
      return true;
    case 'tasks:verify':
      return isBureau;

    // --- Events ---
    case 'events:view':
      return true;
    case 'events:create':
      return isPres || isVP || isEventsManager || isBureau;
    case 'events:edit_own':
      return isPres || isVP || isEventsManager || isBureau;
    case 'events:edit_all':
      return isPres || isVP;
    case 'events:delete_own':
      return isPres || isVP || isEventsManager;
    case 'events:delete_all':
      return isPres || isVP;
    case 'events:restore':
      return false; // Reserved exclusively for Club Administrator

    // --- Meetings ---
    case 'meetings:view_shared':
      return true;
    case 'meetings:view_confidential':
      return isBureau;
    case 'meetings:create':
      return isBureau;
    case 'meetings:edit':
    case 'meetings:edit_own':
      return isBureau;
    case 'meetings:edit_all':
      return isPres || isVP || isSecGen;
    case 'meetings:delete':
    case 'meetings:delete_own':
      return isPres || isVP || isSecGen || isBureau;
    case 'meetings:delete_all':
      return isPres || isVP || isSecGen;
    case 'meetings:restore':
      return false; // Reserved exclusively for Club Administrator
    case 'meetings:dispatch_bot':
    case 'meetings:sync':
      return isBureau;

    // --- Projects ---
    case 'projects:view':
      return true;
    case 'projects:create':
      return isPres || isVP || isProjectManager || isSustainableManager || isBureau;
    case 'projects:edit_own':
      return isPres || isVP || isProjectManager || isSustainableManager || isBureau;
    case 'projects:edit_all':
      return isPres || isVP || isProjectManager;
    case 'projects:delete_own':
      return isPres || isVP || isProjectManager;
    case 'projects:delete_all':
      return isPres || isVP;
    case 'projects:restore':
      return false; // Reserved exclusively for Club Administrator

    // --- Attendance ---
    case 'attendance:view_own':
      return true;
    case 'attendance:view_all':
      return isBureau;
    case 'attendance:scan':
      return isPres || isVP || isSecGen;
    case 'attendance:manage_sessions':
    case 'attendance:correct_records':
      return isPres || isVP || isSecGen;

    // --- Finance ---
    case 'finance:view_overview':
      return isPres || isVP || isSecGen || isTreas;
    case 'finance:view_ledger':
      return isPres || isVP || isTreas;
    case 'finance:create_entry':
    case 'finance:approve_entry':
    case 'finance:disburse':
      return isTreas; // ONLY Treasurer (or Admin) can disburse/approve finances!

    // --- Recruitment / HR ---
    case 'hr:view_applications':
    case 'hr:review_applications':
    case 'hr:manage_pipeline':
      return isPres || isVP || isHR;

    // --- Partnerships ---
    case 'partnerships:view':
      return isBureau;
    case 'partnerships:manage_pipeline':
    case 'partnerships:commit_sponsorship':
      return isPres || isVP || isPartnerships;

    // --- Audit & Recovery ---
    case 'audit:view':
      return isPres || isSecGen || isHR;
    case 'audit:undo':
      return false; // Reserved exclusively for Club Administrator
    case 'recycle_bin:view':
    case 'recycle_bin:restore':
    case 'recycle_bin:permanent_delete':
      return false; // Reserved exclusively for Club Administrator
    case 'system:manage_settings':
      return false; // Reserved exclusively for Club Administrator

    default:
      return false;
  }
}

export function hasAnyPermission(ctx: UserPermissionContext | null | undefined, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => hasPermission(ctx, p));
}

export function hasAllPermissions(ctx: UserPermissionContext | null | undefined, permissions: PermissionKey[]): boolean {
  return permissions.every((p) => hasPermission(ctx, p));
}
