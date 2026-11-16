import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyMeetingBaaSWebhook } from '@/lib/meeting-baas/webhooks';
import { executeMeetingProcessingPipeline } from '@/lib/meeting-baas/pipeline';
import { MeetingBaaSWebhookPayload } from '@/lib/meeting-baas/types';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Convert NextRequest headers to dictionary
    const headersRecord: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    // 2. Cryptographic SVIX Signature Verification
    let payload: MeetingBaaSWebhookPayload;
    try {
      payload = verifyMeetingBaaSWebhook(rawBody, headersRecord);
    } catch (sigErr: any) {
      console.warn('Meeting BaaS Webhook rejection:', sigErr?.message);
      return NextResponse.json(
        { success: false, error: sigErr?.message || 'Unauthorized webhook signature' },
        { status: 401 }
      );
    }

    const eventId =
      headersRecord['svix-id'] ||
      payload.event_id ||
      payload.id ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventType = payload.event || 'bot.status_change';
    const botId = payload.data?.bot_id || payload.bot_id || '';
    const supabase = getSupabaseAdmin();

    // 3. Idempotency Check: Reject duplicate event processing
    const { data: existingEvent } = await supabase
      .from('meeting_webhook_events')
      .select('id, processing_status')
      .eq('provider', 'meeting_baas')
      .eq('provider_event_id', eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processing_status === 'processed') {
      return NextResponse.json({ success: true, message: 'Event already processed' });
    }

    // 4. Record webhook event in public.meeting_webhook_events
    if (!existingEvent) {
      await supabase.from('meeting_webhook_events').insert({
        provider: 'meeting_baas',
        provider_event_id: eventId,
        provider_bot_id: botId,
        event_type: eventType,
        payload: payload as any,
        processing_status: 'pending',
        received_at: new Date().toISOString(),
      });
    }

    // 5. Correlate with meeting
    let meetingId = payload.data?.extra?.meeting_id || payload.data?.metadata?.meeting_id;
    if (!meetingId && botId) {
      const { data: botSession } = await supabase
        .from('meeting_bot_sessions')
        .select('meeting_id')
        .eq('provider_bot_id', botId)
        .maybeSingle();
      if (botSession) {
        meetingId = botSession.meeting_id;
      }
    }

    // 6. Handle Bot State Transitions & Automated Sync
    const isCompletedEvent =
      eventType === 'complete' ||
      eventType === 'bot.completed' ||
      eventType === 'bot.done' ||
      eventType === 'recording.ready' ||
      eventType === 'transcription_complete' ||
      eventType === 'transcription.completed' ||
      (eventType === 'bot.status_change' &&
        (payload.data?.status === 'completed' || payload.data?.status === 'ended'));

    if (isCompletedEvent) {
      if (botId) {
        await supabase
          .from('meeting_bot_sessions')
          .update({
            bot_status: 'completed',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_bot_id', botId);
      }

      if (meetingId) {
        await supabase
          .from('meetings')
          .update({
            recording_status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', meetingId);

        // Enqueue durable background processing job
        const idempotencyKey = `job_${meetingId}_${botId}_process`;
        const { data: jobRecord } = await supabase
          .from('meeting_processing_jobs')
          .upsert(
            {
              meeting_id: meetingId,
              job_type: 'process_meeting_artifacts',
              idempotency_key: idempotencyKey,
              status: 'queued',
              payload: { botId, eventId },
            },
            { onConflict: 'idempotency_key' }
          )
          .select('id')
          .single();

        // Trigger processing pipeline (runs asynchronously on the server)
        executeMeetingProcessingPipeline({
          meetingId,
          botId,
          jobId: jobRecord?.id,
        }).catch((err) => console.error('Background pipeline error:', err));
      }
    } else if (eventType === 'bot.status_change') {
      const status = payload.data?.status || 'in_meeting';
      const subCode = payload.data?.sub_code;

      let mappedStatus = 'live';
      if (status === 'joining') mappedStatus = 'joining';
      else if (status === 'waiting_admission') mappedStatus = 'waiting_admission';
      else if (status === 'recording' || status === 'in_meeting') mappedStatus = 'live';
      else if (status === 'failed' || subCode === 'recording_permission_denied') mappedStatus = 'failed';

      if (botId) {
        await supabase
          .from('meeting_bot_sessions')
          .update({
            bot_status: status,
            failure_reason: subCode || null,
            updated_at: new Date().toISOString(),
          })
          .eq('provider_bot_id', botId);
      }

      if (meetingId) {
        await supabase
          .from('meetings')
          .update({
            recording_status: mappedStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', meetingId);
      }
    } else if (eventType === 'bot.failed' || eventType === 'bot.kicked' || eventType === 'bot.stopped') {
      const failureReason = payload.data?.failure_reason || payload.data?.sub_code || eventType;

      if (botId) {
        await supabase
          .from('meeting_bot_sessions')
          .update({
            bot_status: eventType === 'bot.stopped' ? 'completed' : 'failed',
            failure_reason: failureReason,
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_bot_id', botId);
      }

      if (meetingId) {
        await supabase
          .from('meetings')
          .update({
            recording_status: eventType === 'bot.stopped' ? 'completed' : 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', meetingId);
      }
    }

    // 7. Mark event as processed
    await supabase
      .from('meeting_webhook_events')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('provider', 'meeting_baas')
      .eq('provider_event_id', eventId);

    return NextResponse.json({ success: true, eventId });
  } catch (err: any) {
    console.error('Webhook processing failure:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal webhook error' },
      { status: 500 }
    );
  }
}
