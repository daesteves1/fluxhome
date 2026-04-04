import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portal_token: string }> }
) {
  const { portal_token } = await params;
  const serviceClient = await createServiceClient();

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id')
    .eq('portal_token', portal_token)
    .single();

  if (!clientRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const client = clientRaw as { id: string };

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

  return NextResponse.json({ ok: true, choice });
}
