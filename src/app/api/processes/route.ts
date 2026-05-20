import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

type RawProc = {
  id: string; process_step: string; updated_at: string; broker_id: string;
  montante_solicitado: number | null;
  clients: { p1_name: string; p2_name: string | null } | null;
  brokers?: { id: string; users: { name: string } | null } | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '25')));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [serviceClient, cookieStore] = await Promise.all([createServiceClient(), cookies()]);

  const { data: userProfileRaw } = await serviceClient
    .from('users').select('id, role').eq('id', user.id).single();
  const userProfile = userProfileRaw as { id: string; role: string } | null;
  if (!userProfile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeOfficeCookie = cookieStore.get('homeflux_active_office')?.value;
  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;

  let brokerQuery = serviceClient.from('brokers').select('id, office_id, is_office_admin').eq('user_id', user.id).eq('is_active', true);
  if (activeOfficeCookie) brokerQuery = brokerQuery.eq('office_id', activeOfficeCookie);
  const { data: brokersRaw } = await brokerQuery;
  const brokers = (brokersRaw ?? []) as { id: string; office_id: string; is_office_admin: boolean }[];
  const broker = brokers[0];
  if (!broker) return NextResponse.json({ error: 'No broker' }, { status: 404 });

  const showOwnOnly = userProfile.role === 'broker' || (broker.is_office_admin && viewCookie === 'broker');
  const selectFields = showOwnOnly
    ? 'id, process_step, updated_at, broker_id, montante_solicitado, clients(p1_name, p2_name)'
    : 'id, process_step, updated_at, broker_id, montante_solicitado, clients(p1_name, p2_name), brokers(id, users(name))';

  let query = serviceClient.from('processes').select(selectFields).order('updated_at', { ascending: false }).range(offset, offset + limit - 1);
  if (showOwnOnly) query = query.eq('broker_id', broker.id);
  else query = query.eq('office_id', broker.office_id);

  const { data } = await query;
  const processes = ((data ?? []) as unknown as RawProc[]).map((p) => ({
    id: p.id,
    p1_name: p.clients?.p1_name ?? '',
    p2_name: p.clients?.p2_name ?? null,
    process_step: p.process_step,
    updated_at: p.updated_at,
    broker_id: p.broker_id,
    montante_solicitado: p.montante_solicitado,
    brokerName: showOwnOnly ? null : ((p.brokers?.users as { name: string } | null)?.name ?? null),
  }));

  // Doc counts for this page
  const docCounts: Record<string, { mandatory_total: number; mandatory_approved: number; rejected_count: number }> = {};
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

  return NextResponse.json({ processes, docCounts });
}
