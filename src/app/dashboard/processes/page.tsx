export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ProcessosList, type ProcessRow } from '@/components/dashboard/processos-list';
import type { DocCounts } from '@/components/dashboard/kanban-board';

type RawProc = {
  id: string; process_step: string; updated_at: string; broker_id: string;
  montante_solicitado: number | null;
  clients: { p1_name: string; p2_name: string | null } | null;
  brokers?: { id: string; users: { name: string } | null } | null;
};

export default async function ProcessesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [serviceClient, cookieStore] = await Promise.all([createServiceClient(), cookies()]);

  const activeOfficeCookie = cookieStore.get('homeflux_active_office')?.value;
  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;

  // Parallel: user profile + all broker records
  const [{ data: userProfileRaw }, { data: brokersRaw }] = await Promise.all([
    serviceClient.from('users').select('id, role').eq('id', user.id).single(),
    serviceClient.from('brokers').select('id, office_id, is_office_admin').eq('user_id', user.id).eq('is_active', true),
  ]);

  const userProfile = userProfileRaw as { id: string; role: string } | null;
  const allBrokers = (brokersRaw ?? []) as { id: string; office_id: string; is_office_admin: boolean }[];

  if (!userProfile) redirect('/login');
  if (userProfile.role !== 'super_admin' && allBrokers.length === 0) redirect('/login');

  const cookieMatch = allBrokers.find((b) => b.office_id === activeOfficeCookie);
  const broker = cookieMatch ?? allBrokers[0] ?? null;

  const showOwnOnly = userProfile.role === 'broker' || (broker?.is_office_admin && viewCookie === 'broker');

  const selectFields = showOwnOnly
    ? 'id, process_step, updated_at, broker_id, montante_solicitado, clients(p1_name, p2_name)'
    : 'id, process_step, updated_at, broker_id, montante_solicitado, clients(p1_name, p2_name), brokers(id, users(name))';

  // Parallel: total count+valor (lightweight) + first 25 processes with full data
  const baseCountQ = serviceClient.from('processes').select('montante_solicitado', { count: 'exact', head: false });
  const baseProcsQ = serviceClient.from('processes').select(selectFields).order('updated_at', { ascending: false }).range(0, 24);

  const countQ = showOwnOnly && broker
    ? baseCountQ.eq('broker_id', broker.id)
    : broker?.office_id ? baseCountQ.eq('office_id', broker.office_id) : baseCountQ;

  const procsQ = showOwnOnly && broker
    ? baseProcsQ.eq('broker_id', broker.id)
    : broker?.office_id ? baseProcsQ.eq('office_id', broker.office_id) : baseProcsQ;

  const [{ data: valorData, count: totalCount }, { data: processData }] = await Promise.all([
    countQ,
    procsQ,
  ]);

  const totalValor = ((valorData ?? []) as { montante_solicitado: number | null }[])
    .reduce((sum, r) => sum + (r.montante_solicitado ?? 0), 0);

  const processes: ProcessRow[] = ((processData ?? []) as unknown as RawProc[]).map((p) => ({
    id: p.id,
    p1_name: p.clients?.p1_name ?? '',
    p2_name: p.clients?.p2_name ?? null,
    process_step: p.process_step,
    updated_at: p.updated_at,
    broker_id: p.broker_id,
    montante_solicitado: p.montante_solicitado,
    brokerName: showOwnOnly ? null : ((p.brokers?.users as { name: string } | null)?.name ?? null),
  }));

  // Doc counts for the first page only
  const docCounts: DocCounts = {};
  if (processes.length > 0) {
    const ids = processes.map((p) => p.id);
    const { data: docData } = await serviceClient
      .from('document_requests').select('process_id, is_mandatory, status').in('process_id', ids);
    for (const doc of (docData ?? []) as { process_id: string; is_mandatory: boolean; status: string }[]) {
      if (!doc.process_id) continue;
      if (!docCounts[doc.process_id]) docCounts[doc.process_id] = { mandatory_total: 0, mandatory_approved: 0, rejected_count: 0 };
      if (doc.is_mandatory) {
        docCounts[doc.process_id].mandatory_total++;
        if (doc.status === 'approved') docCounts[doc.process_id].mandatory_approved++;
      }
      if (doc.status === 'rejected') docCounts[doc.process_id].rejected_count++;
    }
  }

  return (
    <ProcessosList
      initialProcesses={processes}
      initialDocCounts={docCounts}
      totalCount={totalCount ?? processes.length}
      totalValor={totalValor}
      showBrokerColumn={!showOwnOnly}
    />
  );
}
