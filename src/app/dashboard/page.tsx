import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ClientsTable } from '@/components/dashboard/clients-table';
import { Users, FileText, Send, CheckCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

type ProcessRow = {
  id: string;
  p1_name: string;
  p2_name: string | null;
  process_step: string;
  updated_at: string;
  broker_id: string;
  brokers: { id: string; users: { name: string } | null } | null;
};

type FollowupRow = {
  id: string;
  p1_name: string;
  followup_at: string;
  followup_note: string | null;
};

function greeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 19) return 'Boa tarde';
  return 'Boa noite';
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const t = await getTranslations('dashboard');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userProfileRaw } = await serviceClient
    .from('users')
    .select('id, role, name')
    .eq('id', user.id)
    .single();

  const userProfile = userProfileRaw as { id: string; role: string; name: string } | null;

  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value;

  if (userProfile?.role === 'super_admin' && !impersonatingId) {
    redirect('/admin');
  }
  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;

  type BrokerData = { id: string; office_id: string; is_office_admin: boolean };
  let broker: BrokerData | null = null;

  if (impersonatingId) {
    const { data: impBrokerRaw } = await serviceClient
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('id', impersonatingId)
      .eq('is_active', true)
      .single();
    broker = impBrokerRaw as BrokerData | null;
  } else {
    const { data: brokerRaw } = await serviceClient
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    broker = brokerRaw as BrokerData | null;
  }

  if (!broker && userProfile?.role !== 'super_admin') {
    redirect('/login');
  }

  const showOwnOnly =
    Boolean(impersonatingId) ||
    userProfile?.role === 'broker' ||
    (broker?.is_office_admin && viewCookie === 'broker');

  let processesRaw: ProcessRow[] = [];

  type RawProc = { id: string; process_step: string; updated_at: string; broker_id: string; clients: { p1_name: string; p2_name: string | null } | null };

  if (showOwnOnly && broker) {
    const { data } = await serviceClient
      .from('processes')
      .select('id, process_step, updated_at, broker_id, clients(p1_name, p2_name)')
      .eq('broker_id', broker.id)
      .order('updated_at', { ascending: false });
    processesRaw = ((data ?? []) as unknown as RawProc[]).map((p) => ({
      id: p.id, p1_name: p.clients?.p1_name ?? '', p2_name: p.clients?.p2_name ?? null,
      process_step: p.process_step, updated_at: p.updated_at, broker_id: p.broker_id, brokers: null,
    }));
  } else if (broker?.office_id) {
    const { data } = await serviceClient
      .from('processes')
      .select('id, process_step, updated_at, broker_id, clients(p1_name, p2_name)')
      .eq('office_id', broker.office_id)
      .order('updated_at', { ascending: false });
    processesRaw = ((data ?? []) as unknown as RawProc[]).map((p) => ({
      id: p.id, p1_name: p.clients?.p1_name ?? '', p2_name: p.clients?.p2_name ?? null,
      process_step: p.process_step, updated_at: p.updated_at, broker_id: p.broker_id, brokers: null,
    }));
  }

  // Follow-up reminders: processes with followup_at within next 7 days
  type RawFollowup = { id: string; followup_at: string | null; followup_note: string | null; clients: { p1_name: string } | null };
  let followups: FollowupRow[] = [];
  if (broker) {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: fuData } = await serviceClient
      .from('processes')
      .select('id, followup_at, followup_note, clients(p1_name)')
      .eq(showOwnOnly ? 'broker_id' : 'office_id', showOwnOnly ? broker.id : broker.office_id)
      .lte('followup_at', in7days)
      .not('followup_at', 'is', null)
      .neq('process_step', 'closed')
      .order('followup_at', { ascending: true })
      .limit(5);

    followups = ((fuData ?? []) as unknown as RawFollowup[]).map((p) => ({
      id: p.id,
      p1_name: p.clients?.p1_name ?? '',
      followup_at: p.followup_at ?? '',
      followup_note: p.followup_note,
    }));
  }

  const firstName = userProfile?.name?.split(' ')[0] ?? '';

  const activeProcesses = processesRaw.filter(
    (p) => !['closed', 'approved'].includes(p.process_step)
  ).length;

  const docsPending = processesRaw.filter(
    (p) => p.process_step === 'docs_pending'
  ).length;

  const propostasSent = processesRaw.filter(
    (p) => p.process_step === 'propostas_sent'
  ).length;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const closedThisMonth = processesRaw.filter(
    (p) => p.process_step === 'closed' && p.updated_at >= startOfMonth
  ).length;

  const todayPT = now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          {greeting()}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="text-sm text-slate-500 capitalize hidden sm:block">{todayPT}</p>
      </div>

      {/* KPI cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">{t('pipeline')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard title={t('activeProcesses')} value={activeProcesses} icon={Users} trend="neutral" />
          <KpiCard title={t('docsPendingReview')} value={docsPending} icon={FileText} trend={docsPending > 0 ? 'warning' : 'neutral'} />
          <KpiCard title={t('propostasSent')} value={propostasSent} icon={Send} trend="neutral" />
          <KpiCard title={t('closedThisMonth')} value={closedThisMonth} icon={CheckCircle} trend="positive" />
        </div>
      </div>

      {/* Follow-up reminders */}
      {followups.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Seguimentos próximos</h2>
          <div className="space-y-2">
            {followups.map((fu) => (
              <Link
                key={fu.id}
                href={`/dashboard/processes/${fu.id}`}
                className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors"
              >
                <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{fu.p1_name}</p>
                  {fu.followup_note && <p className="text-xs text-slate-500 truncate">{fu.followup_note}</p>}
                </div>
                <span className="text-xs text-amber-700 font-medium shrink-0">{formatDate(fu.followup_at)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Processes table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">{t('clients')}</h2>
          <Link
            href="/dashboard/clients/new"
            className="inline-flex items-center h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + {t('addClient')}
          </Link>
        </div>
        <ClientsTable clients={processesRaw} showBrokerColumn={!showOwnOnly} />
      </div>
    </div>
  );
}
