import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewPropostaStepper } from '@/components/propostas/new-proposta-stepper';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewBankPropostaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  // Load broker + office branding
  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; office_id: string } | null;
  if (!broker) redirect('/dashboard');

  const [{ data: clientRaw }, { data: officeRaw }] = await Promise.all([
    serviceClient
      .from('clients')
      .select('p2_name, loan_amount, term_months')
      .eq('id', id)
      .single(),
    serviceClient
      .from('offices')
      .select('name, white_label')
      .eq('id', broker.office_id)
      .single(),
  ]);

  const client = clientRaw as {
    p2_name: string | null;
    loan_amount: number | null;
    term_months: number | null;
  } | null;

  const office = officeRaw as {
    name: string;
    white_label: { logo_url: string | null; primary_color: string } | null;
  } | null;

  return (
    <NewPropostaStepper
      clientId={id}
      p2Name={client?.p2_name ?? null}
      clientLoanAmount={client?.loan_amount ?? null}
      clientTermMonths={client?.term_months ?? null}
      logoUrl={office?.white_label?.logo_url ?? undefined}
      officeName={office?.name}
    />
  );
}
