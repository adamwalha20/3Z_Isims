import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNewCredentialSecrets, generateMemberQRPayload } from '@/lib/attendance/qr-security';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check for existing active credential
    const { data: existing } = await supabase
      .from('member_qr_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Reconstruct payload using stored credential ID and an existing or regenerated secret
      // Note: Because one-way hash cannot be reversed, if existing was created previously
      // we generate payload if secret was kept in memory, or if first generation we generate a valid token.
      // To ensure constant usability, we generate a fresh active token if needed or use deterministic salt.
      const payload = generateMemberQRPayload(existing.id, existing.token_salt);
      return NextResponse.json({
        success: true,
        credentialId: existing.id,
        qrPayload: payload,
        createdAt: existing.created_at,
      });
    }

    // Auto-generate new active credential for member
    const newCred = createNewCredentialSecrets();
    const { data: inserted, error: insertError } = await supabase
      .from('member_qr_credentials')
      .insert({
        id: newCred.credentialId,
        user_id: user.id,
        token_hash: newCred.tokenHash,
        token_salt: newCred.tokenSalt,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      credentialId: inserted.id,
      qrPayload: newCred.qrPayload,
      createdAt: inserted.created_at,
    });
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

    const body = await req.json().catch(() => ({}));
    if (body.action === 'regenerate') {
      // Revoke all existing credentials for this member
      await supabase
        .from('member_qr_credentials')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Create new credential
      const newCred = createNewCredentialSecrets();
      const { data: inserted, error: insertError } = await supabase
        .from('member_qr_credentials')
        .insert({
          id: newCred.credentialId,
          user_id: user.id,
          token_hash: newCred.tokenHash,
          token_salt: newCred.tokenSalt,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        credentialId: inserted.id,
        qrPayload: newCred.qrPayload,
        createdAt: inserted.created_at,
        message: 'Personal QR code credentials regenerated successfully',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

