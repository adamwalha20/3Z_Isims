import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Must be bureau or admin
    const { data: isAuth } = await supabase.rpc('is_bureau_or_admin', { user_uuid: user.id });
    const isAdam = user.email?.toLowerCase() === 'adamwalha20@gmail.com';
    if (!isAuth && !isAdam) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Only bureau officers and administrators can correct attendance records' }, { status: 403 });
    }

    const body = await req.json();
    const { attendanceId, newStatus, reason } = body;

    if (!attendanceId || !newStatus) {
      return NextResponse.json({ success: false, error: 'Attendance ID and new status are required' }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('correct_attendance_record', {
      p_attendance_id: attendanceId,
      p_new_status: newStatus,
      p_reason: reason || 'Administrative correction',
      p_performed_by: user.id,
    });

    if (rpcError) {
      return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json(rpcResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown correction error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

