import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSignedPlaybackUrl } from '@/lib/meeting-baas/artifacts';
import { isSuperAdminEmail } from '@/lib/constants/auth';

export const dynamic = 'force-dynamic';

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
      .select('id, visibility, organizer_id, created_by')
      .eq('id', meetingId)
      .single();

    if (meetErr || !meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const isConfidential = meeting.visibility === 'restricted' || meeting.visibility === 'confidential';
    if (isConfidential) {
      const isSuperAdmin = isSuperAdminEmail(user.email);
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
          { success: false, error: 'Access restricted: Confidential meeting playback requires invitation or leadership permissions.' },
          { status: 403 }
        );
      }
    }

    // 2. Fetch recording record
    const adminDb = getSupabaseAdmin();
    const { data: recording, error: recErr } = await adminDb
      .from('meeting_recordings')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recErr || !recording) {
      return NextResponse.json({ success: false, error: 'No recording available for this meeting.' }, { status: 404 });
    }

    let playbackUrl: string | null = null;
    const targetPath = recording.video_storage_path || recording.storage_path;

    if (targetPath) {
      if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
        playbackUrl = targetPath;
      } else {
        // Generate signed URL from private Supabase Storage
        playbackUrl = await createSignedPlaybackUrl(targetPath, 7200); // 2 hours
      }
    } else if (recording.provider_video_url) {
      playbackUrl = recording.provider_video_url;
    }

    if (!playbackUrl) {
      return NextResponse.json(
        { success: false, error: 'Recording file path is pending or unavailable.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playbackUrl,
      durationSeconds: recording.duration_seconds || 0,
      mimeType: recording.mime_type || 'video/mp4',
      storagePath: targetPath,
    });
  } catch (err: any) {
    console.error('Playback stream resolution failed:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to generate playback stream' },
      { status: 500 }
    );
  }
}
