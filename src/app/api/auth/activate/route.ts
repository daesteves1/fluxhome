import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { resend, FROM_EMAIL, APP_URL } from '@/lib/email';
import { ActivationSuccessEmail } from '@/emails/activation-success-email';
import { render } from '@react-email/render';
import React from 'react';

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !name || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Fetch and validate invitation
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
      return NextResponse.json({ error: 'Convite inválido ou já utilizado' }, { status: 400 });
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      return NextResponse.json({ error: 'Este convite expirou' }, { status: 400 });
    }

    // 2. Non-super_admin roles must have an office_id
    if (invitation.role !== 'super_admin' && !invitation.office_id) {
      return NextResponse.json({ error: 'Convite sem escritório associado' }, { status: 400 });
    }

    // 3. Create or find the auth user
    let userId: string;

    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
    });

    if (signUpError || !authData.user) {
      // User may already exist — look them up by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === invitation.email);

      if (!existingUser) {
        return NextResponse.json(
          { error: signUpError?.message ?? 'Erro ao criar utilizador' },
          { status: 500 }
        );
      }

      // Update password so they can log in with the new credentials
      await supabase.auth.admin.updateUserById(existingUser.id, { password });
      userId = existingUser.id;
    } else {
      userId = authData.user.id;
    }

    const now = new Date().toISOString();

    // 4. Insert into public.users — ON CONFLICT DO NOTHING
    await supabase.from('users').upsert(
      {
        id: userId,
        email: invitation.email,
        name,
        role: invitation.role as 'super_admin' | 'office_admin' | 'broker',
        created_at: now,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    // 5. Insert into public.brokers — ON CONFLICT DO NOTHING
    //    (skipped for super_admin; office_id presence already validated above)
    if (invitation.role !== 'super_admin' && invitation.office_id) {
      await supabase.from('brokers').upsert(
        {
          user_id: userId,
          office_id: invitation.office_id,
          is_office_admin: invitation.role === 'office_admin',
          is_active: true,
          invited_at: invitation.sent_at,
          activated_at: now,
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );
    }

    // 6. Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: now })
      .eq('id', invitation.id);

    // 7. Send activation success email (non-blocking)
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: invitation.email,
        subject: 'Conta ativada — HomeFlux',
        html: await render(React.createElement(ActivationSuccessEmail, {
          name,
          loginUrl: `${APP_URL}/login`,
        })),
      });
    } catch {
      // Activation still succeeds if email fails
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Activate error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
