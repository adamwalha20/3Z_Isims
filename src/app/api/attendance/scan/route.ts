import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseQRPayload, verifyCredentialSecret, hashTokenSecret } from '@/lib/attendance/qr-security';
import { formatTunisTime } from '@/lib/email/timezone-utils';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // Check secretary or bureau/admin privileges
    const { data: isAuth } = await supabase.rpc('is_bureau_or_admin', { user_uuid: user.id });
    const isSuperAdminEmail = (user.email?.toLowerCase() || '') === 'adamwalha20@gmail.com';
    if (!isAuth && !isSuperAdminEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Only secretaries and bureau officers can scan attendance' }, { status: 403 });
    }

    const body = await req.json();
    const { qrPayload, sessionId, manualMemberId } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    // 1. Fetch Session
    const { data: session, error: sessError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessError || !session) {
      return NextResponse.json({ success: false, error: 'Physical session not found' }, { status: 404 });
    }

    if (session.attendance_status !== 'open') {
      return NextResponse.json({
        success: false,
        error: `Session attendance is ${session.attendance_status}. Scans are only accepted when attendance is open.`,
      }, { status: 400 });
    }

    let targetMemberId: string | null = null;
    let verificationMethod = 'qr';

    if (manualMemberId) {
      // Manual fallback check-in
      targetMemberId = manualMemberId;
      verificationMethod = 'manual';
    } else if (qrPayload) {
      // Parse & validate QR payload
      const parsed = parseQRPayload(qrPayload);
      if (!parsed) {
        return NextResponse.json({ success: false, error: 'Invalid QR code format' }, { status: 400 });
      }

      // Query credential
      const { data: credential, error: credError } = await supabase
        .from('member_qr_credentials')
        .select('*')
        .eq('id', parsed.credentialId)
        .eq('is_active', true)
        .is('revoked_at', null)
        .single();

      if (credError || !credential) {
        return NextResponse.json({ success: false, error: 'Invalid or revoked QR code. Please request credential regeneration.' }, { status: 400 });
      }

      // Verify token
      const isMatch =
        parsed.tokenSecret === credential.token_salt ||
        verifyCredentialSecret(parsed.tokenSecret, credential.token_hash, credential.token_salt);

      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Cryptographic signature mismatch. Token is invalid or counterfeit.' }, { status: 400 });
      }

      targetMemberId = credential.user_id;
    } else {
      return NextResponse.json({ success: false, error: 'Either qrPayload or manualMemberId must be provided' }, { status: 400 });
    }

    // 2. Execute atomic attendance registration RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('register_qr_attendance', {
      p_session_id: sessionId,
      p_member_id: targetMemberId,
      p_verified_by: user.id,
      p_verification_method: verificationMethod,
    });

    if (rpcError) {
      return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    }

    // 3. Fetch member details and bureau position for rich response card
    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, student_id, study_field, avatar_path')
      .eq('id', targetMemberId)
      .single();

    const { data: bureauPositions } = await supabase
      .from('user_bureau_positions')
      .select('bureau_positions(display_name)')
      .eq('user_id', targetMemberId);

    const positionList = (bureauPositions || [])
      .map((bp: any) => bp.bureau_positions?.display_name)
      .filter(Boolean);

    const positionLabel = positionList.length > 0 ? positionList.join(' & ') : 'Club Member';

    if (rpcResult.already_registered) {
      const existingAtt = rpcResult.attendance;
      return NextResponse.json({
        success: false,
        alreadyRegistered: true,
        message: `Member already checked in at ${formatTunisTime(existingAtt.checked_in_at)} (${existingAtt.attendance_status.toUpperCase()})`,
        member: {
          id: targetMemberId,
          name: memberProfile?.full_name || 'Member',
          position: positionLabel,
          avatar: memberProfile?.avatar_path,
        },
        session: {
          id: session.id,
          title: session.title,
        },
        attendance: {
          checkedInAt: existingAtt.checked_in_at,
          arrivalTimeFormatted: formatTunisTime(existingAtt.checked_in_at),
          status: existingAtt.attendance_status,
          xpAwarded: existingAtt.xp_awarded,
        },
      });
    }

    return NextResponse.json({
      success: true,
      alreadyRegistered: false,
      member: {
        id: targetMemberId,
        name: memberProfile?.full_name || rpcResult.member_name || 'Member',
        position: positionLabel,
        avatar: memberProfile?.avatar_path,
      },
      session: {
        id: session.id,
        title: session.title,
      },
      attendance: {
        checkedInAt: rpcResult.checked_in_at,
        arrivalTimeFormatted: formatTunisTime(rpcResult.checked_in_at),
        status: rpcResult.status,
        xpAwarded: rpcResult.xp_awarded,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown scan error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

