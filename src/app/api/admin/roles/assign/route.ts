import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

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

    const callerEmail = user.email?.toLowerCase() || '';

    // mahdihelmin@gmail.com is strictly excluded from administrative privileges
    if (callerEmail === 'mahdihelmin@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: This account does not have administrative privileges.' },
        { status: 403 }
      );
    }

    // Check if caller is superadmin or has admin role in database
    const isSuperAdminEmail = callerEmail === 'adamwalha20@gmail.com';
    let isDbAdmin = false;

    if (!isSuperAdminEmail) {
      const { data: roleRecords } = await supabase
        .from('user_roles')
        .select('roles(key)')
        .eq('user_id', user.id);
      isDbAdmin = roleRecords?.some((r: any) => r.roles?.key === 'admin') || false;
    }

    if (!isSuperAdminEmail && !isDbAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only club administrators can assign bureau mandates.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { positionKey, targetUserId, memberName } = body;

    if (!positionKey) {
      return NextResponse.json({ success: false, error: 'Position key is required' }, { status: 400 });
    }

    // 1. Fetch bureau position
    const { data: pos, error: posErr } = await supabase
      .from('bureau_positions')
      .select('id, key, display_name')
      .eq('key', positionKey)
      .single();

    if (posErr || !pos) {
      return NextResponse.json(
        { success: false, error: posErr?.message || 'Bureau position not found' },
        { status: 404 }
      );
    }

    // 2. Capture previous assignment for undo and audit trail
    const { data: prevAssign } = await supabase
      .from('user_bureau_positions')
      .select('user_id, profiles!user_bureau_positions_user_id_fkey(full_name)')
      .eq('position_id', pos.id)
      .maybeSingle();

    const prevUserId = prevAssign?.user_id || null;
    const prevMemberName = (prevAssign as any)?.profiles?.full_name || 'Unassigned';

    // 3. Clear previous occupant
    const { error: delErr } = await supabase
      .from('user_bureau_positions')
      .delete()
      .eq('position_id', pos.id);

    if (delErr) {
      console.error('Error clearing previous bureau assignment:', delErr);
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    const isAssigningNewMember = targetUserId && targetUserId !== 'unassigned' && isUuid(targetUserId);

    if (isAssigningNewMember) {
      // 4. Insert new assignment
      const { error: insErr } = await supabase
        .from('user_bureau_positions')
        .insert({
          position_id: pos.id,
          user_id: targetUserId,
          assigned_by: user.id,
        });

      if (insErr) {
        console.error('Error inserting new bureau assignment:', insErr);
        return NextResponse.json({ success: false, error: insErr.message }, { status: 500 });
      }

      // 5. Ensure member has 'bureau' role in user_roles
      const { data: bRole } = await supabase
        .from('roles')
        .select('id')
        .eq('key', 'bureau')
        .maybeSingle();

      if (bRole) {
        await supabase.from('user_roles').upsert({
          user_id: targetUserId,
          role_id: bRole.id,
        });
      }
    }

    // 6. Record in audit_logs with reversible states
    const finalMemberName = isAssigningNewMember ? (memberName || 'Member') : 'Unassigned';
    await supabase.from('audit_logs').insert({
      action: 'ASSIGN_BUREAU_POSITION',
      actor_id: user.id,
      entity_type: 'bureau_position',
      entity_id: pos.id,
      details: isAssigningNewMember
        ? `Assigned ${finalMemberName} to ${pos.display_name}`
        : `Vacated position ${pos.display_name}`,
      previous_state: {
        position_id: pos.id,
        position_key: pos.key,
        position_name: pos.display_name,
        user_id: prevUserId,
        member_name: prevMemberName,
      },
      new_state: {
        position_id: pos.id,
        position_key: pos.key,
        position_name: pos.display_name,
        user_id: isAssigningNewMember ? targetUserId : null,
        member_name: finalMemberName,
      },
      can_undo: true,
      is_undone: false,
    });

    return NextResponse.json({
      success: true,
      message: isAssigningNewMember
        ? `Successfully assigned ${finalMemberName} to ${pos.display_name}`
        : `Position ${pos.display_name} vacated.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
