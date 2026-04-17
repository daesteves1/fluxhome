/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import JSZip from 'jszip';

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

    const { token, docIds } = body;

    // Validate session
    const link = await validateSession(token, serviceClient);
    if (!link) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // Fetch all uploads
    const { data: uploadsData, error: uploadsError } = await (serviceClient as any)
      .from('document_uploads')
      .select('*')
      .in('id', docIds);

    if (uploadsError || !uploadsData) {
      return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
    }

    const validUploads = [];

    // Verify each upload
    for (const upload of uploadsData) {
      const { data: docRequestData } = await (serviceClient as any)
        .from('document_requests')
        .select('*')
        .eq('id', upload.document_request_id)
        .single();

      if (
        docRequestData &&
        docRequestData.client_id === link.client_id &&
        docRequestData.status === 'approved'
      ) {
        validUploads.push({ upload, docRequest: docRequestData });
      }
    }

    // Build ZIP
    const zip = new JSZip();

    for (const { upload, docRequest } of validUploads) {
      // Get folder based on proponente
      let folder = 'Partilhado';
      if (docRequest.proponente === 'p1') {
        folder = 'P1';
      } else if (docRequest.proponente === 'p2') {
        folder = 'P2';
      }

      // Download file from storage
      const { data: fileData, error: fileError } = await serviceClient.storage
        .from('client-documents')
        .download(upload.storage_path);

      if (!fileError && fileData) {
        const fileName = upload.file_name || `document-${upload.id}`;
        zip.folder(folder)?.file(fileName, fileData);
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // Log bulk download
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    await (serviceClient as any).from('bank_share_access_log').insert({
      share_link_id: link.id,
      event: 'bulk_downloaded',
      metadata: {
        count: validUploads.length,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return new NextResponse(zipBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Processo_${link.client_id.slice(0, 8)}_Docs.zip"`,
      },
    });
  } catch (err) {
    console.error('Bulk download error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
