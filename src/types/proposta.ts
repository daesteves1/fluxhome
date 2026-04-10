// ─── Bank Proposta ────────────────────────────────────────────────────────────

export type BankProposta = {
  id: string;
  client_id: string;
  broker_id: string;
  office_id: string;
  bank_name: string;
  rate_type: 'variavel' | 'fixa' | 'mista' | null;
  fixed_period_years: number | null;
  loan_amount: number | null;
  term_months: number | null;
  euribor_index: '3m' | '6m' | '12m' | 'na' | null;
  spread: number | null;   // stored as percentage value e.g. 0.7 = 0.7%
  tan: number | null;
  taeg: number | null;
  monthly_payment: number | null;
  // Insurance — vida per proponent
  vida_p1_banco: number | null;
  vida_p1_externa: number | null;
  vida_p2_banco: number | null;
  vida_p2_externa: number | null;
  // Insurance — multirriscos (one policy)
  multiriscos_banco: number | null;
  multiriscos_externa: number | null;
  // Recommended insurance type per line
  vida_p1_recomendada: 'banco' | 'externa' | null;
  vida_p2_recomendada: 'banco' | 'externa' | null;
  multiriscos_recomendada: 'banco' | 'externa' | null;
  // One-time charges
  comissao_avaliacao: number | null;
  comissao_estudo: number | null;
  abertura_processo: number | null;
  comissao_formalizacao: number | null;
  comissao_solicitadoria: number | null;
  doc_particular_autenticado: number | null;
  copia_certificada: number | null;
  imposto_selo_mutuo: number | null;
  imposto_selo_aquisicao: number | null;
  imt: number | null;
  deposito_dpa: number | null;
  comissao_tramitacao: number | null;
  cheque_bancario: number | null;
  registo: number | null;
  escritura: number | null;
  // Monthly charges
  manutencao_conta: number | null;
  manutencao_anual: boolean;
  outras_comissoes_mensais: number | null;
  // Validity & residual
  validade_ate: string | null;  // ISO date string
  valor_residual: number | null;
  valor_avaliacao: number | null;
  // Spread conditions (array of tags)
  condicoes_spread: string[] | null;
  condicoes_pos_fixo: string | null;
  // MTIC
  mtic: number | null;
  // Other
  bank_pdf_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Mapa Comparativo ─────────────────────────────────────────────────────────

export type MapaComparativo = {
  id: string;
  client_id: string;
  broker_id: string;
  office_id: string;
  title: string;
  proposta_ids: string[];
  recommended_proposta_id: string | null;
  highlighted_cells: Record<string, unknown>;
  is_visible_to_client: boolean;
  broker_notes: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const RATE_TYPE_LABELS: Record<string, string> = {
  variavel: 'Variável',
  fixa: 'Fixa',
  mista: 'Mista',
};

export const EURIBOR_LABELS: Record<string, string> = {
  '3m': '3 meses',
  '6m': '6 meses',
  '12m': '12 meses',
  na: 'N/A',
};

export const ONE_TIME_CHARGE_FIELDS: { key: keyof BankProposta; label: string }[] = [
  { key: 'comissao_avaliacao',        label: 'Comissão de avaliação' },
  { key: 'comissao_estudo',           label: 'Comissão de estudo' },
  { key: 'abertura_processo',         label: 'Abertura do processo' },
  { key: 'comissao_formalizacao',     label: 'Comissão de formalização' },
  { key: 'comissao_solicitadoria',    label: 'Comissão de solicitadoria' },
  { key: 'doc_particular_autenticado',label: 'Documento particular autenticado' },
  { key: 'copia_certificada',         label: 'Cópia certificada de contrato' },
  { key: 'imposto_selo_mutuo',        label: 'Imposto de selo sobre o mútuo' },
  { key: 'imposto_selo_aquisicao',    label: 'Imposto de selo sobre aquisição' },
  { key: 'imt',                       label: 'IMT' },
  { key: 'deposito_dpa',              label: 'Depósito online DPA' },
  { key: 'comissao_tramitacao',       label: 'Comissão de tramitação' },
  { key: 'cheque_bancario',           label: 'Cheque bancário' },
  { key: 'registo',                   label: 'Registo' },
  { key: 'escritura',                 label: 'Escritura' },
];

export const BANK_SUGGESTIONS = [
  'CGD', 'BPI', 'Santander', 'Novo Banco', 'Bankinter',
  'Banco CTT', 'ActivoBank', 'UCI', 'ABANCA',
];

export function calcPrestacaoTotalBanco(p: BankProposta): number {
  return (p.monthly_payment ?? 0) + (p.vida_p1_banco ?? 0) + (p.vida_p2_banco ?? 0) + (p.multiriscos_banco ?? 0);
}

export function calcPrestacaoTotalExterno(p: BankProposta): number {
  return (p.monthly_payment ?? 0) + (p.vida_p1_externa ?? 0) + (p.vida_p2_externa ?? 0) + (p.multiriscos_externa ?? 0);
}

// Aliases used by excel/pdf routes
export function calcSubtotalBanco(p: BankProposta): number {
  return calcPrestacaoTotalBanco(p);
}
export function calcSubtotalExterno(p: BankProposta): number {
  return calcPrestacaoTotalExterno(p);
}

export function calcTotalRecomendado(p: BankProposta, hasP2 = false): number {
  const vidaP1 = p.vida_p1_recomendada === 'banco' ? (p.vida_p1_banco ?? 0) : (p.vida_p1_externa ?? 0);
  const vidaP2 = hasP2
    ? (p.vida_p2_recomendada === 'banco' ? (p.vida_p2_banco ?? 0) : (p.vida_p2_externa ?? 0))
    : 0;
  const multi = p.multiriscos_recomendada === 'banco' ? (p.multiriscos_banco ?? 0) : (p.multiriscos_externa ?? 0);
  return (p.monthly_payment ?? 0) + vidaP1 + vidaP2 + multi;
}

export function getRecomendadaLabel(p: BankProposta, hasP2: boolean): string {
  const hasVida1 = (p.vida_p1_banco ?? 0) > 0 || (p.vida_p1_externa ?? 0) > 0;
  const hasVida2 = hasP2 && ((p.vida_p2_banco ?? 0) > 0 || (p.vida_p2_externa ?? 0) > 0);
  const hasMulti = (p.multiriscos_banco ?? 0) > 0 || (p.multiriscos_externa ?? 0) > 0;

  if (!hasVida1 && !hasMulti) return '';

  const vida1Label = p.vida_p1_recomendada === 'banco' ? 'banco' : 'ext.';
  const vida2Label = p.vida_p2_recomendada === 'banco' ? 'banco' : 'ext.';
  const multiLabel = p.multiriscos_recomendada === 'banco' ? 'banco' : 'ext.';

  if (hasP2) {
    const parts: string[] = [];
    if (hasVida1) parts.push(`Vida P1: ${vida1Label}`);
    if (hasVida2) parts.push(`Vida P2: ${vida2Label}`);
    if (hasMulti) parts.push(`Multirriscos: ${multiLabel}`);
    return parts.join(' · ');
  } else {
    const parts: string[] = [];
    if (hasVida1) parts.push(`Vida: ${vida1Label}`);
    if (hasMulti) parts.push(`Multirriscos: ${multiLabel}`);
    return parts.join(' · ');
  }
}

export function calcTotalEncargosUnicos(p: BankProposta): number {
  return ONE_TIME_CHARGE_FIELDS.reduce((sum, { key }) => sum + (p[key] as number | null ?? 0), 0);
}

export function fmtEur(v: number | null | undefined): string {
  if (v == null || v === 0) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(2)}%`;
}
