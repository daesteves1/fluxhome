import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; propostaId: string }> }

function errMsg(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    return JSON.stringify(o);
  }
  return String(e);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  try {
    const { data, error } = await serviceClient
      .from('bank_propostas' as 'propostas')
      .select('*')
      .eq('id', propostaId)
      .eq('client_id', id)
      .single() as unknown as { data: unknown; error: unknown };

    if (error) {
      console.error('[GET /api/clients/[id]/bank-propostas/[propostaId]] DB error:', errMsg(error));
      return NextResponse.json({ error: errMsg(error) }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('[GET /api/clients/[id]/bank-propostas/[propostaId]] Unexpected error:', e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  try {
    const body = await request.json() as Record<string, unknown>;

    const { id: _id, client_id: _cid, broker_id: _bid, office_id: _oid, created_at: _cat, ...updateData } = body;
    void _id; void _cid; void _bid; void _oid; void _cat;

    const { data, error } = await serviceClient
      .from('bank_propostas' as 'propostas')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', propostaId)
      .eq('client_id', id)
      .select('id')
      .single() as unknown as { data: { id: string } | null; error: unknown };

    if (error) {
      console.error('[PUT /api/clients/[id]/bank-propostas/[propostaId]] DB error:', errMsg(error));
      return NextResponse.json({ error: errMsg(error) }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id });
  } catch (e) {
    console.error('[PUT /api/clients/[id]/bank-propostas/[propostaId]] Unexpected error:', e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  try {
    const { error } = await serviceClient
      .from('bank_propostas' as 'propostas')
      .delete()
      .eq('id', propostaId)
      .eq('client_id', id) as unknown as { error: unknown };

    if (error) {
      console.error('[DELETE /api/clients/[id]/bank-propostas/[propostaId]] DB error:', errMsg(error));
      return NextResponse.json({ error: errMsg(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/clients/[id]/bank-propostas/[propostaId]] Unexpected error:', e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
