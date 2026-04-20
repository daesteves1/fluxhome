-- =============================================================================
-- FluxHome Seed Data
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/hzjwscyxmwhqhdztvibw/sql/new
-- =============================================================================

-- ─── 1. MIGRATIONS (idempotent) ───────────────────────────────────────────────

-- processes table
create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  broker_id uuid references public.brokers(id) not null,
  office_id uuid references public.offices(id) not null,
  tipo text not null check (tipo in ('credito_habitacao', 'renegociacao', 'construcao', 'outro')),
  process_step text not null default 'lead',
  valor_imovel numeric,
  montante_solicitado numeric,
  prazo_meses integer,
  finalidade text,
  localizacao_imovel text,
  p1_profissao text,
  p1_entidade_empregadora text,
  p1_tipo_contrato text,
  p1_rendimento_mensal numeric,
  p2_profissao text,
  p2_entidade_empregadora text,
  p2_tipo_contrato text,
  p2_rendimento_mensal numeric,
  followup_at timestamptz,
  followup_note text,
  followup_dismissed_at timestamptz,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);

alter table public.processes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='processes' and policyname='brokers_own_processes') then
    create policy "brokers_own_processes" on public.processes
      for all using (
        broker_id in (select id from public.brokers where user_id = auth.uid() and is_active = true)
        or office_id in (select office_id from public.brokers where user_id = auth.uid() and is_active = true and is_office_admin = true)
      );
  end if;
  if not exists (select 1 from pg_policies where tablename='processes' and policyname='service_role_processes') then
    create policy "service_role_processes" on public.processes for all using (auth.role() = 'service_role');
  end if;
end $$;

-- Add process_id to related tables
alter table public.document_requests  add column if not exists process_id uuid references public.processes(id) on delete cascade;
alter table public.bank_propostas      add column if not exists process_id uuid references public.processes(id) on delete cascade;
alter table public.mapa_comparativo    add column if not exists process_id uuid references public.processes(id) on delete cascade;
alter table public.broker_notes        add column if not exists process_id uuid references public.processes(id);

-- bank_share_links may or may not exist
do $$ begin
  if exists (select 1 from information_schema.tables where table_name='bank_share_links') then
    alter table public.bank_share_links add column if not exists process_id uuid references public.processes(id) on delete cascade;
  end if;
end $$;

-- Strip process columns from clients (if still there from old schema)
alter table public.clients drop column if exists process_step;
alter table public.clients drop column if exists valor_imovel;
alter table public.clients drop column if exists montante_solicitado;
alter table public.clients drop column if exists prazo_meses;
alter table public.clients drop column if exists finalidade;
alter table public.clients drop column if exists p1_profissao;
alter table public.clients drop column if exists p1_entidade_empregadora;
alter table public.clients drop column if exists p1_tipo_contrato;
alter table public.clients drop column if exists p1_rendimento_mensal;
alter table public.clients drop column if exists p2_profissao;
alter table public.clients drop column if exists p2_entidade_empregadora;
alter table public.clients drop column if exists p2_tipo_contrato;
alter table public.clients drop column if exists p2_rendimento_mensal;

-- ─── 2. CONSTANTS ─────────────────────────────────────────────────────────────

-- broker_id and office_id used for all seed records
-- Adjust if your local IDs are different
do $$ declare
  v_broker1 uuid := '44444444-4444-4444-4444-444444444444';
  v_broker2 uuid := '55555555-5555-5555-5555-555555555555';
  v_office  uuid := '11111111-1111-1111-1111-111111111111';
begin
  if not exists (select 1 from public.brokers where id = v_broker1) then
    raise exception 'Broker % not found. Update the IDs in this script.', v_broker1;
  end if;
end $$;

-- ─── 3. NEW CLIENTS ───────────────────────────────────────────────────────────

