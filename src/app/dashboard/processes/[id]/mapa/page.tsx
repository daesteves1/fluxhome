import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { MapaEditor } from '@/components/propostas/mapa-editor';
import type { BankProposta, MapaComparativo } from '@/types/proposta';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProcessMapaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Fetch auth + all process data in parallel
  const [{ data: { user } }, { data: processRaw }, { data: bankPropostasRaw }, { data: mapaRaw }] = await Promise.all([
    supabase.auth.getUser(),
    adminClient.from('processes').select('id, client_id, office_id').eq('id', id).single(),
    adminClient
      .from('bank_propostas' as 'propostas')
      .select('*')
      .eq('process_id', id)
      .order('created_at', { ascending: true }) as unknown as Promise<{ data: BankProposta[] }>,
    adminClient
      .from('mapa_comparativo' as 'propostas')
      .select('*')
      .eq('process_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as Promise<{ data: MapaComparativo | null }>,
  ]);

  if (!user) redirect('/login');
  if (!processRaw) notFound();
  const proc = processRaw as { id: string; client_id: string; office_id: string };

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
