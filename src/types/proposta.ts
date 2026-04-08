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
  // Insurance — bank
  vida_banco: number | null;
  multiriscos_banco: number | null;
  // Insurance — external
  vida_externa: number | null;
  multiriscos_externa: number | null;
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
  // Spread conditions (array of tags)
  condicoes_spread: string[] | null;
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

export function calcSubtotalBanco(p: BankProposta): number {
  return (p.monthly_payment ?? 0) + (p.vida_banco ?? 0) + (p.multiriscos_banco ?? 0) + (p.manutencao_conta ?? 0) + (p.outras_comissoes_mensais ?? 0);
}

export function calcSubtotalExterno(p: BankProposta): number {
  return (p.monthly_payment ?? 0) + (p.vida_externa ?? 0) + (p.multiriscos_externa ?? 0) + (p.manutencao_conta ?? 0) + (p.outras_comissoes_mensais ?? 0);
}

export function calcPrestacaoTotalBanco(p: BankProposta): number {
  return (p.monthly_payment ?? 0) + (p.vida_banco ?? 0) + (p.multiriscos_banco ?? 0) + (p.manutencao_conta ?? 0) + (p.outras_comissoes_mensais ?? 0);
}

export function calcPrestacaoTotalExterno(p: BankProposta): number {
  return (p.monthly_payment ?? 0) + (p.vida_externa ?? 0) + (p.multiriscos_externa ?? 0) + (p.manutencao_conta ?? 0) + (p.outras_comissoes_mensais ?? 0);
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
