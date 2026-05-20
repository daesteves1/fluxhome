-- Broker in-app notifications
create table if not exists broker_notifications (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references brokers(id) on delete cascade,
  office_id uuid not null references offices(id) on delete cascade,
  type text not null, -- 'doc_uploaded' | 'doc_em_analise' | 'process_created' | 'lead_new' | 'proposta_choice' | 'general'
  title text not null,
  body text,
  link text, -- relative URL to navigate to on click
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists broker_notifications_broker_id_idx on broker_notifications(broker_id, created_at desc);
create index if not exists broker_notifications_unread_idx on broker_notifications(broker_id, is_read) where is_read = false;

-- RLS
alter table broker_notifications enable row level security;

-- Brokers can only see their own notifications
create policy "broker_notifications_select" on broker_notifications
  for select using (
    broker_id in (
      select id from brokers where user_id = auth.uid()
    )
  );

-- Mark as read (update)
create policy "broker_notifications_update" on broker_notifications
  for update using (
    broker_id in (
      select id from brokers where user_id = auth.uid()
    )
  );

-- Service role can insert (triggers from API routes)
create policy "broker_notifications_insert_service" on broker_notifications
  for insert with check (true);

-- Add recontact_at column to processes if not exists
alter table processes add column if not exists recontact_at timestamptz;
