/**
 * Attendance Scanner Authorization Policy
 * 
 * Strict club rule: Only the President, Vice President, Secretary General,
 * and Club Administrator are permitted to access and operate the attendance scanner.
 */

export const ALLOWED_SCANNER_POSITIONS = [
  'president',
  'vice_president',
  'secretary_general',
  'secretary',
] as const;

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
  // 1. Club super administrator
  if (userEmail && userEmail.toLowerCase() === 'adamwalha20@gmail.com') {
    return true;
  }
  if (isAdmin === true) {
    return true;
  }
  if (activeRole === 'admin') {
    return true;
  }

  // 2. Active bureau position check (for simulation / active role switching)
  if (activeBureauPosition) {
    const normActive = activeBureauPosition.toLowerCase();
    if (
      normActive === 'president' ||
      normActive === 'vice_president' ||
      normActive === 'secretary_general' ||
      normActive.includes('secretary')
    ) {
      return true;
    }
  }

  // 3. User's assigned bureau positions check
  if (Array.isArray(userBureauPositions) && userBureauPositions.length > 0) {
    const hasAllowedPosition = userBureauPositions.some((pos) => {
      if (!pos) return false;
      const norm = pos.toLowerCase();
      return (
        norm === 'president' ||
        norm === 'vice_president' ||
        norm === 'secretary_general' ||
        norm.includes('secretary')
      );
    });

    if (hasAllowedPosition) {
      return true;
    }
  }

  return false;
}
