import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { ProcessStep } from '@/types/database';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from('processes')
    .select('*, clients(id, p1_name, p2_name, p1_email, p1_phone, p1_nif, p2_email, p2_phone, portal_token, office_id, broker_id)')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const body = await request.json();

  const allowed = [
    'process_step', 'tipo', 'valor_imovel', 'montante_solicitado', 'prazo_meses',
    'finalidade', 'localizacao_imovel', 'p1_profissao', 'p1_entidade_empregadora',
    'p1_tipo_contrato', 'p1_rendimento_mensal', 'p2_profissao', 'p2_entidade_empregadora',
    'p2_tipo_contrato', 'p2_rendimento_mensal', 'followup_at', 'followup_note',
    'followup_dismissed_at', 'observacoes', 'closed_at',
  ];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) { if (k in body) update[k] = body[k]; }

  if (update.process_step === 'closed' && !('closed_at' in body)) {
    update.closed_at = new Date().toISOString();
  }

  const { error } = await serviceClient
    .from('processes')
    .update(update as { process_step?: ProcessStep })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
