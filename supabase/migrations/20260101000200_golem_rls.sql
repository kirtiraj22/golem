alter table public.profiles enable row level security;
alter table public.campaign_metadata enable row level security;
alter table public.asset_metadata enable row level security;
alter table public.chain_transactions enable row level security;
alter table public.auth_challenges enable row level security;
alter table public.wallet_sessions enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.campaign_metadata from anon, authenticated;
revoke all on public.asset_metadata from anon, authenticated;
revoke all on public.chain_transactions from anon, authenticated;
revoke all on public.auth_challenges from anon, authenticated;
revoke all on public.wallet_sessions from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant select on public.campaign_metadata to anon, authenticated;
grant select on public.asset_metadata to anon, authenticated;
grant select on public.chain_transactions to anon, authenticated;

grant all on public.profiles to service_role;
grant all on public.campaign_metadata to service_role;
grant all on public.asset_metadata to service_role;
grant all on public.chain_transactions to service_role;
grant all on public.auth_challenges to service_role;
grant all on public.wallet_sessions to service_role;

create policy "profiles are publicly readable"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "listed campaigns are publicly readable"
on public.campaign_metadata
for select
to anon, authenticated
using (is_listed);

create policy "assets of listed campaigns are publicly readable"
on public.asset_metadata
for select
to anon, authenticated
using (
  exists (
    select 1
      from public.campaign_metadata c
     where c.campaign_pubkey = asset_metadata.campaign_pubkey
       and c.is_listed
  )
);

create policy "transactions of listed campaigns are publicly readable"
on public.chain_transactions
for select
to anon, authenticated
using (
  exists (
    select 1
      from public.campaign_metadata c
     where c.campaign_pubkey = chain_transactions.campaign_pubkey
       and c.is_listed
  )
);