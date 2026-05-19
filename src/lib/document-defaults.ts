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
  allowed_types: string[];
  expected_files: number;
  max_file_size_mb: number;
};

export const PLATFORM_DEFAULT_DOCUMENTS: OfficeDocTemplate[] = [
  {
    doc_type: 'cc',
    label: 'BI / Cartão de Cidadão',
    is_mandatory: true,
    max_files: 2,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    allowed_types: ['application/pdf', 'image/jpeg', 'image/png'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Documento de identificação pessoal válido, emitido pelo Estado Português. Deve estar dentro da validade.',
    instructions: `1. Verifique a validade do seu Cartão de Cidadão (data no verso).

2. Caso esteja válido, basta digitalizar ou fotografar a frente e o verso com boa iluminação e enviar.

3. Se estiver caducado ou prestes a caducar, marque renovação:
   - Online em [eportugal.gov.pt](https://eportugal.gov.pt) → "Pedir ou renovar Cartão de Cidadão"
   - Ou presencialmente numa Loja de Cidadão / Conservatória (marcação em [bilheteonline.mj.pt](https://bilheteonline.mj.pt))

⚠️ Não envie apenas a frente — o banco precisa de ambos os lados no mesmo ficheiro (ou em dois ficheiros separados).`,
  },
  {
    doc_type: 'morada',
    label: 'Comprovativo de Morada',
    is_mandatory: true,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    allowed_types: ['application/pdf', 'image/jpeg', 'image/png'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Documento recente (últimos 3 meses) que comprove a sua morada atual de residência.',
    instructions: `Pode usar qualquer um dos seguintes documentos, desde que tenha menos de 3 meses e mostre o seu nome e morada:
- Fatura de água, luz, gás ou telecomunicações
- Extrato bancário ou comunicação do banco em papel timbrado
- Comprovativo de IRS com morada fiscal

Para obter via Portal das Finanças: aceda a [portaldasfinancas.gov.pt](https://www.portaldasfinancas.gov.pt) → autentique-se → "O Seu Cadastro" → imprima/guarde em PDF o comprovativo de morada fiscal.

Para faturas de serviços: aceda à área de cliente do fornecedor (EDP, Galp, MEO, NOS, Vodafone, etc.) → "Faturas" → descarregue em PDF.

Caso resida em casa de terceiros, será necessária uma declaração de cedência de habitação assinada pelo proprietário, acompanhada do CC do mesmo.`,
    source_label: 'Portal das Finanças',
    source_url: 'https://www.portaldasfinancas.gov.pt',
  },
  {
    doc_type: 'recibos',
    label: 'Últimos 3 Recibos de Vencimento',
    is_mandatory: true,
    max_files: 3,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    allowed_types: ['application/pdf'],
    expected_files: 3,
    max_file_size_mb: 15,
    description: 'Os três recibos de vencimento mais recentes emitidos pela sua entidade empregadora.',
    instructions: `Trabalhadores por conta de outrem:
- Solicite ao departamento de Recursos Humanos da sua empresa, ou
- Aceda ao portal interno da empresa (caso exista) e descarregue os recibos em PDF.

Funcionários públicos: aceda ao portal GeRHuP ou ao sistema da sua entidade pública e descarregue os recibos.

Envie os 3 recibos mais recentes consecutivos (ex.: se estamos em maio, envie fevereiro, março e abril).

Certifique-se que os recibos contêm: nome completo, NIF, entidade empregadora, valor bruto, descontos e valor líquido.`,
  },
  {
    doc_type: 'irs',
    label: 'Declaração de IRS',
    is_mandatory: true,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    allowed_types: ['application/pdf'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Cópia completa da última declaração de IRS submetida (Modelo 3 e todos os anexos).',
    instructions: `1. Aceda a [portaldasfinancas.gov.pt](https://www.portaldasfinancas.gov.pt).
2. Autentique-se com NIF e palavra-passe (ou via Chave Móvel Digital).
3. No menu, selecione: Cidadãos → IRS → Consultar Declaração.
4. Escolha o ano fiscal mais recente entregue.
5. Clique em "Comprovativo" e descarregue o PDF completo (inclui Modelo 3 + todos os anexos).

⚠️ Envie o documento completo — não apenas a primeira página.`,
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
    allowed_types: ['application/pdf'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Documento emitido pela Autoridade Tributária com o cálculo final do IRS (reembolso ou valor a pagar).',
    instructions: `1. Aceda a [portaldasfinancas.gov.pt](https://www.portaldasfinancas.gov.pt) e autentique-se.
2. No menu, selecione: Cidadãos → IRS → Consultar Nota de Liquidação.
3. Escolha o ano correspondente à última declaração entregue.
4. Clique em "Obter Comprovativo" e descarregue o PDF.

⚠️ Atenção: a Nota de Liquidação é diferente da Declaração de IRS — são dois documentos distintos que devem ser enviados separadamente.`,
    source_label: 'Portal das Finanças',
    source_url: 'https://www.portaldasfinancas.gov.pt',
  },
  {
    doc_type: 'extratos',
    label: 'Extratos Bancários (últimos 3 meses)',
    is_mandatory: true,
    max_files: 3,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    allowed_types: ['application/pdf'],
    expected_files: 3,
    max_file_size_mb: 15,
    description: 'Extratos completos das suas contas à ordem dos últimos 3 meses, onde recebe o vencimento e movimenta as despesas habituais.',
    instructions: `1. Aceda ao homebanking ou app do seu banco.
2. Procure a secção "Extratos" ou "Movimentos".
3. Selecione o intervalo dos 3 meses mais recentes completos.
4. Descarregue em PDF oficial do banco (não envie prints de ecrã nem ficheiros Excel).
5. Se tiver contas em mais do que um banco onde movimenta rendimentos ou despesas relevantes, envie extratos de todas.

Os extratos devem mostrar claramente: nome do titular, IBAN, todos os movimentos e saldos.

Dicas por banco:
- CGD: Caixadirecta → "Conta" → "Extratos" → "Extrato Integrado"
- Millennium BCP: App ou site → "Conta" → "Extratos"
- Santander: NetBanco → "Contas" → "Extratos"
- Novobanco: NBnetwork → "Consultas" → "Extrato"
- BPI: App BPI → "Conta" → "Extrato"`,
  },
  {
    doc_type: 'mapa_resp',
    label: 'Mapa de Responsabilidades de Crédito',
    is_mandatory: true,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: true,
    is_custom: false,
    allowed_types: ['application/pdf'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Documento oficial emitido pelo Banco de Portugal que lista todos os créditos ativos em seu nome.',
    instructions: `1. Aceda a [www.bportugal.pt](https://www.bportugal.pt) → secção "Mapa de Responsabilidades de Crédito".
   Ou diretamente: [clientebancario.bportugal.pt](https://clientebancario.bportugal.pt)

2. Autentique-se com:
   - Chave Móvel Digital, ou
   - Cartão de Cidadão com leitor, ou
   - Credenciais do Portal das Finanças.

3. Selecione o mês mais recente disponível (atualizado mensalmente).
4. Descarregue o PDF e envie.

⚠️ O mapa deve ter menos de 2 meses à data de envio.
Se tem cônjuge/segundo proponente, cada um deve obter o seu próprio mapa individualmente.`,
    source_label: 'Banco de Portugal',
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
    allowed_types: ['application/pdf'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Cópia do seu contrato de trabalho atual, assinado por ambas as partes.',
    instructions: `1. Procure a cópia que recebeu da sua entidade empregadora quando foi contratado.
2. Caso não tenha, solicite uma cópia ao departamento de Recursos Humanos.
3. O contrato deve estar assinado pelo trabalhador e pela entidade empregadora.

Se tem contrato sem termo (efetivo): envie o contrato original + qualquer adenda relevante (promoções, alterações salariais).

Se tem contrato a termo: envie o documento mais recente em vigor.

Caso tenha apenas contrato verbal ou esteja em situação atípica, informe o seu mediador para o aconselhar sobre alternativas.`,
  },
  {
    doc_type: 'decl_atividade',
    label: 'Declaração de Início de Atividade',
    is_mandatory: false,
    max_files: 1,
    proponente: 'per_proponente',
    enabled: false,
    is_custom: false,
    allowed_types: ['application/pdf'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Documento emitido pelas Finanças que comprova o início da sua atividade como trabalhador independente / empresário em nome individual.',
    instructions: `1. Aceda a [portaldasfinancas.gov.pt](https://www.portaldasfinancas.gov.pt) e autentique-se.
2. No menu, selecione: Cidadãos → Entregar → Início de Atividade → Consultar.
   Em alternativa: Os Seus Serviços → Consultar → Declarações → Início/Alteração/Cessação.
3. Localize a sua declaração de início de atividade e clique em "Comprovativo".
4. Descarregue o PDF.

Caso tenha feito alterações posteriores (alteração de CAE, regime de IVA, etc.), envie também as declarações de alteração.`,
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
    allowed_types: ['application/pdf'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Contrato assinado entre comprador e vendedor que formaliza a promessa de compra e venda do imóvel.',
    instructions: `Este documento é elaborado e assinado entre comprador e vendedor (ou através do mediador imobiliário/advogado).

Se ainda não foi assinado, contacte o vendedor ou o mediador imobiliário que está a intermediar a compra.

O CPCV deve conter:
- Identificação completa de comprador e vendedor
- Identificação do imóvel (morada, artigo matricial, descrição predial)
- Preço total e condições de pagamento
- Valor do sinal pago e datas
- Prazo para a escritura
- Assinaturas de ambas as partes (preferencialmente com reconhecimento notarial)

Envie o contrato completo, assinado por todas as partes.`,
  },
  {
    doc_type: 'caderneta',
    label: 'Caderneta Predial',
    is_mandatory: false,
    max_files: 1,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    allowed_types: ['application/pdf', 'image/jpeg', 'image/png'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Documento emitido pelas Finanças com a descrição fiscal do imóvel que pretende adquirir.',
    instructions: `Quem pede: normalmente o vendedor do imóvel (pois é ele que tem acesso autenticado).

O vendedor deve aceder a [portaldasfinancas.gov.pt](https://www.portaldasfinancas.gov.pt) → autenticar-se → Cidadãos → Património → Consultar Património Predial → Obter Caderneta Predial → selecionar o imóvel e descarregar o PDF.

Em alternativa, qualquer pessoa pode obter pedindo presencialmente num Serviço de Finanças mediante pagamento (cerca de 15€).

O documento deve ter sido emitido nos últimos 12 meses.

Solicite ao vendedor ou ao mediador imobiliário se ainda não dispõe.`,
    source_label: 'Portal das Finanças',
    source_url: 'https://www.portaldasfinancas.gov.pt',
  },
  {
    doc_type: 'certidao',
    label: 'Certidão Permanente do Imóvel',
    is_mandatory: false,
    max_files: 1,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    allowed_types: ['application/pdf'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Documento emitido pela Conservatória do Registo Predial com toda a informação jurídica do imóvel (proprietários, ónus, hipotecas).',
    instructions: `1. Aceda a [www.predialonline.pt](https://www.predialonline.pt).
2. Autentique-se com Cartão de Cidadão ou Chave Móvel Digital (ou registo no site).
3. Clique em "Pedir Certidão Permanente".
4. Indique o número de descrição predial e a freguesia (constam na Caderneta Predial).
5. Pague a taxa (15€ por 6 meses de acesso) por Multibanco, cartão ou MB Way.
6. Receberá um código de acesso que permite consultar/imprimir a certidão durante 6 meses.
7. Envie o PDF da certidão ou o código de acesso ao seu mediador.

Em alternativa, o vendedor pode obter e fornecer-lhe a certidão.`,
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
    allowed_types: ['application/pdf', 'image/jpeg', 'image/png'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Documento técnico que descreve as características construtivas do imóvel, obrigatório para imóveis construídos após 30/03/2004.',
    instructions: `Quem fornece: o vendedor do imóvel deve possuir este documento (foi entregue aquando da compra original ao promotor/construtor).

Solicite ao vendedor ou ao mediador imobiliário.

Caso o vendedor não tenha cópia, pode pedir um duplicado na Câmara Municipal onde o imóvel está registado, no setor de Urbanismo.

⚠️ A FTH só é obrigatória para imóveis construídos/licenciados após 30 de março de 2004. Para imóveis mais antigos, este documento pode não existir — informe o seu mediador.

O documento deve estar assinado pelo técnico responsável pela obra.`,
  },
  {
    doc_type: 'contrato_credito',
    label: 'Contrato de Crédito Atual',
    is_mandatory: false,
    max_files: 1,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    allowed_types: ['application/pdf'],
    expected_files: 1,
    max_file_size_mb: 15,
    description: 'Contrato original do crédito que pretende transferir ou renegociar, assinado com o banco atual.',
    instructions: `1. Procure a cópia que lhe foi entregue pelo banco quando contratou o crédito.
2. Caso não tenha, solicite uma segunda via ao seu banco atual:
   - Através do homebanking (alguns bancos disponibilizam em "Documentos" ou "Contratos")
   - Por email ao gestor de conta
   - Presencialmente no balcão

Envie o contrato completo, incluindo:
- Condições particulares (montante, prazo, taxa, spread)
- Condições gerais
- Eventuais adendas ou alterações posteriores

Se o crédito foi alvo de renegociação anterior, envie também os aditamentos.`,
  },
  {
    doc_type: 'extratos_emprestimo',
    label: 'Extratos do Empréstimo (últimos 3 meses)',
    is_mandatory: false,
    max_files: 3,
    proponente: 'shared',
    enabled: false,
    is_custom: false,
    allowed_types: ['application/pdf'],
    expected_files: 3,
    max_file_size_mb: 15,
    description: 'Comprovativo dos últimos 3 pagamentos da prestação do crédito atual.',
    instructions: `1. Aceda ao homebanking do banco onde tem o crédito.
2. Procure a secção "Créditos" ou "Empréstimos" → selecione o seu crédito habitação.
3. Descarregue o extrato/mapa de amortização dos últimos 3 meses, em PDF oficial.

Em alternativa, podem ser usados:
- Comprovativos das 3 últimas prestações pagas (movimentos na conta à ordem onde é debitada a prestação)
- Plano financeiro atualizado emitido pelo banco

O documento deve mostrar: identificação do empréstimo, valor da prestação, capital em dívida e datas dos pagamentos.

Caso tenha dificuldade em obter via homebanking, contacte o gestor do banco solicitando um plano financeiro atualizado.`,
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
