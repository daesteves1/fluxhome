import { createClient, createServiceClient, createAdminClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { NewPropostaStepper } from '@/components/propostas/new-proposta-stepper';
import { resolveSettings } from '@/lib/settings';
import type { PlatformSettings } from '@/lib/settings';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ extraction_id?: string }>;
}

export default async function NewBankPropostaProcessPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { extraction_id } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  const { data: brokerArr } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);

  const broker = ((brokerArr ?? [])[0] ?? null) as { id: string; office_id: string } | null;
  if (!broker) redirect('/dashboard');

  const { data: processRaw } = await serviceClient
    .from('processes')
    .select('client_id, montante_solicitado, prazo_meses, clients(p2_name)')
    .eq('id', id)
    .single();

  if (!processRaw) notFound();

  const proc = processRaw as {
    client_id: string;
    montante_solicitado: number | null;
    prazo_meses: number | null;
    clients: { p2_name: string | null } | null;
  };

  const { data: officeRaw } = await createAdminClient()
    .from('offices')
    .select('settings')
    .eq('id', broker!.office_id)
    .single();

  const officeSettings = (officeRaw as { settings: Partial<PlatformSettings> | null } | null)?.settings ?? null;
  const resolved = resolveSettings(officeSettings);

  // If coming from "Validar agora", fetch the extraction data
  let initialExtraction: { id: string; extracted_data: Record<string, unknown>; confidence_data: Record<string, number>; pdf_path: string | null } | null = null;
  if (extraction_id) {
    const { data: exRaw } = await serviceClient
      .from('proposta_extractions' as 'bank_propostas')
      .select('id, extracted_data, confidence_data, pdf_path')
      .eq('id', extraction_id)
      .single() as unknown as { data: { id: string; extracted_data: Record<string, unknown>; confidence_data: Record<string, number>; pdf_path: string | null } | null };
    initialExtraction = exRaw ?? null;
  }

  return (
    <NewPropostaStepper
      clientId={proc.client_id}
      p2Name={proc.clients?.p2_name ?? null}
      clientLoanAmount={proc.montante_solicitado ?? null}
      clientTermMonths={proc.prazo_meses ?? null}
      backUrl={`/dashboard/processes/${id}?tab=propostas`}
      aiExtractionEnabled={resolved.ai_proposta_extraction}
      processId={id}
      initialExtractionId={initialExtraction?.id ?? null}
      initialExtractedData={initialExtraction ? { extracted_data: initialExtraction.extracted_data, confidence_data: initialExtraction.confidence_data, pdf_path: initialExtraction.pdf_path } : null}
    />
  );
}
