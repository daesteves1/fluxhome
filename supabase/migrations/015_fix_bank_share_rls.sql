-- Fix bank_share_links RLS: broker_id references brokers.id, not auth.uid() directly.
-- The previous policies used broker_id = auth.uid() which is wrong because
-- auth.uid() is the user's auth id (= brokers.user_id), not brokers.id.

drop policy if exists "brokers_select_own_share_links" on public.bank_share_links;
drop policy if exists "brokers_insert_share_links" on public.bank_share_links;
drop policy if exists "brokers_update_own_share_links" on public.bank_share_links;

create policy "brokers_select_own_share_links"
  on public.bank_share_links
  for select
  using (
    broker_id in (
      select id from public.brokers where user_id = auth.uid() and is_active = true
    )
  );

create policy "brokers_insert_share_links"
  on public.bank_share_links
  for insert
  with check (
    broker_id in (
      select id from public.brokers where user_id = auth.uid() and is_active = true
    )
  );

create policy "brokers_update_own_share_links"
  on public.bank_share_links
  for update
  using (
    broker_id in (
      select id from public.brokers where user_id = auth.uid() and is_active = true
    )
  );
