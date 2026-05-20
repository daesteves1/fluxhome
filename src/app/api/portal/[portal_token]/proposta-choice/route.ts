import { createServiceClient } from '@/lib/supabase/server';
import { createBrokerNotification } from '@/lib/broker-notifications';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portal_token: string }> }
) {
  const { portal_token } = await params;
  const serviceClient = await createServiceClient();

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, broker_id, office_id, p1_name')
    .eq('portal_token', portal_token)
    .single();

  if (!clientRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const client = clientRaw as { id: string; broker_id: string | null; office_id: string; p1_name: string };

  const body = (await request.json()) as {
    proposta_id: string;
    bank_name: string;
    insurance_choice: 'banco' | 'externa';
  };

  if (!body.proposta_id || !body.bank_name || !body.insurance_choice) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const choice = {
    proposta_id: body.proposta_id,
    bank_name: body.bank_name,
    insurance_choice: body.insurance_choice,
    confirmed_at: new Date().toISOString(),
  };

  const { error } = await serviceClient
    .from('clients')
    .update({ proposta_choice: choice } as unknown as Record<string, unknown>)
    .eq('id', client.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify broker of proposta choice (non-fatal)
  if (client.broker_id) {
    // Find the most recent process for this client to build the link
    const { data: procRaw } = await serviceClient
      .from('processes')
      .select('id')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as { data: { id: string } | null };

    const link = procRaw
      ? `/dashboard/processes/${procRaw.id}?tab=propostas`
      : `/dashboard/clients/${client.id}?tab=propostas`;

    void createBrokerNotification(serviceClient, {
      brokerId: client.broker_id,
      officeId: client.office_id,
      type: 'proposta_choice',
      title: `${client.p1_name} escolheu uma proposta`,
      body: body.bank_name,
      link,
    });
  }

  return NextResponse.json({ ok: true, choice });
}
