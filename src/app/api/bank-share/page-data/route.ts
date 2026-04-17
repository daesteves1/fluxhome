/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function validateSession(token: string, serviceClient: SupabaseClient<Database>) {
  const { data: linkData, error: linkError } = await (serviceClient as any)
    .from('bank_share_links')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .single();

  if (linkError || !linkData) return null;

  // Check that otp_verified event exists for this link
  const { data: verifiedLog } = await (serviceClient as any)
    .from('bank_share_access_log')
    .select('id')
    .eq('share_link_id', linkData.id)
    .eq('event', 'otp_verified')
    .limit(1);

  if (!verifiedLog || verifiedLog.length === 0) return null;

  return linkData;
}

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createAdminClient();
    const body = await request.json();

    const { token } = body;

    // Validate session
    const link = await validateSession(token, serviceClient);
    if (!link) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // Fetch client data
    const { data: clientData, error: clientError } = await (serviceClient as any)
      .from('clients')
      .select('*')
      .eq('id', link.client_id)
      .single();

    if (clientError || !clientData) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch approved document requests with latest uploads
    const { data: docRequests, error: docError } = await (serviceClient as any)
      .from('document_requests')
      .select('*')
      .eq('client_id', link.client_id)
      .eq('status', 'approved');

    if (docError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    const documentsWithUploads = [];
    for (const request of docRequests || []) {
      const { data: uploads } = await (serviceClient as any)
        .from('document_uploads')
        .select('*')
        .eq('document_request_id', request.id)
        .order('uploaded_at', { ascending: false })
        .limit(1);

      documentsWithUploads.push({
        request: {
          id: request.id,
          label: request.label,
          proponente: request.proponente,
          doc_type: request.doc_type,
        },
        upload: uploads && uploads.length > 0 ? {
          id: uploads[0].id,
          file_name: uploads[0].file_name,
          file_size: uploads[0].file_size,
        } : null,
      });
    }

    // Fetch broker info
    const { data: brokerData, error: brokerError } = await (serviceClient as any)
      .from('brokers')
      .select('user_id')
      .eq('id', link.broker_id)
      .single();

    if (brokerError || !brokerData) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }

    const { data: brokerUser, error: userError } = await (serviceClient as any)
      .from('users')
      .select('name')
      .eq('id', brokerData.user_id)
      .single();

    const brokerName = brokerUser?.name ?? 'Unknown';

    // Fetch office white_label
    const { data: officeData, error: officeError } = await (serviceClient as any)
      .from('offices')
      .select('name, white_label')
      .eq('id', (clientData as any).office_id)
      .single();

    const officeName = officeData?.name ?? 'Unknown';
    const whiteLabel = officeData?.white_label as { logo_url?: string | null } | null;

    // Log page_viewed
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    await (serviceClient as any).from('bank_share_access_log').insert({
      share_link_id: link.id,
      event: 'page_viewed',
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json({
      client: clientData,
      documents: documentsWithUploads,
      office: {
        name: officeName,
        white_label: {
          logo_url: whiteLabel?.logo_url ?? null,
        },
      },
      link: {
        contact_email: link.contact_email,
        expires_at: link.expires_at,
        bank_name: link.bank_name,
      },
    });
  } catch (err) {
    console.error('Page data error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
