-- Bank share links: broker creates a time-limited, token-gated share link for a bank contact
create table public.bank_share_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  broker_id uuid references public.brokers(id) not null,
  token uuid default gen_random_uuid() not null unique,
  bank_id text not null,
  bank_name text not null,
  contact_email text not null,
  note text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz default now()
);

-- OTP codes for verifying bank contact identity
create table public.bank_share_otps (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid references public.bank_share_links(id) on delete cascade not null,
  otp_hash text not null,
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz default now()
);

-- Audit log for all events on a share link
-- events: 'otp_requested', 'otp_verified', 'otp_failed', 'link_locked',
--         'page_viewed', 'doc_downloaded', 'bulk_downloaded', 'data_copied'
create table public.bank_share_access_log (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid references public.bank_share_links(id) on delete cascade not null,
  event text not null,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);
