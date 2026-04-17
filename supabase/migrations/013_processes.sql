-- Create processes table
create table public.processes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  broker_id uuid references public.brokers(id) not null,
  office_id uuid references public.offices(id) not null,
  tipo text not null check (tipo in ('credito_habitacao', 'renegociacao', 'construcao', 'outro')),
  process_step text not null default 'lead',
  -- financial profile
  valor_imovel numeric,
  montante_solicitado numeric,
  prazo_meses integer,
  finalidade text,
  localizacao_imovel text,
  -- P1 financials
  p1_profissao text,
  p1_entidade_empregadora text,
  p1_tipo_contrato text,
  p1_rendimento_mensal numeric,
  -- P2 financials
  p2_profissao text,
  p2_entidade_empregadora text,
  p2_tipo_contrato text,
  p2_rendimento_mensal numeric,
  -- follow-up reminder
  followup_at timestamptz,
  followup_note text,
  followup_dismissed_at timestamptz,
  -- metadata
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);

-- RLS
alter table public.processes enable row level security;
create policy "brokers_own_processes" on public.processes
  for all using (
    broker_id in (select id from public.brokers where user_id = auth.uid() and is_active = true)
    or office_id in (select office_id from public.brokers where user_id = auth.uid() and is_active = true and is_office_admin = true)
  );
create policy "service_role_processes" on public.processes for all using (auth.role() = 'service_role');

-- Data migration: one process per existing client
insert into public.processes (client_id, broker_id, office_id, tipo, process_step, montante_solicitado, valor_imovel, prazo_meses, created_at, updated_at)
select
  id,
  broker_id,
  office_id,
  'credito_habitacao',
  coalesce(process_step, 'lead'),
  loan_amount,
  property_value,
  term_months,
  created_at,
  updated_at
from public.clients;

-- Add process_id FK to process-scoped tables
alter table public.document_requests add column if not exists process_id uuid references public.processes(id) on delete cascade;
alter table public.bank_propostas add column if not exists process_id uuid references public.processes(id) on delete cascade;
alter table public.mapa_comparativo add column if not exists process_id uuid references public.processes(id) on delete cascade;
alter table public.bank_share_links add column if not exists process_id uuid references public.processes(id) on delete cascade;
alter table public.broker_notes add column if not exists process_id uuid references public.processes(id);

-- Back-fill process_id on existing rows using the just-created processes
update public.document_requests dr
set process_id = p.id
from public.processes p
where p.client_id = dr.client_id and dr.process_id is null;

update public.bank_propostas bp
set process_id = p.id
from public.processes p
where p.client_id = bp.client_id and bp.process_id is null;

update public.mapa_comparativo mc
set process_id = p.id
from public.processes p
where p.client_id = mc.client_id and mc.process_id is null;

update public.bank_share_links bsl
set process_id = p.id
from public.processes p
where p.client_id = bsl.client_id and bsl.process_id is null;

update public.broker_notes bn
set process_id = p.id
from public.processes p
where p.client_id = bn.client_id and bn.process_id is null;

-- Strip process fields from clients
alter table public.clients
  drop column if exists process_step,
  drop column if exists valor_imovel,
  drop column if exists montante_solicitado,
  drop column if exists prazo_meses,
  drop column if exists finalidade,
  drop column if exists p1_profissao,
  drop column if exists p1_entidade_empregadora,
  drop column if exists p1_tipo_contrato,
  drop column if exists p1_rendimento_mensal,
  drop column if exists p2_profissao,
  drop column if exists p2_entidade_empregadora,
  drop column if exists p2_tipo_contrato,
  drop column if exists p2_rendimento_mensal;
