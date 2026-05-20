import { createServiceClient } from '@/lib/supabase/server';
import { buildDocumentFileName } from '@/lib/file-utils';
import { createBrokerNotification } from '@/lib/broker-notifications';
import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_DEFAULT_DOCUMENTS } from '@/lib/document-defaults';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portal_token: string }> }
) {
  const { portal_token } = await params;
  const serviceClient = await createServiceClient();

  // Validate portal token → client
  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, office_id, broker_id, p1_name')
    .eq('portal_token', portal_token)
    .single();

  if (!clientRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const client = clientRaw as { id: string; office_id: string; broker_id: string | null; p1_name: string };

  const contentType = request.headers.get('content-type') ?? '';

  let request_id: string;
  let file_name: string | null = null;
  let file_size: number | null = null;
  let mime_type: string | null = null;
  let storage_path: string;
  let docReqForNotification: { id: string; status: string; label: string; process_id: string | null } | null = null;

  if (contentType.includes('multipart/form-data')) {
    // File upload: store via service role to bypass RLS
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    request_id = formData.get('request_id') as string;

    if (!file || !request_id) {
      return NextResponse.json({ error: 'file and request_id are required' }, { status: 400 });
    }

    // Fetch doc_type + label for template validation and file naming
    const { data: docReqRaw } = await serviceClient
      .from('document_requests')
      .select('id, doc_type, label, process_id')
      .eq('id', request_id)
      .eq('client_id', client.id)
      .single();

    if (!docReqRaw) return NextResponse.json({ error: 'Document request not found' }, { status: 404 });

    const docReq = docReqRaw as { id: string; doc_type: string | null; label: string; process_id: string | null };
    docReqForNotification = { id: docReq.id, status: 'em_analise', label: docReq.label, process_id: docReq.process_id };

    const template = docReq.doc_type ? PLATFORM_DEFAULT_DOCUMENTS.find((t) => t.doc_type === docReq.doc_type) : null;

    if (template) {
      if (!template.allowed_types.includes(file.type)) {
        const readableTypes = template.allowed_types
          .map((t) => {
            if (t === 'application/pdf') return 'PDF';
            if (t === 'image/jpeg') return 'JPG';
            if (t === 'image/png') return 'PNG';
            return t;
          })
          .join(', ');
        return NextResponse.json(
          { error: `Tipo de ficheiro não permitido. Use: ${readableTypes}` },
          { status: 400 }
        );
      }

      const maxBytes = template.max_file_size_mb * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: `Ficheiro demasiado grande. Tamanho máximo: ${template.max_file_size_mb} MB` },
          { status: 400 }
        );
      }
    }

    file_size = file.size;
    mime_type = file.type || null;
    const docTypeName = docReq.doc_type ?? docReq.label ?? 'documento';
    file_name = buildDocumentFileName(docTypeName, null, file.name);
    storage_path = `${client.office_id}/${client.id}/${request_id}/${file_name}`;

    const { error: uploadError } = await serviceClient.storage
      .from('client-documents')
      .upload(storage_path, file, { contentType: mime_type ?? undefined });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  } else {
    // JSON metadata-only path (legacy / broker-side uploads)
    const body = await request.json();
    request_id = body.request_id;
    storage_path = body.storage_path;
    file_name = body.file_name ?? null;
    file_size = body.file_size ?? null;
    mime_type = body.mime_type ?? null;

    if (!request_id || !storage_path) {
      return NextResponse.json({ error: 'request_id and storage_path are required' }, { status: 400 });
    }

    // Verify document_request belongs to this client
    const { data: docReqRaw } = await serviceClient
      .from('document_requests')
      .select('id, status, label, process_id')
      .eq('id', request_id)
      .eq('client_id', client.id)
      .single();

    if (!docReqRaw) return NextResponse.json({ error: 'Document request not found' }, { status: 404 });

    docReqForNotification = docReqRaw as { id: string; status: string; label: string; process_id: string | null };
  }

  const { data, error } = await serviceClient
    .from('document_uploads')
    .insert({
      document_request_id: request_id,
      client_id: client.id,
      storage_path,
      file_name,
      file_size,
      mime_type,
      uploaded_by: 'client',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Always set em_analise after a successful upload (unless already approved)
  await serviceClient
    .from('document_requests')
    .update({ status: 'em_analise' })
    .eq('id', request_id)
    .neq('status', 'approved');

  // Notify broker of new upload (non-fatal)
  if (client.broker_id && docReqForNotification) {
    const link = docReqForNotification.process_id
      ? `/dashboard/processes/${docReqForNotification.process_id}?tab=documents`
      : `/dashboard/clients/${client.id}?tab=documents`;
    void createBrokerNotification(serviceClient, {
      brokerId: client.broker_id,
      officeId: client.office_id,
      type: 'doc_uploaded',
      title: `${client.p1_name} enviou um documento`,
      body: docReqForNotification.label ?? null,
      link,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
