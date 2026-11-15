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

    // Strict Authorization: Only President, Vice President, Secretary General, and Administrator can correct attendance records
    const isSuperAdminEmail = (user.email?.toLowerCase() || '') === 'adamwalha20@gmail.com';
    const { data: roleRecords } = await supabase
      .from('user_roles')
      .select('roles(key)')
      .eq('user_id', user.id);
    const isAdmin = isSuperAdminEmail || roleRecords?.some((r: any) => r.roles?.key === 'admin');

    const { data: userPosData } = await supabase
      .from('user_bureau_positions')
      .select('bureau_positions(key)')
      .eq('user_id', user.id);

    const positions: string[] = (userPosData || [])
      .map((p: any) => p.bureau_positions?.key?.toLowerCase())
      .filter(Boolean);

    const allowedPositions = ['president', 'vice_president', 'secretary_general', 'secretary'];
    const hasAuthorizedPosition = positions.some(
      (pos) => allowedPositions.includes(pos) || pos.includes('secretary')
    );

    if (!isAdmin && !hasAuthorizedPosition) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized: Only the President, Vice President, Secretary General, and Administrator can correct attendance records.',
        },
        { status: 403 }
      );
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

