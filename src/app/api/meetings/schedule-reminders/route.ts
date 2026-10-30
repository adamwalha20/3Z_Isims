import { NextRequest, NextResponse } from 'next/server';
import {
  scheduleMeetingReminders,
  cancelPendingMeetingReminders,
  rescheduleMeetingReminders,
} from '@/lib/notifications/notification-service';
import { createClient } from '@/lib/supabase/server';
import { Meeting, Profile } from '@/types/database.types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, meetingId, meetingData } = body;

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    // If cancelling
    if (action === 'cancel') {
      await cancelPendingMeetingReminders(meetingId);
      return NextResponse.json({ success: true, message: 'Meeting reminders cancelled' });
    }

    // For schedule or reschedule, fetch meeting and club members if not supplied
    let meeting: Meeting | null = null;
    if (meetingData) {
      meeting = meetingData;
    } else {
      const { data: dbMeet } = await supabase.from('meetings').select('*').eq('id', meetingId).single();
      meeting = dbMeet as unknown as Meeting;
    }

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const { data: profiles } = await supabase.from('profiles').select('*');
    const attendees = (profiles || []) as unknown as Profile[];

    if (action === 'reschedule') {
      await rescheduleMeetingReminders(meeting, attendees);
      return NextResponse.json({ success: true, message: 'Meeting reminders rescheduled' });
    }

    // Default action: schedule
    const result = await scheduleMeetingReminders(meeting, attendees);
    return NextResponse.json({
      success: result.success,
      scheduledCount: result.scheduledCount,
      error: result.error,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
