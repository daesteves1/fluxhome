export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { ClientsTable } from '@/components/dashboard/clients-table';
import Link from 'next/link';

export default async function ClientsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const t = await getTranslations();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userProfileRaw } = await serviceClient
    .from('users')
    .select('id, role, name')
    .eq('id', user.id)
    .single();

  const userProfile = userProfileRaw as { id: string; role: string; name: string } | null;

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id, is_office_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; office_id: string; is_office_admin: boolean } | null;

  if (!broker && userProfile?.role !== 'super_admin') {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;

  const showOwnOnly =
    userProfile?.role === 'broker' ||
    (broker?.is_office_admin && viewCookie === 'broker');

  type ProcessRow = {
    id: string;
    p1_name: string;
    p2_name: string | null;
    process_step: string;
    updated_at: string;
    broker_id: string;
    brokers: { id: string; users: { name: string } | null } | null;
  };

  let processes: ProcessRow[] = [];

  type RawProc = { id: string; process_step: string; updated_at: string; broker_id: string; clients: { p1_name: string; p2_name: string | null } | null; brokers?: { id: string; users: { name: string } | null } | null };

  if (showOwnOnly && broker) {
    const { data } = await serviceClient
      .from('processes')
      .select('id, process_step, updated_at, broker_id, clients(p1_name, p2_name)')
      .eq('broker_id', broker.id)
      .order('updated_at', { ascending: false });
    processes = ((data ?? []) as unknown as RawProc[]).map((p) => ({
      id: p.id,
      p1_name: p.clients?.p1_name ?? '',
      p2_name: p.clients?.p2_name ?? null,
      process_step: p.process_step,
      updated_at: p.updated_at,
      broker_id: p.broker_id,
      brokers: null,
    }));
  } else if (broker?.office_id) {
    const { data } = await serviceClient
      .from('processes')
      .select('id, process_step, updated_at, broker_id, clients(p1_name, p2_name), brokers(id, users(name))')
      .eq('office_id', broker.office_id)
      .order('updated_at', { ascending: false });
    processes = ((data ?? []) as unknown as RawProc[]).map((p) => ({
      id: p.id,
      p1_name: p.clients?.p1_name ?? '',
      p2_name: p.clients?.p2_name ?? null,
      process_step: p.process_step,
      updated_at: p.updated_at,
      broker_id: p.broker_id,
      brokers: p.brokers ?? null,
    }));
  }

  // Doc counts indexed by process_id
  type DocCounts = Record<string, { mandatory_total: number; mandatory_approved: number; rejected_count: number }>;
  const docCounts: DocCounts = {};

  if (processes.length > 0) {
    const processIds = processes.map((p) => p.id);
    const { data: docData } = await serviceClient
      .from('document_requests')
      .select('process_id, is_mandatory, status')
      .in('process_id', processIds);

    for (const doc of (docData ?? []) as { process_id: string; is_mandatory: boolean; status: string }[]) {
      if (!doc.process_id) continue;
      if (!docCounts[doc.process_id]) {
        docCounts[doc.process_id] = { mandatory_total: 0, mandatory_approved: 0, rejected_count: 0 };
      }
      if (doc.is_mandatory) {
        docCounts[doc.process_id].mandatory_total++;
        if (doc.status === 'approved') docCounts[doc.process_id].mandatory_approved++;
      }
      if (doc.status === 'rejected') docCounts[doc.process_id].rejected_count++;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('clients.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {processes.length} {processes.length === 1 ? 'processo' : 'processos'}
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="inline-flex items-center h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + {t('dashboard.addClient')}
        </Link>
      </div>

      <ClientsTable clients={processes} showBrokerColumn={!showOwnOnly} docCounts={docCounts} />
    </div>
  );
}