insert into public.clients (id, broker_id, office_id, p1_name, p1_nif, p1_email, p1_phone, p1_birth_date, p1_employment_type,
                             p2_name, p2_nif, p2_email, p2_phone, p2_birth_date, p2_employment_type, portal_token, created_at)
values
  -- Miguel Santos — single, Lisboa, propostas_sent
  ('6b26af58-cef6-418d-baf8-b83f937b31f1',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Miguel Santos', '234567890', 'miguel.santos@email.pt', '+351 912 345 678',
   '1985-03-14', 'Trabalhador por conta de outrem',
   null, null, null, null, null, null,
   gen_random_uuid(), now() - interval '45 days'),

  -- Catarina Sousa + Tiago Sousa — Cascais, approved
  ('2dcab91c-9d40-47ca-95ba-44b8ea153518',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Catarina Sousa', '345678901', 'catarina.sousa@gmail.com', '+351 923 456 789',
   '1989-07-22', 'Trabalhador por conta de outrem',
   'Tiago Sousa', '345678902', 'tiago.sousa@gmail.com', '+351 934 567 890',
   '1987-11-08', 'Trabalhador por conta de outrem',
   gen_random_uuid(), now() - interval '90 days'),

  -- Joana Rodrigues — Porto, docs_complete
  ('dcd1819e-d617-4e10-a1e9-029d70dcb882',
   '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
   'Joana Rodrigues', '456789012', 'joana.rodrigues@sapo.pt', '+351 945 678 901',
   '1991-01-30', 'Trabalhador por conta de outrem',
   null, null, null, null, null, null,
   gen_random_uuid(), now() - interval '30 days'),

  -- Bernardo Lopes — Setúbal, lead
  ('fc127925-451d-4363-bfe6-6d03d800820d',
   '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
   'Bernardo Lopes', '567890123', 'bernardo.lopes@outlook.pt', '+351 956 789 012',
   '1978-09-05', 'Trabalhador por conta de outrem',
   null, null, null, null, null, null,
   gen_random_uuid(), now() - interval '3 days'),

  -- Filipa Nunes + André Nunes — Braga, closed with followup
  ('83921a77-33a1-4e7f-ac0f-dbe2238a2f0d',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Filipa Nunes', '678901234', 'filipa.nunes@gmail.com', '+351 967 890 123',
   '1983-05-17', 'Trabalhador por conta de outrem',
   'André Nunes', '678901235', 'andre.nunes@gmail.com', '+351 978 901 234',
   '1981-12-03', 'Trabalhador por conta de outrem',
   gen_random_uuid(), now() - interval '180 days')

on conflict (id) do nothing;

-- ─── 4. PROCESSES ─────────────────────────────────────────────────────────────

insert into public.processes (id, client_id, broker_id, office_id, tipo, process_step,
                               valor_imovel, montante_solicitado, prazo_meses,
                               finalidade, localizacao_imovel,
                               p1_profissao, p1_entidade_empregadora, p1_tipo_contrato, p1_rendimento_mensal,
                               p2_profissao, p2_entidade_empregadora, p2_tipo_contrato, p2_rendimento_mensal,
                               observacoes, followup_at, followup_note, closed_at,
                               created_at, updated_at)
