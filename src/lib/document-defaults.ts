export type OfficeDocTemplate = {
  doc_type: string;
  label: string;
  is_mandatory: boolean;
  max_files: number;
  proponente: 'per_proponente' | 'shared';
  enabled: boolean;
  is_custom: boolean;
  description?: string;
  instructions?: string;
  source_label?: string;
  source_url?: string;
};

export const PLATFORM_DEFAULT_DOCUMENTS: OfficeDocTemplate[] = [
  {
    doc_type: 'cc',
    label: 'BI / Cartão de Cidadão',
    is_mandatory: true,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    description: 'Documento de identificação pessoal.',
    instructions: 'Fotografe a frente e o verso do Cartão de Cidadão. Pode enviar em ficheiros separados. Garanta que toda a informação está legível, sem reflexos e que a foto não está cortada.',
  },
  {
    doc_type: 'morada',
    label: 'Comprovativo de Morada',
    is_mandatory: true,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    description: 'Documento que comprova a sua morada atual.',
    instructions: 'Envie uma fatura recente de água, luz, gás ou telecomunicações com menos de 3 meses, ou um extrato bancário que inclua o seu nome e morada completa.',
  },
  {
    doc_type: 'recibos',
    label: 'Últimos 3 Recibos de Vencimento',
    is_mandatory: true,
    max_files: 3,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    description: 'Comprovativos do seu rendimento mensal do emprego.',
    instructions: 'Envie os 3 recibos de vencimento mais recentes. Inclua todas as páginas de cada recibo. Se trabalhar por conta de outrem, os recibos são fornecidos pelo seu empregador (disponíveis no portal da empresa ou pedidos ao departamento de RH).',
  },
  {
    doc_type: 'irs',
    label: 'Declaração de IRS',
    is_mandatory: true,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    description: 'Declaração de rendimentos submetida nas Finanças.',
    instructions: 'Aceda ao Portal das Finanças e faça login com o seu NIF e senha. Vá a "IRS > Entregar Declaração > Consultar Declarações" e descarregue a última declaração submetida em PDF.',
    source_label: 'Portal das Finanças — IRS',
    source_url: 'https://irs.portaldasfinancas.gov.pt',
  },
  {
    doc_type: 'nota_liquidacao',
    label: 'Nota de Liquidação do IRS',
    is_mandatory: true,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    description: 'Certidão de liquidação do IRS emitida pelas Finanças. Atenção: não é a "Demonstração de Liquidação" que recebe automaticamente — é a Certidão.',
    instructions: 'Aceda ao Portal das Finanças e faça login. Clique no ícone de pesquisa (lupa) no topo da página. Escreva "CERTIDAO" no campo de pesquisa. Selecione a opção "PEDIR CERTIDÃO" e depois escolha "LIQUIDAÇÃO DE IRS". Selecione o ano fiscal e confirme o pedido. A certidão fica disponível para download em PDF em poucos minutos.\n\nNota importante: os clientes enviam frequentemente a "Demonstração de Liquidação" por engano — esse documento chega por correio ou está nos documentos do IRS. O que precisa é diferente: a Certidão de Liquidação, pedida especificamente através da pesquisa por "CERTIDAO" no portal.',
    source_label: 'Portal das Finanças',
    source_url: 'https://www.portaldasfinancas.gov.pt',
  },
  {
    doc_type: 'extratos',
    label: 'Extratos Bancários 3 Meses',
    is_mandatory: true,
    max_files: 3,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    description: 'Extratos das suas contas bancárias dos últimos 3 meses.',
    instructions: 'Envie os extratos completos dos últimos 3 meses de todas as contas bancárias onde recebe o vencimento ou tem poupanças relevantes. Inclua todas as páginas. Os extratos devem mostrar claramente o seu IBAN, nome, todos os movimentos e saldo final. Pode obtê-los através do homebanking do seu banco em "Consultas > Extratos" e exportar em PDF.',
  },
  {
    doc_type: 'mapa_resp',
    label: 'Mapa de Responsabilidades',
    is_mandatory: true,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    description: 'Relatório de todos os créditos e responsabilidades junto do sistema financeiro português, emitido pelo Banco de Portugal.',
    instructions: 'Aceda ao Portal do Cliente Bancário do Banco de Portugal. Faça login com Chave Móvel Digital, Cartão de Cidadão com leitores ou credenciais do portal. Em "Serviços > Mapa de Responsabilidades de Crédito", selecione o relatório do mês anterior e descarregue em PDF. O documento é gerado imediatamente.',
    source_label: 'Banco de Portugal — Portal do Cliente Bancário',
    source_url: 'https://clientebancario.bportugal.pt',
  },
  {
    doc_type: 'contrato_trabalho',
    label: 'Contrato de Trabalho',
    is_mandatory: false,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    description: 'Contrato de trabalho em vigor.',
    instructions: 'Envie o contrato de trabalho atual assinado por ambas as partes (empregador e trabalhador). Deve incluir a data de início, função, remuneração base e duração (se for a prazo). Se tiver adendas ou alterações ao contrato original, inclua-as também.',
  },
  {
    doc_type: 'decl_atividade',
    label: 'Declaração de Início de Atividade',
    is_mandatory: false,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: false,
    is_custom: false,
    description: 'Declaração de início de atividade nas Finanças (para trabalhadores independentes / recibos verdes).',
    instructions: 'Aceda ao Portal das Finanças e faça login. Vá a "Serviços > Iniciar Atividade" e descarregue a declaração de início de atividade. Deve mostrar o seu NIF, a data de início e o código de atividade (CAE ou código CIRS). Obrigatório se for trabalhador independente.',
    source_label: 'Portal das Finanças',
    source_url: 'https://www.portaldasfinancas.gov.pt',
  },
  {
    doc_type: 'cpcv',
    label: 'CPCV / Contrato Promessa',
    is_mandatory: false,
    max_files: 2,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    description: 'Contrato Promessa de Compra e Venda do imóvel.',
    instructions: 'Envie o CPCV completo assinado por todas as partes (comprador e vendedor). Inclua todas as páginas, as condições gerais, a identificação do imóvel e o valor do sinal pago. Se existirem procurações, inclua-as também.',
  },
  {
    doc_type: 'caderneta',
    label: 'Caderneta Predial',
    is_mandatory: false,
    max_files: 1,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    description: 'Certidão matricial do imóvel, emitida pelas Finanças.',
    instructions: 'A caderneta predial pode ser obtida no Portal das Finanças em "e-Balcão > Património > Imóveis > Pedir Caderneta Predial" (necessita do artigo matricial do imóvel). Em alternativa, peça ao vendedor ou à agência imobiliária que forneça o documento. A caderneta tem validade de 1 ano.',
    source_label: 'Portal das Finanças — e-Balcão',
    source_url: 'https://www.portaldasfinancas.gov.pt/at/html/ebalcao.html',
  },
  {
    doc_type: 'certidao',
    label: 'Certidão Permanente do Imóvel',
    is_mandatory: false,
    max_files: 1,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    description: 'Certidão do registo predial do imóvel, emitida pelo registo predial.',
    instructions: 'Aceda ao Predial Online e clique em "Pedir Certidão". Introduza a descrição predial do imóvel (constante da escritura ou do CPCV — inclui a conservatória e o número de descrição). Pague a taxa (€15,05) e o código de acesso permanente é gerado imediatamente. A certidão permanente tem validade de 6 meses e pode ser consultada online pelo mediador com o código de acesso.',
    source_label: 'Predial Online',
    source_url: 'https://www.predialonline.pt',
  },
  {
    doc_type: 'ficha_tecnica',
    label: 'Ficha Técnica de Habitação',
    is_mandatory: false,
    max_files: 1,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    description: 'Documento técnico do imóvel emitido pela câmara municipal aquando da conclusão da obra.',
    instructions: 'A Ficha Técnica de Habitação é obrigatória para imóveis construídos após março de 2004. É fornecida pelo vendedor ou pelo promotor imobiliário. Se o vendedor não a tiver, pode ser solicitada à câmara municipal da área onde o imóvel se localiza.',
  },
  {
    doc_type: 'contrato_credito',
    label: 'Contrato de Crédito Atual',
    is_mandatory: false,
    max_files: 1,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    description: 'Contrato do crédito habitação atual (necessário para transferências e renegociações).',
    instructions: 'Envie o contrato de crédito habitação atual completo, incluindo todas as páginas e condições gerais (e particulares). Se não tiver o contrato físico, pode solicitá-lo diretamente ao seu banco atual no balcão ou através do homebanking. Inclua eventuais adendas ou aditamentos ao contrato original.',
  },
  {
    doc_type: 'extratos_emprestimo',
    label: 'Últimos Extratos do Empréstimo',
    is_mandatory: false,
    max_files: 3,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    description: 'Extratos do seu empréstimo habitação atual, mostrando as prestações recentes.',
    instructions: 'Envie os últimos 3 extratos do empréstimo habitação. Os extratos devem mostrar as prestações pagas, o capital em dívida, a taxa de juro atual (TAEG e TAN) e o prazo restante. Pode obtê-los através do homebanking do seu banco na secção de créditos ou empréstimos.',
  },
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
