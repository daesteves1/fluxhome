import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !name || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Fetch invitation
    const { data: invRaw, error: inviteError } = await supabase
      .from('invitations')
      .select('id, email, role, office_id, expires_at, sent_at, status')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    const invitation = invRaw as {
      id: string;
      email: string;
      role: string;
      office_id: string | null;
      expires_at: string | null;
      sent_at: string;
      status: string;
    } | null;

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('invitations') as any).update({ status: 'expired' }).eq('id', invitation.id);
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
    });

    if (signUpError || !authData.user) {
      // User might already exist — try to update password instead
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === invitation.email
      );

      if (existingUser) {
        await supabase.auth.admin.updateUserById(existingUser.id, { password });

        // Update user record
        await supabase
          .from('users')
          .update({ name })
          .eq('id', existingUser.id);

        // Update broker activated_at
        if (invitation.office_id) {
          await supabase
            .from('brokers')
            .update({ activated_at: new Date().toISOString() })
            .eq('user_id', existingUser.id)
            .eq('office_id', invitation.office_id);
        }
      } else {
        return NextResponse.json({ error: signUpError?.message || 'Failed to create user' }, { status: 500 });
      }
    } else {
      const userId = authData.user.id;

      // Insert user profile
      await supabase.from('users').upsert({
        id: userId,
        email: invitation.email,
        name,
        role: invitation.role as 'super_admin' | 'office_admin' | 'broker',
      });

      // If broker/office_admin role, create broker record
      if (invitation.office_id && invitation.role !== 'super_admin') {
        await supabase.from('brokers').insert({
          user_id: userId,
          office_id: invitation.office_id,
          is_office_admin: invitation.role === 'office_admin',
          invited_at: invitation.sent_at,
          activated_at: new Date().toISOString(),
        });
      }
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Activate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
