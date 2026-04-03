import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { PropostaEditor } from '@/components/propostas/proposta-editor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewPropostaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, p1_name, p2_name, loan_amount, term_months')
    .eq('id', id)
    .single();

  if (!clientRaw) notFound();
  const client = clientRaw as { id: string; p1_name: string; p2_name: string | null; loan_amount: number | null; term_months: number | null };

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; office_id: string } | null;
  if (!broker) redirect('/dashboard');

  const { data: officeRaw } = await serviceClient
    .from('offices')
    .select('name, white_label')
    .eq('id', broker.office_id)
    .single();

  return (
    <PropostaEditor
      clientId={id}
      clientName={client.p1_name}
      brokerId={broker.id}
      defaultLoanAmount={client.loan_amount}
      defaultTermMonths={client.term_months}
      officeName={(officeRaw as { name: string } | null)?.name ?? ''}
    />
  );
}
