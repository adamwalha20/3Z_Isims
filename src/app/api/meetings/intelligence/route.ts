import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // 1. Fetch meeting & verify permission
    const { data: meeting, error: meetErr } = await supabase
      .from('meetings')
      .select('*, organizer:profiles!meetings_organizer_id_fkey(id, email, full_name, avatar_path)')
      .eq('id', meetingId)
      .single();

    if (meetErr || !meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const isConfidential = meeting.visibility === 'restricted' || meeting.visibility === 'confidential';
    if (isConfidential) {
      const isSuperAdmin = (user.email?.toLowerCase() || '') === 'adamwalha20@gmail.com';
      const isOrganizer = meeting.organizer_id === user.id || meeting.created_by === user.id;

      const { data: roleRecords } = await supabase
        .from('user_roles')
        .select('roles(key)')
        .eq('user_id', user.id);
      const isBureauOrAdmin =
        isSuperAdmin ||
        roleRecords?.some((r: any) => ['admin', 'bureau'].includes(r.roles?.key));

      const { data: participant } = await supabase
        .from('meeting_participants')
        .select('user_id')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isOrganizer && !isBureauOrAdmin && !participant) {
        return NextResponse.json(
          { success: false, error: 'Access restricted: Confidential meeting.' },
          { status: 403 }
        );
      }
    }

    const adminDb = getSupabaseAdmin();

    // 2. Fetch parallel intelligence entities
    const [
      { data: botSessions },
      { data: recordings },
      { data: transcripts },
      { data: summary },
      { data: decisions },
      { data: actionItems },
    ] = await Promise.all([
      adminDb
        .from('meeting_bot_sessions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false }),

      adminDb
        .from('meeting_recordings')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false }),

      adminDb
        .from('meeting_transcripts')
        .select(`
          *,
          segments:meeting_transcript_segments(*)
        `)
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false }),

      adminDb
        .from('meeting_summaries')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      adminDb
        .from('meeting_decisions')
        .select('*, reviewer:profiles!meeting_decisions_reviewed_by_fkey(full_name)')
        .eq('meeting_id', meetingId)
        .order('source_timestamp', { ascending: true }),

      adminDb
        .from('meeting_action_items')
        .select(`
          *,
          confirmed_assignee:profiles!meeting_action_items_confirmed_assignee_id_fkey(id, full_name, avatar_path),
          reviewer:profiles!meeting_action_items_reviewed_by_fkey(full_name)
        `)
        .eq('meeting_id', meetingId)
        .order('source_timestamp', { ascending: true }),
    ]);

    return NextResponse.json({
      success: true,
      meeting,
      botSessions: botSessions || [],
      recordings: recordings || [],
      transcript: transcripts?.[0] || null,
      summary: summary || null,
      decisions: decisions || [],
      actionItems: actionItems || [],
    });
  } catch (err: any) {
    console.error('Meeting intelligence query failed:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch meeting intelligence' },
      { status: 500 }
    );
  }
}
