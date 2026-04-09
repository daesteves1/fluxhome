import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { BankPropostaForm } from '@/components/propostas/bank-proposta-form';
import type { BankProposta } from '@/types/proposta';

interface PageProps {
  params: Promise<{ id: string; propostaId: string }>;
}

export default async function EditBankPropostaPage({ params }: PageProps) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  const [propostaResult, clientResult] = await Promise.all([
    serviceClient
      .from('bank_propostas' as 'propostas')
      .select('*')
      .eq('id', propostaId)
      .eq('client_id', id)
      .single() as unknown as Promise<{ data: BankProposta | null }>,
    serviceClient
      .from('clients')
      .select('p2_name')
      .eq('id', id)
      .single(),
  ]);

  if (!propostaResult.data) notFound();

  const p2Name = (clientResult.data as { p2_name: string | null } | null)?.p2_name ?? null;

  return (
    <div className="flex flex-col h-full">
      <BankPropostaForm
        clientId={id}
        backUrl={`/dashboard/clients/${id}?tab=propostas`}
        initialData={propostaResult.data}
        p2Name={p2Name}
      />
    </div>
  );
}
