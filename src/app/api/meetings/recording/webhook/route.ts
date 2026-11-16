import { NextRequest, NextResponse } from 'next/server';
import { POST as meetingBaaSWebhookHandler } from '@/app/api/webhooks/meeting-baas/route';

/**
 * Legacy webhook endpoint compatibility forwarder.
 * Delegates directly to the canonical Meeting BaaS API v2 webhook handler.
 */
export async function POST(req: NextRequest) {
  return meetingBaaSWebhookHandler(req);
}
