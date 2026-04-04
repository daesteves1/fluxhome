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
  const { data } = await serviceClient
    .from('bank_propostas' as 'propostas')
    .select('*')
    .eq('id', propostaId)
    .eq('client_id', id)
    .single() as unknown as { data: BankProposta | null };

  if (!data) notFound();

  return (
    <div className="flex flex-col h-full">
      <BankPropostaForm
        clientId={id}
        backUrl={`/dashboard/clients/${id}?tab=propostas`}
        initialData={data}
      />
    </div>
  );
}
