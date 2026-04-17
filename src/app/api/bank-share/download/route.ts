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

    const { token, docId } = body;

    // Validate session
    const link = await validateSession(token, serviceClient);
    if (!link) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // Fetch upload
    const { data: uploadData, error: uploadError } = await (serviceClient as any)
      .from('document_uploads')
      .select('*')
      .eq('id', docId)
      .single();

    if (uploadError || !uploadData) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const upload = uploadData;

    // Fetch document request and verify client_id and status
    const { data: docRequestData, error: docError } = await (serviceClient as any)
      .from('document_requests')
      .select('*')
      .eq('id', upload.document_request_id)
      .single();

    if (docError || !docRequestData) {
      return NextResponse.json({ error: 'Document request not found' }, { status: 404 });
    }

    if (docRequestData.client_id !== link.client_id || docRequestData.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from('client-documents')
      .createSignedUrl(upload.storage_path, 600); // 10 minutes

    if (signedUrlError || !signedUrlData) {
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    // Log download
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    await (serviceClient as any).from('bank_share_access_log').insert({
      share_link_id: link.id,
      event: 'doc_downloaded',
      metadata: {
        doc_id: docId,
        doc_name: upload.file_name,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json({ signedUrl: signedUrlData.signedUrl });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
