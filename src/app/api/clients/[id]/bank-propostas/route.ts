import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendClientPropostasEmail } from '@/lib/client-notifications';

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
    const { data, error } = await serviceClient
      .from('bank_propostas' as 'propostas')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false }) as unknown as { data: unknown[]; error: unknown };

    if (error) {
      console.error('[GET /api/clients/[id]/bank-propostas] DB error:', errMsg(error));
      return NextResponse.json({ error: errMsg(error) }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('[GET /api/clients/[id]/bank-propostas] Unexpected error:', e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
      .limit(1);
    const broker = ((brokerRaw.data ?? [])[0] ?? null) as { id: string; office_id: string } | null;
    if (!broker) {
      console.error('[POST /api/clients/[id]/bank-propostas] Broker not found for user', user.id);
      return NextResponse.json({ error: 'Broker not found' }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;

    // Check if this is the first proposta for this client
    const { count: existingCount } = await serviceClient
      .from('bank_propostas' as 'propostas')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', id) as unknown as { count: number | null };
    const isFirstProposta = !existingCount || existingCount === 0;

    const { data, error } = await serviceClient
      .from('bank_propostas' as 'propostas')
      .insert({ ...body, client_id: id, broker_id: broker.id, office_id: broker.office_id })
      .select('id')
      .single() as unknown as { data: { id: string } | null; error: unknown };

    if (error) {
      console.error('[POST /api/clients/[id]/bank-propostas] DB error:', errMsg(error));
      return NextResponse.json({ error: errMsg(error) }, { status: 500 });
    }

    // Send propostas email only on the first proposta
    if (isFirstProposta) {
      const { data: clientRaw } = await serviceClient
        .from('clients').select('p1_name, p1_email, portal_token').eq('id', id).single() as unknown as { data: { p1_name: string; p1_email: string | null; portal_token: string | null } | null };
      if (clientRaw) {
        void sendClientPropostasEmail(serviceClient, {
          clientName: clientRaw.p1_name,
          clientEmail: clientRaw.p1_email,
          portalToken: clientRaw.portal_token,
          brokerId: broker.id,
          officeId: broker.office_id,
        });
      }
    }

    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/clients/[id]/bank-propostas] Unexpected error:', e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
