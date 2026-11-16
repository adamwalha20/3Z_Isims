import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdminEmail, isScannerAuthorizedPosition } from '@/lib/constants/auth';

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

    // Strict Authorization: Only President, Vice President, Secretary General, and Administrator
    const isSuperAdmin = isSuperAdminEmail(user.email);
    const { data: roleRecords } = await supabase
      .from('user_roles')
      .select('roles(key)')
      .eq('user_id', user.id);
    const isAdmin = isSuperAdmin || roleRecords?.some((r: any) => r.roles?.key === 'admin');

    const { data: userPosData } = await supabase
      .from('user_bureau_positions')
      .select('bureau_positions(key)')
      .eq('user_id', user.id);

    const positions: string[] = (userPosData || [])
      .map((p: any) => p.bureau_positions?.key?.toLowerCase())
      .filter(Boolean);

    const hasAuthorizedPosition = positions.some(isScannerAuthorizedPosition);

    if (!isAdmin && !hasAuthorizedPosition) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized: Only the President, Vice President, Secretary General, and Administrator can verify attendance checkout.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { sessionId, memberId } = body;

    if (!sessionId || !memberId) {
      return NextResponse.json({ success: false, error: 'Session ID and Member ID are required' }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('checkout_qr_attendance', {
      p_session_id: sessionId,
      p_member_id: memberId,
      p_verified_by: user.id,
    });

    if (rpcError) {
      return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json(rpcResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown checkout error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

