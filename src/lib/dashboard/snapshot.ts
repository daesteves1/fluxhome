import { createAdminClient } from '@/lib/supabase/server';
import type { DashboardScope, SnapshotData, FunnelStep, TipoDistribution, BankScorecardRow, BrokerLeaderboardRow } from './types';
import { ACTIVE_STEPS, STEP_ORDER, STEP_LABELS, TIPO_LABELS, DEFAULT_COMMISSION_RATE, SNAPSHOT_TTL_MINUTES, SPARKLINE_DAYS, STEP_PROBABILITY } from './constants';
import type { ProcessStep, ProcessTipo } from '@/types/database';

// ── Helpers ────────────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function isoDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

function scopeFilter(scope: DashboardScope) {
  if (scope.filterBrokerId) return { field: 'broker_id' as const, value: scope.filterBrokerId };
  if (scope.view === 'broker') return { field: 'broker_id' as const, value: scope.brokerId };
  return { field: 'office_id' as const, value: scope.officeId };
}

// ── Main compute ───────────────────────────────────────────────────────────

type RawProcess = {
  id: string;
  process_step: string;
  tipo: string;
  montante_solicitado: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  broker_id: string;
  followup_at: string | null;
  client_id: string;
};

type RawBankProposta = {
  id: string;
  process_id: string | null;
  bank_name: string;
  taeg: number | null;
  spread: number | null;
  validade_ate: string | null;
};

type RawBroker = {
  id: string;
  users: { name: string } | null;
};

type RawClient = {
  id: string;
  broker_id: string;
  proposta_choice: { bank_name?: string } | null;
};

type RawNote = {
  process_id: string | null;
};

