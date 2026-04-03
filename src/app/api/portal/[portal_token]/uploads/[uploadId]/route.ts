import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ portal_token: string; uploadId: string }> }
) {
  const { portal_token, uploadId } = await params;
  const serviceClient = await createServiceClient();

  // Validate portal token → client
  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id')
    .eq('portal_token', portal_token)
    .single();

  if (!clientRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const client = clientRaw as { id: string };

  // Fetch the upload, verifying it belongs to this client
  const { data: uploadRaw } = await serviceClient
    .from('document_uploads')
    .select('id, storage_path, document_request_id, client_id')
    .eq('id', uploadId)
    .eq('client_id', client.id)
    .single();

  if (!uploadRaw) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

  const upload = uploadRaw as {
    id: string;
    storage_path: string;
    document_request_id: string;
    client_id: string;
  };

  // Delete from storage
  await serviceClient.storage.from('client-documents').remove([upload.storage_path]);

  // Delete the upload record
  const { error } = await serviceClient
    .from('document_uploads')
    .delete()
    .eq('id', uploadId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count remaining uploads for this request
  const { count } = await serviceClient
    .from('document_uploads')
    .select('id', { count: 'exact', head: true })
    .eq('document_request_id', upload.document_request_id);

  // If no uploads remain, reset request status to pending
  if (!count || count === 0) {
    await serviceClient
      .from('document_requests')
      .update({ status: 'pending' })
      .eq('id', upload.document_request_id)
      .in('status', ['em_analise', 'rejected']);
  }

  return NextResponse.json({ remaining: count ?? 0 });
}
