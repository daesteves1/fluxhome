import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resend, FROM_EMAIL, APP_URL } from '@/lib/email';
import { ClientLinkEmail } from '@/emails/client-link-email';
import { render } from '@react-email/render';
import React from 'react';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; office_id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, p1_name, p1_email, portal_token')
    .eq('id', id)
    .single();

  const client = clientRaw as { id: string; p1_name: string; p1_email: string | null; portal_token: string } | null;
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!client.p1_email) {
    return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
  }

  const { data: officeRaw } = await serviceClient
    .from('offices')
    .select('name')
    .eq('id', broker.office_id)
    .single();

  const { data: brokerUserRaw } = await serviceClient
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single();

  const officeName = (officeRaw as { name: string } | null)?.name ?? 'HomeFlux';
  const brokerName = (brokerUserRaw as { name: string } | null)?.name ?? 'O seu mediador';
  const portalUrl = `${APP_URL}/portal/${client.portal_token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: client.p1_email,
      subject: `O seu portal de documentos — ${officeName}`,
      html: await render(React.createElement(ClientLinkEmail, {
        clientName: client.p1_name,
        brokerName,
        officeName,
        portalUrl,
      })),
    });
  } catch (err) {
    console.error('Email send error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