async function computeSnapshot(scope: DashboardScope): Promise<SnapshotData> {
  const admin = createAdminClient();
  const { field, value } = scopeFilter(scope);

  // ── Phase 1: fetch processes + office settings in parallel ─────────────
  const [{ data: procsRaw }, { data: officeRaw }] = await Promise.all([
    admin
      .from('processes')
      .select('id, process_step, tipo, montante_solicitado, created_at, updated_at, closed_at, broker_id, followup_at, client_id')
      .eq(field, value),
    admin.from('offices').select('settings').eq('id', scope.officeId).single(),
  ]);

  const procs = (procsRaw ?? []) as unknown as RawProcess[];
  const officeSettings = (officeRaw as { settings: Record<string, unknown> } | null)?.settings ?? {};
  const commissionRate = typeof officeSettings.commission_rate === 'number'
    ? officeSettings.commission_rate
    : DEFAULT_COMMISSION_RATE;

  // Derive IDs from the processes we already have
  const processIds = procs.map((p) => p.id);
  const clientIds = Array.from(new Set(procs.map((p) => p.client_id).filter(Boolean)));
  const recentLeadIds = procs
    .filter((p) => p.process_step === 'lead' && p.created_at >= isoDateStr(7))
    .map((p) => p.id);

  const freshCutoff = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // ── Phase 2: fetch all dependent data in parallel ─────────────────────
  const [bankPropostasResult, clientsResult, brokerNotesResult, brokersResult] = await Promise.all([
    // bank_propostas fetched once — used for both scorecard and freshness
    processIds.length > 0
      ? admin
          .from('bank_propostas')
          .select('id, process_id, bank_name, taeg, spread, validade_ate')
          .in('process_id', processIds)
      : Promise.resolve({ data: [] as RawBankProposta[] }),

    // clients — for proposta_choice / bank scorecard
    clientIds.length > 0
      ? admin
          .from('clients')
          .select('id, broker_id, proposta_choice')
          .in('id', clientIds)
      : Promise.resolve({ data: [] }),

    // broker_notes — for lead response health metric
    recentLeadIds.length > 0
      ? admin
          .from('broker_notes')
          .select('process_id')
          .in('process_id', recentLeadIds)
      : Promise.resolve({ data: [] }),

    // brokers — only needed for office leaderboard
    scope.view === 'office'
      ? admin
          .from('brokers')
          .select('id, users(name)')
          .eq('office_id', scope.officeId)
          .eq('is_active', true)
      : Promise.resolve({ data: [] }),
  ]);

  const bankPropostas = (bankPropostasResult.data ?? []) as unknown as RawBankProposta[];
  const clients = (clientsResult.data ?? []) as unknown as RawClient[];
  const brokerNotesRaw = (brokerNotesResult.data ?? []) as RawNote[];
  const brokers = (brokersResult.data ?? []) as unknown as RawBroker[];

  // ── Time windows ───────────────────────────────────────────────────────
  const now = new Date();
  const d90 = isoDateStr(90);
  const d30 = isoDateStr(30);
  const d30Prev = isoDateStr(60);

  // ── Layer 1: Hero ──────────────────────────────────────────────────────

  const activeProcs = procs.filter((p) => ACTIVE_STEPS.includes(p.process_step as ProcessStep));
  const closedProcs90d = procs.filter(
    (p) => p.process_step === 'closed' && p.closed_at && p.closed_at >= d90
  );

  const pipelineVolume = activeProcs.reduce((s, p) => s + (p.montante_solicitado ?? 0), 0);
  const activeCount = activeProcs.length;

  const leadsIn90d = procs.filter((p) => p.created_at >= d90).length;
  const conversionRate90d = leadsIn90d > 0
    ? Math.round((closedProcs90d.length / leadsIn90d) * 100)
    : 0;

  const closeDays = closedProcs90d
    .filter((p) => p.closed_at)
    .map((p) => daysBetween(p.created_at, p.closed_at!));
  const avgCloseDays90d = Math.round(median(closeDays));

  const commEstimated30d = activeProcs
    .filter((p) => ['approved', 'propostas_sent'].includes(p.process_step))
    .reduce((s, p) => {
      const prob = STEP_PROBABILITY[p.process_step as ProcessStep] ?? 0;
      return s + (p.montante_solicitado ?? 0) * prob * commissionRate;
    }, 0);

  const prevActiveProcs = procs.filter(
    (p) => ACTIVE_STEPS.includes(p.process_step as ProcessStep) && p.updated_at >= d30Prev && p.updated_at < d30
  );
  const prevPipelineVolume = prevActiveProcs.reduce((s, p) => s + (p.montante_solicitado ?? 0), 0);
  const prevActiveCount = prevActiveProcs.length;

  const closedPrev30d = procs.filter(
    (p) => p.process_step === 'closed' && p.closed_at && p.closed_at >= d30Prev && p.closed_at < d30
  );
  const leadsPrev30d = procs.filter((p) => p.created_at >= d30Prev && p.created_at < d30).length;
  const prevConversionRate = leadsPrev30d > 0
    ? Math.round((closedPrev30d.length / leadsPrev30d) * 100)
    : 0;

  const prevCloseDays = closedPrev30d
    .filter((p) => p.closed_at)
    .map((p) => daysBetween(p.created_at, p.closed_at!));
  const prevAvgCloseDays = Math.round(median(prevCloseDays));

  // ── Sparklines ─────────────────────────────────────────────────────────
  const last30Map = new Map<string, { volume: number; count: number }>();
  for (let i = SPARKLINE_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last30Map.set(d.toISOString().split('T')[0], { volume: 0, count: 0 });
  }

  for (const p of procs) {
    const key = p.updated_at.split('T')[0];
    if (last30Map.has(key)) {
      const e = last30Map.get(key)!;
      e.volume += p.montante_solicitado ?? 0;
      e.count += 1;
    }
  }

  const sparklineValues = Array.from(last30Map.values());
  const sparklineVolume = sparklineValues.map((v) => v.volume);
  const sparklineActive = sparklineValues.map((v) => v.count);

  // ── Layer 3: Funnel ────────────────────────────────────────────────────
  const funnel: FunnelStep[] = STEP_ORDER.map((step) => {
    const stepProcs = procs.filter((p) => p.process_step === step);
    const daysInStep = stepProcs.map((p) => {
      const ref = p.closed_at ?? now.toISOString();
      return daysBetween(p.updated_at, ref);
    });
    return {
      step,
      label: STEP_LABELS[step],
      count: stepProcs.length,
      avg_days_in_step: Math.round(median(daysInStep)),
    };
  });

  // ── Layer 3: Forecast ──────────────────────────────────────────────────
  function forecastForHorizon(days: number): number {
    return activeProcs
      .filter((p) => {
        const daysInActive = daysBetween(p.created_at, now.toISOString());
        return daysInActive <= days;
      })
      .reduce((s, p) => {
        const prob = STEP_PROBABILITY[p.process_step as ProcessStep] ?? 0;
        return s + (p.montante_solicitado ?? 0) * prob * commissionRate;
      }, 0);
  }

  const forecast30d = forecastForHorizon(30);
  const forecast60d = forecastForHorizon(60);
  const forecast90d = forecastForHorizon(90);

  // ── Layer 3: Pipeline velocity ─────────────────────────────────────────
  const wonCount90d = closedProcs90d.length;
  const avgDealSize = wonCount90d > 0
    ? closedProcs90d.reduce((s, p) => s + (p.montante_solicitado ?? 0), 0) / wonCount90d
    : 0;
  const winRate = leadsIn90d > 0 ? wonCount90d / leadsIn90d : 0;
  const avgCycleDays = avgCloseDays90d || 1;
  const pipelineVelocity = avgCycleDays > 0
    ? Math.round((wonCount90d * avgDealSize * commissionRate * winRate) / avgCycleDays)
    : 0;

  // ── Layer 3: Tipo distribution ─────────────────────────────────────────
  const tipoMap = new Map<string, number>();
  for (const p of procs) {
    tipoMap.set(p.tipo, (tipoMap.get(p.tipo) ?? 0) + 1);
  }
  const tipoDist: TipoDistribution[] = Array.from(tipoMap.entries()).map(([tipo, count]) => ({
    tipo,
    label: TIPO_LABELS[tipo as ProcessTipo] ?? tipo,
    count,
  }));

  // ── Layer 4: Bank scorecard ────────────────────────────────────────────
  let bankScorecard: BankScorecardRow[] = [];
  if (processIds.length > 0) {
    const chosenByBank = new Map<string, number>();
    for (const c of clients) {
      const bankName = (c.proposta_choice as { bank_name?: string } | null)?.bank_name;
      if (bankName) chosenByBank.set(bankName, (chosenByBank.get(bankName) ?? 0) + 1);
    }

    const bankMap = new Map<string, { count: number; taeg: number[]; spread: number[]; approved: number }>();
    const approvedProcessIds = new Set(
      procs.filter((p) => ['approved', 'closed'].includes(p.process_step)).map((p) => p.id)
    );

    for (const bp of bankPropostas) {
      if (!bankMap.has(bp.bank_name)) bankMap.set(bp.bank_name, { count: 0, taeg: [], spread: [], approved: 0 });
      const entry = bankMap.get(bp.bank_name)!;
      entry.count += 1;
      if (bp.taeg != null) entry.taeg.push(bp.taeg);
      if (bp.spread != null) entry.spread.push(bp.spread);
      if (bp.process_id && approvedProcessIds.has(bp.process_id)) entry.approved += 1;
    }

    bankScorecard = Array.from(bankMap.entries())
      .map(([bank_name, d]) => ({
        bank_name,
        propostas_count: d.count,
        approved_count: d.approved,
        taeg_avg: d.taeg.length ? Math.round((d.taeg.reduce((a, b) => a + b) / d.taeg.length) * 100) / 100 : null,
        spread_avg: d.spread.length ? Math.round((d.spread.reduce((a, b) => a + b) / d.spread.length) * 100) / 100 : null,
        chosen_count: chosenByBank.get(bank_name) ?? 0,
      }))
      .sort((a, b) => b.propostas_count - a.propostas_count);
  }

  // ── Layer 4: Broker leaderboard ────────────────────────────────────────
  let brokerLeaderboard: BrokerLeaderboardRow[] = [];
  if (scope.view === 'office') {
    const now2 = new Date();
    const startOfMonth = new Date(now2.getFullYear(), now2.getMonth(), 1).toISOString();
    const startOfTrim = new Date(now2.getFullYear(), Math.floor(now2.getMonth() / 3) * 3, 1).toISOString();
    const startOfYear = new Date(now2.getFullYear(), 0, 1).toISOString();

    brokerLeaderboard = brokers.map((b) => {
      const bp = procs.filter((p) => p.broker_id === b.id);
      const activeBp = bp.filter((p) => ACTIVE_STEPS.includes(p.process_step as ProcessStep));
      const closedBp = bp.filter((p) => p.process_step === 'closed');
      const closedMonth = closedBp.filter((p) => (p.closed_at ?? '') >= startOfMonth).length;
      const closedTrim = closedBp.filter((p) => (p.closed_at ?? '') >= startOfTrim).length;
      const closedYear = closedBp.filter((p) => (p.closed_at ?? '') >= startOfYear).length;
      const leads90d = bp.filter((p) => p.created_at >= d90).length;
      const closed90d = closedBp.filter((p) => (p.closed_at ?? '') >= d90).length;
      const bConvRate = leads90d > 0 ? Math.round((closed90d / leads90d) * 100) : 0;
      const bCloseDays = closedBp.filter((p) => p.closed_at)
        .map((p) => daysBetween(p.created_at, p.closed_at!));
      const bAvgCycle = Math.round(median(bCloseDays));
      const bCommEst = activeBp.reduce((s, p) => {
        const prob = STEP_PROBABILITY[p.process_step as ProcessStep] ?? 0;
        return s + (p.montante_solicitado ?? 0) * prob * commissionRate;
      }, 0);

      return {
        broker_id: b.id,
        broker_name: b.users?.name ?? '—',
        active: activeBp.length,
        closed_month: closedMonth,
        closed_trimestre: closedTrim,
        closed_year: closedYear,
        conversion_rate: bConvRate,
        avg_cycle_days: bAvgCycle,
        commission_est: Math.round(bCommEst),
      };
    });
  }

  // ── Layer 4: Pipeline health gauge ─────────────────────────────────────

  // Component 1: Lead response ≤24h
  const recentLeads = procs.filter(
    (p) => p.process_step === 'lead' && p.created_at >= isoDateStr(7)
  );
  const respondedIds = new Set(brokerNotesRaw.map((n) => n.process_id));
  const respondedCount = recentLeads.filter((p) => respondedIds.has(p.id)).length;
  const healthLeadResponse = recentLeads.length > 0
    ? Math.round((respondedCount / recentLeads.length) * 100)
    : 100;

  // Component 2: Stale score
  const activeForStale = procs.filter((p) => ACTIVE_STEPS.includes(p.process_step as ProcessStep));
  const notStale = activeForStale.filter((p) => p.updated_at >= isoDateStr(14)).length;
  const healthStale = activeForStale.length > 0
    ? Math.round((notStale / activeForStale.length) * 100)
    : 100;

  // Component 3: Proposta freshness — reuse bankPropostas fetched in phase 2
  let healthFreshness = 100;
  if (bankPropostas.length > 0) {
    const bpWithDate = bankPropostas.filter((bp) => bp.validade_ate != null);
    const fresh = bpWithDate.filter((bp) => bp.validade_ate && bp.validade_ate >= freshCutoff).length;
    healthFreshness = bpWithDate.length > 0 ? Math.round((fresh / bpWithDate.length) * 100) : 100;
  }

  const healthScore = Math.round((healthLeadResponse + healthStale + healthFreshness) / 3);

  // ── Layer 4: Avg ticket ────────────────────────────────────────────────
  const procsWithAmount = procs.filter((p) => (p.montante_solicitado ?? 0) > 0);
  const avgTicket = procsWithAmount.length > 0
    ? Math.round(procsWithAmount.reduce((s, p) => s + (p.montante_solicitado ?? 0), 0) / procsWithAmount.length)
    : 0;

  return {
    commission_rate: commissionRate,
    computed_at: new Date().toISOString(),
    pipeline_volume: Math.round(pipelineVolume),
    active_count: activeCount,
    conversion_rate_90d: conversionRate90d,
    avg_close_days_90d: avgCloseDays90d,
    commission_estimated_30d: Math.round(commEstimated30d),
    prev_pipeline_volume: Math.round(prevPipelineVolume),
    prev_active_count: prevActiveCount,
    prev_conversion_rate: prevConversionRate,
    prev_avg_close_days: prevAvgCloseDays,
    sparkline_volume: sparklineVolume,
    sparkline_active: sparklineActive,
    funnel,
    forecast_30d: Math.round(forecast30d),
    forecast_60d: Math.round(forecast60d),
    forecast_90d: Math.round(forecast90d),
    pipeline_velocity: pipelineVelocity,
    tipo_dist: tipoDist,
    bank_scorecard: bankScorecard,
    broker_leaderboard: brokerLeaderboard,
    health_score: healthScore,
    health_lead_response: healthLeadResponse,
    health_stale: healthStale,
    health_freshness: healthFreshness,
    avg_ticket: avgTicket,
  };
}

