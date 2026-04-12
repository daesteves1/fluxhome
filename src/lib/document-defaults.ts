export type OfficeDocTemplate = {
  doc_type: string;
  label: string;
  is_mandatory: boolean;
  max_files: number;
  proponente: 'per_proponente' | 'shared';
  enabled: boolean;
  is_custom: boolean;
};

export const PLATFORM_DEFAULT_DOCUMENTS: OfficeDocTemplate[] = [
  { doc_type: 'cc',                label: 'BI / Cartão de Cidadão',                  is_mandatory: true,  max_files: 1, proponente: 'per_proponente', enabled: true,  is_custom: false },
  { doc_type: 'morada',            label: 'Comprovativo de Morada',                   is_mandatory: true,  max_files: 1, proponente: 'per_proponente', enabled: true,  is_custom: false },
  { doc_type: 'recibos',           label: 'Últimos 3 Recibos de Vencimento',          is_mandatory: true,  max_files: 3, proponente: 'per_proponente', enabled: true,  is_custom: false },
  { doc_type: 'irs',               label: 'Declaração de IRS',                        is_mandatory: true,  max_files: 1, proponente: 'per_proponente', enabled: true,  is_custom: false },
  { doc_type: 'nota_liquidacao',   label: 'Nota de Liquidação do IRS',                is_mandatory: true,  max_files: 1, proponente: 'per_proponente', enabled: true,  is_custom: false },
  { doc_type: 'extratos',          label: 'Extratos Bancários 3 Meses',               is_mandatory: true,  max_files: 3, proponente: 'per_proponente', enabled: true,  is_custom: false },
  { doc_type: 'mapa_resp',         label: 'Mapa de Responsabilidades',                is_mandatory: true,  max_files: 1, proponente: 'per_proponente', enabled: true,  is_custom: false },
  { doc_type: 'contrato_trabalho', label: 'Contrato de Trabalho',                     is_mandatory: false, max_files: 1, proponente: 'per_proponente', enabled: true,  is_custom: false },
  { doc_type: 'decl_atividade',    label: 'Declaração de Início de Atividade',        is_mandatory: false, max_files: 1, proponente: 'per_proponente', enabled: false, is_custom: false },
  { doc_type: 'cpcv',              label: 'CPCV / Contrato Promessa',                 is_mandatory: false, max_files: 2, proponente: 'shared',          enabled: false, is_custom: false },
  { doc_type: 'caderneta',         label: 'Caderneta Predial',                        is_mandatory: false, max_files: 1, proponente: 'shared',          enabled: false, is_custom: false },
  { doc_type: 'certidao',          label: 'Certidão Permanente do Imóvel',            is_mandatory: false, max_files: 1, proponente: 'shared',          enabled: false, is_custom: false },
  { doc_type: 'ficha_tecnica',     label: 'Ficha Técnica de Habitação',               is_mandatory: false, max_files: 1, proponente: 'shared',          enabled: false, is_custom: false },
  { doc_type: 'contrato_credito',  label: 'Contrato de Crédito Atual',                is_mandatory: false, max_files: 1, proponente: 'shared',          enabled: false, is_custom: false },
  { doc_type: 'extratos_emprestimo', label: 'Últimos Extratos do Empréstimo',         is_mandatory: false, max_files: 3, proponente: 'shared',          enabled: false, is_custom: false },
];

/** Mortgage types that auto-enable credit transfer documents */
export const TRANSFER_MORTGAGE_TYPES = ['Transferência', 'Renegociação'];

/** Doc types auto-added for transfer/renegotiation mortgage types */
export const TRANSFER_AUTO_DOC_TYPES = ['contrato_credito'];
/** Doc types auto-added only for transfer (not renegotiation) */
export const TRANSFER_ONLY_DOC_TYPES = ['extratos_emprestimo'];

/**
 * Returns the resolved document template for an office.
 * Falls back to PLATFORM_DEFAULT_DOCUMENTS if the office has no template configured.
 */
export function getOfficeDocumentTemplate(officeTemplate: OfficeDocTemplate[] | null | undefined): OfficeDocTemplate[] {
  if (!officeTemplate || officeTemplate.length === 0) return PLATFORM_DEFAULT_DOCUMENTS;
  return officeTemplate;
}
