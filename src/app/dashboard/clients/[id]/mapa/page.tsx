import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MapaEditor } from '@/components/propostas/mapa-editor';
import type { BankProposta, MapaComparativo } from '@/types/proposta';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MapaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  const { data: bankPropostasRaw } = await serviceClient
    .from('bank_propostas' as 'propostas')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: true }) as unknown as { data: BankProposta[] };

  const { data: mapaRaw } = await serviceClient
    .from('mapa_comparativo' as 'propostas')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as { data: MapaComparativo | null };

  return (
    <MapaEditor
      clientId={id}
      backUrl={`/dashboard/clients/${id}?tab=propostas`}
      bankPropostas={bankPropostasRaw ?? []}
      initialMapa={mapaRaw}
    />
  );
}