// ── Public: get or refresh ────────────────────────────────────────────────

export async function getOrRefreshSnapshot(scope: DashboardScope): Promise<SnapshotData> {
  const admin = createAdminClient();
  const scopeKey = scope.view === 'office' && !scope.filterBrokerId
    ? 'office'
    : (scope.filterBrokerId ?? scope.brokerId);
  const today = new Date().toISOString().split('T')[0];
  const freshFrom = new Date(Date.now() - SNAPSHOT_TTL_MINUTES * 60 * 1000).toISOString();

  const { data: existing } = await admin
    .from('dashboard_snapshots')
    .select('data, computed_at')
    .eq('office_id', scope.officeId)
    .eq('scope_key', scopeKey)
    .eq('snapshot_date', today)
    .gte('computed_at', freshFrom)
    .maybeSingle();

  if (existing?.data) return existing.data as SnapshotData;

  const data = await computeSnapshot(scope);

  await admin.from('dashboard_snapshots').upsert(
    {
      office_id: scope.officeId,
      scope_key: scopeKey,
      snapshot_date: today,
      data: data as unknown as import('@/types/database').Json,
      computed_at: data.computed_at,
    },
    { onConflict: 'office_id,scope_key,snapshot_date' }
  );

  return data;
}

export async function forceRefreshSnapshot(scope: DashboardScope): Promise<SnapshotData> {
  const admin = createAdminClient();
  const scopeKey = scope.view === 'office' && !scope.filterBrokerId
    ? 'office'
    : (scope.filterBrokerId ?? scope.brokerId);
  const today = new Date().toISOString().split('T')[0];

  const data = await computeSnapshot(scope);

  await admin.from('dashboard_snapshots').upsert(
    {
      office_id: scope.officeId,
      scope_key: scopeKey,
      snapshot_date: today,
      data: data as unknown as import('@/types/database').Json,
      computed_at: data.computed_at,
    },
    { onConflict: 'office_id,scope_key,snapshot_date' }
  );

  return data;
}
