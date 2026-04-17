import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; requestId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, requestId } = await params;
  const body = await request.json();
  const serviceClient = await createServiceClient();

  const allowed: Record<string, unknown> = {};
  if ('status' in body) allowed.status = body.status;
  if ('broker_notes' in body) allowed.broker_notes = body.broker_notes;
  if ('label' in body) allowed.label = body.label;

  const { error } = await serviceClient
    .from('document_requests').update(allowed).eq('id', requestId).eq('process_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, requestId } = await params;
  const serviceClient = await createServiceClient();

  const { count } = await serviceClient
    .from('document_uploads').select('id', { count: 'exact', head: true }).eq('document_request_id', requestId);
  if (count && count > 0) return NextResponse.json({ error: 'Tem ficheiros carregados' }, { status: 409 });

  const { error } = await serviceClient
    .from('document_requests').delete().eq('id', requestId).eq('process_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
