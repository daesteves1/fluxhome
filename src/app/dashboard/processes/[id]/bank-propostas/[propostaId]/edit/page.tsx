import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { BankPropostaForm } from '@/components/propostas/bank-proposta-form';
import type { BankProposta } from '@/types/proposta';

interface PageProps {
  params: Promise<{ id: string; propostaId: string }>;
}

export default async function EditBankPropostaProcessPage({ params }: PageProps) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  // Resolve client_id from process
  const { data: processRaw } = await serviceClient
    .from('processes')
    .select('client_id, clients(p2_name)')
    .eq('id', id)
    .single();

  if (!processRaw) notFound();

  const proc = processRaw as {
    client_id: string;
    clients: { p2_name: string | null } | null;
  };

  const { data: propostaData } = await (serviceClient
    .from('bank_propostas' as 'propostas')
    .select('*')
    .eq('id', propostaId)
    .eq('client_id', proc.client_id)
    .single() as unknown as Promise<{ data: BankProposta | null }>);

  if (!propostaData) notFound();

  return (
    <div className="flex flex-col h-full">
      <BankPropostaForm
        clientId={proc.client_id}
        backUrl={`/dashboard/processes/${id}?tab=propostas`}
        initialData={propostaData}
        p2Name={proc.clients?.p2_name ?? null}
      />
    </div>
  );
}
