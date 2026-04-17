import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { label, proponente, is_mandatory, max_files, description, doc_type, sort_order } = await request.json();

  const serviceClient = await createServiceClient();

  // Get client_id from process
  const { data: procRaw } = await serviceClient.from('processes').select('client_id').eq('id', id).single();
  const proc = procRaw as { client_id: string } | null;
  if (!proc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await serviceClient
    .from('document_requests')
    .insert({
      client_id: proc.client_id,
      process_id: id,
      label, proponente,
      is_mandatory, max_files,
      description: description ?? null,
      doc_type: doc_type ?? null,
      sort_order: sort_order ?? 99,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
