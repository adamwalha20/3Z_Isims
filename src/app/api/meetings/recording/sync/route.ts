import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { executeMeetingProcessingPipeline } from '@/lib/meeting-baas/pipeline';
import { getMeetingBaaSClient } from '@/lib/meeting-baas/client';
import { isSuperAdminEmail } from '@/lib/constants/auth';

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

    const adminDb = getSupabaseAdmin();

    // Find bot ID from sessions or query Meeting BaaS
    let botId: string | null = null;
    const { data: botSession } = await adminDb
      .from('meeting_bot_sessions')
      .select('provider_bot_id')
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
        error: 'No recording bot session found for this meeting in Meeting BaaS.',
      }, { status: 404 });
    }

    // Execute background processing pipeline
    const pipelineRes = await executeMeetingProcessingPipeline({
      meetingId,
      botId,
    });

    if (!pipelineRes.success) {
      return NextResponse.json({
        success: false,
        error: pipelineRes.error || 'Pipeline execution failed.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting recording and AI intelligence successfully processed!',
      botId,
    });
  } catch (err: any) {
    console.error('Recording sync error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to sync recording' },
      { status: 500 }
    );
  }
}
