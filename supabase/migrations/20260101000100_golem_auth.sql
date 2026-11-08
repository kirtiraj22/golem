create table public.auth_challenges (
  nonce text primary key,
  wallet_address text not null,
  message text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint auth_challenges_nonce_format check (nonce ~ '^[0-9a-f]{32,128}$'),
  constraint auth_challenges_wallet_format check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  constraint auth_challenges_message_len check (char_length(message) between 1 and 1000),
  constraint auth_challenges_expiry check (expires_at > issued_at)
);

create index auth_challenges_wallet_idx on public.auth_challenges (wallet_address);
create index auth_challenges_expires_idx on public.auth_challenges (expires_at);

create table public.wallet_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  wallet_address text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint wallet_sessions_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint wallet_sessions_wallet_format check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  constraint wallet_sessions_expiry check (expires_at > created_at)
);

create index wallet_sessions_wallet_idx on public.wallet_sessions (wallet_address);
create index wallet_sessions_expires_idx on public.wallet_sessions (expires_at);

create or replace function public.purge_expired_auth()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_challenges integer;
  v_sessions integer;
begin
  delete from public.auth_challenges
   where expires_at < now() - interval '1 day';
  get diagnostics v_challenges = row_count;

  delete from public.wallet_sessions
   where expires_at < now() - interval '1 day'
      or revoked_at < now() - interval '1 day';
  get diagnostics v_sessions = row_count;

  return v_challenges + v_sessions;
end;
$$;

revoke all on function public.purge_expired_auth() from public, anon, authenticated;
grant execute on function public.purge_expired_auth() to service_role;