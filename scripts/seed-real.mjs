#!/usr/bin/env node
// Seed script for real broker/office IDs
// node scripts/seed-real.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing credentials'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BROKER = '8b0fd6bf-96b1-4960-961d-7f070b6fb24c';
const OFFICE = 'ffba8a4b-fc3b-47e4-b759-3ab92138e445';

function ago(days) {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
}
function future(days) {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString();
}
async function upsert(table, rows) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (error) console.warn(`  ⚠ ${table}:`, error.message);
  else console.log(`  ✓ ${table} (${rows.length} rows)`);
}

// ── CLIENTS ──────────────────────────────────────────────────────────────────
console.log('\n→ Clients');
await upsert('clients', [
  // 1. Ricardo Fonseca — single, Lisboa, propostas_sent
  { id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    broker_id: BROKER, office_id: OFFICE,
    p1_name: 'Ricardo Fonseca', p1_nif: '112233445', p1_email: 'ricardo.fonseca@gmail.com',
    p1_phone: '+351 912 111 222', p1_birth_date: '1986-06-18',
    p1_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'aa000001-0001-0001-0001-000000000001', created_at: ago(50) },

  // 2. Marta Pereira + João Pereira — couple, Porto, approved
  { id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    broker_id: BROKER, office_id: OFFICE,
    p1_name: 'Marta Pereira', p1_nif: '223344556', p1_email: 'marta.pereira@sapo.pt',
    p1_phone: '+351 923 222 333', p1_birth_date: '1984-11-03',
    p1_employment_type: 'Trabalhador por conta de outrem',
    p2_name: 'João Pereira', p2_nif: '223344557', p2_email: 'joao.pereira@sapo.pt',
    p2_phone: '+351 934 333 444', p2_birth_date: '1982-04-27',
    p2_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'aa000002-0002-0002-0002-000000000002', created_at: ago(95) },

  // 3. Sofia Martins — single, Sintra, docs_pending
  { id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8',
    broker_id: BROKER, office_id: OFFICE,
    p1_name: 'Sofia Martins', p1_nif: '334455667', p1_email: 'sofia.martins@outlook.pt',
    p1_phone: '+351 945 333 444', p1_birth_date: '1992-02-14',
    p1_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'aa000003-0003-0003-0003-000000000003', created_at: ago(20) },

  // 4. Pedro Alves + Ana Alves — couple, Braga, approved
  { id: 'd4e5f6a7-4444-4d0e-1f2a-b4c5d6e7f8a9',
    broker_id: BROKER, office_id: OFFICE,
    p1_name: 'Pedro Alves', p1_nif: '445566778', p1_email: 'pedro.alves@gmail.com',
    p1_phone: '+351 956 444 555', p1_birth_date: '1979-08-30',
    p1_employment_type: 'Trabalhador por conta de outrem',
    p2_name: 'Ana Alves', p2_nif: '445566779', p2_email: 'ana.alves@gmail.com',
    p2_phone: '+351 967 555 666', p2_birth_date: '1981-05-12',
    p2_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'aa000004-0004-0004-0004-000000000004', created_at: ago(110) },

  // 5. Luís Cardoso — single, Cascais, lead
  { id: 'e5f6a7b8-5555-4e1f-2a3b-c5d6e7f8a9b0',
    broker_id: BROKER, office_id: OFFICE,
    p1_name: 'Luís Cardoso', p1_nif: '556677889', p1_email: 'luis.cardoso@netcabo.pt',
    p1_phone: '+351 916 555 666', p1_birth_date: '1975-12-09',
    p1_employment_type: 'Trabalhador independente',
    portal_token: 'aa000005-0005-0005-0005-000000000005', created_at: ago(4) },

  // 6. Teresa Baptista + Rui Baptista — couple, Faro, closed
  { id: 'f6a7b8c9-6666-4f2a-3b4c-d6e7f8a9b0c1',
    broker_id: BROKER, office_id: OFFICE,
    p1_name: 'Teresa Baptista', p1_nif: '667788990', p1_email: 'teresa.baptista@gmail.com',
    p1_phone: '+351 927 666 777', p1_birth_date: '1980-07-25',
    p1_employment_type: 'Trabalhador por conta de outrem',
    p2_name: 'Rui Baptista', p2_nif: '667788991', p2_email: 'rui.baptista@gmail.com',
    p2_phone: '+351 938 777 888', p2_birth_date: '1978-03-16',
    p2_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'aa000006-0006-0006-0006-000000000006', created_at: ago(200) },

  // 7. Nuno Gomes — single, Setúbal, docs_complete
  { id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    broker_id: BROKER, office_id: OFFICE,
    p1_name: 'Nuno Gomes', p1_nif: '778899001', p1_email: 'nuno.gomes@gmail.com',
    p1_phone: '+351 912 777 888', p1_birth_date: '1988-09-21',
    p1_employment_type: 'Trabalhador por conta de outrem',
    portal_token: 'aa000007-0007-0007-0007-000000000007', created_at: ago(35) },
]);

