import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const TIPO_TO_MORTGAGE: Record<string, string> = {
  aquisicao: 'acquisition',
  construcao: 'construction',
  refinanciamento: 'refinancing',
  transferencia: 'transfer',
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value;

  // Resolve the acting broker
  type BrokerRow = { id: string; office_id: string };
  let broker: BrokerRow | null = null;

  if (impersonatingId) {
    const { data } = await serviceClient.from('brokers').select('id, office_id').eq('id', impersonatingId).eq('is_active', true).single();
    broker = data as BrokerRow | null;
  } else {
    const { data } = await serviceClient.from('brokers').select('id, office_id').eq('user_id', user.id).eq('is_active', true).single();
    broker = data as BrokerRow | null;
  }

  if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch the full lead
  const { data: leadRaw } = await serviceClient
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  type FullLead = {
    id: string;
    office_id: string;
    p1_nome: string;
    p1_email: string | null;
    p1_telefone: string | null;
    p1_nif: string | null;
    p1_data_nascimento: string | null;
    p1_tipo_emprego: string | null;
    p2_nome: string | null;
    p2_email: string | null;
    p2_telefone: string | null;
    p2_nif: string | null;
    p2_data_nascimento: string | null;
    p2_tipo_emprego: string | null;
    tipo_operacao: string;
    valor_imovel: number | null;
    montante_pretendido: number | null;
    prazo_pretendido: number | null;
    localizacao_imovel: string | null;
    mensagem: string | null;
    assigned_broker_id: string | null;
    converted_client_id: string | null;
  };

  const lead = leadRaw as FullLead | null;
  if (!lead || lead.office_id !== broker.office_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (lead.converted_client_id) {
    // Already converted — return existing client id
    return NextResponse.json({ clientId: lead.converted_client_id });
  }

  // Pick broker: use assigned broker if set, otherwise the acting broker
  const clientBrokerId = lead.assigned_broker_id ?? broker.id;

  // Create the client
  const { data: newClient, error: clientError } = await serviceClient
    .from('clients')
    .insert({
      broker_id: clientBrokerId,
      office_id: broker.office_id,
      p1_name: lead.p1_nome,
      p1_email: lead.p1_email,
      p1_phone: lead.p1_telefone,
      p1_nif: lead.p1_nif,
      p1_birth_date: lead.p1_data_nascimento,
      p1_employment_type: lead.p1_tipo_emprego,
      p2_name: lead.p2_nome,
      p2_email: lead.p2_email,
      p2_phone: lead.p2_telefone,
      p2_nif: lead.p2_nif,
      p2_birth_date: lead.p2_data_nascimento,
      p2_employment_type: lead.p2_tipo_emprego,
      mortgage_type: TIPO_TO_MORTGAGE[lead.tipo_operacao] ?? null,
      property_value: lead.valor_imovel,
      loan_amount: lead.montante_pretendido,
      // lead form collects years; clients.term_months expects months
      term_months: lead.prazo_pretendido ? lead.prazo_pretendido * 12 : null,
      property_address: lead.localizacao_imovel,
      notes_general: lead.mensagem,
    })
    .select('id')
    .single();

  if (clientError || !newClient) {
    console.error('Client creation error:', clientError);
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
  }

  const client = newClient as { id: string };

  // Mark lead as converted
  await serviceClient
    .from('leads')
    .update({ status: 'convertido', converted_client_id: client.id })
    .eq('id', leadId);

  return NextResponse.json({ clientId: client.id }, { status: 201 });
}
