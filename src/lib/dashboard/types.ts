export type DashboardRange = '7d' | '30d' | '90d' | 'all';
export type DashboardView = 'office' | 'broker';

export type DashboardScope = {
  view: DashboardView;
  officeId: string;
  brokerId: string;
  filterBrokerId: string | null;
  isOfficeAdmin: boolean;
};

export type FunnelStep = {
  step: string;
  label: string;
  count: number;
  avg_days_in_step: number;
};

export type TipoDistribution = {
  tipo: string;
  label: string;
  count: number;
};

export type BankScorecardRow = {
  bank_name: string;
  propostas_count: number;
  approved_count: number;
  taeg_avg: number | null;
  spread_avg: number | null;
  chosen_count: number;
};

export type BrokerLeaderboardRow = {
  broker_id: string;
  broker_name: string;
  active: number;
  closed_month: number;
  closed_trimestre: number;
  closed_year: number;
  conversion_rate: number;
  avg_cycle_days: number;
  commission_est: number;
};

export type SnapshotData = {
  commission_rate: number;
  computed_at: string;

  // Layer 1 — hero
  pipeline_volume: number;
  active_count: number;
  conversion_rate_90d: number;
  avg_close_days_90d: number;
  commission_estimated_30d: number;

  // Prev 30d deltas
  prev_pipeline_volume: number;
  prev_active_count: number;
  prev_conversion_rate: number;
  prev_avg_close_days: number;

  // Sparklines — 30 daily values, oldest first
  sparkline_volume: number[];
  sparkline_active: number[];

  // Layer 3 — pipeline health
  funnel: FunnelStep[];
  forecast_30d: number;
  forecast_60d: number;
  forecast_90d: number;
  pipeline_velocity: number;
  tipo_dist: TipoDistribution[];

  // Layer 4 — performance
  bank_scorecard: BankScorecardRow[];
  broker_leaderboard: BrokerLeaderboardRow[];
  health_score: number;
  health_lead_response: number;
  health_stale: number;
  health_freshness: number;
  avg_ticket: number;
};

// Layer 2 — live action queue items
export type ActionQueueItem = {
  id: string;
  processId: string;
  clientName: string;
  label: string;
  statusLabel: string;
  urgency: 0 | 1 | 2; // 0=overdue, 1=today/due, 2=upcoming
  brokerName?: string;
};

export type ActionQueues = {
  followups: ActionQueueItem[];
  docs_pending: ActionQueueItem[];
  docs_analysis: ActionQueueItem[];
  propostas_expiring: ActionQueueItem[];
  propostas_waiting: ActionQueueItem[];
  processos_parados: ActionQueueItem[];
  leads_nao_contactados: ActionQueueItem[];
};

export type LayerToggles = {
  hero: boolean;
  action_board: boolean;
  pipeline_health: boolean;
  performance: boolean;
};