// ── PROCESSES ────────────────────────────────────────────────────────────────
console.log('\n→ Processes');
await upsert('processes', [
  // 1. Ricardo Fonseca — propostas_sent
  { id: 'f1000001-aaaa-4000-b000-c00000000001',
    client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    broker_id: BROKER, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'propostas_sent',
    valor_imovel: 295000, montante_solicitado: 236000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Lisboa - Areeiro',
    p1_profissao: 'Gestor de Projetos', p1_entidade_empregadora: 'Consultoria Global Lda',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 3600,
    observacoes: 'Apartamento T3 no Areeiro. Cliente indeciso entre CGD e NovoBanco.',
    created_at: ago(45), updated_at: ago(4) },

  // 2. Marta + João Pereira — approved
  { id: 'f2000002-bbbb-4000-b000-c00000000002',
    client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    broker_id: BROKER, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'approved',
    valor_imovel: 340000, montante_solicitado: 272000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Porto - Foz do Douro',
    p1_profissao: 'Professora Universitária', p1_entidade_empregadora: 'Universidade do Porto',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 3200,
    p2_profissao: 'Engenheiro Mecânico', p2_entidade_empregadora: 'Bosch Portugal SA',
    p2_tipo_contrato: 'Contrato sem termo', p2_rendimento_mensal: 3800,
    observacoes: 'Moradia T4 na Foz. Aprovado pelo Santander com spread 0,85%. Escritura marcada para maio.',
    created_at: ago(90), updated_at: ago(1) },

  // 3. Sofia Martins — docs_pending
  { id: 'f3000003-cccc-4000-b000-c00000000003',
    client_id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8',
    broker_id: BROKER, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'docs_pending',
    valor_imovel: 185000, montante_solicitado: 148000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Sintra - Queluz',
    p1_profissao: 'Designer Gráfico', p1_entidade_empregadora: 'Agência Criativa Lda',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 1950,
    observacoes: 'Apartamento T2 em Queluz. Falta recibos e IRS.',
    created_at: ago(18), updated_at: ago(2) },

  // 4. Pedro + Ana Alves — approved
  { id: 'f4000004-dddd-4000-b000-c00000000004',
    client_id: 'd4e5f6a7-4444-4d0e-1f2a-b4c5d6e7f8a9',
    broker_id: BROKER, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'approved',
    valor_imovel: 230000, montante_solicitado: 184000, prazo_meses: 300,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Braga - Palmeira',
    p1_profissao: 'Médico de Família', p1_entidade_empregadora: 'Centro de Saúde',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 4200,
    p2_profissao: 'Enfermeira', p2_entidade_empregadora: 'Hospital de Braga',
    p2_tipo_contrato: 'Contrato sem termo', p2_rendimento_mensal: 2300,
    observacoes: 'Moradia T3 em Palmeira. CGD aprovou. Aguarda marcação de escritura.',
    created_at: ago(105), updated_at: ago(3) },

  // 5. Luís Cardoso — lead
  { id: 'f5000005-eeee-4000-b000-c00000000005',
    client_id: 'e5f6a7b8-5555-4e1f-2a3b-c5d6e7f8a9b0',
    broker_id: BROKER, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'lead',
    valor_imovel: 420000, montante_solicitado: 336000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Cascais - Estoril',
    p1_profissao: 'Empresário', p1_entidade_empregadora: 'Cardoso & Associados Lda',
    p1_tipo_contrato: 'Trabalhador independente', p1_rendimento_mensal: 6500,
    observacoes: 'Moradia T4 no Estoril. Primeiro contacto. Rendimentos variáveis — precisamos IRS 3 anos.',
    created_at: ago(3), updated_at: ago(3) },

  // 6. Teresa + Rui Baptista — closed with followup
  { id: 'f6000006-ffff-4000-b000-c00000000006',
    client_id: 'f6a7b8c9-6666-4f2a-3b4c-d6e7f8a9b0c1',
    broker_id: BROKER, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'closed',
    valor_imovel: 265000, montante_solicitado: 212000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Faro - Montenegro',
    p1_profissao: 'Hoteleira', p1_entidade_empregadora: 'Grupo Algarve Hotels SA',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 2800,
    p2_profissao: 'Arquiteto', p2_entidade_empregadora: 'Atelier Sul Lda',
    p2_tipo_contrato: 'Contrato sem termo', p2_rendimento_mensal: 3100,
    observacoes: 'Escritura realizada a 5 março. BPI spread 0,95%. Processo concluído.',
    followup_at: future(300), followup_note: 'Rever renegociação quando Euribor baixar',
    closed_at: ago(43), created_at: ago(195), updated_at: ago(43) },

  // 7. Nuno Gomes — docs_complete
  { id: 'f7000007-aaaa-4000-b000-c00000000007',
    client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    broker_id: BROKER, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'docs_complete',
    valor_imovel: 210000, montante_solicitado: 168000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente', localizacao_imovel: 'Setúbal - Azeitão',
    p1_profissao: 'Técnico de Eletricidade', p1_entidade_empregadora: 'EDP Distribuição',
    p1_tipo_contrato: 'Contrato sem termo', p1_rendimento_mensal: 2650,
    observacoes: 'Documentação completa. A preparar propostas bancárias.',
    created_at: ago(30), updated_at: ago(5) },
]);

