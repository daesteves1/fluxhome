import type { ProcessStep, ProcessTipo } from '@/types/database';

export const STEP_LABELS: Record<ProcessStep, string> = {
  lead: 'Lead',
  docs_pending: 'Docs pendentes',
  docs_complete: 'Docs completos',
  propostas_sent: 'Propostas enviadas',
  approved: 'Aprovado',
  closed: 'Fechado',
};

export const STEP_ORDER: ProcessStep[] = [
  'lead', 'docs_pending', 'docs_complete', 'propostas_sent', 'approved', 'closed',
];

export const ACTIVE_STEPS: ProcessStep[] = [
  'lead', 'docs_pending', 'docs_complete', 'propostas_sent', 'approved',
];

export const STEP_PROBABILITY: Record<ProcessStep, number> = {
  lead: 0.10,
  docs_pending: 0.25,
  docs_complete: 0.45,
  propostas_sent: 0.60,
  approved: 0.85,
  closed: 1.0,
};

export const TIPO_LABELS: Record<ProcessTipo, string> = {
  credito_habitacao: 'Crédito habitação',
  renegociacao: 'Renegociação',
  construcao: 'Construção',
  outro: 'Outro',
};

export const DEFAULT_COMMISSION_RATE = 0.0075;
export const SNAPSHOT_TTL_MINUTES = 30;
export const SPARKLINE_DAYS = 30;
