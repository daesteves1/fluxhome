import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BankPropostaForm } from '@/components/propostas/bank-proposta-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewBankPropostaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();
  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('p2_name')
    .eq('id', id)
    .single();
  const p2Name = (clientRaw as { p2_name: string | null } | null)?.p2_name ?? null;

  return (
    <div className="flex flex-col h-full">
      <BankPropostaForm
        clientId={id}
        backUrl={`/dashboard/clients/${id}?tab=propostas`}
        p2Name={p2Name}
      />
    </div>
  );
}