// ── DOCUMENT REQUESTS ────────────────────────────────────────────────────────
console.log('\n→ Document requests');
await upsert('document_requests', [
  // Sofia Martins — docs_pending: some approved, some pending
  { id: 'da100001-aaaa-4000-b000-000000000001', client_id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8',
    process_id: 'f3000003-cccc-4000-b000-c00000000003', proponente: 'f1',
    doc_type: 'f1_cc', label: 'Cartão de Cidadão', is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'da100002-aaaa-4000-b000-000000000002', client_id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8',
    process_id: 'f3000003-cccc-4000-b000-c00000000003', proponente: 'f1',
    doc_type: 'f1_nif', label: 'Cartão de NIF', is_mandatory: true, max_files: 2, sort_order: 2, status: 'approved' },
  { id: 'da100003-aaaa-4000-b000-000000000003', client_id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8',
    process_id: 'f3000003-cccc-4000-b000-c00000000003', proponente: 'f1',
    doc_type: 'f1_irs', label: 'Última declaração IRS', is_mandatory: true, max_files: 3, sort_order: 3, status: 'pending' },
  { id: 'da100004-aaaa-4000-b000-000000000004', client_id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8',
    process_id: 'f3000003-cccc-4000-b000-c00000000003', proponente: 'f1',
    doc_type: 'f1_recibos', label: 'Últimos 3 recibos de vencimento', is_mandatory: true, max_files: 5, sort_order: 4, status: 'pending' },
  { id: 'da100005-aaaa-4000-b000-000000000005', client_id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8',
    process_id: 'f3000003-cccc-4000-b000-c00000000003', proponente: 'shared',
    doc_type: 'cpcv', label: 'CPCV / Promessa de Compra e Venda', is_mandatory: true, max_files: 2, sort_order: 5, status: 'em_analise' },

  // Ricardo Fonseca — all approved
  { id: 'da200001-bbbb-4000-b000-000000000001', client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    process_id: 'f1000001-aaaa-4000-b000-c00000000001', proponente: 'f1',
    doc_type: 'f1_cc', label: 'Cartão de Cidadão', is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'da200002-bbbb-4000-b000-000000000002', client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    process_id: 'f1000001-aaaa-4000-b000-c00000000001', proponente: 'f1',
    doc_type: 'f1_irs', label: 'Declaração IRS', is_mandatory: true, max_files: 3, sort_order: 2, status: 'approved' },
  { id: 'da200003-bbbb-4000-b000-000000000003', client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    process_id: 'f1000001-aaaa-4000-b000-c00000000001', proponente: 'f1',
    doc_type: 'f1_recibos', label: 'Recibos de vencimento', is_mandatory: true, max_files: 5, sort_order: 3, status: 'approved' },
  { id: 'da200004-bbbb-4000-b000-000000000004', client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    process_id: 'f1000001-aaaa-4000-b000-c00000000001', proponente: 'shared',
    doc_type: 'cpcv', label: 'CPCV', is_mandatory: true, max_files: 2, sort_order: 4, status: 'approved' },

  // Marta + João — all approved
  { id: 'da300001-cccc-4000-b000-000000000001', client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    process_id: 'f2000002-bbbb-4000-b000-c00000000002', proponente: 'f1',
    doc_type: 'f1_cc', label: 'Cartão de Cidadão (P1)', is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'da300002-cccc-4000-b000-000000000002', client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    process_id: 'f2000002-bbbb-4000-b000-c00000000002', proponente: 'f1',
    doc_type: 'f1_irs', label: 'IRS P1', is_mandatory: true, max_files: 3, sort_order: 2, status: 'approved' },
  { id: 'da300003-cccc-4000-b000-000000000003', client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    process_id: 'f2000002-bbbb-4000-b000-c00000000002', proponente: 'f2',
    doc_type: 'f2_cc', label: 'Cartão de Cidadão (P2)', is_mandatory: true, max_files: 2, sort_order: 3, status: 'approved' },
  { id: 'da300004-cccc-4000-b000-000000000004', client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    process_id: 'f2000002-bbbb-4000-b000-c00000000002', proponente: 'f2',
    doc_type: 'f2_irs', label: 'IRS P2', is_mandatory: true, max_files: 3, sort_order: 4, status: 'approved' },
  { id: 'da300005-cccc-4000-b000-000000000005', client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    process_id: 'f2000002-bbbb-4000-b000-c00000000002', proponente: 'shared',
    doc_type: 'cpcv', label: 'CPCV', is_mandatory: true, max_files: 2, sort_order: 5, status: 'approved' },

  // Nuno Gomes — docs_complete: all approved
  { id: 'da400001-dddd-4000-b000-000000000001', client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    process_id: 'f7000007-aaaa-4000-b000-c00000000007', proponente: 'f1',
    doc_type: 'f1_cc', label: 'Cartão de Cidadão', is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'da400002-dddd-4000-b000-000000000002', client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    process_id: 'f7000007-aaaa-4000-b000-c00000000007', proponente: 'f1',
    doc_type: 'f1_irs', label: 'Declaração IRS', is_mandatory: true, max_files: 3, sort_order: 2, status: 'approved' },
  { id: 'da400003-dddd-4000-b000-000000000003', client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    process_id: 'f7000007-aaaa-4000-b000-c00000000007', proponente: 'f1',
    doc_type: 'f1_recibos', label: 'Recibos de vencimento', is_mandatory: true, max_files: 5, sort_order: 3, status: 'approved' },
  { id: 'da400004-dddd-4000-b000-000000000004', client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    process_id: 'f7000007-aaaa-4000-b000-c00000000007', proponente: 'shared',
    doc_type: 'cpcv', label: 'CPCV', is_mandatory: true, max_files: 2, sort_order: 4, status: 'approved' },
  { id: 'da400005-dddd-4000-b000-000000000005', client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    process_id: 'f7000007-aaaa-4000-b000-c00000000007', proponente: 'shared',
    doc_type: 'certidao_registo', label: 'Certidão do Registo Predial', is_mandatory: false, max_files: 2, sort_order: 5, status: 'approved' },
]);

