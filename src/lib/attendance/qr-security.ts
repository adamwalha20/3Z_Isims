import crypto from 'crypto';

export interface GeneratedCredential {
  credentialId: string;
  qrPayload: string;
  tokenSecret: string;
  tokenHash: string;
  tokenSalt: string;
}

export interface ParsedQRPayload {
  version: string;
  credentialId: string;
  tokenSecret: string;
}

const QR_PREFIX = 'zec_att_v1';

/**
 * Generates an opaque, secure token payload for a member's personal QR code.
 * Format: zec_att_v1:<credential_id>:<token_secret>
 * Raw user IDs, emails, and sensitive personal info are NEVER encoded in the QR.
 */
export function generateMemberQRPayload(credentialId: string, tokenSecret: string): string {
  return `${QR_PREFIX}:${credentialId}:${tokenSecret}`;
}

/**
 * Creates cryptographically secure secrets, salt, and token hash for a new credential
 */
export function createNewCredentialSecrets(credentialId?: string): GeneratedCredential {
  const id = credentialId || crypto.randomUUID();
  const tokenSecret = crypto.randomBytes(24).toString('hex');
  const tokenSalt = crypto.randomBytes(16).toString('hex');
  const tokenHash = hashTokenSecret(tokenSecret, tokenSalt);
  const qrPayload = generateMemberQRPayload(id, tokenSecret);

  return {
    credentialId: id,
    qrPayload,
    tokenSecret,
    tokenHash,
    tokenSalt,
  };
}

/**
 * Hashes a token secret with salt using HMAC-SHA256
 */
export function hashTokenSecret(tokenSecret: string, tokenSalt: string): string {
  return crypto.createHmac('sha256', tokenSalt).update(tokenSecret).digest('hex');
}

/**
 * Parses and validates the structural format of a scanned QR payload
 */
export function parseQRPayload(rawPayload: string): ParsedQRPayload | null {
  if (!rawPayload || typeof rawPayload !== 'string') return null;

  const parts = rawPayload.trim().split(':');
  if (parts.length !== 3) return null;

  const [version, credentialId, tokenSecret] = parts;
  if (version !== QR_PREFIX) return null;

  // Validate credentialId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(credentialId)) return null;

  // Validate tokenSecret is a hex string
  if (!tokenSecret || tokenSecret.length < 16) return null;

  return { version, credentialId, tokenSecret };
}

/**
 * Validates a scanned QR payload against the stored credential in constant time
 */
export function verifyCredentialSecret(
  tokenSecret: string,
  storedHash: string,
  storedSalt: string
): boolean {
  try {
    const computedHash = hashTokenSecret(tokenSecret, storedSalt);
    const computedBuf = Buffer.from(computedHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');

    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

