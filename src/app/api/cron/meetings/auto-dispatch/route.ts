import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createRecordingBot, getBotDetails } from '@/lib/meeting-baas/bots';
import { executeMeetingProcessingPipeline } from '@/lib/meeting-baas/pipeline';
import { isSuperAdminEmail } from '@/lib/constants/auth';

export async function GET(req: NextRequest) {
  return handleAutoDispatchAndSync(req);
}

export async function POST(req: NextRequest) {
  return handleAutoDispatchAndSync(req);
}

async function handleAutoDispatchAndSync(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Verify authorization: accept Vercel Cron Secret or Admin / Bureau role
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized invocation' }, { status: 401 });
      }

      const isSuperAdmin = isSuperAdminEmail(user.email);
      const { data: roleRecords } = await supabase
        .from('user_roles')
        .select('roles(key)')
        .eq('user_id', user.id);

      const isAuthorized =
        isSuperAdmin ||
        roleRecords?.some((r: any) => ['admin', 'bureau'].includes(r.roles?.key));

      if (!isAuthorized) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin or Bureau access required' }, { status: 403 });
      }
    }
  }

  const adminDb = getSupabaseAdmin();
  const now = new Date();
  // 5 minutes in the future window
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  // Don't look back further than 4 hours for missed start times
  const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

  const results = {
    dispatched: [] as Array<{ meetingId: string; title: string; botId: string }>,
    synced: [] as Array<{ meetingId: string; title: string; botId: string }>,
    errors: [] as string[],
  };

  // ===========================================================================
  // 1. AUTO-DISPATCH: Meetings starting within 5 minutes (or right now)
  // ===========================================================================
  try {
    const { data: dueMeetings, error: dueErr } = await adminDb
      .from('meetings')
      .select('id, title, meeting_url, starts_at, organizer_id, recording_status, recording_enabled')
      .in('status', ['scheduled', 'in_progress'])
      .eq('recording_enabled', true)
      .not('meeting_url', 'is', null)
      .in('recording_status', ['none', 'requested'])
      .lte('starts_at', windowEnd)
      .gte('starts_at', windowStart);

    if (dueErr) {
      results.errors.push(`Failed to fetch due meetings: ${dueErr.message}`);
    } else if (dueMeetings && dueMeetings.length > 0) {
      for (const meeting of dueMeetings) {
        try {
          if (!meeting.meeting_url || !meeting.meeting_url.includes('meet.google.com')) {
            continue;
          }

          // Check if an active bot session is already running
          const { data: existingActive } = await adminDb
            .from('meeting_bot_sessions')
            .select('id, provider_bot_id')
            .eq('meeting_id', meeting.id)
            .in('bot_status', ['dispatched', 'joining', 'waiting_admission', 'in_meeting', 'recording'])
            .maybeSingle();

          if (existingActive) {
            continue;
          }

          // Dispatch bot to Google Meet
          const botResult = await createRecordingBot({
            meetingUrl: meeting.meeting_url,
            meetingId: meeting.id,
            botName: 'ZEC AI Meeting Assistant',
            extra: {
              auto_dispatched: true,
              dispatched_lead_time_minutes: 5,
              meeting_starts_at: meeting.starts_at,
            },
          });

          if (botResult?.bot_id) {
            // Record bot session
            await adminDb.from('meeting_bot_sessions').insert({
              meeting_id: meeting.id,
              provider_bot_id: botResult.bot_id,
              bot_status: 'joining',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            // Update meeting status
            await adminDb
              .from('meetings')
              .update({
                recording_status: 'joining',
                updated_at: new Date().toISOString(),
              })
              .eq('id', meeting.id);

            // Notify meeting organizer
            if (meeting.organizer_id) {
              await adminDb.from('notifications').insert({
                recipient_id: meeting.organizer_id,
                recipient_user_id: meeting.organizer_id,
                type: 'meeting_bot_dispatched',
                title: 'ZEC AI Assistant Dispatched (5min early)',
                body: `Your AI Meeting Assistant has joined Google Meet early for "${meeting.title}" to ensure complete recording and transcription from minute zero.`,
                destination_url: `/meetings/${meeting.id}`,
                is_read: false,
                created_at: new Date().toISOString(),
              });
            }

            results.dispatched.push({
              meetingId: meeting.id,
              title: meeting.title,
              botId: botResult.bot_id,
            });
          }
        } catch (botErr: any) {
          results.errors.push(`Error dispatching bot for meeting ${meeting.id}: ${botErr?.message}`);
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Auto-dispatch routine error: ${err?.message}`);
  }

  // ===========================================================================
  // 2. AUTO-SYNC: Sync recordings for completed/in-flight meetings automatically
  // ===========================================================================
  try {
    const { data: activeMeetings, error: actErr } = await adminDb
      .from('meetings')
      .select('id, title, recording_status')
      .in('recording_status', ['live', 'recording', 'processing'])
      .order('updated_at', { ascending: false })
      .limit(10);

    if (actErr) {
      results.errors.push(`Failed to fetch active meetings for sync: ${actErr.message}`);
    } else if (activeMeetings && activeMeetings.length > 0) {
      for (const m of activeMeetings) {
        try {
          const { data: botSession } = await adminDb
            .from('meeting_bot_sessions')
            .select('provider_bot_id, bot_status')
            .eq('meeting_id', m.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (botSession?.provider_bot_id) {
            // Check current status in Meeting BaaS
            const details = await getBotDetails(botSession.provider_bot_id);
            const status = details?.data?.status || '';
            const isFinished =
              status === 'completed' ||
              status === 'done' ||
              status === 'ended' ||
              Boolean(details?.data?.output_transcription) ||
              Boolean(details?.data?.transcription);

            if (isFinished) {
              // Execute pipeline automatically
              await executeMeetingProcessingPipeline({
                meetingId: m.id,
                botId: botSession.provider_bot_id,
              });

              results.synced.push({
                meetingId: m.id,
                title: m.title,
                botId: botSession.provider_bot_id,
              });
            }
          }
        } catch (syncErr: any) {
          results.errors.push(`Error auto-syncing meeting ${m.id}: ${syncErr?.message}`);
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Auto-sync routine error: ${err?.message}`);
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    dispatchedCount: results.dispatched.length,
    syncedCount: results.synced.length,
    results,
  });
}
