import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { executeMeetingProcessingPipeline } from '@/lib/meeting-baas/pipeline';
import { getMeetingBaaSClient } from '@/lib/meeting-baas/client';
import { getBotDetails } from '@/lib/meeting-baas/bots';
import { isSuperAdminEmail } from '@/lib/constants/auth';

/**
 * Shared sync execution logic for both GET (auto-poller) and POST (manual/webhook sync)
 */
async function executeSyncForMeeting(meetingId: string) {
  const adminDb = getSupabaseAdmin();

  // 1. Fetch meeting record
  const { data: meeting, error: meetErr } = await adminDb
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (meetErr || !meeting) {
    return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
  }

  // 2. Check if already completed with transcripts and summaries
  const { data: existingTranscript } = await adminDb
    .from('meeting_transcripts')
    .select('id')
    .eq('meeting_id', meetingId)
    .maybeSingle();

  const { data: existingSummary } = await adminDb
    .from('meeting_summaries')
    .select('id')
    .eq('meeting_id', meetingId)
    .maybeSingle();

  if (meeting.recording_status === 'completed' && existingTranscript && existingSummary) {
    return NextResponse.json({
      success: true,
      isReady: true,
      status: 'completed',
      alreadySynced: true,
      message: 'Meeting recording and AI intelligence are already synced.',
    });
  }

  // 3. Find bot ID from sessions or query Meeting BaaS
  let botId: string | null = null;
  const { data: botSession } = await adminDb
    .from('meeting_bot_sessions')
    .select('id, provider_bot_id, bot_status')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (botSession?.provider_bot_id) {
    botId = botSession.provider_bot_id;
  } else {
    // Query Meeting BaaS API for recent bots
    const baasClient = getMeetingBaaSClient();
    if (baasClient.isConfigured()) {
      try {
        const listRes = await baasClient.request<any>('/bots', { method: 'GET' });
        const bots = listRes?.data || listRes || [];
        const match = Array.isArray(bots)
          ? bots.find(
              (b: any) =>
                b.extra?.meeting_id === meetingId ||
                (meeting.meeting_url && b.meeting_url === meeting.meeting_url)
            )
          : null;
        if (match) {
          botId = match.bot_id || match.id;
        }
      } catch (queryErr) {
        console.warn('Could not query Meeting BaaS bots list:', queryErr);
      }
    }
  }

  if (!botId) {
    return NextResponse.json({
      success: false,
      isReady: false,
      status: meeting.recording_status || 'none',
      error: 'No recording bot session found for this meeting.',
    }, { status: 404 });
  }

  // 4. Query live status from Meeting BaaS
  let isFinished = false;
  let botStatus = botSession?.bot_status || 'unknown';
  try {
    const details = await getBotDetails(botId);
    const botData: any = details?.data;
    botStatus = botData?.status || botData?.bot?.status || botStatus;
    isFinished =
      botStatus === 'completed' ||
      botStatus === 'done' ||
      botStatus === 'ended' ||
      Boolean(botData?.output_transcription) ||
      Boolean(botData?.transcription) ||
      Boolean(botData?.mp4) ||
      Boolean(botData?.video_url);
  } catch (err) {
    console.warn('Live bot status check failed, falling back to database state:', err);
    if (botSession?.bot_status === 'completed' || meeting.recording_status === 'processing') {
      isFinished = true;
    }
  }

  // 5. If not finished yet, update current status and return pending
  if (!isFinished) {
    if (botSession && botStatus && botStatus !== botSession.bot_status) {
      await adminDb
        .from('meeting_bot_sessions')
        .update({ bot_status: botStatus, updated_at: new Date().toISOString() })
        .eq('id', botSession.id);
    }
    return NextResponse.json({
      success: true,
      isReady: false,
      status: botStatus,
      message: `Recording bot is currently ${botStatus}. Sync will complete automatically once meeting ends.`,
    });
  }

  // 6. Execute background processing pipeline
  const pipelineRes = await executeMeetingProcessingPipeline({
    meetingId,
    botId,
  });

  if (!pipelineRes.success) {
    return NextResponse.json({
      success: false,
      isReady: false,
      error: pipelineRes.error || 'Pipeline execution failed.',
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    isReady: true,
    status: 'completed',
    message: 'Meeting recording and AI intelligence successfully processed!',
    botId,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    return await executeSyncForMeeting(meetingId);
  } catch (err: any) {
    console.error('Recording auto-sync error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to sync recording' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { meetingId } = body;

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    // Check meeting permissions
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const isSuperAdmin = isSuperAdminEmail(user.email);
    const isOrganizer = meeting.organizer_id === user.id || meeting.created_by === user.id;

    const { data: roleRecords } = await supabase
      .from('user_roles')
      .select('roles(key)')
      .eq('user_id', user.id);

    const hasLeadershipRole =
      isSuperAdmin ||
      isOrganizer ||
      roleRecords?.some((r: any) => ['admin', 'bureau'].includes(r.roles?.key));

    if (!hasLeadershipRole) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only meeting organizers and bureau officers can sync recordings.' },
        { status: 403 }
      );
    }

    return await executeSyncForMeeting(meetingId);
  } catch (err: any) {
    console.error('Recording sync error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to sync recording' },
      { status: 500 }
    );
  }
}
