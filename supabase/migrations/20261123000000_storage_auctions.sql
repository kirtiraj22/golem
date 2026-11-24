-- Storage-auction game state.
--
-- The wallet profile stays in public.player_profiles. This table stores the
-- player's off-chain ledger: in-game coins, storage lots, rival bids, revealed
-- hauls, inventory and market headlines. All writes go through Next.js route
-- handlers with the service-role key, so anon/authenticated get no access.
--
-- The state column is versioned JSON. The API uses optimistic locking so two
-- open tabs cannot overwrite each other's bids or inventory.

create table if not exists public.player_game_state (
  wallet_address text primary key
    references public.player_profiles (wallet_address) on delete cascade,
  state jsonb not null,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_game_state_state_object check (jsonb_typeof(state) = 'object'),
  constraint player_game_state_version_nonnegative check (version >= 0)
);

drop trigger if exists player_game_state_set_updated_at
  on public.player_game_state;

create trigger player_game_state_set_updated_at
before update on public.player_game_state
for each row execute function public.set_updated_at();

alter table public.player_game_state enable row level security;

revoke all on public.player_game_state from anon, authenticated;
grant all on public.player_game_state to service_role;
