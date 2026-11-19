/**
 * ZEC Campus Hub — Route-Level Permission Guards & Access Matrix
 * Provides centralized route and API authorization checks for Next.js pages and API routes.
 */

import { hasPermission, type UserPermissionContext } from './access-control.ts';
import { isSuperAdminEmail } from './roles.ts';
import type { PermissionKey } from './permissions.ts';

export interface RouteAccessRule {
  pathPrefix: string;
  exact?: boolean;
  requiredPermissions?: PermissionKey[];
  requireAdmin?: boolean;
  allowRoles?: string[];
  description: string;
}

export const ROUTE_ACCESS_RULES: readonly RouteAccessRule[] = [
  // Admin governance modules
  {
    pathPrefix: '/admin/audit-logs',
    requiredPermissions: ['audit:view'],
    description: 'Audit logs viewable by Admin, HR Manager, and Secretary General',
  },
  {
    pathPrefix: '/admin/members',
    requiredPermissions: ['members:manage', 'hr:review_applications'],
    description: 'Member applications and management viewable by Admin and HR Manager',
  },
  {
    pathPrefix: '/admin/roles',
    requireAdmin: true,
    description: 'Role assignment and elevation strictly requires Administrator',
  },
  {
    pathPrefix: '/admin/recycle-bin',
    requireAdmin: true,
    requiredPermissions: ['recycle_bin:view'],
    description: 'Recycle bin and permanent purge strictly requires Administrator',
  },
  {
    pathPrefix: '/admin/attendance',
    requiredPermissions: ['attendance:manage_sessions'],
    description: 'Bureau attendance overview accessible to Executive Board and Admin',
  },
  {
    pathPrefix: '/admin',
    requireAdmin: true,
    description: 'Admin Portal Root requires Administrator privileges',
  },

  // Attendance scanner
  {
    pathPrefix: '/attendance/scanner',
    requiredPermissions: ['attendance:scan'],
    description: 'Attendance scanner restricted to Secretary General, President, VP, and Admin',
  },

  // Bureau modules (Projects, Documents, Departments, Members directory)
  {
    pathPrefix: '/projects',
    requiredPermissions: ['projects:view'],
    description: 'Projects workspace accessible to Bureau officers and Admins',
  },
  {
    pathPrefix: '/documents',
    requiredPermissions: ['departments:view'],
    description: 'Club and department documents',
  },
  {
    pathPrefix: '/departments',
    requiredPermissions: ['departments:view'],
    description: 'Club department workspaces',
  },
] as const;

/**
 * Checks whether a given user context is authorized to navigate to a target pathname.
 */
export function canAccessRoute(
  ctx: UserPermissionContext | null | undefined,
  pathname: string
): { allowed: boolean; redirectPath?: string; reason?: string } {
  if (!ctx) {
    return {
      allowed: false,
      redirectPath: '/login',
      reason: 'Authentication required. Please sign in to continue.',
    };
  }

  // Super Admin bypasses all route restrictions
  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') {
    return { allowed: true };
  }

  const normalizedPath = pathname.toLowerCase().split('?')[0];

  // Match the most specific route rule first
  const matchingRule = ROUTE_ACCESS_RULES.find((rule) => {
    if (rule.exact) {
      return normalizedPath === rule.pathPrefix.toLowerCase();
    }
    return normalizedPath.startsWith(rule.pathPrefix.toLowerCase());
  });

  if (!matchingRule) {
    // Default: Authenticated user can view non-restricted pages (Dashboard, Tasks, Attendance Pass, Events, Ranking, Announcements, Profile)
    return { allowed: true };
  }

  if (matchingRule.requireAdmin) {
    return {
      allowed: false,
      redirectPath: '/',
      reason: 'Access Restricted: Administrator portal requires elevated executive permissions.',
    };
  }

  if (matchingRule.requiredPermissions && matchingRule.requiredPermissions.length > 0) {
    const hasAny = matchingRule.requiredPermissions.some((perm) => hasPermission(ctx, perm));
    if (!hasAny) {
      return {
        allowed: false,
        redirectPath: '/',
        reason: `Access Restricted: Your current role lacks the required capability (${matchingRule.requiredPermissions.join(' or ')}).`,
      };
    }
  }

  return { allowed: true };
}

/**
 * API route authorization helper.
 * Validates whether the caller has the required permissions for an API operation.
 */
export function checkApiAuthorization(
  ctx: UserPermissionContext | null | undefined,
  endpoint: string,
  method: string = 'GET'
): { allowed: boolean; statusCode: number; error?: string } {
  if (!ctx) {
    return { allowed: false, statusCode: 401, error: 'Unauthorized: Session missing' };
  }

  if (isSuperAdminEmail(ctx.email) || ctx.role === 'admin') {
    return { allowed: true, statusCode: 200 };
  }

  const normEndpoint = endpoint.toLowerCase();
  const m = method.toUpperCase();

  // Audit Log Purge / Undo
  if (normEndpoint.includes('/api/audit-logs/undo') || normEndpoint.includes('/api/audit-logs/purge')) {
    return { allowed: false, statusCode: 403, error: 'Forbidden: Undo and purge operations require Administrator privileges' };
  }

  // Member Management API
  if (normEndpoint.includes('/api/members/remove')) {
    if (!hasPermission(ctx, 'members:remove')) {
      return { allowed: false, statusCode: 403, error: 'Forbidden: Lacks members:remove permission' };
    }
  }

  if (normEndpoint.includes('/api/members/delete')) {
    if (!hasPermission(ctx, 'members:delete_account')) {
      return { allowed: false, statusCode: 403, error: 'Forbidden: Lacks members:delete_account permission' };
    }
  }

  // Permanent Delete / Recycle Bin
  if (normEndpoint.includes('/api/recycle-bin/permanent-delete')) {
    if (!hasPermission(ctx, 'recycle_bin:permanent_delete')) {
      return { allowed: false, statusCode: 403, error: 'Forbidden: Permanent deletion requires Administrator privileges' };
    }
  }

  // Attendance Scanning
  if (normEndpoint.includes('/api/attendance/scan') || normEndpoint.includes('/api/attendance/record')) {
    if (m === 'POST' && !hasPermission(ctx, 'attendance:scan')) {
      return { allowed: false, statusCode: 403, error: 'Forbidden: Only authorized officers can scan attendance' };
    }
  }

  return { allowed: true, statusCode: 200 };
}
