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

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!brokerRaw) redirect('/dashboard');

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('p2_name, loan_amount, term_months')
    .eq('id', id)
    .single();

  const client = clientRaw as {
    p2_name: string | null;
    loan_amount: number | null;
    term_months: number | null;
  } | null;

  return (
    <NewPropostaStepper
      clientId={id}
      p2Name={client?.p2_name ?? null}
      clientLoanAmount={client?.loan_amount ?? null}
      clientTermMonths={client?.term_months ?? null}
    />
  );
}
