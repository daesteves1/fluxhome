import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ProcessDetailHeader } from '@/components/processes/process-detail-header';
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs';
import { getOfficeDocumentTemplate, type OfficeDocTemplate } from '@/lib/document-defaults';
import type { ProcessTipo, ProcessStep } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProcessDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch process with client
  const { data: processRaw, error } = await serviceClient
    .from('processes')
    .select('*, clients(id, p1_name, p2_name, p1_email, p1_phone, p1_nif, p1_birth_date, p2_email, p2_phone, p2_nif, portal_token, office_id, broker_id)')
    .eq('id', id)
    .single();

  if (error || !processRaw) notFound();

  const proc = processRaw as {
    id: string;
    client_id: string;
    broker_id: string;
    office_id: string;
    tipo: ProcessTipo;
    process_step: ProcessStep;
    valor_imovel: number | null;
    montante_solicitado: number | null;
    prazo_meses: number | null;
    finalidade: string | null;
    localizacao_imovel: string | null;
    followup_at: string | null;
    followup_note: string | null;
    observacoes: string | null;
    created_at: string;
    clients: {
      id: string;
      p1_name: string;
      p2_name: string | null;
      p1_email: string | null;
      p1_phone: string | null;
      p1_nif: string | null;
      p1_birth_date: string | null;
      p2_email: string | null;
      p2_phone: string | null;
      p2_nif: string | null;
      portal_token: string;
      office_id: string;
      broker_id: string;
    };
  };

  const clientInfo = proc.clients;

  // Documents filtered by process_id
  const { data: docRequestsRaw } = await serviceClient
    .from('document_requests')
    .select('*')
    .eq('process_id', id)
    .order('sort_order', { ascending: true });

  const docRequestIds = (docRequestsRaw ?? []).map((r) => (r as { id: string }).id);
  let uploadsRaw: unknown[] = [];
  if (docRequestIds.length > 0) {
    const { data } = await serviceClient.from('document_uploads').select('*').in('document_request_id', docRequestIds);
    uploadsRaw = data ?? [];
  }

  // Notes filtered by process_id
  const { data: brokerNotesRaw } = await serviceClient
    .from('broker_notes')
    .select('*')
    .eq('process_id', id)
    .order('created_at', { ascending: false });

  // Broker info
  const { data: brokerRaw } = await serviceClient
    .from('brokers').select('id, is_office_admin').eq('user_id', user.id).eq('is_active', true).single();
  const broker = brokerRaw as { id: string; is_office_admin: boolean } | null;

  // Office for document template
  const { data: officeRaw } = await serviceClient
    .from('offices').select('name, white_label, document_template').eq('id', proc.office_id).single();
  const officeDocTemplate = getOfficeDocumentTemplate(
    (officeRaw as { document_template?: OfficeDocTemplate[] | null } | null)?.document_template ?? null
  );

  // Pass a client-like object to ClientDetailTabs (it needs client.id for BankShareTab)
  const clientForTabs = {
    id: clientInfo.id,
    p1_name: clientInfo.p1_name,
    p2_name: clientInfo.p2_name,
    p1_email: clientInfo.p1_email,
    p1_phone: clientInfo.p1_phone,
    portal_token: clientInfo.portal_token,
  };

  return (
    <div className="space-y-4">
      <ProcessDetailHeader
        process={proc}
        client={{ id: clientInfo.id, p1_name: clientInfo.p1_name, p2_name: clientInfo.p2_name }}
      />
      <ClientDetailTabs
        client={clientForTabs as Parameters<typeof ClientDetailTabs>[0]['client']}
        documentRequests={(docRequestsRaw ?? []) as Parameters<typeof ClientDetailTabs>[0]['documentRequests']}
        uploads={uploadsRaw as Parameters<typeof ClientDetailTabs>[0]['uploads']}
        brokerNotes={(brokerNotesRaw ?? []) as Parameters<typeof ClientDetailTabs>[0]['brokerNotes']}
        currentBrokerId={broker?.id ?? null}
        officeId={proc.office_id}
        officeName={(officeRaw as { name: string } | null)?.name ?? ''}
        officeDocTemplate={officeDocTemplate}
        defaultTab={tab}
        processId={id}
      />
    </div>
  );
}
