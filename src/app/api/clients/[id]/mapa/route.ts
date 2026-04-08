import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string }> }

function errMsg(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    return JSON.stringify(o);
  }
  return String(e);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  try {
    const { data: mapaRaw, error: mapaError } = await serviceClient
      .from('mapa_comparativo' as 'propostas')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as { data: unknown; error: unknown };

    if (mapaError) {
      console.error('[GET /api/clients/[id]/mapa] DB error:', errMsg(mapaError));
      return NextResponse.json({ error: errMsg(mapaError) }, { status: 500 });
    }

    if (!mapaRaw) return NextResponse.json(null);

    const mapa = mapaRaw as { proposta_ids: string[] };
    let bankPropostas: unknown[] = [];

    if (mapa.proposta_ids?.length > 0) {
      const { data, error: bpError } = await serviceClient
        .from('bank_propostas' as 'propostas')
        .select('*')
        .in('id', mapa.proposta_ids) as unknown as { data: unknown[]; error: unknown };

      if (bpError) {
        console.error('[GET /api/clients/[id]/mapa] bank_propostas error:', errMsg(bpError));
        // Return mapa without propostas rather than failing completely
        return NextResponse.json({ mapa: mapaRaw, bankPropostas: [] });
      }
      bankPropostas = data ?? [];
    }

    let propostaChoice: unknown = null;
    try {
      const { data: clientData } = await serviceClient
        .from('clients')
        .select('proposta_choice')
        .eq('id', id)
        .maybeSingle() as unknown as { data: { proposta_choice: unknown } | null };
      propostaChoice = clientData?.proposta_choice ?? null;
    } catch { /* ignore */ }

    return NextResponse.json({ mapa: mapaRaw, bankPropostas, propostaChoice });
  } catch (e) {
    console.error('[GET /api/clients/[id]/mapa] Unexpected error:', e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  try {
    const brokerRaw = await serviceClient
      .from('brokers')
      .select('id, office_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    const broker = brokerRaw.data as { id: string; office_id: string } | null;
    if (!broker) {
      console.error('[PUT /api/clients/[id]/mapa] Broker not found for user', user.id);
      return NextResponse.json({ error: 'Broker not found' }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;

    const { data: existingRaw } = await serviceClient
      .from('mapa_comparativo' as 'propostas')
      .select('id')
      .eq('client_id', id)
      .limit(1)
      .maybeSingle() as unknown as { data: { id: string } | null };

    const now = new Date().toISOString();

    if (existingRaw?.id) {
      const { id: _id, client_id: _cid, broker_id: _bid, office_id: _oid, created_at: _cat, ...updateData } = body;
      void _id; void _cid; void _bid; void _oid; void _cat;

      const { data, error } = await serviceClient
        .from('mapa_comparativo' as 'propostas')
        .update({ ...updateData, updated_at: now })
        .eq('id', existingRaw.id)
        .select('id')
        .single() as unknown as { data: { id: string } | null; error: unknown };

      if (error) {
        console.error('[PUT /api/clients/[id]/mapa] Update error:', errMsg(error));
        return NextResponse.json({ error: errMsg(error) }, { status: 500 });
      }
      return NextResponse.json({ id: data?.id });
    } else {
      const insertPayload = {
        ...body,
        client_id: id,
        broker_id: broker.id,
        office_id: broker.office_id,
        title: body.title ?? 'Mapa Comparativo',
        proposta_ids: body.proposta_ids ?? [],
        highlighted_cells: body.highlighted_cells ?? {},
        is_visible_to_client: body.is_visible_to_client ?? false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (serviceClient.from('mapa_comparativo' as 'propostas') as any)
        .insert(insertPayload)
        .select('id')
        .single() as { data: { id: string } | null; error: unknown };

      if (error) {
        console.error('[PUT /api/clients/[id]/mapa] Insert error:', errMsg(error));
        return NextResponse.json({ error: errMsg(error) }, { status: 500 });
      }
      return NextResponse.json({ id: data?.id }, { status: 201 });
    }
  } catch (e) {
    console.error('[PUT /api/clients/[id]/mapa] Unexpected error:', e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
