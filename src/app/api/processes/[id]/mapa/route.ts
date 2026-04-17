import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string }> }

function errMsg(e: unknown): string {
  if (e && typeof e === 'object') { const o = e as Record<string, unknown>; if (typeof o.message === 'string') return o.message; }
  return String(e);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: mapaRaw, error: mapaError } = (await serviceClient
    .from('mapa_comparativo' as 'propostas').select('*').eq('process_id', id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  ) as unknown as { data: unknown; error: unknown };

  if (mapaError) return NextResponse.json({ error: errMsg(mapaError) }, { status: 500 });
  if (!mapaRaw) return NextResponse.json(null);

  const mapa = mapaRaw as { proposta_ids: string[] };
  let bankPropostas: unknown[] = [];
  if (mapa.proposta_ids?.length > 0) {
    const { data } = (await serviceClient
      .from('bank_propostas' as 'propostas').select('*').in('id', mapa.proposta_ids)
    ) as unknown as { data: unknown[] };
    bankPropostas = data ?? [];
  }

  return NextResponse.json({ mapa: mapaRaw, bankPropostas, propostaChoice: null });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const brokerRaw = await serviceClient.from('brokers').select('id, office_id').eq('user_id', user.id).eq('is_active', true).single();
  const broker = brokerRaw.data as { id: string; office_id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Broker not found' }, { status: 403 });

  const { data: procRaw } = await serviceClient.from('processes').select('client_id').eq('id', id).single();
  const proc = procRaw as { client_id: string } | null;
  if (!proc) return NextResponse.json({ error: 'Process not found' }, { status: 404 });

  const body = await request.json() as Record<string, unknown>;
  const { data: existingRaw } = (await serviceClient
    .from('mapa_comparativo' as 'propostas').select('id').eq('process_id', id).limit(1).maybeSingle()
  ) as unknown as { data: { id: string } | null };

  const now = new Date().toISOString();
  if (existingRaw?.id) {
    const { id: _id, client_id: _c, broker_id: _b, office_id: _o, process_id: _p, created_at: _ca, ...updateData } = body;
    void _id; void _c; void _b; void _o; void _p; void _ca;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = (await (serviceClient.from('mapa_comparativo' as 'propostas') as any)
      .update({ ...updateData, updated_at: now }).eq('id', existingRaw.id).select('id').single()
    ) as { data: { id: string } | null; error: unknown };
    if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 });
    return NextResponse.json({ id: (data as { id: string }).id });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (serviceClient.from('mapa_comparativo' as 'propostas') as any)
      .insert({ ...body, client_id: proc.client_id, process_id: id, broker_id: broker.id, office_id: broker.office_id, title: body.title ?? 'Mapa Comparativo', proposta_ids: body.proposta_ids ?? [], highlighted_cells: body.highlighted_cells ?? {}, is_visible_to_client: body.is_visible_to_client ?? false })
      .select('id').single() as { data: { id: string } | null; error: unknown };
    if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 });
    return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
  }
}
