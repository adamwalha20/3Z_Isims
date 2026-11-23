/**
 * Attendance Scanner Authorization Policy & Administrative Constants
 * 
 * Strict club rule: Only the President, Vice President, Secretary General,
 * and Club Administrator are permitted to access and operate the attendance scanner.
 */

export const ADMIN_EMAILS = [
  'adamwalha20@gmail.com',
  'adamwalha.isims@gmail.com',
  'adamwalha2@gmail.com',
] as const;

export const RESTRICTED_NON_ADMIN_EMAILS = [
  'mahdihelmin@gmail.com',
] as const;

export const ALLOWED_SCANNER_POSITIONS = [
  'president',
  'vice_president',
  'secretary_general',
  'secretary',
] as const;

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (RESTRICTED_NON_ADMIN_EMAILS.some((r) => r.toLowerCase() === lower)) {
    return false;
  }
  return (
    ADMIN_EMAILS.some((a) => a.toLowerCase() === lower) ||
    lower.startsWith('adamwalha')
  );
}

export function isScannerAuthorizedPosition(positionKey?: string | null): boolean {
  if (!positionKey) return false;
  const norm = positionKey.toLowerCase().trim();
  return (
    ALLOWED_SCANNER_POSITIONS.some((p) => p === norm) ||
    norm.includes('secretary') ||
    norm.includes('president')
  );
}

export interface ScannerAuthCheckParams {
  activeRole?: string | null;
  isAdmin?: boolean | null;
  userEmail?: string | null;
  userBureauPositions?: (string | null | undefined)[] | null;
  activeBureauPosition?: string | null;
}

export function canAccessAttendanceScanner({
  activeRole,
  isAdmin,
  userEmail,
  userBureauPositions,
  activeBureauPosition,
}: ScannerAuthCheckParams): boolean {
  // 1. If actively simulating member or lead, explicitly disallow scanner
  if (activeRole === 'member' || activeRole === 'lead') {
    return false;
  }

  // 2. Active bureau position check (for simulation / active role switching)
  if (activeRole === 'bureau' && activeBureauPosition && activeBureauPosition !== 'all') {
    return isScannerAuthorizedPosition(activeBureauPosition);
  }

  // 3. Admin mode (simulating admin or verified club administrator)
  if (activeRole === 'admin' || (isAdmin === true && activeRole !== 'member')) {
    return true;
  }

  // 4. User's assigned bureau positions check
  if (Array.isArray(userBureauPositions) && userBureauPositions.length > 0) {
    const hasAllowedPosition = userBureauPositions.some(isScannerAuthorizedPosition);
    if (hasAllowedPosition) {
      return true;
    }
  }

  // 5. Fallback for super administrator when not actively previewing a non-admin role
  if (isSuperAdminEmail(userEmail) && (!activeRole || activeRole === 'admin')) {
    return true;
  }

  return false;
}
