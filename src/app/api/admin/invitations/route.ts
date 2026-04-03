import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resend, FROM_EMAIL, APP_URL } from '@/lib/email';
import { InvitationEmail } from '@/emails/invitation-email';
import { render } from '@react-email/render';
import { randomUUID } from 'crypto';
import React from 'react';

type AuthResult =
  | { type: 'super_admin'; serviceClient: Awaited<ReturnType<typeof createServiceClient>> }
  | { type: 'office_admin'; serviceClient: Awaited<ReturnType<typeof createServiceClient>>; officeId: string };

async function requireAdminAccess(): Promise<AuthResult | null> {
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
    return { type: 'super_admin', serviceClient };
  }

  // Check if office admin
  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('office_id, is_office_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { office_id: string; is_office_admin: boolean } | null;
  if (broker?.is_office_admin) {
    return { type: 'office_admin', serviceClient, officeId: broker.office_id };
  }

  return null;
}

export async function GET() {
  const auth = await requireAdminAccess();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { serviceClient } = auth;

  let query = serviceClient
    .from('invitations')
    .select('id, email, role, office_id, status, sent_at, expires_at, accepted_at, offices(name)')
    .order('sent_at', { ascending: false });

  // Office admins can only see their own office's invitations
  if (auth.type === 'office_admin') {
    query = query.eq('office_id', auth.officeId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitations: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAccess();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { serviceClient } = auth;

  const body = await request.json();
  const { email, role, office_id, invitee_name } = body;

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  // Office admins can only invite brokers within their own office
  if (auth.type === 'office_admin') {
    if (role !== 'broker') {
      return NextResponse.json({ error: 'Office admins can only invite brokers' }, { status: 403 });
    }
    if (office_id && office_id !== auth.officeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const resolvedOfficeId = auth.type === 'office_admin' ? auth.officeId : (office_id ?? null);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data: inv, error } = await serviceClient
    .from('invitations')
    .insert({
      email,
      role,
      office_id: resolvedOfficeId,
      token,
      status: 'pending',
      sent_at: new Date().toISOString(),
      expires_at: expiresAt,
      invited_by: user!.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch office name for email
  let officeName = 'HomeFlux';
  if (resolvedOfficeId) {
    const { data: officeRaw } = await serviceClient
      .from('offices')
      .select('name')
      .eq('id', resolvedOfficeId)
      .single();
    officeName = (officeRaw as { name: string } | null)?.name ?? officeName;
  }

  const activationUrl = `${APP_URL}/activate/${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Convite para ${officeName} — HomeFlux`,
      html: await render(React.createElement(InvitationEmail, {
        officeName,
        inviteeName: invitee_name || email,
        activationUrl,
      })),
    });
  } catch (err) {
    console.error('Email send error:', err);
  }

  return NextResponse.json({ id: (inv as { id: string }).id }, { status: 201 });
}
