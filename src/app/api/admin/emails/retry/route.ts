import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { reminderId } = await req.json();
    if (!reminderId) {
      return NextResponse.json({ success: false, error: 'Missing reminderId' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    // Reset reminder status to 'pending' with 0 attempts so the scheduler picks it up immediately
    const { error } = await supabase
      .from('scheduled_email_reminders')
      .update({
        status: 'pending',
        attempts: 0,
        scheduled_at: new Date().toISOString(), // schedule immediately
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder queued for immediate retry by scheduler.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Retry failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
