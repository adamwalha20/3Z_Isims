import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Fetch single session with full attendance list and relations
      const { data: session, error: sessError } = await supabase
        .from('sessions')
        .select(`
          *,
          organizer:profiles!sessions_organizer_id_fkey(*),
          department:departments(*),
          attendance_records:session_attendance(
            *,
            member:profiles!session_attendance_member_id_fkey(*),
            verifier:profiles!session_attendance_verified_by_fkey(*)
          )
        `)
        .eq('id', sessionId)
        .single();

      if (sessError || !session) {
        return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, session });
    }

    let query = supabase
      .from('sessions')
      .select(`
        *,
        organizer:profiles!sessions_organizer_id_fkey(full_name, email),
        department:departments(name),
        attendance_records:session_attendance(attendance_status)
      `)
      .order('starts_at', { ascending: false });

    if (status) {
      query = query.eq('attendance_status', status);
    }

    const { data: sessions, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Augment with counts
    const augmented = (sessions || []).map((s: any) => {
      const records = s.attendance_records || [];
      const present = records.filter((r: any) => r.attendance_status === 'present').length;
      const late = records.filter((r: any) => r.attendance_status === 'late').length;
      return {
        ...s,
        present_count: present,
        late_count: late,
        total_attendees: records.length,
      };
    });

    return NextResponse.json({ success: true, sessions: augmented });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAuth } = await supabase.rpc('is_bureau_or_admin', { user_uuid: user.id });
    const isAdam = user.email?.toLowerCase() === 'adamwalha20@gmail.com';
    if (!isAuth && !isAdam) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Only bureau officers and administrators can create physical sessions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      session_type = 'workshop',
      date,
      starts_at,
      ends_at,
      location,
      department_id,
      late_threshold_minutes = 10,
      xp_on_time = 15,
      xp_late = 10,
      xp_full_session = 5,
      requires_checkout = false,
      requires_manual_verification = false,
      visibility = 'club',
    } = body;

    if (!title || !date || !starts_at || !location) {
      return NextResponse.json({ success: false, error: 'Title, date, starts_at, and location are required' }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        title,
        description: description || null,
        session_type,
        date,
        starts_at,
        ends_at: ends_at || null,
        location,
        organizer_id: user.id,
        department_id: department_id || null,
        late_threshold_minutes: Number(late_threshold_minutes),
        xp_on_time: Number(xp_on_time),
        xp_late: Number(xp_late),
        xp_full_session: Number(xp_full_session),
        requires_checkout: Boolean(requires_checkout),
        requires_manual_verification: Boolean(requires_manual_verification),
        visibility,
        attendance_status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAuth } = await supabase.rpc('is_bureau_or_admin', { user_uuid: user.id });
    const isAdam = user.email?.toLowerCase() === 'adamwalha20@gmail.com';
    if (!isAuth && !isAdam) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { sessionId, attendance_status, ...otherUpdates } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      ...otherUpdates,
      updated_at: new Date().toISOString(),
    };

    if (attendance_status) {
      updates.attendance_status = attendance_status;
      if (attendance_status === 'open') {
        updates.attendance_open_at = new Date().toISOString();
        updates.opened_by = user.id;
      } else if (attendance_status === 'closed') {
        updates.attendance_close_at = new Date().toISOString();
        updates.closed_by = user.id;
      } else if (attendance_status === 'finalized') {
        updates.finalized_at = new Date().toISOString();
        updates.finalized_by = user.id;
      }
    }

    const { data: updated, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

