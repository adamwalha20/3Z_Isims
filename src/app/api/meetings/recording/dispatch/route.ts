import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createRecordingBot, leaveMeeting, validateGoogleMeetUrl } from '@/lib/meeting-baas/bots';
import { isSuperAdminEmail } from '@/lib/constants/auth';
import { getMeetingBaaSClient } from '@/lib/meeting-baas/client';

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
    const { meetingId, action = 'dispatch' } = body;

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    // 1. Fetch Meeting record
    const { data: meeting, error: meetErr } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetErr || !meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Cannot dispatch bot to a cancelled meeting.' }, { status: 400 });
    }

    // 2. Authorization check: Organizer, Bureau Officer, or Club Administrator
    const isSuperAdmin = isSuperAdminEmail(user.email);
    const isOrganizer = meeting.organizer_id === user.id || meeting.created_by === user.id;

    const { data: roleRecords } = await supabase
      .from('user_roles')
      .select('roles(key)')
      .eq('user_id', user.id);

    const isParticipant = (meeting.participant_ids || []).includes(user.id);
    const hasLeadershipRole =
      isSuperAdmin ||
      isOrganizer ||
      (body.isAutoDispatch && (isParticipant || meeting.recording_enabled)) ||
      roleRecords?.some((r: any) => ['admin', 'bureau'].includes(r.roles?.key));

    if (!hasLeadershipRole) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only meeting organizers and bureau officers can control recording bots.' },
        { status: 403 }
      );
    }

    const adminDb = getSupabaseAdmin();

    // =========================================================================
    // ACTION: STOP RUNNING BOT
    // =========================================================================
    if (action === 'stop' || action === 'leave') {
      const { data: activeSession } = await adminDb
        .from('meeting_bot_sessions')
        .select('*')
        .eq('meeting_id', meetingId)
        .in('bot_status', ['dispatched', 'joining', 'waiting_admission', 'in_meeting', 'recording'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeSession) {
        return NextResponse.json({ success: false, error: 'No active recording bot session found to stop.' }, { status: 404 });
      }

      try {
        await leaveMeeting(activeSession.provider_bot_id);
      } catch (leaveErr: any) {
        console.warn('Meeting BaaS leave command notice:', leaveErr?.message);
      }

      await adminDb
        .from('meeting_bot_sessions')
        .update({
          bot_status: 'completed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);

      await adminDb
        .from('meetings')
        .update({
          recording_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      return NextResponse.json({
        success: true,
        message: 'Recording bot instructed to leave Google Meet session.',
        botId: activeSession.provider_bot_id,
      });
    }

    // =========================================================================
    // ACTION: DISPATCH RECORDING BOT
    // =========================================================================
    const meetingUrl = body.meetingUrl || meeting.meeting_url;
    const { isValid, normalizedUrl, error: urlError } = validateGoogleMeetUrl(meetingUrl);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: urlError || 'Valid Google Meet URL (https://meet.google.com/xxx-yyyy-zzz) is required.' },
        { status: 400 }
      );
    }

    // 3. Deduplication Check: Check if an active bot is already running for this meeting
    const { data: existingActiveBot } = await adminDb
      .from('meeting_bot_sessions')
      .select('id, provider_bot_id, bot_status')
      .eq('meeting_id', meetingId)
      .in('bot_status', ['dispatched', 'joining', 'waiting_admission', 'in_meeting', 'recording'])
      .maybeSingle();

    if (existingActiveBot) {
      return NextResponse.json({
        success: true,
        alreadyActive: true,
        botId: existingActiveBot.provider_bot_id,
        status: existingActiveBot.bot_status,
        message: `A recording bot is already active (${existingActiveBot.bot_status}) for this meeting.`,
      });
    }

    // 4. Verify Meeting BaaS Configuration
    const baasClient = getMeetingBaaSClient();
    if (!baasClient.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Meeting BaaS API key is not configured. Please set MEETING_BAAS_API_KEY in your environment variables.',
          isConfigError: true,
        },
        { status: 503 }
      );
    }

    // 5. Call Meeting BaaS API v2 to create bot
    const botResult = await createRecordingBot({
      meetingUrl: normalizedUrl,
      meetingId: meeting.id,
      botName: 'ZEC AI Meeting Assistant',
      recordingMode: 'speaker_view',
      deduplicationKey: `zec_meet_${meeting.id}`,
      extra: {
        meeting_id: meeting.id,
        dispatched_by: user.id,
        organizer_email: user.email,
      },
    });

    // 6. Record bot session in Supabase
    await adminDb.from('meeting_bot_sessions').insert({
      meeting_id: meeting.id,
      provider: 'meeting_baas',
      provider_bot_id: botResult.bot_id,
      bot_status: 'joining',
      dispatched_by: user.id,
      dispatched_at: new Date().toISOString(),
      metadata: {
        meeting_url: normalizedUrl,
        bot_name: 'ZEC AI Meeting Assistant',
      },
    });

    // 7. Update meeting record
    await adminDb
      .from('meetings')
      .update({
        recording_status: 'joining',
        recording_enabled: true,
        meeting_url: normalizedUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meeting.id);

    return NextResponse.json({
      success: true,
      botId: botResult.bot_id,
      status: 'joining',
      message: 'ZEC AI Meeting Assistant dispatched successfully. The bot is connecting to Google Meet.',
    });
  } catch (err: any) {
    console.error('Bot dispatch error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to dispatch recording bot' },
      { status: 500 }
    );
  }
}
