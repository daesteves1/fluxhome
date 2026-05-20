import { createClient, createServiceClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ClientsTable } from '@/components/dashboard/clients-table';
import { PeriodFilter, type Period } from '@/components/dashboard/period-filter';
import {
  Users, FileText, Send, CheckCircle, Calendar, Inbox,
  AlertTriangle, Clock, TrendingUp,
} from 'lucide-react';
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

function greeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 19) return 'Boa tarde';
  return 'Boa noite';
}

function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return null;
}

function prevPeriodStart(period: Period): Date | null {
  const start = periodStart(period);
  if (!start) return null;
  const durationMs = new Date().getTime() - start.getTime();
  return new Date(start.getTime() - durationMs);
}

const STEP_LABELS: Record<string, string> = {
  docs_pending: 'Docs pendentes',
  docs_submitted: 'Docs submetidos',
  in_analysis: 'Em análise',
  propostas_sent: 'Propostas enviadas',
  approved: 'Aprovado',
  closed: 'Fechado',
};

const STEP_ORDER = ['docs_pending', 'docs_submitted', 'in_analysis', 'propostas_sent', 'approved', 'closed'];

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period: Period = (['7d', '30d', '90d', 'all'] as Period[]).includes(params.period as Period)
    ? (params.period as Period)
    : '30d';

  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const t = await getTranslations('dashboard');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userProfileRaw } = await serviceClient
    .from('users').select('id, role, name').eq('id', user.id).single();
  const userProfile = userProfileRaw as { id: string; role: string; name: string } | null;

  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value;

  if (userProfile?.role === 'super_admin' && !impersonatingId) redirect('/admin');

  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;

  type BrokerData = { id: string; office_id: string; is_office_admin: boolean };
  let broker: BrokerData | null = null;

  if (impersonatingId) {
    const { data } = await serviceClient
      .from('brokers').select('id, office_id, is_office_admin').eq('id', impersonatingId).eq('is_active', true).single();
    broker = data as BrokerData | null;
  } else {
    const activeOfficeCookie = cookieStore.get('homeflux_active_office')?.value;
    const { data } = await serviceClient.from('brokers').select('id, office_id, is_office_admin').eq('user_id', user.id).eq('is_active', true);
    const all = (data ?? []) as BrokerData[];
    broker = all.find((b) => b.office_id === activeOfficeCookie) ?? all[0] ?? null;
  }

  if (!broker && userProfile?.role !== 'super_admin') redirect('/login');

  const showOwnOnly =
    Boolean(impersonatingId) ||
    userProfile?.role === 'broker' ||
    (broker?.is_office_admin && viewCookie === 'broker');

  const scopeField = showOwnOnly ? 'broker_id' : 'office_id';
  const scopeValue = showOwnOnly ? broker!.id : broker!.office_id;

  // ── Fetch all processes for this scope ──────────────────────────────────────
  type RawProc = {
    id: string; process_step: string; updated_at: string; created_at: string;
    broker_id: string; followup_at: string | null; followup_note: string | null;
    clients: { p1_name: string; p2_name: string | null; p1_email: string | null } | null;
  };

  const { data: allProcsRaw } = await serviceClient
    .from('processes')
    .select('id, process_step, updated_at, created_at, broker_id, followup_at, followup_note, clients(p1_name, p2_name, p1_email)')
    .eq(scopeField, scopeValue)
    .order('updated_at', { ascending: false });

  const allProcs = (allProcsRaw ?? []) as unknown as RawProc[];

  const pStart = periodStart(period);
  const pPrevStart = prevPeriodStart(period);

  // Filter to period
  const periodProcs = pStart
    ? allProcs.filter((p) => new Date(p.updated_at) >= pStart)
    : allProcs;

  const prevPeriodProcs = pStart && pPrevStart
    ? allProcs.filter((p) => {
        const d = new Date(p.updated_at);
        return d >= pPrevStart && d < pStart;
      })
    : [];

  const processesRaw: ProcessRow[] = allProcs.map((p) => ({
    id: p.id,
    p1_name: p.clients?.p1_name ?? '',
    p2_name: p.clients?.p2_name ?? null,
    process_step: p.process_step,
    updated_at: p.updated_at,
    broker_id: p.broker_id,
    brokers: null,
  }));

  // ── KPI calculations ────────────────────────────────────────────────────────
  const activeAll = allProcs.filter((p) => !['closed', 'approved'].includes(p.process_step)).length;
  const activePeriod = periodProcs.filter((p) => !['closed', 'approved'].includes(p.process_step)).length;
  const activePrev = prevPeriodProcs.filter((p) => !['closed', 'approved'].includes(p.process_step)).length;

  const docsPending = allProcs.filter((p) => p.process_step === 'docs_pending').length;

  const propostasSent = periodProcs.filter((p) => p.process_step === 'propostas_sent').length;
  const propostasSentPrev = prevPeriodProcs.filter((p) => p.process_step === 'propostas_sent').length;

  const closedPeriod = periodProcs.filter((p) => ['closed', 'approved'].includes(p.process_step)).length;
  const closedPrev = prevPeriodProcs.filter((p) => ['closed', 'approved'].includes(p.process_step)).length;

  // ── Pipeline snapshot ───────────────────────────────────────────────────────
  const pipelineSteps = STEP_ORDER.filter((s) => !['closed', 'approved'].includes(s));
  const pipelineCounts = pipelineSteps.map((step) => ({
    step,
    label: STEP_LABELS[step] ?? step,
    count: allProcs.filter((p) => p.process_step === step).length,
  }));
  const pipelineMax = Math.max(...pipelineCounts.map((s) => s.count), 1);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const overdueFollowups = allProcs.filter(
    (p) => p.followup_at && new Date(p.followup_at) < new Date() && !['closed', 'approved'].includes(p.process_step)
  );

  const staleProcs = allProcs.filter((p) => {
    if (['closed', 'approved'].includes(p.process_step)) return false;
    const daysSinceUpdate = (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 14;
  });

  // ── Recontacts (followup_at in next 14 days) ────────────────────────────────
  const in14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const recontacts = allProcs
    .filter((p) => p.followup_at && new Date(p.followup_at) >= new Date() && new Date(p.followup_at) <= in14days)
    .sort((a, b) => new Date(a.followup_at!).getTime() - new Date(b.followup_at!).getTime())
    .slice(0, 8);

  // ── Recent activity ─────────────────────────────────────────────────────────
  const recentActivity = allProcs.slice(0, 6);

  // ── Leads ───────────────────────────────────────────────────────────────────
  let newLeadsCount = 0;
  let leadCaptureEnabled = false;
  if (broker?.office_id) {
    const { data: officeRaw } = await createAdminClient()
      .from('offices').select('lead_capture_enabled').eq('id', broker.office_id).single();
    leadCaptureEnabled = (officeRaw as { lead_capture_enabled: boolean } | null)?.lead_capture_enabled ?? false;
    if (leadCaptureEnabled) {
      const { count } = await serviceClient
        .from('leads').select('*', { count: 'exact', head: true })
        .eq('office_id', broker.office_id).eq('status', 'novo');
      newLeadsCount = count ?? 0;
    }
  }

  const firstName = userProfile?.name?.split(' ')[0] ?? '';
  const todayPT = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  const activeDelta = period !== 'all' ? activePeriod - activePrev : null;
  const closedDelta = period !== 'all' ? closedPeriod - closedPrev : null;
  const propostasDelta = period !== 'all' ? propostasSent - propostasSentPrev : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-sm text-slate-500 capitalize mt-0.5">{todayPT}</p>
        </div>
        <Suspense>
          <PeriodFilter current={period} />
        </Suspense>
      </div>

      {/* Alerts */}
      {(overdueFollowups.length > 0 || staleProcs.length > 0) && (
        <div className="space-y-2">
          {overdueFollowups.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-800">
                <strong>{overdueFollowups.length}</strong> {overdueFollowups.length === 1 ? 'seguimento em atraso' : 'seguimentos em atraso'}
              </p>
              <Link href="/dashboard/processes" className="ml-auto text-xs text-red-600 font-medium hover:underline shrink-0">
                Ver →
              </Link>
            </div>
          )}
          {staleProcs.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>{staleProcs.length}</strong> {staleProcs.length === 1 ? 'processo sem atividade há mais de 14 dias' : 'processos sem atividade há mais de 14 dias'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('pipeline')}</h2>
        <div className={`grid gap-3 ${leadCaptureEnabled ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
          <KpiCard
            title={t('activeProcesses')}
            value={activeAll}
            icon={Users}
            trend="neutral"
            delta={activeDelta}
          />
          <KpiCard
            title={t('docsPendingReview')}
            value={docsPending}
            icon={FileText}
            trend={docsPending > 0 ? 'warning' : 'neutral'}
          />
          <KpiCard
            title={t('propostasSent')}
            value={propostasSent}
            icon={Send}
            trend="neutral"
            delta={propostasDelta}
          />
          <KpiCard
            title={t('closedThisMonth')}
            value={closedPeriod}
            icon={CheckCircle}
            trend={closedPeriod > 0 ? 'positive' : 'neutral'}
            delta={closedDelta}
          />
          {leadCaptureEnabled && (
            <KpiCard
              title="Leads Novos"
              value={newLeadsCount}
              icon={Inbox}
              trend={newLeadsCount > 0 ? 'warning' : 'neutral'}
              href="/dashboard/leads"
            />
          )}
        </div>
      </div>

      {/* Pipeline snapshot */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          <TrendingUp className="inline h-3.5 w-3.5 mr-1" />
          Pipeline por etapa
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="space-y-2.5">
            {pipelineCounts.map(({ step, label, count }) => (
              <div key={step} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(count / pipelineMax) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-6 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column: recontacts + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recontacts */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            <Calendar className="inline h-3.5 w-3.5 mr-1" />
            Seguimentos próximos
          </h2>
          {recontacts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-8 text-center text-sm text-slate-400">
              Sem seguimentos agendados
            </div>
          ) : (
            <div className="space-y-2">
              {recontacts.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/processes/${p.id}`}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.clients?.p1_name ?? ''}</p>
                    {p.followup_note && <p className="text-xs text-slate-500 truncate">{p.followup_note}</p>}
                  </div>
                  <span className="text-xs text-slate-500 font-medium shrink-0">{formatDate(p.followup_at!)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Atividade recente
            </h2>
            <Link href="/dashboard/clients/new" className="inline-flex items-center h-8 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              + {t('addClient')}
            </Link>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Sem atividade recente</div>
            ) : (
              recentActivity.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/processes/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.clients?.p1_name ?? ''}</p>
                    <p className="text-xs text-slate-400">{STEP_LABELS[p.process_step] ?? p.process_step}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(p.updated_at)}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full process table */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('clients')}</h2>
        <ClientsTable clients={processesRaw} showBrokerColumn={!showOwnOnly} />
      </div>
    </div>
  );
}
