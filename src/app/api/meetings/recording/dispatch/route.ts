import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId, meetingUrl } = body;

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Missing meetingId' }, { status: 400 });
    }

    if (!meetingUrl || !meetingUrl.includes('meet.google.com')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing Google Meet URL. Must follow https://meet.google.com/xxx-yyyy-zzz format.',
      }, { status: 400 });
    }

    const provider = process.env.MEETING_RECORDING_PROVIDER || 'recall_ai';
    const apiKey = process.env.MEETING_RECORDING_API_KEY;
    const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/meetings/recording/webhook`
      : 'https://3-z-isims.vercel.app/api/meetings/recording/webhook';

    // 1. If real provider API key is configured (e.g. Recall.ai / MeetingBaas)
    if (apiKey && apiKey !== 'your-recording-api-key') {
      try {
        let externalJobId = '';
        if (provider === 'recall_ai') {
          const resp = await fetch('https://api.recall.ai/api/v1/bot', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meeting_url: meetingUrl,
              bot_name: 'ZEC Meeting Recorder',
              recording_mode: 'speaker_view',
              chat: {
                auto_join: true,
                join_message: 'ZEC Meeting Recorder joined. This session is recorded and transcribed for 3ZERO Club ISIMS institutional memory.',
              },
              automatic_leave: {
                everyone_left_timeout: 300,
                waiting_room_timeout: 600,
              },
              webhook_url: webhookUrl,
            }),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Recall.ai error: ${errText}`);
          }

          const botData = await resp.json();
          externalJobId = botData.id;
        }

        // Store job in database if live Supabase is available
        const supabase = await createClient();
        if (supabase) {
          await supabase.from('meeting_recording_jobs').insert({
            meeting_id: meetingId,
            provider,
            external_job_id: externalJobId,
            status: 'bot_joining',
            idempotency_key: `dispatch_${meetingId}_${Date.now()}`,
          });

          await supabase
            .from('meetings')
            .update({
              recording_status: 'live',
              recording_enabled: true,
            })
            .eq('id', meetingId);
        }

        return NextResponse.json({
          success: true,
          status: 'live',
          provider,
          externalJobId,
          message: 'ZEC Meeting Recorder successfully dispatched to Google Meet session.',
        });
      } catch (err: unknown) {
        console.error('Failed to dispatch external recording bot:', err);
        const msg = err instanceof Error ? err.message : 'External recording provider dispatch failed';
        return NextResponse.json({
          success: false,
          status: 'failed',
          error: msg,
        }, { status: 502 });
      }
    }

    // 2. Modular fallback when no external provider API key is provided
    // Creates job in 'requested' state and informs organizer of available alternatives (upload / Google Drive import)
    const supabase = await createClient();
    if (supabase) {
      await supabase.from('meeting_recording_jobs').insert({
        meeting_id: meetingId,
        provider: 'custom_bot',
        external_job_id: `mock-job-${Date.now()}`,
        status: 'requested',
        idempotency_key: `mock_dispatch_${meetingId}_${Date.now()}`,
        error_message: 'Awaiting provider credentials or direct recording upload by meeting host.',
      });

      await supabase
        .from('meetings')
        .update({
          recording_status: 'requested',
          recording_enabled: true,
        })
        .eq('id', meetingId);
    }

    return NextResponse.json({
      success: true,
      status: 'requested',
      provider: 'custom_bot',
      message: 'Recording bot requested for scheduled session. If an external bot provider is not configured, the meeting organizer can upload the Google Meet recording directly after the session.',
      instructions: {
        optionA: 'Configure MEETING_RECORDING_PROVIDER & MEETING_RECORDING_API_KEY in .env.local for automatic bot joining.',
        optionB: 'Upload recording directly from organizer device via meeting page.',
        optionC: 'Import Google Meet recording file downloaded from Google Drive.',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal dispatch error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
