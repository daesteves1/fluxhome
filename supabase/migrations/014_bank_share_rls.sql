-- RLS for bank_share_links
alter table public.bank_share_links enable row level security;

-- Brokers can read their own links
create policy "brokers_select_own_share_links"
  on public.bank_share_links
  for select
  using (broker_id = auth.uid()::uuid);

-- Brokers can create links
create policy "brokers_insert_share_links"
  on public.bank_share_links
  for insert
  with check (broker_id = auth.uid()::uuid);

-- Brokers can revoke (update) their own links
create policy "brokers_update_own_share_links"
  on public.bank_share_links
  for update
  using (broker_id = auth.uid()::uuid);

-- RLS for bank_share_otps — no direct client access, service role only
alter table public.bank_share_otps enable row level security;

-- No policies: only service role key can read/write OTPs

-- RLS for bank_share_access_log — no direct client access, service role only
alter table public.bank_share_access_log enable row level security;

-- No policies: only service role key can read/write access log
