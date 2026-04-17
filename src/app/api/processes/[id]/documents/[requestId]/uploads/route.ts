import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; requestId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { requestId } = await params;
  const { storage_path, file_name, file_size, mime_type, uploaded_by, client_id } = await request.json();

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from('document_uploads')
    .insert({ document_request_id: requestId, client_id, storage_path, file_name, file_size, mime_type, uploaded_by })
    .select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from('document_requests').update({ status: 'em_analise' }).eq('id', requestId).neq('status', 'approved');
  return NextResponse.json(data);
}
