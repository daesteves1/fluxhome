import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { MapaEditor } from '@/components/propostas/mapa-editor';
import type { BankProposta, MapaComparativo } from '@/types/proposta';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProcessMapaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  const { data: processRaw } = await serviceClient
    .from('processes')
    .select('id, client_id, office_id')
    .eq('id', id)
    .single();

  if (!processRaw) notFound();
  const proc = processRaw as { id: string; client_id: string; office_id: string };

  const { data: bankPropostasRaw } = await serviceClient
    .from('bank_propostas' as 'propostas')
    .select('*')
    .eq('process_id', id)
    .order('created_at', { ascending: true }) as unknown as { data: BankProposta[] };

  const { data: mapaRaw } = await serviceClient
    .from('mapa_comparativo' as 'propostas')
    .select('*')
    .eq('process_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as { data: MapaComparativo | null };

  return (
    <MapaEditor
      clientId={proc.client_id}
      processId={id}
      backUrl={`/dashboard/processes/${id}?tab=propostas`}
      bankPropostas={bankPropostasRaw ?? []}
      initialMapa={mapaRaw}
    />
  );
}
