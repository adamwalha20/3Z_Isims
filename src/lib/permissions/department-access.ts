import type { UserPermissionContext } from './access-control.ts';
import { isSuperAdminEmail, POSITION_TO_DEPARTMENT_SLUG, type BureauPositionKey } from './roles.ts';

/**
 * Enforces Department Isolation:
 * Department Leads and Managers can only view and manage tools for their assigned department,
 * while Executive Board (President, VP, Secretary General) and Admins retain operational oversight.
 */
export function canAccessDepartment(
  ctx: UserPermissionContext | null | undefined,
  targetDeptSlugOrId: string | null | undefined
): boolean {
  if (!ctx || !targetDeptSlugOrId) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;

  const positions = new Set<string>();
  if (ctx.activeBureauPosition) positions.add(ctx.activeBureauPosition.toLowerCase());
  (ctx.bureauPositions || []).forEach((p) => {
    if (p) positions.add(p.toLowerCase());
  });

  // Executive Board has club-wide oversight
  if (positions.has('president') || positions.has('vice_president') || positions.has('secretary_general')) {
    return true;
  }

  // Check if target matches user's department assignment
  const targetNorm = targetDeptSlugOrId.toLowerCase().trim();
  if (ctx.departmentSlug && ctx.departmentSlug.toLowerCase() === targetNorm) {
    return true;
  }
  if (ctx.departmentId && ctx.departmentId.toLowerCase() === targetNorm) {
    return true;
  }

  // Check if position natively maps to this department slug
  for (const pos of positions) {
    const mappedSlug = POSITION_TO_DEPARTMENT_SLUG[pos as BureauPositionKey];
    if (mappedSlug && mappedSlug.toLowerCase() === targetNorm) {
      return true;
    }
  }

  return false;
}

export function canViewDepartment(
  ctx: UserPermissionContext | null | undefined,
  targetDeptSlugOrId: string | null | undefined
): boolean {
  return canAccessDepartment(ctx, targetDeptSlugOrId);
}

export function canManageDepartment(
  ctx: UserPermissionContext | null | undefined,
  targetDeptSlugOrId: string | null | undefined
): boolean {
  if (!ctx || !targetDeptSlugOrId) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;

  const positions = new Set<string>();
  if (ctx.activeBureauPosition) positions.add(ctx.activeBureauPosition.toLowerCase());
  (ctx.bureauPositions || []).forEach((p) => {
    if (p) positions.add(p.toLowerCase());
  });

  // President and VP can manage all departments
  if (positions.has('president') || positions.has('vice_president')) {
    return true;
  }

  // Department Leads can only manage their own department
  return canAccessDepartment(ctx, targetDeptSlugOrId);
}

export function canViewDepartmentDocument(
  ctx: UserPermissionContext | null | undefined,
  document: {
    visibility?: string | null;
    department_id?: string | null;
    department_slug?: string | null;
  }
): boolean {
  if (!ctx) return false;
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') return true;

  const vis = document.visibility || 'club';
  if (vis === 'public' || vis === 'club') return true;

  // Confidential or department-restricted
  const docDept = document.department_slug || document.department_id;
  return canAccessDepartment(ctx, docDept);
}