// ── BANK PROPOSTAS ───────────────────────────────────────────────────────────
console.log('\n→ Bank propostas');
await upsert('bank_propostas', [
  // Ricardo Fonseca — 3 proposals
  { id: 'ba100001-aaaa-4000-b000-000000000001',
    client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    process_id: 'f1000001-aaaa-4000-b000-c00000000001',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'CGD', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.85, tan: 3.77, taeg: 4.01,
    loan_amount: 236000, term_months: 360, monthly_payment: 1105,
    vida_banco: 27.50, multiriscos_banco: 17.00,
    comissao_avaliacao: 350, imposto_selo_mutuo: 1868, registo: 300, manutencao_conta: 7.50,
    notes: 'CGD melhor spread. Exige domiciliação de ordenado e seguro vida na CGD.',
    created_at: ago(8), updated_at: ago(8) },

  { id: 'ba100002-aaaa-4000-b000-000000000002',
    client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    process_id: 'f1000001-aaaa-4000-b000-c00000000001',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'Novo Banco', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.95, tan: 3.87, taeg: 4.12,
    loan_amount: 236000, term_months: 360, monthly_payment: 1118,
    vida_banco: 30.00, multiriscos_banco: 19.00,
    comissao_avaliacao: 300, imposto_selo_mutuo: 1868, registo: 300, manutencao_conta: 5.00,
    notes: 'Novo Banco sem obrigatoriedade de seguros internos.',
    created_at: ago(7), updated_at: ago(7) },

  { id: 'ba100003-aaaa-4000-b000-000000000003',
    client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    process_id: 'f1000001-aaaa-4000-b000-c00000000001',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'Santander', rate_type: 'mista', euribor_index: '6m',
    fixed_period_years: 5,
    spread: 0.80, tan: 3.72, taeg: 3.98,
    loan_amount: 236000, term_months: 360, monthly_payment: 1096,
    vida_banco: 28.00, multiriscos_banco: 18.50,
    comissao_avaliacao: 350, comissao_estudo: 150, imposto_selo_mutuo: 1868, registo: 300, manutencao_conta: 6.00,
    notes: 'Santander taxa mista: 5 anos a 2.90% fixo, depois variável com spread 0.80. Ideal para estabilidade inicial.',
    created_at: ago(6), updated_at: ago(6) },

  // Marta + João Pereira — 2 proposals (approved: Santander chosen)
  { id: 'ba200001-bbbb-4000-b000-000000000001',
    client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    process_id: 'f2000002-bbbb-4000-b000-c00000000002',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'Santander', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.85, tan: 3.77, taeg: 4.00,
    loan_amount: 272000, term_months: 360, monthly_payment: 1273,
    vida_banco: 38.00, multiriscos_banco: 24.00,
    comissao_avaliacao: 350, imposto_selo_mutuo: 2149, registo: 350, manutencao_conta: 6.50,
    notes: 'Santander aprovado. Escritura marcada para maio.',
    created_at: ago(55), updated_at: ago(55) },

  { id: 'ba200002-bbbb-4000-b000-000000000002',
    client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7',
    process_id: 'f2000002-bbbb-4000-b000-c00000000002',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'BPI', rate_type: 'variavel', euribor_index: '6m',
    spread: 1.00, tan: 3.92, taeg: 4.18,
    loan_amount: 272000, term_months: 360, monthly_payment: 1289,
    vida_banco: 35.00, multiriscos_banco: 22.00,
    comissao_avaliacao: 300, comissao_estudo: 100, imposto_selo_mutuo: 2149, registo: 350, manutencao_conta: 5.50,
    notes: 'BPI spread mais alto. Cliente preferiu Santander.',
    created_at: ago(55), updated_at: ago(55) },

  // Pedro + Ana Alves — 2 proposals (approved: CGD chosen)
  { id: 'ba300001-cccc-4000-b000-000000000001',
    client_id: 'd4e5f6a7-4444-4d0e-1f2a-b4c5d6e7f8a9',
    process_id: 'f4000004-dddd-4000-b000-c00000000004',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'CGD', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.90, tan: 3.82, taeg: 4.05,
    loan_amount: 184000, term_months: 300, monthly_payment: 960,
    vida_banco: 31.00, multiriscos_banco: 20.00,
    comissao_avaliacao: 350, imposto_selo_mutuo: 1455, registo: 300, manutencao_conta: 7.50,
    notes: 'CGD aprovado. Casal já tem conta na CGD, facilitou processo.',
    created_at: ago(70), updated_at: ago(70) },

  { id: 'ba300002-cccc-4000-b000-000000000002',
    client_id: 'd4e5f6a7-4444-4d0e-1f2a-b4c5d6e7f8a9',
    process_id: 'f4000004-dddd-4000-b000-c00000000004',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'Millennium BCP', rate_type: 'variavel', euribor_index: '6m',
    spread: 1.00, tan: 3.92, taeg: 4.15,
    loan_amount: 184000, term_months: 300, monthly_payment: 973,
    vida_banco: 33.00, multiriscos_banco: 21.50,
    comissao_avaliacao: 300, comissao_estudo: 200, imposto_selo_mutuo: 1455, registo: 300, manutencao_conta: 6.00,
    notes: 'BCP alternativa com spread ligeiramente maior.',
    created_at: ago(70), updated_at: ago(70) },

  // Nuno Gomes — 3 proposals (docs_complete → a preparar)
  { id: 'ba400001-dddd-4000-b000-000000000001',
    client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    process_id: 'f7000007-aaaa-4000-b000-c00000000007',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'CGD', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.90, tan: 3.82, taeg: 4.06,
    loan_amount: 168000, term_months: 360, monthly_payment: 787,
    vida_banco: 24.00, multiriscos_banco: 16.00,
    comissao_avaliacao: 350, imposto_selo_mutuo: 1328, registo: 250, manutencao_conta: 7.50,
    notes: 'CGD pré-aprovada. A aguardar avaliação do imóvel.',
    created_at: ago(3), updated_at: ago(3) },

  { id: 'ba400002-dddd-4000-b000-000000000002',
    client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    process_id: 'f7000007-aaaa-4000-b000-c00000000007',
    broker_id: BROKER, office_id: OFFICE,
    bank_name: 'BPI', rate_type: 'mista', euribor_index: '6m',
    fixed_period_years: 3,
    spread: 0.85, tan: 3.77, taeg: 4.02,
    loan_amount: 168000, term_months: 360, monthly_payment: 781,
    vida_banco: 22.50, multiriscos_banco: 15.00,
    comissao_avaliacao: 300, imposto_selo_mutuo: 1328, registo: 250, manutencao_conta: 5.00,
    notes: 'BPI taxa mista 3 anos a 2.85% depois variável. Prestação inicial mais baixa.',
    created_at: ago(3), updated_at: ago(3) },
]);

