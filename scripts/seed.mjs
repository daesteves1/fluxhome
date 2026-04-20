#!/usr/bin/env node
// Seed script — run with: node scripts/seed.mjs
// Requires migrations to be applied first (supabase db push)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envVars = {};
try {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#][^=]*)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch {}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Broker / office IDs (adjust if different in your project)
const BROKER1  = '44444444-4444-4444-4444-444444444444';
const BROKER2  = '55555555-5555-5555-5555-555555555555';
const OFFICE   = '11111111-1111-1111-1111-111111111111';

// ── helpers ──────────────────────────────────────────────────────────────────
function ago(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function future(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
async function upsert(table, rows, conflict = 'id') {
  const { error } = await sb.from(table).upsert(rows, { onConflict: conflict, ignoreDuplicates: true });
  if (error) console.warn(`  ⚠ ${table}:`, error.message);
  else console.log(`  ✓ ${table} (${rows.length} rows)`);
}

// ── 1. NEW CLIENTS ─────────────────────────────────────────────────────────
console.log('\n→ Clients');
await upsert('clients', [
  { id: '6b26af58-cef6-418d-baf8-b83f937b31f1', broker_id: BROKER1, office_id: OFFICE,
    p1_name: 'Miguel Santos', p1_nif: '234567890', p1_email: 'miguel.santos@email.pt',
    p1_phone: '+351 912 345 678', p1_birth_date: '1985-03-14',
    p1_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'fd1122aa-0001-0001-0001-000000000001', created_at: ago(45) },

  { id: '2dcab91c-9d40-47ca-95ba-44b8ea153518', broker_id: BROKER1, office_id: OFFICE,
    p1_name: 'Catarina Sousa', p1_nif: '345678901', p1_email: 'catarina.sousa@gmail.com',
    p1_phone: '+351 923 456 789', p1_birth_date: '1989-07-22',
    p1_employment_type: 'Trabalhador por conta de outrem',
    p2_name: 'Tiago Sousa', p2_nif: '345678902', p2_email: 'tiago.sousa@gmail.com',
    p2_phone: '+351 934 567 890', p2_birth_date: '1987-11-08',
    p2_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'fd1122aa-0002-0002-0002-000000000002', created_at: ago(90) },

  { id: 'dcd1819e-d617-4e10-a1e9-029d70dcb882', broker_id: BROKER2, office_id: OFFICE,
    p1_name: 'Joana Rodrigues', p1_nif: '456789012', p1_email: 'joana.rodrigues@sapo.pt',
    p1_phone: '+351 945 678 901', p1_birth_date: '1991-01-30',
    p1_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'fd1122aa-0003-0003-0003-000000000003', created_at: ago(30) },

  { id: 'fc127925-451d-4363-bfe6-6d03d800820d', broker_id: BROKER2, office_id: OFFICE,
    p1_name: 'Bernardo Lopes', p1_nif: '567890123', p1_email: 'bernardo.lopes@outlook.pt',
    p1_phone: '+351 956 789 012', p1_birth_date: '1978-09-05',
    p1_employment_type: 'Trabalhador independente',
    portal_token: 'fd1122aa-0004-0004-0004-000000000004', created_at: ago(3) },

  { id: '83921a77-33a1-4e7f-ac0f-dbe2238a2f0d', broker_id: BROKER1, office_id: OFFICE,
    p1_name: 'Filipa Nunes', p1_nif: '678901234', p1_email: 'filipa.nunes@gmail.com',
    p1_phone: '+351 967 890 123', p1_birth_date: '1983-05-17',
    p1_employment_type: 'Trabalhador por conta de outrem',
    p2_name: 'André Nunes', p2_nif: '678901235', p2_email: 'andre.nunes@gmail.com',
    p2_phone: '+351 978 901 234', p2_birth_date: '1981-12-03',
    p2_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'fd1122aa-0005-0005-0005-000000000005', created_at: ago(180) },
]);

// ── 2. PROCESSES ──────────────────────────────────────────────────────────
console.log('\n→ Processes');
await upsert('processes', [
  // Ana Ferreira — docs_pending
  { id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
    client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'docs_pending',
    valor_imovel: 230000, montante_solicitado: 184000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Lisboa - Benfica',
    p1_profissao: 'Gestora de RH', p1_entidade_empregadora: 'Empresa XYZ Lda',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 2800,
    observacoes: 'Imóvel T2 em Benfica. Cliente com histórico de crédito limpo.',
    created_at: ago(25), updated_at: ago(3) },

  // Carlos Mendes — propostas_sent
  { id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
    client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'propostas_sent',
    valor_imovel: 380000, montante_solicitado: 304000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Cascais',
    p1_profissao: 'Diretor Comercial', p1_entidade_empregadora: 'Tech Solutions SA',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 4500,
    p2_profissao: 'Consultora', p2_entidade_empregadora: 'Consulting Group Lda',
    p2_tipo_contrato: 'Contrato sem termo', p2_rendimento_mensal: 3200,
    observacoes: 'Moradia T4 em Cascais. Casal com estabilidade profissional sólida.',
    created_at: ago(60), updated_at: ago(5) },

  // Rui Oliveira — approved
  { id: 'd48e578a-67f6-48d3-8311-77d912eda6c7',
    client_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'approved',
    valor_imovel: 195000, montante_solicitado: 156000, prazo_meses: 300,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Setúbal',
    p1_profissao: 'Engenheiro Civil', p1_entidade_empregadora: 'Construções SA',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 2400,
    observacoes: 'Apartamento T2 em Setúbal aprovado pelo BCP.',
    created_at: ago(75), updated_at: ago(2) },

  // Inês Costa — renegociacao closed + followup
  { id: '14035f8c-d57f-4ecd-8bc1-75d174b95086',
    client_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    broker_id: BROKER1, office_id: OFFICE,
    tipo: 'renegociacao', process_step: 'closed',
    montante_solicitado: 120000, prazo_meses: 240,
    localizacao_imovel: 'Lisboa',
    p1_profissao: 'Professora', p1_entidade_empregadora: 'Escola Secundária',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 1900,
    p2_profissao: 'Técnico de IT', p2_entidade_empregadora: 'Câmara Municipal',
    p2_tipo_contrato: 'Contrato sem termo', p2_rendimento_mensal: 2100,
    observacoes: 'Renegociação bem-sucedida. Poupança de 180€/mês.',
    followup_at: future(540), followup_note: 'Contactar para nova renegociação ou mudança de banco',
    closed_at: ago(10), created_at: ago(120), updated_at: ago(10) },

  // Miguel Santos — propostas_sent
  { id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
    client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1',
    broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'propostas_sent',
    valor_imovel: 320000, montante_solicitado: 256000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Lisboa - Alvalade',
    p1_profissao: 'Engenheiro de Software', p1_entidade_empregadora: 'Startup Lisboa Lda',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 3800,
    observacoes: 'Apartamento T3 em Alvalade. Aguarda decisão entre CGD e Santander.',
    created_at: ago(40), updated_at: ago(4) },

  // Catarina + Tiago — approved
  { id: '0e90ce09-bb71-479f-9a32-4e32881045ba',
    client_id: '2dcab91c-9d40-47ca-95ba-44b8ea153518',
    broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'approved',
    valor_imovel: 520000, montante_solicitado: 416000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Cascais - São João do Estoril',
    p1_profissao: 'Médica', p1_entidade_empregadora: 'Hospital CUF',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 5200,
    p2_profissao: 'Arquiteto', p2_entidade_empregadora: 'Atelier Arq Lda',
    p2_tipo_contrato: 'Contrato sem termo', p2_rendimento_mensal: 4100,
    observacoes: 'Moradia T4 com jardim. Aprovado pela CGD com spread de 0,9%.',
    created_at: ago(85), updated_at: ago(1) },

  // Joana Rodrigues — docs_complete
  { id: 'c814a210-70f4-4e46-95f0-688af6587f10',
    client_id: 'dcd1819e-d617-4e10-a1e9-029d70dcb882',
    broker_id: BROKER2, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'docs_complete',
    valor_imovel: 210000, montante_solicitado: 168000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Porto - Bonfim',
    p1_profissao: 'Advogada', p1_entidade_empregadora: 'Sociedade de Advogados Lda',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 3100,
    created_at: ago(28), updated_at: ago(2) },

  // Bernardo Lopes — lead (construção)
  { id: '8339cd21-7b58-41ab-92c0-45c45ce49e2e',
    client_id: 'fc127925-451d-4363-bfe6-6d03d800820d',
    broker_id: BROKER2, office_id: OFFICE,
    tipo: 'construcao', process_step: 'lead',
    valor_imovel: 450000, montante_solicitado: 300000, prazo_meses: 360,
    finalidade: 'Construção de habitação própria', localizacao_imovel: 'Setúbal - Palmela',
    p1_profissao: 'Empresário', p1_entidade_empregadora: 'Bernardo Lopes Unipessoal',
    p1_tipo_contrato: 'Trabalhador independente', p1_rendimento_mensal: 5500,
    observacoes: 'Terreno adquirido. Pretende construção de moradia T4.',
    created_at: ago(2), updated_at: ago(2) },

  // Filipa + André Nunes — closed + followup
  { id: 'b4d23bd6-dc81-48c8-8bb0-e996c2b0d2d5',
    client_id: '83921a77-33a1-4e7f-ac0f-dbe2238a2f0d',
    broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'closed',
    valor_imovel: 285000, montante_solicitado: 228000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Braga - Gualtar',
    p1_profissao: 'Enfermeira', p1_entidade_empregadora: 'Hospital de Braga',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 2200,
    p2_profissao: 'Técnico Informático', p2_entidade_empregadora: 'Câmara Municipal Braga',
    p2_tipo_contrato: 'Contrato sem termo', p2_rendimento_mensal: 1950,
    observacoes: 'Escritura realizada. Processo concluído com sucesso pelo Novo Banco.',
    followup_at: future(180), followup_note: 'Verificar oportunidade de renegociação spread',
    closed_at: ago(5), created_at: ago(175), updated_at: ago(5) },
]);

// ── 3. DOCUMENT REQUESTS ─────────────────────────────────────────────────
console.log('\n→ Document requests');

const docRows = [
  // Ana Ferreira — docs_pending: some approved, some pending
  { id: '97632dcb-5def-4eed-9b46-90fecb6e8fce', client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    process_id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0', proponente: 'p1',
    doc_type: 'p1_cc', label: 'Cartão de Cidadão', is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: '5b76fd02-bbb8-4a8f-ad1b-2238a360a18d', client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    process_id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0', proponente: 'p1',
    doc_type: 'p1_nif', label: 'Cartão de NIF', is_mandatory: true, max_files: 2, sort_order: 2, status: 'approved' },
  { id: '6c83c3f6-ea03-4aee-954f-2d682e9330b4', client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    process_id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0', proponente: 'p1',
    doc_type: 'p1_irs', label: 'Última declaração IRS', is_mandatory: true, max_files: 3, sort_order: 3, status: 'em_analise' },
  { id: '1b1ed96b-61d7-44eb-800c-9a9430930ccc', client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    process_id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0', proponente: 'p1',
    doc_type: 'p1_recibos', label: 'Últimos 3 recibos de vencimento', is_mandatory: true, max_files: 5, sort_order: 4, status: 'pending' },
  { id: '952e89ac-3bdf-4b40-b89a-bc42bb3cb64e', client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    process_id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0', proponente: 'shared',
    doc_type: 'cpcv', label: 'CPCV / Promessa de Compra e Venda', is_mandatory: true, max_files: 2, sort_order: 5, status: 'pending' },
  { id: '8efd0de1-9762-424c-aa39-77e8650a41c6', client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    process_id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0', proponente: 'shared',
    doc_type: 'caderneta', label: 'Caderneta Predial', is_mandatory: false, max_files: 2, sort_order: 6, status: 'pending' },

  // Carlos Mendes — all approved
  { id: 'c95e556f-86d7-4081-8a41-766202334939', client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f', proponente: 'p1',
    doc_type: 'p1_cc', label: 'Cartão de Cidadão (P1)', is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'd3e7c61e-55b6-4d74-a970-f0debe862f04', client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f', proponente: 'p1',
    doc_type: 'p1_irs', label: 'IRS P1', is_mandatory: true, max_files: 3, sort_order: 2, status: 'approved' },
  { id: 'b3911b7a-e5ac-4f83-ba09-bed27d3a3e92', client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f', proponente: 'p1',
    doc_type: 'p1_recibos', label: 'Recibos P1', is_mandatory: true, max_files: 5, sort_order: 3, status: 'approved' },
  { id: '7837de7f-151e-4b63-a540-7b2123665576', client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f', proponente: 'p2',
    doc_type: 'p2_cc', label: 'Cartão de Cidadão (P2)', is_mandatory: true, max_files: 2, sort_order: 4, status: 'approved' },
  { id: '191e4faa-0b89-4e59-97c9-5d80ebc94382', client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f', proponente: 'p2',
    doc_type: 'p2_irs', label: 'IRS P2', is_mandatory: true, max_files: 3, sort_order: 5, status: 'approved' },
  { id: 'fe0639df-fc0e-45cd-9785-bd2f966da3a9', client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f', proponente: 'shared',
    doc_type: 'cpcv', label: 'CPCV', is_mandatory: true, max_files: 2, sort_order: 6, status: 'approved' },

  // Miguel Santos — all approved
  { id: 'f4c93728-d932-4306-a604-d2b6bede70ce', client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1',
    process_id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9', proponente: 'p1',
    doc_type: 'p1_cc', label: 'Cartão de Cidadão', is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'ad6d037a-b234-493d-8a04-7290e66f2347', client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1',
    process_id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9', proponente: 'p1',
    doc_type: 'p1_irs', label: 'Declaração IRS', is_mandatory: true, max_files: 3, sort_order: 2, status: 'approved' },
  { id: 'e3146fc1-eb21-4caf-bde0-e960329c7660', client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1',
    process_id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9', proponente: 'p1',
    doc_type: 'p1_recibos', label: 'Recibos de vencimento', is_mandatory: true, max_files: 5, sort_order: 3, status: 'approved' },
  { id: '6e3b874d-763c-4406-8b58-e91bb32a549a', client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1',
    process_id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9', proponente: 'shared',
    doc_type: 'cpcv', label: 'CPCV', is_mandatory: true, max_files: 2, sort_order: 4, status: 'approved' },

  // Joana Rodrigues — all approved
  { id: '551d02ab-445a-4281-a241-fbd1893d5712', client_id: 'dcd1819e-d617-4e10-a1e9-029d70dcb882',
    process_id: 'c814a210-70f4-4e46-95f0-688af6587f10', proponente: 'p1',
    doc_type: 'p1_cc', label: 'Cartão de Cidadão', is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: '860917b3-efdc-4699-91b6-0e59debd68cf', client_id: 'dcd1819e-d617-4e10-a1e9-029d70dcb882',
    process_id: 'c814a210-70f4-4e46-95f0-688af6587f10', proponente: 'p1',
    doc_type: 'p1_irs', label: 'Declaração IRS', is_mandatory: true, max_files: 3, sort_order: 2, status: 'approved' },
  { id: '221c3b8c-8313-4b2b-b8ef-146d36ca36cb', client_id: 'dcd1819e-d617-4e10-a1e9-029d70dcb882',
    process_id: 'c814a210-70f4-4e46-95f0-688af6587f10', proponente: 'p1',
    doc_type: 'p1_recibos', label: 'Recibos de vencimento', is_mandatory: true, max_files: 5, sort_order: 3, status: 'approved' },
  { id: '0a3e530e-9ac6-4cf9-a094-6a9cb31b37e3', client_id: 'dcd1819e-d617-4e10-a1e9-029d70dcb882',
    process_id: 'c814a210-70f4-4e46-95f0-688af6587f10', proponente: 'shared',
    doc_type: 'cpcv', label: 'CPCV', is_mandatory: true, max_files: 2, sort_order: 4, status: 'approved' },
  { id: 'f4f7d4bf-ee0e-43bb-9799-3f219570a8f9', client_id: 'dcd1819e-d617-4e10-a1e9-029d70dcb882',
    process_id: 'c814a210-70f4-4e46-95f0-688af6587f10', proponente: 'shared',
    doc_type: 'certidao_registo', label: 'Certidão do Registo Predial', is_mandatory: false, max_files: 2, sort_order: 5, status: 'approved' },
];

await upsert('document_requests', docRows);

// ── 4. BANK PROPOSTAS ────────────────────────────────────────────────────
console.log('\n→ Bank propostas');
await upsert('bank_propostas', [
  // Carlos Mendes — 4 proposals
  { id: 'c163ec4f-e2d6-49d0-8ad2-4d00684bfa03',
    client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
    broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'CGD', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.90, tan: 3.82, taeg: 4.05, loan_amount: 304000, term_months: 360, monthly_payment: 1423,
    vida_banco: 35.50, multiriscos_banco: 22.00,
    comissao_avaliacao: 350, imposto_selo_mutuo: 2400, registo: 350, manutencao_conta: 7.50, manutencao_anual: false,
    notes: 'Proposta base CGD. Exige domiciliação de ordenado e seguro de vida na CGD.',
    created_at: ago(10), updated_at: ago(10) },

  { id: 'a67fd96a-9e7d-4422-b9f7-0259e60c95f1',
    client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
    broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'Millennium BCP', rate_type: 'variavel', euribor_index: '6m',
    spread: 1.05, tan: 3.97, taeg: 4.22, loan_amount: 304000, term_months: 360, monthly_payment: 1448,
    vida_banco: 38.00, multiriscos_banco: 24.50,
    comissao_avaliacao: 300, comissao_estudo: 200, imposto_selo_mutuo: 2400, registo: 350, manutencao_conta: 6.00, manutencao_anual: false,
    notes: 'BCP mais caro em spread mas sem obrigatoriedade de seguros.',
    created_at: ago(10), updated_at: ago(10) },

  { id: '7e58a39c-e826-47e3-b690-afe0e10f8ba0',
    client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
    broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'Novo Banco', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.95, tan: 3.87, taeg: 4.10, loan_amount: 304000, term_months: 360, monthly_payment: 1433,
    vida_banco: 32.00, multiriscos_banco: 20.00,
    comissao_avaliacao: 300, imposto_selo_mutuo: 2400, registo: 350, manutencao_conta: 5.00, manutencao_anual: false,
    notes: 'Novo Banco com spread intermédio e seguros mais baratos.',
    created_at: ago(9), updated_at: ago(9) },

  { id: 'ac02f935-5844-4979-b9ad-036110a23d2c',
    client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
    broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'Santander', rate_type: 'mista', euribor_index: '6m',
    fixed_period_years: 5,
    spread: 0.80, tan: 3.72, taeg: 3.98, loan_amount: 304000, term_months: 360, monthly_payment: 1408,
    vida_banco: 36.00, multiriscos_banco: 21.00,
    comissao_avaliacao: 350, comissao_estudo: 150, imposto_selo_mutuo: 2400, registo: 350, manutencao_conta: 6.50, manutencao_anual: false,
    notes: 'Santander: taxa mista 5 anos fixa a 2.95% depois variável com spread 0.80. Melhor para quem quer estabilidade inicial.',
    created_at: ago(8), updated_at: ago(8) },

  // Miguel Santos — 2 proposals
  { id: 'd954e0f0-8d07-450b-b4ae-45686e5a80fd',
    client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1',
    process_id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
    broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'CGD', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.85, tan: 3.77, taeg: 4.00, loan_amount: 256000, term_months: 360, monthly_payment: 1198,
    vida_banco: 29.50, multiriscos_banco: 18.00,
    comissao_avaliacao: 350, imposto_selo_mutuo: 2020, registo: 300, manutencao_conta: 7.50, manutencao_anual: false,
    notes: 'CGD melhor spread da praça para este perfil.',
    created_at: ago(7), updated_at: ago(7) },

  { id: '38c6b1b2-0def-4c4d-9a72-5b29ac3018f7',
    client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1',
    process_id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
    broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'Santander', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.95, tan: 3.87, taeg: 4.12, loan_amount: 256000, term_months: 360, monthly_payment: 1213,
    vida_banco: 31.00, multiriscos_banco: 19.50,
    comissao_avaliacao: 300, comissao_estudo: 150, imposto_selo_mutuo: 2020, registo: 300, manutencao_conta: 5.50, manutencao_anual: false,
    notes: 'Santander com spread ligeiramente maior mas sem obrigações adicionais.',
    created_at: ago(6), updated_at: ago(6) },
]);

// ── 5. MAPA COMPARATIVO ──────────────────────────────────────────────────
console.log('\n→ Mapa comparativo');
await upsert('mapa_comparativo', [
  { id: '4892a1c9-0e3b-4e2a-861e-5f2f03901234',
    client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
    broker_id: BROKER1, office_id: OFFICE,
    title: 'Comparativo Habitação Cascais',
    proposta_ids: ['c163ec4f-e2d6-49d0-8ad2-4d00684bfa03','a67fd96a-9e7d-4422-b9f7-0259e60c95f1','7e58a39c-e826-47e3-b690-afe0e10f8ba0','ac02f935-5844-4979-b9ad-036110a23d2c'],
    recommended_proposta_id: 'c163ec4f-e2d6-49d0-8ad2-4d00684bfa03',
    highlighted_cells: { spread: true, monthly_payment: true },
    is_visible_to_client: true,
    created_at: ago(7), updated_at: ago(5) },

  { id: '5903b2da-1f4c-5f3b-972f-6a3a14012345',
    client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1',
    process_id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
    broker_id: BROKER1, office_id: OFFICE,
    title: 'Comparativo Habitação Alvalade',
    proposta_ids: ['d954e0f0-8d07-450b-b4ae-45686e5a80fd','38c6b1b2-0def-4c4d-9a72-5b29ac3018f7'],
    recommended_proposta_id: 'd954e0f0-8d07-450b-b4ae-45686e5a80fd',
    highlighted_cells: { spread: true },
    is_visible_to_client: false,
    created_at: ago(5), updated_at: ago(4) },
]);

// ── 6. BROKER NOTES ──────────────────────────────────────────────────────
console.log('\n→ Broker notes');
await upsert('broker_notes', [
  { client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', process_id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
    broker_id: BROKER1, content: 'Ligou a confirmar que vai enviar os recibos até sexta-feira. Tem dificuldade em aceder ao portal.', created_at: ago(2) },
  { client_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', process_id: '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
    broker_id: BROKER1, content: 'Reunião marcada para 22/04 para explicar processo de avaliação do imóvel.', created_at: ago(5) },
  { client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
    broker_id: BROKER1, content: 'Cliente prefere claramente a CGD pela relação bancária que já tem. Santander também é boa opção para taxa mista inicial.', created_at: ago(6) },
  { client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', process_id: 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
    broker_id: BROKER1, content: 'Mapa comparativo enviado ao cliente. Aguardar resposta até ao fim da semana.', created_at: ago(4) },
  { client_id: '6b26af58-cef6-418d-baf8-b83f937b31f1', process_id: 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
    broker_id: BROKER1, content: 'Miguel está muito satisfeito com a proposta da CGD. Quer marcar avaliação do imóvel para semana que vem.', created_at: ago(3) },
  { client_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', process_id: 'd48e578a-67f6-48d3-8311-77d912eda6c7',
    broker_id: BROKER1, content: 'BCP aprovou! Spread 1.10%, 300 meses, prestação de 892€. Cliente muito contente. A marcar escritura.', created_at: ago(3) },
  { client_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', process_id: '14035f8c-d57f-4ecd-8bc1-75d174b95086',
    broker_id: BROKER1, content: 'Renegociação concluída. Passaram de spread 2,1% para 1,3%. Poupança mensal de €184. Muito satisfeitos.', created_at: ago(12) },
]);

console.log('\n✅ Seed complete!\n');
