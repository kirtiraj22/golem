-- Player onboarding profile for The Copper Stall.
--
-- This migration reuses public.auth_challenges and public.wallet_sessions from
-- 20260101000100_golem_auth.sql, so apply the earlier migrations first.
--
-- All reads and writes go through server-side Next.js routes using the
-- Supabase service-role key. The browser never receives that key.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint player_profiles_wallet_format check (
    wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
  ),
  constraint player_profiles_username_format check (
    username = btrim(username)
    and char_length(username) between 3 and 24
    and username ~ '^[A-Za-z0-9][A-Za-z0-9 _-]*[A-Za-z0-9]$'
  )
);

create index if not exists player_profiles_last_seen_idx
  on public.player_profiles (last_seen_at desc);

drop trigger if exists player_profiles_set_updated_at
  on public.player_profiles;

create trigger player_profiles_set_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();

alter table public.player_profiles enable row level security;

-- Profiles are private server-side data for this milestone. The service role
-- bypasses RLS; anon/authenticated cannot read or write the table directly.
revoke all on public.player_profiles from anon, authenticated;
grant all on public.player_profiles to service_role;

-- Atomic create-or-retrieve. Returning wallets keep their original username;
-- only last_seen_at and updated_at move forward.
create or replace function public.upsert_player_profile(
  p_wallet_address text,
  p_username text
)
returns public.player_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.player_profiles;
begin
  if p_wallet_address is null
     or p_wallet_address !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$' then
    raise exception 'invalid wallet address' using errcode = '22023';
  end if;

  if p_username is null
     or p_username <> btrim(p_username)
     or char_length(p_username) not between 3 and 24
     or p_username !~ '^[A-Za-z0-9][A-Za-z0-9 _-]*[A-Za-z0-9]$' then
    raise exception 'invalid username' using errcode = '22023';
  end if;

  insert into public.player_profiles (wallet_address, username, last_seen_at)
  values (p_wallet_address, p_username, now())
  on conflict (wallet_address) do update
    set last_seen_at = now(),
        updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.upsert_player_profile(text, text)
  from public, anon, authenticated;
grant execute on function public.upsert_player_profile(text, text)
  to service_role;
