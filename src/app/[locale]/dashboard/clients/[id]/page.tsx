import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ClientDetailHeader } from '@/components/clients/client-detail-header';
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs';
import type { ProcessStep } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: clientRaw, error } = await serviceClient
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !clientRaw) notFound();

  const client = clientRaw as {
    id: string;
    broker_id: string;
    office_id: string;
    p1_name: string;
    p1_nif: string | null;
    p1_email: string | null;
    p1_phone: string | null;
    p1_employment_type: string | null;
    p1_birth_date: string | null;
    p2_name: string | null;
    p2_nif: string | null;
    p2_email: string | null;
    p2_phone: string | null;
    p2_employment_type: string | null;
    p2_birth_date: string | null;
    mortgage_type: string | null;
    property_value: number | null;
    loan_amount: number | null;
    term_months: number | null;
    property_address: string | null;
    notes_general: string | null;
    process_step: ProcessStep;
    portal_token: string;
    terms_accepted_at: string | null;
    created_at: string;
    updated_at: string;
  };

  // Get document requests
  const { data: docRequestsRaw } = await serviceClient
    .from('document_requests')
    .select('*')
    .eq('client_id', id)
    .order('sort_order', { ascending: true });

  // Get uploads for each doc request
  const docRequestIds = (docRequestsRaw ?? []).map((r) => (r as { id: string }).id);
  let uploadsRaw: unknown[] = [];
  if (docRequestIds.length > 0) {
    const { data } = await serviceClient
      .from('document_uploads')
      .select('*')
      .in('document_request_id', docRequestIds);
    uploadsRaw = data ?? [];
  }

  // Get propostas
  const { data: propostasRaw } = await serviceClient
    .from('propostas')
    .select('id, title, is_visible_to_client, created_at, updated_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false });

  // Get broker notes
  const { data: brokerNotesRaw } = await serviceClient
    .from('broker_notes')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false });

  // Get broker info for current user
  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, is_office_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; is_office_admin: boolean } | null;

  // Get office for white-label
  const { data: officeRaw } = await serviceClient
    .from('offices')
    .select('name, white_label')
    .eq('id', client.office_id)
    .single();

  return (
    <div className="space-y-6">
      <ClientDetailHeader
        client={client}
        portalBaseUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
      />
      <ClientDetailTabs
        client={client}
        documentRequests={(docRequestsRaw ?? []) as Parameters<typeof ClientDetailTabs>[0]['documentRequests']}
        uploads={uploadsRaw as Parameters<typeof ClientDetailTabs>[0]['uploads']}
        propostas={(propostasRaw ?? []) as Parameters<typeof ClientDetailTabs>[0]['propostas']}
        brokerNotes={(brokerNotesRaw ?? []) as Parameters<typeof ClientDetailTabs>[0]['brokerNotes']}
        currentBrokerId={broker?.id ?? null}
        officeId={client.office_id}
        officeName={(officeRaw as { name: string } | null)?.name ?? ''}
      />
    </div>
  );
}
