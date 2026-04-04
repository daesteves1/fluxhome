import { createClient } from '@/lib/supabase/server';
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

  return (
    <div className="flex flex-col h-full">
      <BankPropostaForm
        clientId={id}
        backUrl={`/dashboard/clients/${id}?tab=propostas`}
      />
    </div>
  );
}
