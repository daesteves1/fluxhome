import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PortalView } from '@/components/portal/portal-view';

interface PageProps {
  params: Promise<{ portal_token: string }>;
}

export default async function PortalPage({ params }: PageProps) {
  const { portal_token } = await params;
  const serviceClient = await createServiceClient();

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, p1_name, p2_name, portal_token, terms_accepted_at, broker_id')
    .eq('portal_token', portal_token)
    .single();

  if (!clientRaw) notFound();

  const client = clientRaw as {
    id: string;
    p1_name: string;
    p2_name: string | null;
    portal_token: string;
    terms_accepted_at: string | null;
    broker_id: string;
  };

  const { data: documentRequestsRaw } = await serviceClient
    .from('document_requests')
    .select('id, label, status, broker_notes, max_files, sort_order, created_at')
    .eq('client_id', client.id)
    .order('sort_order', { ascending: true });

  // Sort: rejected → pending → em_analise → approved, then by sort_order within group
  const STATUS_SORT: Record<string, number> = { rejected: 0, pending: 1, em_analise: 2, approved: 3 };
  const documentRequestsSorted = [...(documentRequestsRaw ?? [])].sort((a, b) => {
    const ar = a as { status: string; sort_order: number };
    const br = b as { status: string; sort_order: number };
    const ag = STATUS_SORT[ar.status] ?? 99;
    const bg = STATUS_SORT[br.status] ?? 99;
    if (ag !== bg) return ag - bg;
    return ar.sort_order - br.sort_order;
  });

  const requestIds = documentRequestsSorted.map((r) => (r as { id: string }).id);

  const { data: uploadsRaw } = requestIds.length > 0
    ? await serviceClient
        .from('document_uploads')
        .select('id, document_request_id, file_name, storage_path, uploaded_at')
        .in('document_request_id', requestIds)
    : { data: [] };

  const { data: propostasRaw } = await serviceClient
    .from('propostas')
    .select('id, title, created_at, updated_at')
    .eq('client_id', client.id)
    .eq('is_visible_to_client', true)
    .order('created_at', { ascending: false });

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('id', client.broker_id)
    .single();

  const officeId = (brokerRaw as { id: string; office_id: string } | null)?.office_id;
  const { data: officeRaw } = officeId
    ? await serviceClient.from('offices').select('name, white_label').eq('id', officeId).single()
    : { data: null };

  type DocRequest = {
    id: string;
    label: string;
    status: string;
    broker_notes: string | null;
    max_files: number;
    created_at: string;
  };
  type Upload = {
    id: string;
    document_request_id: string;
    file_name: string | null;
    storage_path: string;
    uploaded_at: string;
  };
  type Proposta = {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
  };

  return (
    <PortalView
      clientId={client.id}
      clientName={client.p1_name}
      portalToken={portal_token}
      termsAcceptedAt={client.terms_accepted_at}
      officeName={(officeRaw as { name: string } | null)?.name ?? ''}
      documentRequests={documentRequestsSorted as unknown as DocRequest[]}
      uploads={(uploadsRaw ?? []) as unknown as Upload[]}
      propostas={(propostasRaw ?? []) as unknown as Proposta[]}
    />
  );
}