// ── MAPA COMPARATIVO ─────────────────────────────────────────────────────────
console.log('\n→ Mapa comparativo');
await upsert('mapa_comparativo', [
  // Ricardo Fonseca — 3 proposals, CGD recommended, visible to client
  { id: 'ac100001-aaaa-4000-b000-000000000001',
    client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6',
    process_id: 'f1000001-aaaa-4000-b000-c00000000001',
    broker_id: BROKER, office_id: OFFICE,
    title: 'Comparativo Habitação Areeiro',
    proposta_ids: ['ba100001-aaaa-4000-b000-000000000001','ba100002-aaaa-4000-b000-000000000002','ba100003-aaaa-4000-b000-000000000003'],
    recommended_proposta_id: 'ba100001-aaaa-4000-b000-000000000001',
    highlighted_cells: { spread: true, monthly_payment: true },
    is_visible_to_client: true,
    created_at: ago(6), updated_at: ago(4) },

  // Nuno Gomes — 2 proposals, not yet visible
  { id: 'ac200001-bbbb-4000-b000-000000000001',
    client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2',
    process_id: 'f7000007-aaaa-4000-b000-c00000000007',
    broker_id: BROKER, office_id: OFFICE,
    title: 'Comparativo Habitação Azeitão',
    proposta_ids: ['ba400001-dddd-4000-b000-000000000001','ba400002-dddd-4000-b000-000000000002'],
    recommended_proposta_id: 'ba400002-dddd-4000-b000-000000000002',
    highlighted_cells: { spread: true, tan: true },
    is_visible_to_client: false,
    created_at: ago(2), updated_at: ago(2) },
]);

