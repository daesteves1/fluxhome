import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; propostaId: string }> }

function errMsg(e: unknown): string {
  if (e && typeof e === 'object') { const o = e as Record<string, unknown>; if (typeof o.message === 'string') return o.message; }
  return String(e);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data, error } = (await serviceClient
    .from('bank_propostas' as 'propostas').select('*').eq('id', propostaId).eq('process_id', id).single()
  ) as unknown as { data: unknown; error: unknown };

  if (error) return NextResponse.json({ error: errMsg(error) }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const body = await request.json() as Record<string, unknown>;
  const { id: _id, client_id: _c, broker_id: _b, office_id: _o, process_id: _p, created_at: _ca, ...updateData } = body;
  void _id; void _c; void _b; void _o; void _p; void _ca;

  const { data, error } = (await serviceClient
    .from('bank_propostas' as 'propostas')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', propostaId).eq('process_id', id).select('id').single()
  ) as unknown as { data: { id: string } | null; error: unknown };

  if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 });
  return NextResponse.json({ id: (data as { id: string }).id });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { error } = (await serviceClient
    .from('bank_propostas' as 'propostas').delete().eq('id', propostaId).eq('process_id', id)
  ) as unknown as { error: unknown };

  if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
