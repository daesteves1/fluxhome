#!/usr/bin/env node
/**
 * Demo seed for office bf1bf46c-2d4e-461c-ba4d-a12a43294ba0
 * Creates: 2 brokers, 6 clients, processes at all stages,
 *          bank propostas, mapos, bank share links, broker notes, doc requests/uploads
 *
 * node scripts/seed-demo-office.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
const envVars = {};
try {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=][^=]*)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch {}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing credentials'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const OFFICE = 'bf1bf46c-2d4e-461c-ba4d-a12a43294ba0';

// Fixed broker record IDs (predictable, idempotent re-runs)
const BROKER1 = '00b10001-0000-4001-8001-000000000001'; // Ana Costa — office admin
const BROKER2 = '00b20002-0000-4002-8002-000000000002'; // Miguel Santos

// Client IDs
const C1 = '10000001-0000-4001-8001-000000000001'; // Carla Rodrigues — propostas_sent
const C2 = '20000002-0000-4002-8002-000000000002'; // Bruno & Sara Ferreira — approved
const C3 = '30000003-0000-4003-8003-000000000003'; // Inês Oliveira — docs_pending
const C4 = '40000004-0000-4004-8004-000000000004'; // Tiago & Beatriz Sousa — docs_complete
const C5 = '50000005-0000-4005-8005-000000000005'; // Filipe Monteiro — lead
const C6 = '60000006-0000-4006-8006-000000000006'; // Helena & Paulo Neves — closed

// Process IDs
const PR1 = '11000001-0000-4001-8001-000000000001';
const PR2 = '22000002-0000-4002-8002-000000000002';
const PR3 = '33000003-0000-4003-8003-000000000003';
const PR4 = '44000004-0000-4004-8004-000000000004';
const PR5 = '55000005-0000-4005-8005-000000000005';
const PR6 = '66000006-0000-4006-8006-000000000006';

// Bank proposta IDs
const BP1a = '1a000001-0000-4001-8001-000000000001'; // Carla — CGD (recommended)
const BP1b = '1b000001-0000-4001-8001-000000000002'; // Carla — NovoBanco
const BP1c = '1c000001-0000-4001-8001-000000000003'; // Carla — Santander mista
const BP2a = '2a000002-0000-4002-8002-000000000001'; // Bruno/Sara — Santander (chosen)
const BP2b = '2b000002-0000-4002-8002-000000000002'; // Bruno/Sara — BPI
const BP4a = '4a000004-0000-4004-8004-000000000001'; // Tiago/Beatriz — CGD
const BP4b = '4b000004-0000-4004-8004-000000000002'; // Tiago/Beatriz — Millennium BCP
const BP6a = '6a000006-0000-4006-8006-000000000001'; // Helena/Paulo — BPI (chosen)
const BP6b = '6b000006-0000-4006-8006-000000000002'; // Helena/Paulo — Santander

// Mapa comparativo IDs
const MC1 = 'ac100001-0000-4001-8001-000000000001'; // Carla — visible to client
const MC2 = 'ac200002-0000-4002-8002-000000000001'; // Bruno/Sara — visible (approved)
const MC6 = 'ac600006-0000-4006-8006-000000000001'; // Helena/Paulo — historical

// Bank share link IDs
const BSL1 = 'b5100001-0000-4001-8001-000000000001'; // Carla → CGD gestor
const BSL2 = 'b5200004-0000-4004-8004-000000000001'; // Tiago/Beatriz → Millennium BCP

function ago(days) {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
}
function future(days) {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString();
}

async function upsert(table, rows) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (error) console.warn(`  ⚠ ${table}:`, error.message);
  else console.log(`  ✓ ${table} (${Array.isArray(rows) ? rows.length : 1} rows)`);
}

async function createOrGetUser(email, name, password) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find(u => u.email === email);
  if (existing) {
    console.log(`  ✓ Auth user exists: ${email} (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { name }
  });
  if (error) { console.warn(`  ⚠ createUser ${email}:`, error.message); return null; }
  console.log(`  ✓ Auth user created: ${email} (${data.user.id})`);
  return data.user.id;
}

// ── DUMMY PDF for document uploads ───────────────────────────────────────────
const DUMMY_PDF_PATH = `${OFFICE}/demo/placeholder.pdf`;
const DUMMY_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/MediaBox[0 0 595 842]>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n' +
  '0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF\n'
);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Upload dummy PDF to storage
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Storage: uploading dummy PDF...');
const { error: storageErr } = await sb.storage
  .from('client-documents')
  .upload(DUMMY_PDF_PATH, DUMMY_PDF, { contentType: 'application/pdf', upsert: true });
if (storageErr) console.warn('  ⚠ Storage upload:', storageErr.message);
else console.log('  ✓ Dummy PDF at', DUMMY_PDF_PATH);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Auth users & brokers
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Auth users...');
const userId1 = await createOrGetUser(
  'ana.costa.demo@fluxhome-demo.pt', 'Ana Costa', 'FluxDemo2026#'
);
const userId2 = await createOrGetUser(
  'miguel.santos.demo@fluxhome-demo.pt', 'Miguel Santos', 'FluxDemo2026#'
);
if (!userId1 || !userId2) { console.error('Failed to get/create broker users'); process.exit(1); }

console.log('\n→ public.users...');
await upsert('users', [
  {
    id: userId1,
    email: 'ana.costa.demo@fluxhome-demo.pt',
    name: 'Ana Costa',
    role: 'broker',
    phone: '+351 912 100 200',
    two_fa_enabled: false,
    created_at: ago(180),
  },
  {
    id: userId2,
    email: 'miguel.santos.demo@fluxhome-demo.pt',
    name: 'Miguel Santos',
    role: 'broker',
    phone: '+351 923 300 400',
    two_fa_enabled: false,
    created_at: ago(90),
  },
]);

console.log('\n→ Brokers...');
await upsert('brokers', [
  {
    id: BROKER1,
    user_id: userId1,
    office_id: OFFICE,
    is_office_admin: true,
    is_active: true,
    settings: { propostas_enabled: true },
    invited_at: ago(185),
    activated_at: ago(180),
  },
  {
    id: BROKER2,
    user_id: userId2,
    office_id: OFFICE,
    is_office_admin: false,
    is_active: true,
    settings: { propostas_enabled: true },
    invited_at: ago(95),
    activated_at: ago(90),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Clients
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Clients...');
await upsert('clients', [

  // C1 — Carla Rodrigues — 1 proponente — propostas_sent
  {
    id: C1, broker_id: BROKER1, office_id: OFFICE,
    p1_name: 'Carla Rodrigues',
    p1_nif: '123456789',
    p1_email: 'carla.rodrigues@gmail.com',
    p1_phone: '+351 912 111 222',
    p1_birth_date: '1988-03-15',
    p1_employment_type: 'Trabalhador por conta de outrem',
    property_address: 'Av. da República 45, 3.º Dto, Lisboa',
    notes_general: 'T3 no Areeiro. Cliente muito organizada.',
    portal_token: 'ab100001-0000-4001-8001-000000000001',
    created_at: ago(42),
    updated_at: ago(5),
  },

  // C2 — Bruno & Sara Ferreira — 2 proponentes — approved
  {
    id: C2, broker_id: BROKER1, office_id: OFFICE,
    p1_name: 'Bruno Ferreira',
    p1_nif: '234567890',
    p1_email: 'bruno.ferreira@gmail.com',
    p1_phone: '+351 923 222 333',
    p1_birth_date: '1983-07-28',
    p1_employment_type: 'Trabalhador por conta de outrem',
    p2_name: 'Sara Ferreira',
    p2_nif: '234567891',
    p2_email: 'sara.ferreira@gmail.com',
    p2_phone: '+351 934 333 444',
    p2_birth_date: '1985-11-14',
    p2_employment_type: 'Trabalhador por conta de outrem',
    property_address: 'Rua da Alegria 12, Porto',
    notes_general: 'Moradia T4 na Foz. Casal muito motivado.',
    portal_token: 'ab200002-0000-4002-8002-000000000001',
    created_at: ago(85),
    updated_at: ago(2),
  },

  // C3 — Inês Oliveira — 1 proponente — docs_pending
  {
    id: C3, broker_id: BROKER1, office_id: OFFICE,
    p1_name: 'Inês Oliveira',
    p1_nif: '345678901',
    p1_email: 'ines.oliveira@outlook.pt',
    p1_phone: '+351 945 444 555',
    p1_birth_date: '1993-05-20',
    p1_employment_type: 'Trabalhador por conta de outrem',
    property_address: 'Rua das Flores 7, Sintra',
    notes_general: 'T2 em Colares. Aguarda CPCV ainda não assinado.',
    portal_token: 'ab300003-0000-4003-8003-000000000001',
    created_at: ago(18),
    updated_at: ago(1),
  },

  // C4 — Tiago & Beatriz Sousa — 2 proponentes — docs_complete
  {
    id: C4, broker_id: BROKER2, office_id: OFFICE,
    p1_name: 'Tiago Sousa',
    p1_nif: '456789012',
    p1_email: 'tiago.sousa@gmail.com',
    p1_phone: '+351 916 555 666',
    p1_birth_date: '1980-09-05',
    p1_employment_type: 'Trabalhador por conta de outrem',
    p2_name: 'Beatriz Sousa',
    p2_nif: '456789013',
    p2_email: 'beatriz.sousa@gmail.com',
    p2_phone: '+351 927 666 777',
    p2_birth_date: '1982-02-18',
    p2_employment_type: 'Trabalhador por conta de outrem',
    property_address: 'Rua do Castelo 3, Braga',
    notes_general: 'T3 no centro de Braga. Documentação completa e impecável.',
    portal_token: 'ab400004-0000-4004-8004-000000000001',
    created_at: ago(32),
    updated_at: ago(3),
  },

  // C5 — Filipe Monteiro — 1 proponente — lead
  {
    id: C5, broker_id: BROKER2, office_id: OFFICE,
    p1_name: 'Filipe Monteiro',
    p1_nif: '567890123',
    p1_email: 'filipe.monteiro@netcabo.pt',
    p1_phone: '+351 938 777 888',
    p1_birth_date: '1975-12-01',
    p1_employment_type: 'Trabalhador independente',
    property_address: 'Av. Marginal, Estoril, Cascais',
    notes_general: 'Moradia de luxo T5 no Estoril. Rendimentos variáveis como empresário.',
    portal_token: 'ab500005-0000-4005-8005-000000000001',
    created_at: ago(5),
    updated_at: ago(5),
  },

  // C6 — Helena & Paulo Neves — 2 proponentes — closed
  {
    id: C6, broker_id: BROKER2, office_id: OFFICE,
    p1_name: 'Helena Neves',
    p1_nif: '678901234',
    p1_email: 'helena.neves@gmail.com',
    p1_phone: '+351 912 888 999',
    p1_birth_date: '1979-06-30',
    p1_employment_type: 'Trabalhador por conta de outrem',
    p2_name: 'Paulo Neves',
    p2_nif: '678901235',
    p2_email: 'paulo.neves@gmail.com',
    p2_phone: '+351 923 999 000',
    p2_birth_date: '1977-04-12',
    p2_employment_type: 'Trabalhador por conta de outrem',
    property_address: 'Rua do Azinheiro 22, Azeitão, Setúbal',
    notes_general: 'T3 em Azeitão. Processo concluído — BPI spread 0,90%.',
    portal_token: 'ab600006-0000-4006-8006-000000000001',
    created_at: ago(165),
    updated_at: ago(55),
    terms_accepted_at: ago(160),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Processes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Processes...');
await upsert('processes', [

  // PR1 — Carla — propostas_sent
  {
    id: PR1, client_id: C1, broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'propostas_sent',
    valor_imovel: 380000, montante_solicitado: 304000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente',
    localizacao_imovel: 'Lisboa — Areeiro',
    p1_profissao: 'Gestora de Marketing',
    p1_entidade_empregadora: 'MediaGroup Portugal SA',
    p1_tipo_contrato: 'Contrato sem termo',
    p1_rendimento_mensal: 3800,
    observacoes: 'T3 no Areeiro perto do metro. Carla está a analisar o comparativo. Prefere CGD mas está curiosa com a taxa mista do Santander.',
    created_at: ago(40), updated_at: ago(5),
  },

  // PR2 — Bruno & Sara — approved
  {
    id: PR2, client_id: C2, broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'approved',
    valor_imovel: 450000, montante_solicitado: 360000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente',
    localizacao_imovel: 'Porto — Foz do Douro',
    p1_profissao: 'Engenheiro Civil',
    p1_entidade_empregadora: 'Câmara Municipal do Porto',
    p1_tipo_contrato: 'Contrato sem termo',
    p1_rendimento_mensal: 4200,
    p2_profissao: 'Advogada',
    p2_entidade_empregadora: 'Ferreira & Costa Advogados',
    p2_tipo_contrato: 'Contrato sem termo',
    p2_rendimento_mensal: 3900,
    observacoes: 'Moradia T4 na Foz. Santander aprovou com spread 0,85%. Escritura marcada para 12 de junho.',
    created_at: ago(82), updated_at: ago(2),
  },

  // PR3 — Inês — docs_pending
  {
    id: PR3, client_id: C3, broker_id: BROKER1, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'docs_pending',
    valor_imovel: 195000, montante_solicitado: 156000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente',
    localizacao_imovel: 'Sintra — Colares',
    p1_profissao: 'Arquiteta',
    p1_entidade_empregadora: 'Atelier Oliveira & Associados',
    p1_tipo_contrato: 'Contrato sem termo',
    p1_rendimento_mensal: 2200,
    observacoes: 'T2 em Colares. Falta IRS, recibos e CPCV. Inês disse que envia esta semana.',
    created_at: ago(16), updated_at: ago(1),
  },

  // PR4 — Tiago & Beatriz — docs_complete
  {
    id: PR4, client_id: C4, broker_id: BROKER2, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'docs_complete',
    valor_imovel: 250000, montante_solicitado: 200000, prazo_meses: 300,
    finalidade: 'Habitação própria permanente',
    localizacao_imovel: 'Braga — Centro Histórico',
    p1_profissao: 'Professor Universitário',
    p1_entidade_empregadora: 'Universidade do Minho',
    p1_tipo_contrato: 'Contrato sem termo',
    p1_rendimento_mensal: 3200,
    p2_profissao: 'Fisioterapeuta',
    p2_entidade_empregadora: 'Clínica Saúde Braga',
    p2_tipo_contrato: 'Contrato sem termo',
    p2_rendimento_mensal: 2400,
    observacoes: 'T3 no centro de Braga. Documentação toda recebida e aprovada. A finalizar propostas CGD e BCP.',
    created_at: ago(28), updated_at: ago(3),
  },

  // PR5 — Filipe — lead
  {
    id: PR5, client_id: C5, broker_id: BROKER2, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'lead',
    valor_imovel: 720000, montante_solicitado: 576000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente',
    localizacao_imovel: 'Cascais — Estoril',
    p1_profissao: 'Empresário',
    p1_entidade_empregadora: 'Monteiro & Associados Lda',
    p1_tipo_contrato: 'Trabalhador independente',
    p1_rendimento_mensal: 8000,
    observacoes: 'Moradia T5 no Estoril. Primeiro contacto. Rendimentos irregulares como sócio-gerente — precisamos 3 anos de IRS e atas da empresa.',
    followup_at: future(3),
    followup_note: 'Ligar para confirmar envio de documentação fiscal',
    created_at: ago(5), updated_at: ago(5),
  },

  // PR6 — Helena & Paulo — closed
  {
    id: PR6, client_id: C6, broker_id: BROKER2, office_id: OFFICE,
    tipo: 'credito_habitacao', process_step: 'closed',
    valor_imovel: 280000, montante_solicitado: 224000, prazo_meses: 360,
    finalidade: 'Habitação própria permanente',
    localizacao_imovel: 'Setúbal — Azeitão',
    p1_profissao: 'Professora do Ensino Básico',
    p1_entidade_empregadora: 'Agrupamento de Escolas de Setúbal',
    p1_tipo_contrato: 'Contrato sem termo',
    p1_rendimento_mensal: 2600,
    p2_profissao: 'Técnico de Infraestruturas',
    p2_entidade_empregadora: 'TechNet Solutions SA',
    p2_tipo_contrato: 'Contrato sem termo',
    p2_rendimento_mensal: 3100,
    observacoes: 'Escritura realizada a 3 de março de 2026. BPI spread 0,90%. Processo concluído com sucesso. Recomendaram-nos a dois vizinhos.',
    followup_at: future(700),
    followup_note: 'Contactar para renegociação quando Euribor baixar abaixo de 1,5%',
    closed_at: ago(79),
    created_at: ago(162), updated_at: ago(79),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — Document requests
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Document requests...');

const docRows = [

  // ── C1 Carla — propostas_sent: all docs approved ──────────────────────────
  { id: 'd1100001-0000-4001-8001-000000000001', client_id: C1, process_id: PR1,
    proponente: 'p1', doc_type: 'cc', label: 'BI / Cartão de Cidadão',
    is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'd1100002-0000-4001-8001-000000000002', client_id: C1, process_id: PR1,
    proponente: 'p1', doc_type: 'morada', label: 'Comprovativo de Morada',
    is_mandatory: true, max_files: 1, sort_order: 2, status: 'approved' },
  { id: 'd1100003-0000-4001-8001-000000000003', client_id: C1, process_id: PR1,
    proponente: 'p1', doc_type: 'recibos', label: 'Últimos 3 Recibos de Vencimento',
    is_mandatory: true, max_files: 3, sort_order: 3, status: 'approved' },
  { id: 'd1100004-0000-4001-8001-000000000004', client_id: C1, process_id: PR1,
    proponente: 'p1', doc_type: 'irs', label: 'Declaração de IRS',
    is_mandatory: true, max_files: 1, sort_order: 4, status: 'approved' },
  { id: 'd1100005-0000-4001-8001-000000000005', client_id: C1, process_id: PR1,
    proponente: 'p1', doc_type: 'nota_liquidacao', label: 'Nota de Liquidação do IRS',
    is_mandatory: true, max_files: 1, sort_order: 5, status: 'approved' },
  { id: 'd1100006-0000-4001-8001-000000000006', client_id: C1, process_id: PR1,
    proponente: 'p1', doc_type: 'extratos', label: 'Extratos Bancários (3 meses)',
    is_mandatory: true, max_files: 3, sort_order: 6, status: 'approved' },
  { id: 'd1100007-0000-4001-8001-000000000007', client_id: C1, process_id: PR1,
    proponente: 'p1', doc_type: 'mapa_resp', label: 'Mapa de Responsabilidades',
    is_mandatory: true, max_files: 1, sort_order: 7, status: 'approved' },
  { id: 'd1100008-0000-4001-8001-000000000008', client_id: C1, process_id: PR1,
    proponente: 'shared', doc_type: 'cpcv', label: 'CPCV / Contrato Promessa',
    is_mandatory: false, max_files: 2, sort_order: 8, status: 'approved' },
  { id: 'd1100009-0000-4001-8001-000000000009', client_id: C1, process_id: PR1,
    proponente: 'shared', doc_type: 'caderneta', label: 'Caderneta Predial',
    is_mandatory: false, max_files: 1, sort_order: 9, status: 'approved' },

  // ── C2 Bruno & Sara — approved: all docs approved ─────────────────────────
  { id: 'd2200001-0000-4002-8002-000000000001', client_id: C2, process_id: PR2,
    proponente: 'p1', doc_type: 'cc', label: 'BI / Cartão de Cidadão (Bruno)',
    is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'd2200002-0000-4002-8002-000000000002', client_id: C2, process_id: PR2,
    proponente: 'p1', doc_type: 'morada', label: 'Comprovativo de Morada (Bruno)',
    is_mandatory: true, max_files: 1, sort_order: 2, status: 'approved' },
  { id: 'd2200003-0000-4002-8002-000000000003', client_id: C2, process_id: PR2,
    proponente: 'p1', doc_type: 'recibos', label: 'Recibos de Vencimento (Bruno)',
    is_mandatory: true, max_files: 3, sort_order: 3, status: 'approved' },
  { id: 'd2200004-0000-4002-8002-000000000004', client_id: C2, process_id: PR2,
    proponente: 'p1', doc_type: 'irs', label: 'Declaração IRS (Bruno)',
    is_mandatory: true, max_files: 1, sort_order: 4, status: 'approved' },
  { id: 'd2200005-0000-4002-8002-000000000005', client_id: C2, process_id: PR2,
    proponente: 'p2', doc_type: 'cc', label: 'BI / Cartão de Cidadão (Sara)',
    is_mandatory: true, max_files: 2, sort_order: 5, status: 'approved' },
  { id: 'd2200006-0000-4002-8002-000000000006', client_id: C2, process_id: PR2,
    proponente: 'p2', doc_type: 'morada', label: 'Comprovativo de Morada (Sara)',
    is_mandatory: true, max_files: 1, sort_order: 6, status: 'approved' },
  { id: 'd2200007-0000-4002-8002-000000000007', client_id: C2, process_id: PR2,
    proponente: 'p2', doc_type: 'recibos', label: 'Recibos de Vencimento (Sara)',
    is_mandatory: true, max_files: 3, sort_order: 7, status: 'approved' },
  { id: 'd2200008-0000-4002-8002-000000000008', client_id: C2, process_id: PR2,
    proponente: 'p2', doc_type: 'irs', label: 'Declaração IRS (Sara)',
    is_mandatory: true, max_files: 1, sort_order: 8, status: 'approved' },
  { id: 'd2200009-0000-4002-8002-000000000009', client_id: C2, process_id: PR2,
    proponente: 'shared', doc_type: 'cpcv', label: 'CPCV / Contrato Promessa',
    is_mandatory: false, max_files: 2, sort_order: 9, status: 'approved' },
  { id: 'd220000a-0000-4002-8002-00000000000a', client_id: C2, process_id: PR2,
    proponente: 'shared', doc_type: 'caderneta', label: 'Caderneta Predial',
    is_mandatory: false, max_files: 1, sort_order: 10, status: 'approved' },

  // ── C3 Inês — docs_pending: mixed statuses ────────────────────────────────
  { id: 'd3300001-0000-4003-8003-000000000001', client_id: C3, process_id: PR3,
    proponente: 'p1', doc_type: 'cc', label: 'BI / Cartão de Cidadão',
    is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'd3300002-0000-4003-8003-000000000002', client_id: C3, process_id: PR3,
    proponente: 'p1', doc_type: 'morada', label: 'Comprovativo de Morada',
    is_mandatory: true, max_files: 1, sort_order: 2, status: 'em_analise',
    broker_notes: 'Recebido — a validar se tem menos de 3 meses' },
  { id: 'd3300003-0000-4003-8003-000000000003', client_id: C3, process_id: PR3,
    proponente: 'p1', doc_type: 'recibos', label: 'Últimos 3 Recibos de Vencimento',
    is_mandatory: true, max_files: 3, sort_order: 3, status: 'pending' },
  { id: 'd3300004-0000-4003-8003-000000000004', client_id: C3, process_id: PR3,
    proponente: 'p1', doc_type: 'irs', label: 'Declaração de IRS',
    is_mandatory: true, max_files: 1, sort_order: 4, status: 'pending' },
  { id: 'd3300005-0000-4003-8003-000000000005', client_id: C3, process_id: PR3,
    proponente: 'p1', doc_type: 'extratos', label: 'Extratos Bancários (3 meses)',
    is_mandatory: true, max_files: 3, sort_order: 5, status: 'pending' },
  { id: 'd3300006-0000-4003-8003-000000000006', client_id: C3, process_id: PR3,
    proponente: 'shared', doc_type: 'cpcv', label: 'CPCV / Contrato Promessa',
    is_mandatory: false, max_files: 2, sort_order: 6, status: 'pending',
    broker_notes: 'CPCV ainda não assinado — a aguardar negociação com o vendedor' },

  // ── C4 Tiago & Beatriz — docs_complete: all approved ──────────────────────
  { id: 'd4400001-0000-4004-8004-000000000001', client_id: C4, process_id: PR4,
    proponente: 'p1', doc_type: 'cc', label: 'BI / Cartão de Cidadão (Tiago)',
    is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'd4400002-0000-4004-8004-000000000002', client_id: C4, process_id: PR4,
    proponente: 'p1', doc_type: 'morada', label: 'Comprovativo de Morada (Tiago)',
    is_mandatory: true, max_files: 1, sort_order: 2, status: 'approved' },
  { id: 'd4400003-0000-4004-8004-000000000003', client_id: C4, process_id: PR4,
    proponente: 'p1', doc_type: 'recibos', label: 'Recibos de Vencimento (Tiago)',
    is_mandatory: true, max_files: 3, sort_order: 3, status: 'approved' },
  { id: 'd4400004-0000-4004-8004-000000000004', client_id: C4, process_id: PR4,
    proponente: 'p1', doc_type: 'irs', label: 'Declaração IRS (Tiago)',
    is_mandatory: true, max_files: 1, sort_order: 4, status: 'approved' },
  { id: 'd4400005-0000-4004-8004-000000000005', client_id: C4, process_id: PR4,
    proponente: 'p1', doc_type: 'extratos', label: 'Extratos Bancários (Tiago)',
    is_mandatory: true, max_files: 3, sort_order: 5, status: 'approved' },
  { id: 'd4400006-0000-4004-8004-000000000006', client_id: C4, process_id: PR4,
    proponente: 'p2', doc_type: 'cc', label: 'BI / Cartão de Cidadão (Beatriz)',
    is_mandatory: true, max_files: 2, sort_order: 6, status: 'approved' },
  { id: 'd4400007-0000-4004-8004-000000000007', client_id: C4, process_id: PR4,
    proponente: 'p2', doc_type: 'morada', label: 'Comprovativo de Morada (Beatriz)',
    is_mandatory: true, max_files: 1, sort_order: 7, status: 'approved' },
  { id: 'd4400008-0000-4004-8004-000000000008', client_id: C4, process_id: PR4,
    proponente: 'p2', doc_type: 'recibos', label: 'Recibos de Vencimento (Beatriz)',
    is_mandatory: true, max_files: 3, sort_order: 8, status: 'approved' },
  { id: 'd4400009-0000-4004-8004-000000000009', client_id: C4, process_id: PR4,
    proponente: 'p2', doc_type: 'irs', label: 'Declaração IRS (Beatriz)',
    is_mandatory: true, max_files: 1, sort_order: 9, status: 'approved' },
  { id: 'd440000a-0000-4004-8004-00000000000a', client_id: C4, process_id: PR4,
    proponente: 'shared', doc_type: 'cpcv', label: 'CPCV / Contrato Promessa',
    is_mandatory: false, max_files: 2, sort_order: 10, status: 'approved' },
  { id: 'd440000b-0000-4004-8004-00000000000b', client_id: C4, process_id: PR4,
    proponente: 'shared', doc_type: 'caderneta', label: 'Caderneta Predial',
    is_mandatory: false, max_files: 1, sort_order: 11, status: 'approved' },

  // ── C5 Filipe — lead: só o CC pedido ──────────────────────────────────────
  { id: 'd5500001-0000-4005-8005-000000000001', client_id: C5, process_id: PR5,
    proponente: 'p1', doc_type: 'cc', label: 'BI / Cartão de Cidadão',
    is_mandatory: true, max_files: 2, sort_order: 1, status: 'pending' },
  { id: 'd5500002-0000-4005-8005-000000000002', client_id: C5, process_id: PR5,
    proponente: 'p1', doc_type: 'irs', label: 'Declaração de IRS (3 anos)',
    is_mandatory: true, max_files: 3, sort_order: 2, status: 'pending',
    broker_notes: 'Necessário IRS dos últimos 3 anos por ser trabalhador independente' },

  // ── C6 Helena & Paulo — closed: all approved ──────────────────────────────
  { id: 'd6600001-0000-4006-8006-000000000001', client_id: C6, process_id: PR6,
    proponente: 'p1', doc_type: 'cc', label: 'BI / Cartão de Cidadão (Helena)',
    is_mandatory: true, max_files: 2, sort_order: 1, status: 'approved' },
  { id: 'd6600002-0000-4006-8006-000000000002', client_id: C6, process_id: PR6,
    proponente: 'p1', doc_type: 'irs', label: 'Declaração IRS (Helena)',
    is_mandatory: true, max_files: 1, sort_order: 2, status: 'approved' },
  { id: 'd6600003-0000-4006-8006-000000000003', client_id: C6, process_id: PR6,
    proponente: 'p1', doc_type: 'recibos', label: 'Recibos de Vencimento (Helena)',
    is_mandatory: true, max_files: 3, sort_order: 3, status: 'approved' },
  { id: 'd6600004-0000-4006-8006-000000000004', client_id: C6, process_id: PR6,
    proponente: 'p2', doc_type: 'cc', label: 'BI / Cartão de Cidadão (Paulo)',
    is_mandatory: true, max_files: 2, sort_order: 4, status: 'approved' },
  { id: 'd6600005-0000-4006-8006-000000000005', client_id: C6, process_id: PR6,
    proponente: 'p2', doc_type: 'irs', label: 'Declaração IRS (Paulo)',
    is_mandatory: true, max_files: 1, sort_order: 5, status: 'approved' },
  { id: 'd6600006-0000-4006-8006-000000000006', client_id: C6, process_id: PR6,
    proponente: 'p2', doc_type: 'recibos', label: 'Recibos de Vencimento (Paulo)',
    is_mandatory: true, max_files: 3, sort_order: 6, status: 'approved' },
  { id: 'd6600007-0000-4006-8006-000000000007', client_id: C6, process_id: PR6,
    proponente: 'shared', doc_type: 'cpcv', label: 'CPCV / Contrato Promessa',
    is_mandatory: false, max_files: 2, sort_order: 7, status: 'approved' },
  { id: 'd6600008-0000-4006-8006-000000000008', client_id: C6, process_id: PR6,
    proponente: 'shared', doc_type: 'certidao', label: 'Certidão Permanente do Imóvel',
    is_mandatory: false, max_files: 1, sort_order: 8, status: 'approved' },
];

await upsert('document_requests', docRows);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — Document uploads (for approved & em_analise docs)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Document uploads...');

// Build upload rows for all approved/em_analise docs
const approvedOrAnalise = docRows.filter(d => d.status === 'approved' || d.status === 'em_analise');
const cleanUploadRows = approvedOrAnalise.map((d, i) => {
  const n = (i + 1).toString(16).padStart(4, '0');
  // 8 chars: 'd' + 4-hex-n + '000' = 1+4+3 = 8 ✓
  return {
    id: `d${n}000-0000-4001-8001-000000000001`,
    document_request_id: d.id,
    client_id: d.client_id,
    storage_path: DUMMY_PDF_PATH,
    file_name: `documento_${d.doc_type}.pdf`,
    file_size: 1024,
    mime_type: 'application/pdf',
    uploaded_by: 'client',
    uploaded_at: ago(Math.ceil(i * 0.5) + 1),
  };
});

await upsert('document_uploads', cleanUploadRows);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7 — Bank propostas
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Bank propostas...');
// Euribor 6m ~2.10% as of mid-2026
await upsert('bank_propostas', [

  // ── C1 Carla — 3 propostas (propostas_sent) ───────────────────────────────
  {
    id: BP1a, client_id: C1, process_id: PR1, broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'CGD', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.85, tan: 2.95, taeg: 3.18,
    loan_amount: 304000, term_months: 360, monthly_payment: 1278,
    vida_banco: 31.50, multiriscos_banco: 19.00,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 350, comissao_estudo: null, abertura_processo: null,
    comissao_formalizacao: null, imposto_selo_mutuo: 2406, registo: 350,
    manutencao_conta: 7.50, manutencao_anual: false,
    notes: 'CGD melhor spread. Exige domiciliação de ordenado e seguro vida interno. Solução mais estável com conta já existente.',
    created_at: ago(10), updated_at: ago(10),
  },
  {
    id: BP1b, client_id: C1, process_id: PR1, broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'Novo Banco', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.95, tan: 3.05, taeg: 3.28,
    loan_amount: 304000, term_months: 360, monthly_payment: 1291,
    vida_banco: 34.00, multiriscos_banco: 21.00,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 300, imposto_selo_mutuo: 2406, registo: 350,
    manutencao_conta: 5.00, manutencao_anual: false,
    notes: 'NovoBanco não exige domiciliação de ordenado. Seguros internos ligeiramente mais caros.',
    created_at: ago(9), updated_at: ago(9),
  },
  {
    id: BP1c, client_id: C1, process_id: PR1, broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'Santander', rate_type: 'mista', euribor_index: '6m',
    fixed_period_years: 5,
    spread: 0.80, tan: 2.90, taeg: 3.12,
    loan_amount: 304000, term_months: 360, monthly_payment: 1268,
    vida_banco: 33.00, multiriscos_banco: 20.50,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 350, comissao_estudo: 100, imposto_selo_mutuo: 2406, registo: 350,
    manutencao_conta: 6.00, manutencao_anual: false,
    notes: 'Santander taxa mista: 5 anos a 2.10% fixo, depois variável com spread 0.80. Prestação inicial mais baixa — ideal se taxa baixar nos próximos anos.',
    created_at: ago(8), updated_at: ago(8),
  },

  // ── C2 Bruno & Sara — 2 propostas (approved — Santander escolhido) ────────
  {
    id: BP2a, client_id: C2, process_id: PR2, broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'Santander', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.85, tan: 2.95, taeg: 3.16,
    loan_amount: 360000, term_months: 360, monthly_payment: 1513,
    vida_banco: 46.00, multiriscos_banco: 28.00,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 400, imposto_selo_mutuo: 2849, registo: 400,
    manutencao_conta: 6.50, manutencao_anual: false,
    notes: 'Santander aprovado. Bruno já tem conta Santander — facilitou processo. Escritura 12 de junho.',
    created_at: ago(50), updated_at: ago(50),
  },
  {
    id: BP2b, client_id: C2, process_id: PR2, broker_id: BROKER1, office_id: OFFICE,
    bank_name: 'BPI', rate_type: 'variavel', euribor_index: '6m',
    spread: 1.00, tan: 3.10, taeg: 3.32,
    loan_amount: 360000, term_months: 360, monthly_payment: 1531,
    vida_banco: 43.00, multiriscos_banco: 25.50,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 350, comissao_estudo: 100, imposto_selo_mutuo: 2849, registo: 400,
    manutencao_conta: 5.50, manutencao_anual: false,
    notes: 'BPI spread mais elevado. Casal optou pelo Santander dado o relacionamento bancário já existente.',
    created_at: ago(50), updated_at: ago(50),
  },

  // ── C4 Tiago & Beatriz — 2 propostas (docs_complete — a enviar) ───────────
  {
    id: BP4a, client_id: C4, process_id: PR4, broker_id: BROKER2, office_id: OFFICE,
    bank_name: 'CGD', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.90, tan: 3.00, taeg: 3.22,
    loan_amount: 200000, term_months: 300, monthly_payment: 951,
    vida_banco: 28.50, multiriscos_banco: 17.50,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 350, imposto_selo_mutuo: 1582, registo: 300,
    manutencao_conta: 7.50, manutencao_anual: false,
    notes: 'CGD pré-aprovada com base no perfil de crédito. A aguardar avaliação do imóvel.',
    created_at: ago(4), updated_at: ago(4),
  },
  {
    id: BP4b, client_id: C4, process_id: PR4, broker_id: BROKER2, office_id: OFFICE,
    bank_name: 'Millennium BCP', rate_type: 'variavel', euribor_index: '6m',
    spread: 1.00, tan: 3.10, taeg: 3.33,
    loan_amount: 200000, term_months: 300, monthly_payment: 962,
    vida_banco: 30.00, multiriscos_banco: 19.00,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 300, comissao_estudo: 150, imposto_selo_mutuo: 1582, registo: 300,
    manutencao_conta: 6.00, manutencao_anual: false,
    notes: 'BCP spread ligeiramente maior mas com menos produto obrigatório. Boa alternativa à CGD.',
    created_at: ago(3), updated_at: ago(3),
  },

  // ── C6 Helena & Paulo — 2 propostas (closed — BPI escolhido) ─────────────
  {
    id: BP6a, client_id: C6, process_id: PR6, broker_id: BROKER2, office_id: OFFICE,
    bank_name: 'BPI', rate_type: 'variavel', euribor_index: '6m',
    spread: 0.90, tan: 3.00, taeg: 3.21,
    loan_amount: 224000, term_months: 360, monthly_payment: 942,
    vida_banco: 29.00, multiriscos_banco: 18.00,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 350, imposto_selo_mutuo: 1772, registo: 300,
    manutencao_conta: 5.50, manutencao_anual: false,
    notes: 'BPI aprovado. Helena e Paulo optaram pelo BPI — spread competitivo e boa relação com o gestor de conta.',
    created_at: ago(120), updated_at: ago(120),
  },
  {
    id: BP6b, client_id: C6, process_id: PR6, broker_id: BROKER2, office_id: OFFICE,
    bank_name: 'Santander', rate_type: 'variavel', euribor_index: '6m',
    spread: 1.00, tan: 3.10, taeg: 3.30,
    loan_amount: 224000, term_months: 360, monthly_payment: 954,
    vida_banco: 31.00, multiriscos_banco: 20.00,
    vida_externa: null, multiriscos_externa: null,
    comissao_avaliacao: 300, imposto_selo_mutuo: 1772, registo: 300,
    manutencao_conta: 6.00, manutencao_anual: false,
    notes: 'Santander spread superior. Casal preferiu BPI pela relação já estabelecida.',
    created_at: ago(120), updated_at: ago(120),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8 — Mapa comparativo
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Mapa comparativo...');
await upsert('mapa_comparativo', [

  // C1 — Carla — 3 propostas, CGD recomendada, VISÍVEL ao cliente
  {
    id: MC1, client_id: C1, process_id: PR1, broker_id: BROKER1, office_id: OFFICE,
    title: 'Comparativo Habitação — Areeiro',
    proposta_ids: JSON.stringify([BP1a, BP1b, BP1c]),
    recommended_proposta_id: BP1a,
    highlighted_cells: JSON.stringify({ spread: true, monthly_payment: true, tan: true }),
    is_visible_to_client: true,
    broker_notes: 'CGD é a proposta mais competitiva no spread. O Santander misto pode ser interessante se a taxa Euribor se mantiver elevada.',
    created_at: ago(8), updated_at: ago(5),
  },

  // C2 — Bruno/Sara — 2 propostas, Santander recomendado, visível (aprovado)
  {
    id: MC2, client_id: C2, process_id: PR2, broker_id: BROKER1, office_id: OFFICE,
    title: 'Comparativo Habitação — Foz do Douro',
    proposta_ids: JSON.stringify([BP2a, BP2b]),
    recommended_proposta_id: BP2a,
    highlighted_cells: JSON.stringify({ spread: true, monthly_payment: true }),
    is_visible_to_client: true,
    broker_notes: 'Santander foi aprovado e escolhido. BPI ficou como alternativa consultada.',
    created_at: ago(48), updated_at: ago(45),
  },

  // C6 — Helena/Paulo — 2 propostas, BPI recomendado, visível (histórico)
  {
    id: MC6, client_id: C6, process_id: PR6, broker_id: BROKER2, office_id: OFFICE,
    title: 'Comparativo Habitação — Azeitão',
    proposta_ids: JSON.stringify([BP6a, BP6b]),
    recommended_proposta_id: BP6a,
    highlighted_cells: JSON.stringify({ spread: true, tan: true }),
    is_visible_to_client: true,
    broker_notes: 'BPI escolhido. Processo encerrado.',
    created_at: ago(118), updated_at: ago(115),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 9 — Bank share links (contactos bancários)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Bank share links...');
await upsert('bank_share_links', [

  // C1 Carla — link enviado a gestor CGD (activo)
  {
    id: BSL1, client_id: C1, broker_id: BROKER1, process_id: PR1,
    bank_id: 'cgd', bank_name: 'CGD — Caixa Geral de Depósitos',
    contact_email: 'gestor.credito.areeiro@cgd.pt',
    note: 'Processo urgente — cliente quer escritura antes do verão. Dossiê completo.',
    expires_at: future(14),
    created_at: ago(3),
  },

  // C4 Tiago/Beatriz — link enviado a gestora Millennium BCP (activo)
  {
    id: BSL2, client_id: C4, broker_id: BROKER2, process_id: PR4,
    bank_id: 'millenniumbcp', bank_name: 'Millennium BCP',
    contact_email: 'patricia.almeida@millenniumbcp.pt',
    note: 'Casal com perfil excelente — funcionários públicos, sem encargos. Avaliação do imóvel agendada para esta semana.',
    expires_at: future(10),
    created_at: ago(1),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 10 — Broker notes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n→ Broker notes...');
await upsert('broker_notes', [

  // C1 Carla
  {
    id: 'b4100001-0000-4001-8001-000000000001',
    client_id: C1, process_id: PR1, broker_id: BROKER1,
    content: 'Comparativo enviado. Carla prefere CGD pelo spread mas está curiosa com a taxa mista do Santander. Agendei chamada para amanhã para explicar as diferenças.',
    created_at: ago(5),
  },
  {
    id: 'b4100002-0000-4001-8001-000000000002',
    client_id: C1, process_id: PR1, broker_id: BROKER1,
    content: 'Toda a documentação recebida e aprovada. Dossiê enviado às 3 instituições. A aguardar respostas.',
    created_at: ago(12),
  },

  // C2 Bruno & Sara
  {
    id: 'b4200001-0000-4002-8002-000000000001',
    client_id: C2, process_id: PR2, broker_id: BROKER1,
    content: 'Santander aprovou! Spread 0.85%, prestação 1.513€/mês. Bruno e Sara muito satisfeitos. Escritura marcada para 12 de junho com o notário deles.',
    created_at: ago(2),
  },
  {
    id: 'b4200002-0000-4002-8002-000000000002',
    client_id: C2, process_id: PR2, broker_id: BROKER1,
    content: 'Bruno preferiu Santander pois já tem conta lá há 15 anos — facilitou muito a análise de crédito. BPI ficou como alternativa.',
    created_at: ago(20),
  },
  {
    id: 'b4200003-0000-4002-8002-000000000003',
    client_id: C2, process_id: PR2, broker_id: BROKER1,
    content: 'Documentação recebida completa para os dois proponentes. Enviada às instituições bancárias ontem.',
    created_at: ago(55),
  },

  // C3 Inês
  {
    id: 'b4300001-0000-4003-8003-000000000001',
    client_id: C3, process_id: PR3, broker_id: BROKER1,
    content: 'Inês enviou CC e comprovativo de morada. Faltam recibos (diz que pediu à RH), IRS (vai ao portal das finanças hoje) e o CPCV (negociação ainda em curso com o vendedor).',
    created_at: ago(1),
  },
  {
    id: 'b4300002-0000-4003-8003-000000000002',
    client_id: C3, process_id: PR3, broker_id: BROKER1,
    content: 'Primeiro contacto. T2 em Colares, 195.000€. Inês é arquiteta, contrato sem termo, 2.200€ líquidos. LTV 80%, bom perfil para os bancos.',
    created_at: ago(16),
  },

  // C4 Tiago & Beatriz
  {
    id: 'b4400001-0000-4004-8004-000000000001',
    client_id: C4, process_id: PR4, broker_id: BROKER2,
    content: 'Propostas CGD e Millennium BCP em preparação. Avaliação do imóvel agendada para 5ª feira com perito da CGD. Mapa comparativo será enviado ao casal até sexta-feira.',
    created_at: ago(3),
  },
  {
    id: 'b4400002-0000-4004-8004-000000000002',
    client_id: C4, process_id: PR4, broker_id: BROKER2,
    content: 'Documentação completa e verificada para os dois proponentes. Perfil excelente — dois rendimentos estáveis no público. Nenhum encargo em dívida.',
    created_at: ago(8),
  },

  // C5 Filipe
  {
    id: 'b4500001-0000-4005-8005-000000000001',
    client_id: C5, process_id: PR5, broker_id: BROKER2,
    content: 'Primeiro contacto — Filipe quer moradia T5 no Estoril, 720.000€. É sócio-gerente com rendimentos variáveis. Precisamos de IRS dos últimos 3 anos + atas da empresa com distribuição de lucros. Follow-up em 3 dias.',
    created_at: ago(5),
  },

  // C6 Helena & Paulo
  {
    id: 'b4600001-0000-4006-8006-000000000001',
    client_id: C6, process_id: PR6, broker_id: BROKER2,
    content: 'Processo concluído com sucesso. BPI spread 0.90%, prestação 942€/mês. Helena e Paulo estão muito satisfeitos e já recomendaram o serviço a dois vizinhos.',
    created_at: ago(79),
  },
  {
    id: 'b4600002-0000-4006-8006-000000000002',
    client_id: C6, process_id: PR6, broker_id: BROKER2,
    content: 'Reminder criado para daqui a ~2 anos (quando Euribor deverá estar abaixo de 1.5%) para contactar sobre renegociação. Potencial poupança estimada de 80€/mês.',
    created_at: ago(78),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n✅ Demo seed complete!');
console.log('\nBroker accounts:');
console.log('  Ana Costa    → ana.costa.demo@fluxhome-demo.pt  (office admin)');
console.log('  Miguel Santos → miguel.santos.demo@fluxhome-demo.pt');
console.log('  Password: FluxDemo2026#\n');
console.log('Clients seeded:');
console.log('  C1 Carla Rodrigues  — propostas_sent (3 propostas, mapa visível, share link CGD)');
console.log('  C2 Bruno & Sara     — approved (Santander aprovado, escritura 12 junho)');
console.log('  C3 Inês Oliveira    — docs_pending (CC aprovado, morada em análise, resto pendente)');
console.log('  C4 Tiago & Beatriz  — docs_complete (docs todos aprovados, propostas a preparar)');
console.log('  C5 Filipe Monteiro  — lead (primeiro contacto, imóvel luxo 720k€)');
console.log('  C6 Helena & Paulo   — closed (BPI 0.90%, follow-up em 2 anos)\n');
