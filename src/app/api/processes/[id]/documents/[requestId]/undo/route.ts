import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; requestId: string }> }

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const { id, requestId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from('document_requests').update({ status: 'em_analise', broker_notes: null }).eq('id', requestId).eq('process_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
