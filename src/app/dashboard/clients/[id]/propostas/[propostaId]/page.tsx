import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { PropostaEditor } from '@/components/propostas/proposta-editor';

interface PageProps {
  params: Promise<{ id: string; propostaId: string }>;
}

export default async function EditPropostaPage({ params }: PageProps) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, p1_name, loan_amount, term_months')
    .eq('id', id)
    .single();

  if (!clientRaw) notFound();
  const client = clientRaw as { id: string; p1_name: string; loan_amount: number | null; term_months: number | null };

  const { data: propostaRaw } = await serviceClient
    .from('propostas')
    .select('*')
    .eq('id', propostaId)
    .eq('client_id', id)
    .single();

  if (!propostaRaw) notFound();

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; office_id: string } | null;
  if (!broker) redirect('/dashboard');

  const proposta = propostaRaw as {
    id: string;
    title: string | null;
    comparison_data: unknown;
    insurance_data: unknown;
    one_time_charges: unknown;
    monthly_charges: unknown;
    notes: string | null;
    is_visible_to_client: boolean;
  };

  return (
    <PropostaEditor
      clientId={id}
      clientName={client.p1_name}
      brokerId={broker.id}
      propostaId={propostaId}
      defaultLoanAmount={client.loan_amount}
      defaultTermMonths={client.term_months}
      initialData={{
        title: proposta.title ?? '',
        comparison_data: proposta.comparison_data as BankData[],
        insurance_data: proposta.insurance_data as InsuranceData,
        one_time_charges: proposta.one_time_charges as ChargeRow[],
        monthly_charges: proposta.monthly_charges as ChargeRow[],
        notes: proposta.notes ?? '',
        is_visible_to_client: proposta.is_visible_to_client,
      }}
    />
  );
}

// These types are defined here for the page import — they are also defined in proposta-editor
type BankData = { name: string; highlight?: boolean; [key: string]: unknown };
type InsuranceData = { [bankName: string]: { vida: string; multirriscos: string; vida_ext: string; multirriscos_ext: string } };
type ChargeRow = { label: string; [bankName: string]: string | boolean | undefined };