// ── BROKER NOTES ─────────────────────────────────────────────────────────────
console.log('\n→ Broker notes');
await upsert('broker_notes', [
  { client_id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8', process_id: 'f3000003-cccc-4000-b000-c00000000003',
    broker_id: BROKER, content: 'Sofia ligou preocupada com o prazo. Explicado que ainda há tempo antes da marcação da escritura. Vai enviar recibos esta semana.', created_at: ago(3) },
  { client_id: 'c3d4e5f6-3333-4c9d-0e1f-a3b4c5d6e7f8', process_id: 'f3000003-cccc-4000-b000-c00000000003',
    broker_id: BROKER, content: 'CPCV recebido e validado. Faltam apenas recibos e IRS.', created_at: ago(7) },

  { client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6', process_id: 'f1000001-aaaa-4000-b000-c00000000001',
    broker_id: BROKER, content: 'Ricardo prefere CGD mas está tentado pelo Santander pela taxa mista. Mapa enviado ontem. A aguardar decisão.', created_at: ago(4) },
  { client_id: 'a1b2c3d4-1111-4a7b-8c9d-e1f2a3b4c5d6', process_id: 'f1000001-aaaa-4000-b000-c00000000001',
    broker_id: BROKER, content: 'Reunião presencial marcada para explicar diferença taxa mista vs variável.', created_at: ago(9) },

  { client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7', process_id: 'f2000002-bbbb-4000-b000-c00000000002',
    broker_id: BROKER, content: 'Santander aprovou! Spread 0,85%, prestação 1273€. Casal muito satisfeito. Escritura marcada para 15 maio.', created_at: ago(1) },
  { client_id: 'b2c3d4e5-2222-4b8c-9d0e-f2a3b4c5d6e7', process_id: 'f2000002-bbbb-4000-b000-c00000000002',
    broker_id: BROKER, content: 'João preferiu Santander porque já tem conta lá e não quer mudar. Marta concordou.', created_at: ago(30) },

  { client_id: 'd4e5f6a7-4444-4d0e-1f2a-b4c5d6e7f8a9', process_id: 'f4000004-dddd-4000-b000-c00000000004',
    broker_id: BROKER, content: 'CGD aprovado com spread 0,90%. Pedro e Ana muito aliviados. A tratar da escritura com o advogado deles.', created_at: ago(3) },

  { client_id: 'e5f6a7b8-5555-4e1f-2a3b-c5d6e7f8a9b0', process_id: 'f5000005-eeee-4000-b000-c00000000005',
    broker_id: BROKER, content: 'Primeiro contacto — Luís quer moradia T4 no Estoril. Rendimentos como empresário são variáveis. Precisa de trazer IRS dos últimos 3 anos.', created_at: ago(3) },

  { client_id: 'a7b8c9d0-7777-4a3b-4c5d-e7f8a9b0c1d2', process_id: 'f7000007-aaaa-4000-b000-c00000000007',
    broker_id: BROKER, content: 'Documentação completa recebida. A preparar propostas CGD e BPI. Avaliação do imóvel agendada para próxima semana.', created_at: ago(5) },

  { client_id: 'f6a7b8c9-6666-4f2a-3b4c-d6e7f8a9b0c1', process_id: 'f6000006-ffff-4000-b000-c00000000006',
    broker_id: BROKER, content: 'Processo concluído com sucesso. BPI spread 0,95%. Teresa e Rui muito satisfeitos. Recomendaram-me a dois amigos.', created_at: ago(43) },
]);

console.log('\n✅ Seed complete!\n');