values
  -- Ana Ferreira — docs_pending
  ('137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'credito_habitacao', 'docs_pending',
   230000, 184000, 360,
   'Habitação própria permanente', 'Lisboa - Benfica',
   'Gestora de Recursos Humanos', 'Empresa XYZ Lda', 'Contrato sem termo', 2800,
   null, null, null, null,
   'Imóvel T2 em Benfica. Cliente com histórico de crédito limpo.',
   null, null, null,
   now() - interval '25 days', now() - interval '3 days'),

  -- Carlos Mendes + Sofia Mendes — propostas_sent
  ('bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'credito_habitacao', 'propostas_sent',
   380000, 304000, 360,
   'Habitação própria permanente', 'Cascais',
   'Diretor Comercial', 'Tech Solutions SA', 'Contrato sem termo', 4500,
   'Consultora', 'Consulting Group Lda', 'Contrato sem termo', 3200,
   'Moradia T4 em Cascais. Casal com estabilidade profissional sólida.',
   null, null, null,
   now() - interval '60 days', now() - interval '5 days'),

  -- Rui Oliveira — approved
  ('d48e578a-67f6-48d3-8311-77d912eda6c7',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'credito_habitacao', 'approved',
   195000, 156000, 300,
   'Habitação própria permanente', 'Setúbal',
   'Engenheiro Civil', 'Construções SA', 'Contrato sem termo', 2400,
   null, null, null, null,
   'Apartamento T2 em Setúbal aprovado pelo BCP.',
   null, null, null,
   now() - interval '75 days', now() - interval '2 days'),

  -- Inês Costa + Pedro Costa — closed with followup
  ('14035f8c-d57f-4ecd-8bc1-75d174b95086',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'renegociacao', 'closed',
   null, 120000, 240,
   'Renegociação spread', 'Lisboa',
   'Professora', 'Escola Secundária', 'Contrato sem termo', 1900,
   'Técnico de IT', 'Câmara Municipal', 'Contrato sem termo', 2100,
   'Renegociação bem-sucedida. Poupança de 180€/mês.',
   now() + interval '18 months', 'Contactar para nova renegociação ou mudança de banco', now() - interval '10 days',
   now() - interval '120 days', now() - interval '10 days'),

  -- Miguel Santos — propostas_sent
  ('d3bd0eeb-eb48-42aa-a198-690a98a070c9',
   '6b26af58-cef6-418d-baf8-b83f937b31f1',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'credito_habitacao', 'propostas_sent',
   320000, 256000, 360,
   'Habitação própria permanente', 'Lisboa - Alvalade',
   'Engenheiro de Software', 'Startup Lisboa Lda', 'Contrato sem termo', 3800,
   null, null, null, null,
   'Apartamento T3 em Alvalade. Aguarda decisão entre CGD e Santander.',
   null, null, null,
   now() - interval '40 days', now() - interval '4 days'),

  -- Catarina + Tiago Sousa — approved
  ('0e90ce09-bb71-479f-9a32-4e32881045ba',
   '2dcab91c-9d40-47ca-95ba-44b8ea153518',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'credito_habitacao', 'approved',
   520000, 416000, 360,
   'Habitação própria permanente', 'Cascais - São João do Estoril',
   'Médica', 'Hospital CUF', 'Contrato sem termo', 5200,
   'Arquiteto', 'Atelier Arq Lda', 'Contrato sem termo', 4100,
   'Moradia T4 com jardim. Aprovado pela CGD com spread de 0,9%.',
   null, null, null,
   now() - interval '85 days', now() - interval '1 day'),

  -- Joana Rodrigues — docs_complete
  ('c814a210-70f4-4e46-95f0-688af6587f10',
   'dcd1819e-d617-4e10-a1e9-029d70dcb882',
   '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
   'credito_habitacao', 'docs_complete',
   210000, 168000, 360,
   'Habitação própria permanente', 'Porto - Bonfim',
   'Advogada', 'Sociedade de Advogados Lda', 'Contrato sem termo', 3100,
   null, null, null, null,
   'Apartamento T2 no Porto. Documentação completa, aguarda propostas.',
   null, null, null,
   now() - interval '28 days', now() - interval '2 days'),

  -- Bernardo Lopes — lead
  ('8339cd21-7b58-41ab-92c0-45c45ce49e2e',
   'fc127925-451d-4363-bfe6-6d03d800820d',
   '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
   'construcao', 'lead',
   450000, 300000, 360,
   'Construção de habitação própria', 'Setúbal - Palmela',
   'Empresário', 'Bernardo Lopes Unipessoal', 'Trabalhador independente', 5500,
   null, null, null, null,
   'Terreno adquirido. Pretende construção de moradia T4.',
   null, null, null,
   now() - interval '2 days', now() - interval '2 days'),

  -- Filipa + André Nunes — closed
  ('b4d23bd6-dc81-48c8-8bb0-e996c2b0d2d5',
   '83921a77-33a1-4e7f-ac0f-dbe2238a2f0d',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'credito_habitacao', 'closed',
   285000, 228000, 360,
   'Habitação própria permanente', 'Braga - Gualtar',
   'Enfermeira', 'Hospital de Braga', 'Contrato sem termo', 2200,
   'Técnico Informático', 'Câmara Municipal Braga', 'Contrato sem termo', 1950,
   'Escritura realizada. Processo concluído com sucesso pelo Novo Banco.',
   now() + interval '6 months', 'Verificar oportunidade de renegociação spread', now() - interval '5 days',
   now() - interval '175 days', now() - interval '5 days')

