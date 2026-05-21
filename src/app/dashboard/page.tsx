import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { resolveDashboardScope, loadLayerToggles, loadBrokersForFilter } from '@/lib/dashboard/scope';
import { getOrRefreshSnapshot } from '@/lib/dashboard/snapshot';
import { loadActionQueues } from '@/lib/dashboard/live-queries';
import { HeroStrip } from '@/components/dashboard/hero-strip';
import { ActionBoard } from '@/components/dashboard/action-board';
import { PipelineFunnel } from '@/components/dashboard/pipeline-funnel';
import { PipelineGauge } from '@/components/dashboard/pipeline-gauge';
import { BankScorecard } from '@/components/dashboard/bank-scorecard';
import { BrokerLeaderboard } from '@/components/dashboard/broker-leaderboard';
import { ComingSoonCard } from '@/components/dashboard/coming-soon-card';
import { ScopeControls } from '@/components/dashboard/scope-controls';

function greeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 19) return 'Boa tarde';
  return 'Boa noite';
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60));
  if (mins < 1) return 'agora mesmo';
  if (mins === 1) return 'há 1 min';
  if (mins < 60) return `há ${mins} min`;
  return `há ${Math.round(mins / 60)}h`;
}

interface PageProps {
  searchParams: Promise<{
    range?: string;
    broker?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value ?? null;
  const activeOfficeCookieId = cookieStore.get('homeflux_active_office')?.value ?? null;
  // Scope (office/broker) is driven solely by the TopBar toggle via the homeflux_view cookie
  const viewCookie = cookieStore.get('homeflux_view')?.value;

  const scope = await resolveDashboardScope(
    { scope: viewCookie, broker: params.broker },
    user.id,
    impersonatingId,
    activeOfficeCookieId
  );
  if (!scope) redirect('/login');

  // Load all data in parallel — including user name for greeting
  const [snapshot, queues, layerToggles, brokerList, userNameResult] = await Promise.all([
    getOrRefreshSnapshot(scope),
    loadActionQueues(scope),
    loadLayerToggles(scope.officeId),
    scope.isOfficeAdmin ? loadBrokersForFilter(scope.officeId) : Promise.resolve([]),
    createAdminClient().from('users').select('name').eq('id', user.id).maybeSingle(),
  ]);

  const currentRange = (['7d', '30d', '90d', 'all'] as const).includes(params.range as 'all')
    ? params.range!
    : '30d';

  const firstName = (userNameResult.data as { name?: string } | null)?.name?.split(' ')[0] ?? '';

  const todayPT = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const showBrokerColumn = scope.view === 'office' && !scope.filterBrokerId;

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-sm text-slate-500 capitalize mt-1">{todayPT}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Atualizado {timeAgo(snapshot.computed_at)}
          </p>
        </div>
        <Suspense>
          <ScopeControls
            isOfficeAdmin={scope.isOfficeAdmin}
            currentView={scope.view}
            currentBroker={scope.filterBrokerId}
            brokers={brokerList}
            currentRange={currentRange}
          />
        </Suspense>
      </div>

      {/* ── Layer 1: Hero strip ─────────────────────────────────────────── */}
      {layerToggles.hero && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Pipeline
          </h2>
          <HeroStrip
            pipeline_volume={snapshot.pipeline_volume}
            active_count={snapshot.active_count}
            conversion_rate_90d={snapshot.conversion_rate_90d}
            avg_close_days_90d={snapshot.avg_close_days_90d}
            commission_estimated_30d={snapshot.commission_estimated_30d}
            prev_pipeline_volume={snapshot.prev_pipeline_volume}
            prev_active_count={snapshot.prev_active_count}
            prev_conversion_rate={snapshot.prev_conversion_rate}
            prev_avg_close_days={snapshot.prev_avg_close_days}
            sparkline_volume={snapshot.sparkline_volume}
            sparkline_active={snapshot.sparkline_active}
          />
        </section>
      )}

      {/* ── Layer 2: Action board ───────────────────────────────────────── */}
      {layerToggles.action_board && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Hoje
          </h2>
          <ActionBoard queues={queues} showBrokerColumn={showBrokerColumn} />
        </section>
      )}

      {/* ── Layer 3: Pipeline health ────────────────────────────────────── */}
      {layerToggles.pipeline_health && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Saúde do pipeline
          </h2>
          <PipelineFunnel
            funnel={snapshot.funnel}
            tipoDist={snapshot.tipo_dist}
            forecast30d={snapshot.forecast_30d}
            forecast60d={snapshot.forecast_60d}
            forecast90d={snapshot.forecast_90d}
            pipelineVelocity={snapshot.pipeline_velocity}
            commissionRate={snapshot.commission_rate}
          />

          {/* Loss reason breakdown — scaffolded */}
          <div className="mt-4">
            <ComingSoonCard
              title="Motivo de perda"
              description="Requer campo 'motivo de perda' nos processos."
            />
          </div>
        </section>
      )}

      {/* ── Layer 4: Performance ────────────────────────────────────────── */}
      {layerToggles.performance && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Desempenho
          </h2>

          <div className="space-y-4">
            {/* Bank scorecard */}
            <BankScorecard rows={snapshot.bank_scorecard} />

            {/* Broker leaderboard — office view only */}
            {scope.view === 'office' && snapshot.broker_leaderboard.length > 0 && (
              <BrokerLeaderboard rows={snapshot.broker_leaderboard} />
            )}

            {/* Pipeline health gauge + client portfolio */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PipelineGauge
                score={snapshot.health_score}
                leadResponse={snapshot.health_lead_response}
                staleScore={snapshot.health_stale}
                freshness={snapshot.health_freshness}
              />

              {/* Client portfolio */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Carteira de clientes</h3>

                {/* Avg ticket — real data */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Ticket médio</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {snapshot.avg_ticket > 0
                      ? `${(snapshot.avg_ticket / 1000).toFixed(0)}k €`
                      : '—'}
                  </span>
                </div>

                {/* Scaffolded items */}
                <div className="space-y-2">
                  {[
                    'Distribuição geográfica',
                    'Origem dos clientes',
                    'Taxa de referência',
                  ].map((label) => (
                    <div key={label} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className="text-[10px] text-slate-300 italic">Em breve</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
