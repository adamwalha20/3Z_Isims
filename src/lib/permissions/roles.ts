/**
 * ZEC Campus Hub — Role Definitions & Hierarchy
 */

export type GlobalRole = 'admin' | 'bureau' | 'member';

export type BureauPositionKey =
  | 'president'
  | 'vice_president'
  | 'secretary_general'
  | 'treasurer'
  | 'training_innovation'
  | 'hr_manager'
  | 'marketing_design_manager'
  | 'sustainable_campus_manager'
  | 'communication_engagement_manager'
  | 'events_manager'
  | 'project_manager'
  | 'partnerships_sponsorship_manager';

export const EXECUTIVE_BOARD_POSITIONS: readonly BureauPositionKey[] = [
  'president',
  'vice_president',
  'secretary_general',
  'treasurer',
] as const;

export const ADMIN_EMAILS: readonly string[] = [
  'adamwalha20@gmail.com',
  'adamwalha.isims@gmail.com',
  'adamwalha2@gmail.com',
] as const;

export const POSITION_TO_DEPARTMENT_SLUG: Record<BureauPositionKey, string> = {
  training_innovation: 'training-innovation',
  events_manager: 'events-logistics',
  marketing_design_manager: 'comms-media',
  communication_engagement_manager: 'comms-media',
  partnerships_sponsorship_manager: 'partnerships',
  secretary_general: 'governance',
  president: 'governance',
  vice_president: 'governance',
  treasurer: 'governance',
  hr_manager: 'governance',
  sustainable_campus_manager: 'training-innovation',
  project_manager: 'events-logistics',
};

export function isExecutiveBoard(positionKey?: string | null): boolean {
  if (!positionKey) return false;
  return EXECUTIVE_BOARD_POSITIONS.includes(positionKey as BureauPositionKey);
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (lower === 'mahdihelmin@gmail.com') return false; // Explicit restricted test user
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === lower) || lower.startsWith('adamwalha');
}
