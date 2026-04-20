import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { LeadsView } from '@/components/leads/leads-view';

export default async function LeadsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value;

  type BrokerRow = { id: string; office_id: string; is_office_admin: boolean };
  let broker: BrokerRow | null = null;

  if (impersonatingId) {
    const { data } = await serviceClient
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('id', impersonatingId)
      .eq('is_active', true)
      .single();
    broker = data as BrokerRow | null;
  } else {
    const { data } = await serviceClient
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    broker = data as BrokerRow | null;
  }

  if (!broker) redirect('/dashboard');

  // Check lead capture is enabled for this office
  const { data: officeRaw } = await serviceClient
    .from('offices')
    .select('lead_capture_enabled')
    .eq('id', broker.office_id)
    .single();

  const leadCaptureEnabled = (officeRaw as { lead_capture_enabled: boolean } | null)?.lead_capture_enabled ?? false;

  // Fetch leads for this office (using service client — RLS enforced on regular client)
  // We fetch via service client here since this is an authenticated dashboard RSC
  const { data: leadsRaw } = await serviceClient
    .from('leads')
    .select('id, p1_nome, p1_email, p1_telefone, p2_nome, tipo_operacao, valor_imovel, montante_pretendido, localizacao_imovel, horario_preferencial, status, assigned_broker_id, converted_client_id, created_at, mensagem')
    .eq('office_id', broker.office_id)
    .order('created_at', { ascending: false });

  type LeadRow = {
    id: string;
    p1_nome: string;
    p1_email: string | null;
    p1_telefone: string | null;
    p2_nome: string | null;
    tipo_operacao: string;
    valor_imovel: number | null;
    montante_pretendido: number | null;
    localizacao_imovel: string | null;
    horario_preferencial: string | null;
    status: string;
    assigned_broker_id: string | null;
    converted_client_id: string | null;
    created_at: string;
    mensagem: string | null;
  };

  const leads = (leadsRaw ?? []) as LeadRow[];

  return (
    <LeadsView
      leads={leads}
      officeId={broker.office_id}
      leadCaptureEnabled={leadCaptureEnabled}
    />
  );
}
