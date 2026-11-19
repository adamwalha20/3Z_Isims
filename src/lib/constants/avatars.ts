/**
 * ZEC Campus Hub — Official 3D Cartoon Avatars
 * Elegant, cohesive 3D cartoon avatars styled with the 3ZERO Club emerald / green-tech theme.
 */

export const DEFAULT_AVATAR = '/avatars/avatar-1.png';

export const OFFICIAL_AVATAR_PRESETS: readonly string[] = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
] as const;

/**
 * Returns the member avatar or falls back to the official cartoon avatar.
 * Replaces legacy unsplash stock photos with the modern theme avatar.
 */
export function getSafeAvatar(avatarPath?: string | null): string {
  if (!avatarPath || avatarPath.trim() === '' || avatarPath.includes('images.unsplash.com')) {
    return DEFAULT_AVATAR;
  }
  return avatarPath;
}
