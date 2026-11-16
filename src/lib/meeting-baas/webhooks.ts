import { Webhook } from 'svix';
import {
  MeetingBaaSWebhookSecretError,
  MeetingBaaSWebhookVerificationError,
} from './errors';
import { MeetingBaaSWebhookPayload } from './types';

export function getWebhookSecret(): string {
  const secret = process.env.MEETING_BAAS_WEBHOOK_SECRET || '';
  if (!secret || secret.includes('your-svix-webhook-secret')) {
    throw new MeetingBaaSWebhookSecretError();
  }
  return secret;
}

export function isWebhookConfigured(): boolean {
  try {
    getWebhookSecret();
    return true;
  } catch {
    return false;
  }
}

/**
 * Cryptographically verifies an incoming Meeting BaaS webhook payload using SVIX.
 * Inspects svix-id, svix-timestamp, and svix-signature headers.
 */
export function verifyMeetingBaaSWebhook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>
): MeetingBaaSWebhookPayload {
  const secret = getWebhookSecret();

  // Normalize header keys (case-insensitive)
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      normalizedHeaders[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }
  }

  const svixId = normalizedHeaders['svix-id'];
  const svixTimestamp = normalizedHeaders['svix-timestamp'];
  const svixSignature = normalizedHeaders['svix-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new MeetingBaaSWebhookVerificationError(
      'Missing required SVIX signature headers (svix-id, svix-timestamp, svix-signature)'
    );
  }

  const wh = new Webhook(secret);

  try {
    const verifiedPayload = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as unknown as MeetingBaaSWebhookPayload;

    return verifiedPayload;
  } catch (err: any) {
    throw new MeetingBaaSWebhookVerificationError(
      `Webhook cryptographic verification failed: ${err?.message || 'Signature mismatch'}`
    );
  }
}
