import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resend, FROM_EMAIL, APP_URL } from '@/lib/email';
import { InvitationEmail } from '@/emails/invitation-email';
import { render } from '@react-email/render';
import React from 'react';

async function requireAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = await createServiceClient();

  const { data: userData } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const u = userData as { role: string } | null;
  if (u?.role === 'super_admin') {
    return { type: 'super_admin' as const, serviceClient, officeId: null };
  }

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('office_id, is_office_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { office_id: string; is_office_admin: boolean } | null;
  if (broker?.is_office_admin) {
    return { type: 'office_admin' as const, serviceClient, officeId: broker.office_id };
  }

  return null;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdminAccess();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { serviceClient } = auth;

  const { data: invRaw, error: fetchError } = await serviceClient
    .from('invitations')
    .select('id, email, role, office_id, token, status')
    .eq('id', id)
    .single();

  const inv = invRaw as {
    id: string;
    email: string;
    role: string;
    office_id: string | null;
    token: string;
    status: string;
  } | null;

  if (fetchError || !inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Office admins can only resend invitations for their own office
  if (auth.type === 'office_admin' && inv.office_id !== auth.officeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (inv.status === 'accepted') {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await serviceClient
    .from('invitations')
    .update({ status: 'pending', sent_at: new Date().toISOString(), expires_at: expiresAt })
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Fetch office name for email
  let officeName = 'HomeFlux';
  if (inv.office_id) {
    const { data: officeRaw } = await serviceClient
      .from('offices')
      .select('name')
      .eq('id', inv.office_id)
      .single();
    officeName = (officeRaw as { name: string } | null)?.name ?? officeName;
  }

  const activationUrl = `${APP_URL}/activate/${inv.token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: inv.email,
      subject: `Convite para ${officeName} — HomeFlux`,
      html: await render(React.createElement(InvitationEmail, {
        officeName,
        inviteeName: inv.email,
        activationUrl,
      })),
    });
  } catch (err) {
    console.error('Email resend error:', err);
  }

  return NextResponse.json({ ok: true });
}
