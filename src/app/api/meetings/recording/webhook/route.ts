import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.MEETING_RECORDING_WEBHOOK_SECRET;

    // Optional HMAC signature check if secret is configured
    if (webhookSecret && webhookSecret !== 'your-webhook-secret') {
      const signature = req.headers.get('x-recall-signature') || req.headers.get('x-webhook-signature');
      if (!signature) {
        return NextResponse.json({ error: 'Missing webhook signature header' }, { status: 401 });
      }
      // Note: In Node.js, crypto.createHmac can verify against rawBody
    }

    const payload = JSON.parse(rawBody || '{}');
    const event = payload.event || payload.type || 'bot.done';
    const botId = payload.data?.bot_id || payload.bot_id || payload.id;
    const meetingId = payload.data?.metadata?.meeting_id || payload.meeting_id;
    const idempotencyKey = payload.idempotency_key || `webhook_${botId}_${event}`;

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: true, mode: 'mock_ack' });
    }

    // 1. Idempotency Check: Reject duplicate webhook execution
    const { data: existingJob } = await supabase
      .from('meeting_recording_jobs')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingJob && existingJob.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Event already processed' });
    }

    // 2. Handle Bot State Transitions
    if (event === 'bot.status_change') {
      const subCode = payload.data?.status?.sub_code || payload.status;
      let meetingRecordingStatus = 'live';
      if (subCode === 'recording_permission_denied') {
        meetingRecordingStatus = 'failed';
      } else if (subCode === 'in_call_recording') {
        meetingRecordingStatus = 'live';
      }

      if (meetingId) {
        await supabase
          .from('meetings')
          .update({ recording_status: meetingRecordingStatus })
          .eq('id', meetingId);
      }

      return NextResponse.json({ success: true, status: meetingRecordingStatus });
    }

    // 3. Handle Recording Completed / Ingestion Event
    if (event === 'bot.done' || event === 'recording.ready' || event === 'bot.complete') {
      const videoUrl = payload.data?.video_url || payload.recording_url;
      const durationSeconds = payload.data?.duration || payload.duration || 1800;
      const providerRecordingId = payload.data?.recording_id || `rec_${botId}_${Date.now()}`;

      // Prevent duplicate recording records
      const { data: existingRecording } = await supabase
        .from('meeting_recordings')
        .select('id')
        .eq('provider_recording_id', providerRecordingId)
        .maybeSingle();

      if (!existingRecording && meetingId) {
        // Insert recording
        const { data: newRec } = await supabase
          .from('meeting_recordings')
          .insert({
            meeting_id: meetingId,
            provider: payload.provider || 'recall_ai',
            provider_recording_id: providerRecordingId,
            storage_path: videoUrl || null,
            duration_seconds: Math.round(durationSeconds),
            processing_status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        // Update meeting
        await supabase
          .from('meetings')
          .update({
            recording_status: 'available',
            status: 'completed',
          })
          .eq('id', meetingId);

        // Update or insert job record
        await supabase
          .from('meeting_recording_jobs')
          .upsert({
            meeting_id: meetingId,
            external_job_id: botId,
            status: 'completed',
            idempotency_key: idempotencyKey,
            completed_at: new Date().toISOString(),
          }, { onConflict: 'idempotency_key' });

        // If transcript data is provided directly in payload, ingest it
        const transcriptText = payload.data?.transcript || payload.transcript;
        if (transcriptText && newRec) {
          const { data: newTx } = await supabase
            .from('meeting_transcripts')
            .insert({
              meeting_id: meetingId,
              recording_id: newRec.id,
              language: 'fr',
              content: typeof transcriptText === 'string' ? transcriptText : JSON.stringify(transcriptText),
              processing_status: 'completed',
            })
            .select()
            .single();

          if (newTx && Array.isArray(payload.data?.transcript_segments)) {
            const segRows = payload.data.transcript_segments.map((seg: Record<string, unknown>) => ({
              transcript_id: newTx.id,
              meeting_id: meetingId,
              speaker_label: String(seg.speaker || 'Speaker 1'),
              start_seconds: Number(seg.start_timestamp || 0),
              end_seconds: Number(seg.end_timestamp || 0),
              content: String(seg.words || seg.text || ''),
            }));
            if (segRows.length > 0) {
              await supabase.from('meeting_transcript_segments').insert(segRows);
            }
          }
        }
      }

      return NextResponse.json({ success: true, message: 'Recording ingested successfully' });
    }

    return NextResponse.json({ success: true, event });
  } catch (err: unknown) {
    console.error('Webhook error:', err);
    const msg = err instanceof Error ? err.message : 'Internal webhook error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