on conflict (id) do nothing;

-- ─── 5. DOCUMENT REQUESTS ─────────────────────────────────────────────────────

-- Ana Ferreira — docs_pending: some approved, some pending
insert into public.document_requests (id, client_id, process_id, proponente, doc_type, label, is_mandatory, max_files, sort_order, status, broker_notes, created_at)
values
  ('97632dcb-5def-4eed-9b46-90fecb6e8fce', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   'p1', 'p1_cc', 'Cartão de Cidadão', true, 2, 1, 'approved', null, now() - interval '22 days'),
  ('5b76fd02-bbb8-4a8f-ad1b-2238a360a18d', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   'p1', 'p1_nif', 'Cartão de NIF', true, 2, 2, 'approved', null, now() - interval '22 days'),
  ('6c83c3f6-ea03-4aee-954f-2d682e9330b4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   'p1', 'p1_irs', 'Última declaração IRS', true, 3, 3, 'em_analise', null, now() - interval '22 days'),
  ('1b1ed96b-61d7-44eb-800c-9a9430930ccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   'p1', 'p1_recibos', 'Últimos 3 recibos de vencimento', true, 5, 4, 'pending', null, now() - interval '22 days'),
  ('952e89ac-3bdf-4b40-b89a-bc42bb3cb64e', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   'shared', 'cpcv', 'CPCV / Promessa de Compra e Venda', true, 2, 5, 'pending', null, now() - interval '22 days'),
  ('8efd0de1-9762-424c-aa39-77e8650a41c6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   'shared', 'caderneta', 'Caderneta Predial', false, 2, 6, 'pending', null, now() - interval '22 days')

on conflict (id) do nothing;

-- Carlos Mendes — propostas_sent: all docs approved
insert into public.document_requests (id, client_id, process_id, proponente, doc_type, label, is_mandatory, max_files, sort_order, status, created_at)
values
  ('c95e556f-86d7-4081-8a41-766202334939', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   'p1', 'p1_cc', 'Cartão de Cidadão (P1)', true, 2, 1, 'approved', now() - interval '55 days'),
  ('d3e7c61e-55b6-4d74-a970-f0debe862f04', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   'p1', 'p1_irs', 'IRS P1', true, 3, 2, 'approved', now() - interval '55 days'),
  ('b3911b7a-e5ac-4f83-ba09-bed27d3a3e92', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   'p1', 'p1_recibos', 'Recibos P1', true, 5, 3, 'approved', now() - interval '55 days'),
  ('7837de7f-151e-4b63-a540-7b2123665576', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   'p2', 'p2_cc', 'Cartão de Cidadão (P2)', true, 2, 4, 'approved', now() - interval '55 days'),
  ('191e4faa-0b89-4e59-97c9-5d80ebc94382', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   'p2', 'p2_irs', 'IRS P2', true, 3, 5, 'approved', now() - interval '55 days'),
  ('fe0639df-fc0e-45cd-9785-bd2f966da3a9', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   'shared', 'cpcv', 'CPCV', true, 2, 6, 'approved', now() - interval '55 days')

on conflict (id) do nothing;

-- Miguel Santos — propostas_sent: all docs approved
insert into public.document_requests (id, client_id, process_id, proponente, doc_type, label, is_mandatory, max_files, sort_order, status, created_at)
values
  ('f4c93728-d932-4306-a604-d2b6bede70ce', '6b26af58-cef6-418d-baf8-b83f937b31f1', 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
   'p1', 'p1_cc', 'Cartão de Cidadão', true, 2, 1, 'approved', now() - interval '35 days'),
  ('ad6d037a-b234-493d-8a04-7290e66f2347', '6b26af58-cef6-418d-baf8-b83f937b31f1', 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
   'p1', 'p1_irs', 'Declaração IRS', true, 3, 2, 'approved', now() - interval '35 days'),
  ('e3146fc1-eb21-4caf-bde0-e960329c7660', '6b26af58-cef6-418d-baf8-b83f937b31f1', 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
   'p1', 'p1_recibos', 'Recibos de vencimento', true, 5, 3, 'approved', now() - interval '35 days'),
  ('6e3b874d-763c-4406-8b58-e91bb32a549a', '6b26af58-cef6-418d-baf8-b83f937b31f1', 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
   'shared', 'cpcv', 'CPCV', true, 2, 4, 'approved', now() - interval '35 days')

on conflict (id) do nothing;

-- Joana Rodrigues — docs_complete: all approved
insert into public.document_requests (id, client_id, process_id, proponente, doc_type, label, is_mandatory, max_files, sort_order, status, created_at)
values
  ('551d02ab-445a-4281-a241-fbd1893d5712', 'dcd1819e-d617-4e10-a1e9-029d70dcb882', 'c814a210-70f4-4e46-95f0-688af6587f10',
   'p1', 'p1_cc', 'Cartão de Cidadão', true, 2, 1, 'approved', now() - interval '26 days'),
  ('860917b3-efdc-4699-91b6-0e59debd68cf', 'dcd1819e-d617-4e10-a1e9-029d70dcb882', 'c814a210-70f4-4e46-95f0-688af6587f10',
   'p1', 'p1_irs', 'Declaração IRS', true, 3, 2, 'approved', now() - interval '26 days'),
  ('221c3b8c-8313-4b2b-b8ef-146d36ca36cb', 'dcd1819e-d617-4e10-a1e9-029d70dcb882', 'c814a210-70f4-4e46-95f0-688af6587f10',
   'p1', 'p1_recibos', 'Recibos de vencimento', true, 5, 3, 'approved', now() - interval '26 days'),
  ('0a3e530e-9ac6-4cf9-a094-6a9cb31b37e3', 'dcd1819e-d617-4e10-a1e9-029d70dcb882', 'c814a210-70f4-4e46-95f0-688af6587f10',
   'shared', 'cpcv', 'CPCV', true, 2, 4, 'approved', now() - interval '26 days'),
  ('f4f7d4bf-ee0e-43bb-9799-3f219570a8f9', 'dcd1819e-d617-4e10-a1e9-029d70dcb882', 'c814a210-70f4-4e46-95f0-688af6587f10',
   'shared', 'certidao_registo', 'Certidão do Registo Predial', false, 2, 5, 'approved', now() - interval '26 days')

on conflict (id) do nothing;

-- ─── 6. BANK PROPOSTAS ────────────────────────────────────────────────────────
-- For Carlos Mendes (bd0fa1a9) and Miguel Santos (d3bd0eeb)

insert into public.bank_propostas (id, client_id, process_id, broker_id, office_id,
  bank_name, rate_type, euribor_index, spread, tan, taeg,
  loan_amount, term_months, monthly_payment,
  vida_banco, multiriscos_banco,
  comissao_avaliacao, comissao_estudo, abertura_processo, imposto_selo_mutuo, registo,
  manutencao_conta, manutencao_anual,
  notes, created_at, updated_at)
values
  -- Carlos Mendes — CGD
  ('c163ec4f-e2d6-49d0-8ad2-4d00684bfa03',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'CGD', 'variavel', '6m', 0.90, 3.82, 4.05,
   304000, 360, 1423,
   35.50, 22.00,
   350, 0, 0, 2400, 350,
   7.50, false,
   'Proposta base CGD. Exige domiciliação de ordenado e seguro de vida na CGD.',
   now() - interval '10 days', now() - interval '10 days'),

  -- Carlos Mendes — BCP
  ('a67fd96a-9e7d-4422-b9f7-0259e60c95f1',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Millennium BCP', 'variavel', '6m', 1.05, 3.97, 4.22,
   304000, 360, 1448,
   38.00, 24.50,
   300, 200, 0, 2400, 350,
   6.00, false,
   'BCP mais caro em spread mas sem obrigatoriedade de seguros.',
   now() - interval '10 days', now() - interval '10 days'),

  -- Carlos Mendes — Novo Banco
  ('7e58a39c-e826-47e3-b690-afe0e10f8ba0',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Novo Banco', 'variavel', '6m', 0.95, 3.87, 4.10,
   304000, 360, 1433,
   32.00, 20.00,
   300, 0, 0, 2400, 350,
   5.00, false,
   'Novo Banco com spread intermédio e seguros mais baratos.',
   now() - interval '9 days', now() - interval '9 days'),

  -- Carlos Mendes — Santander (mista)
  ('ac02f935-5844-4979-b9ad-036110a23d2c',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Santander', 'mista', '6m', 0.80, 3.72, 3.98,
   304000, 360, 1408,
   36.00, 21.00,
   350, 150, 0, 2400, 350,
   6.50, false,
   'Santander: taxa mista 5 anos fixa a 2.95% depois variável com spread 0.80. Melhor para quem quer estabilidade inicial.',
   now() - interval '8 days', now() - interval '8 days'),

  -- Miguel Santos — CGD
  ('d954e0f0-8d07-450b-b4ae-45686e5a80fd',
   '6b26af58-cef6-418d-baf8-b83f937b31f1', 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'CGD', 'variavel', '6m', 0.85, 3.77, 4.00,
   256000, 360, 1198,
   29.50, 18.00,
   350, 0, 0, 2020, 300,
   7.50, false,
   'CGD melhor spread da praça para este perfil.',
   now() - interval '7 days', now() - interval '7 days'),

  -- Miguel Santos — Santander
  ('38c6b1b2-0def-4c4d-9a72-5b29ac3018f7',
   '6b26af58-cef6-418d-baf8-b83f937b31f1', 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Santander', 'variavel', '6m', 0.95, 3.87, 4.12,
   256000, 360, 1213,
   31.00, 19.50,
   300, 150, 0, 2020, 300,
   5.50, false,
   'Santander com spread ligeiramente maior mas sem obrigações.',
   now() - interval '6 days', now() - interval '6 days')

on conflict (id) do nothing;

-- ─── 7. MAPA COMPARATIVO ─────────────────────────────────────────────────────

insert into public.mapa_comparativo (id, client_id, process_id, broker_id, office_id,
  title, proposta_ids, recommended_proposta_id, highlighted_cells, is_visible_to_client,
  created_at, updated_at)
values
  -- Carlos Mendes — mapa with all 4 proposals, CGD recommended, visible to client
  ('4892a1c9-0e3b-4e2a-861e-5f2f03901234',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Comparativo Habitação Cascais',
   '["c163ec4f-e2d6-49d0-8ad2-4d00684bfa03","a67fd96a-9e7d-4422-b9f7-0259e60c95f1","7e58a39c-e826-47e3-b690-afe0e10f8ba0","ac02f935-5844-4979-b9ad-036110a23d2c"]'::jsonb,
   'c163ec4f-e2d6-49d0-8ad2-4d00684bfa03',
   '{"spread": true, "monthly_payment": true}'::jsonb,
   true,
   now() - interval '7 days', now() - interval '5 days'),

  -- Miguel Santos — mapa with 2 proposals
  ('5903b2da-1f4c-5f3b-972f-6a3a14012345',
   '6b26af58-cef6-418d-baf8-b83f937b31f1', 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Comparativo Habitação Alvalade',
   '["d954e0f0-8d07-450b-b4ae-45686e5a80fd","38c6b1b2-0def-4c4d-9a72-5b29ac3018f7"]'::jsonb,
   'd954e0f0-8d07-450b-b4ae-45686e5a80fd',
   '{"spread": true}'::jsonb,
   false,
   now() - interval '5 days', now() - interval '4 days')

on conflict (id) do nothing;

-- ─── 8. BROKER NOTES ─────────────────────────────────────────────────────────

insert into public.broker_notes (id, client_id, process_id, broker_id, content, created_at)
values
  ('6f3c92e8-1a2b-4d5e-8f79-9a0b1c2d3e4f',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   '44444444-4444-4444-4444-444444444444',
   'Ligou a confirmar que vai enviar os recibos até sexta-feira. Tem dificuldade em aceder ao portal.',
   now() - interval '2 days'),

  ('7a4d03f9-2b3c-5e6f-9a8b-0c1d2e3f4a5b',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '137c5b2f-4f02-4ea4-83ac-c8d99d4541a0',
   '44444444-4444-4444-4444-444444444444',
   'Reunião marcada para 22/04 para explicar processo de avaliação do imóvel.',
   now() - interval '5 days'),

  ('8a5e14b0-3c4d-6f7a-0b9c-1d2e3f4a5b6c',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   '44444444-4444-4444-4444-444444444444',
   'Cliente prefere claramente a CGD pela relação bancária que já tem. Santander também é boa opção se quiser taxa mista inicial.',
   now() - interval '6 days'),

  ('9b6f25c1-4d5e-7a8b-1c0d-2e3f4a5b6c7d',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bd0fa1a9-b32c-4f48-bc9f-2fd80f44b65f',
   '44444444-4444-4444-4444-444444444444',
   'Mapa comparativo enviado ao cliente. Aguardar resposta até ao fim da semana.',
   now() - interval '4 days'),

  ('0a7b36c2-5e6f-8a9b-2c1d-3e4f5a6b7c8d',
   '6b26af58-cef6-418d-baf8-b83f937b31f1', 'd3bd0eeb-eb48-42aa-a198-690a98a070c9',
   '44444444-4444-4444-4444-444444444444',
   'Miguel está muito satisfeito com a proposta da CGD. Quer marcar avaliação do imóvel para semana que vem.',
   now() - interval '3 days'),

  ('1c8b47d3-6f7a-9b0c-3e2f-4a5b6c7d8e9f',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 'd48e578a-67f6-48d3-8311-77d912eda6c7',
   '44444444-4444-4444-4444-444444444444',
   'BCP aprovou! Spread 1.10%, 300 meses, prestação de 892€. Cliente muito contente.',
   now() - interval '3 days'),

  ('2d9b58e4-7a8b-0c1d-4f3e-5a6b7c8d9e0f',
   'dddddddd-dddd-dddd-dddd-dddddddddddd', '14035f8c-d57f-4ecd-8bc1-75d174b95086',
   '44444444-4444-4444-4444-444444444444',
   'Renegociação concluída. Passaram de spread 2,1% para 1,3%. Poupança mensal de €184. Muito satisfeitos.',
   now() - interval '12 days')

on conflict (id) do nothing;

-- ─── Done ─────────────────────────────────────────────────────────────────────
select 'Seed complete!' as result,
  (select count(*) from public.processes) as total_processes,
  (select count(*) from public.clients)   as total_clients,
  (select count(*) from public.document_requests) as total_doc_requests,
  (select count(*) from public.bank_propostas) as total_bank_propostas;
