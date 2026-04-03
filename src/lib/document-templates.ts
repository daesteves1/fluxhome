export type DocCategory = 'per_proponente' | 'shared' | 'specific';

export interface DocTemplate {
  key: string;
  label: string;
  is_mandatory: boolean;
  max_files: number;
  category: DocCategory;
  sort_order: number;
  /** For 'specific' docs — which mortgage_type values trigger them */
  mortgage_types?: string[];
}

/** Per-proponente docs — always created for p1, and for p2 if client has p2 */
export const PER_PROPONENTE_TEMPLATES: DocTemplate[] = [
  { key: 'bi_cc',          label: 'BI / Cartão de Cidadão',              is_mandatory: true,  max_files: 1, category: 'per_proponente', sort_order: 1 },
  { key: 'comp_morada',    label: 'Comprovativo de Morada',              is_mandatory: true,  max_files: 1, category: 'per_proponente', sort_order: 2 },
  { key: 'recibos',        label: 'Últimos 3 Recibos de Vencimento',     is_mandatory: true,  max_files: 3, category: 'per_proponente', sort_order: 3 },
  { key: 'decl_irs',       label: 'Declaração de IRS',                   is_mandatory: true,  max_files: 1, category: 'per_proponente', sort_order: 4 },
  { key: 'nota_liq_irs',   label: 'Nota de Liquidação do IRS',           is_mandatory: true,  max_files: 1, category: 'per_proponente', sort_order: 5 },
  { key: 'extratos_banco', label: 'Extratos Bancários 3 Meses',          is_mandatory: true,  max_files: 3, category: 'per_proponente', sort_order: 6 },
  { key: 'mapa_resp',      label: 'Mapa de Responsabilidades',           is_mandatory: true,  max_files: 1, category: 'per_proponente', sort_order: 7 },
  { key: 'contrato_trab',  label: 'Contrato de Trabalho',               is_mandatory: false, max_files: 1, category: 'per_proponente', sort_order: 8 },
  { key: 'decl_inicio_at', label: 'Declaração de Início de Atividade',  is_mandatory: false, max_files: 1, category: 'per_proponente', sort_order: 9 },
];

/** Shared process docs — optional, toggled per client */
export const SHARED_TEMPLATES: DocTemplate[] = [
  { key: 'cpcv',      label: 'CPCV / Contrato Promessa de Compra e Venda', is_mandatory: false, max_files: 2, category: 'shared', sort_order: 20 },
  { key: 'cad_pred',  label: 'Caderneta Predial',                           is_mandatory: false, max_files: 1, category: 'shared', sort_order: 21 },
  { key: 'cert_perm', label: 'Certidão Permanente do Imóvel',               is_mandatory: false, max_files: 1, category: 'shared', sort_order: 22 },
  { key: 'fich_tec',  label: 'Ficha Técnica de Habitação',                  is_mandatory: false, max_files: 1, category: 'shared', sort_order: 23 },
];

/** Specific docs — only relevant for certain mortgage types */
export const SPECIFIC_TEMPLATES: DocTemplate[] = [
  {
    key: 'contrato_cred_atual',
    label: 'Contrato de Crédito Atual',
    is_mandatory: false,
    max_files: 1,
    category: 'specific',
    sort_order: 30,
    mortgage_types: ['transfer', 'refinancing'],
  },
  {
    key: 'extratos_emp',
    label: 'Últimos Extratos do Empréstimo',
    is_mandatory: false,
    max_files: 3,
    category: 'specific',
    sort_order: 31,
    mortgage_types: ['transfer'],
  },
];

export const ALL_OPTIONAL_TEMPLATES = [...SHARED_TEMPLATES, ...SPECIFIC_TEMPLATES];

/** Returns specific templates applicable to a given mortgage_type */
export function getApplicableSpecific(mortgageType: string | null): DocTemplate[] {
  if (!mortgageType) return [];
  return SPECIFIC_TEMPLATES.filter((t) => t.mortgage_types?.includes(mortgageType));
}
