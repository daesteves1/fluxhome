import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portal_token: string }> }
) {
  const { portal_token } = await params;
  const serviceClient = await createServiceClient();

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, office_id')
    .eq('portal_token', portal_token)
    .single();

  if (!clientRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const client = clientRaw as { id: string; office_id: string };

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const request_id = formData.get('request_id') as string | null;

  if (!file || !request_id) {
    return NextResponse.json({ error: 'file and request_id are required' }, { status: 400 });
  }

  // Verify doc request belongs to this client
  const { data: docReqRaw } = await serviceClient
    .from('document_requests')
    .select('id')
    .eq('id', request_id)
    .eq('client_id', client.id)
    .single();

  if (!docReqRaw) return NextResponse.json({ error: 'Document request not found' }, { status: 404 });

  // Delete all existing uploads for this request
  const { data: existingUploads } = await serviceClient
    .from('document_uploads')
    .select('id, storage_path')
    .eq('document_request_id', request_id)
    .eq('client_id', client.id);

  const existing = (existingUploads ?? []) as { id: string; storage_path: string }[];
  if (existing.length > 0) {
    const paths = existing.map((u) => u.storage_path);
    await serviceClient.storage.from('client-documents').remove(paths);
    await serviceClient
      .from('document_uploads')
      .delete()
      .in('id', existing.map((u) => u.id));
  }

  // Upload new file
  const storage_path = `${client.office_id}/${client.id}/${request_id}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await serviceClient.storage
    .from('client-documents')
    .upload(storage_path, file, { contentType: file.type || undefined });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error } = await serviceClient
    .from('document_uploads')
    .insert({
      document_request_id: request_id,
      client_id: client.id,
      storage_path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: 'client',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient
    .from('document_requests')
    .update({ status: 'em_analise', broker_notes: null })
    .eq('id', request_id);

  return NextResponse.json(data, { status: 201 });
}
