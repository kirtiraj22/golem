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

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  display_name text,
  bio text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_wallet_format check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  constraint profiles_display_name_len check (display_name is null or char_length(display_name) between 1 and 50),
  constraint profiles_bio_len check (bio is null or char_length(bio) <= 500),
  constraint profiles_website_format check (website_url is null or (char_length(website_url) <= 200 and website_url ~ '^https?://'))
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.campaign_metadata (
  id uuid primary key default gen_random_uuid(),
  campaign_pubkey text not null unique,
  company_wallet text not null references public.profiles (wallet_address) on delete cascade,
  campaign_id bigint not null,
  title text not null,
  description text,
  category text,
  tags text[] not null default '{}',
  total_budget_lamports bigint not null,
  expected_asset_count integer not null,
  min_votes bigint not null,
  voting_deadline timestamptz not null,
  claim_deadline timestamptz not null,
  onchain_status text not null default 'DRAFT',
  cached_registered_asset_count integer not null default 0,
  cached_finalized_asset_count integer not null default 0,
  cached_total_claimed_lamports bigint not null default 0,
  is_listed boolean not null default false,
  create_tx_signature text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_metadata_pubkey_format check (campaign_pubkey ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  constraint campaign_metadata_company_format check (company_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  constraint campaign_metadata_campaign_id_range check (campaign_id >= 0 and campaign_id <= 9007199254740991),
  constraint campaign_metadata_title_len check (char_length(title) between 3 and 120),
  constraint campaign_metadata_description_len check (description is null or char_length(description) <= 5000),
  constraint campaign_metadata_category_len check (category is null or char_length(category) between 1 and 40),
  constraint campaign_metadata_tags_len check (cardinality(tags) <= 10),
  constraint campaign_metadata_budget_range check (total_budget_lamports > 0 and total_budget_lamports <= 9007199254740991),
  constraint campaign_metadata_asset_count_range check (expected_asset_count between 1 and 500),
  constraint campaign_metadata_min_votes_range check (min_votes >= 1 and min_votes <= 9007199254740991),
  constraint campaign_metadata_deadlines check (claim_deadline > voting_deadline),
  constraint campaign_metadata_status_values check (onchain_status in ('DRAFT', 'ACTIVE', 'CLOSED', 'SETTLED')),
  constraint campaign_metadata_cached_counts check (
    cached_registered_asset_count >= 0
    and cached_finalized_asset_count >= 0
    and cached_total_claimed_lamports >= 0
  ),
  constraint campaign_metadata_signature_format check (create_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,90}$'),
  constraint campaign_metadata_company_campaign_unique unique (company_wallet, campaign_id)
);

create index campaign_metadata_listed_created_idx on public.campaign_metadata (is_listed, created_at desc);
create index campaign_metadata_company_idx on public.campaign_metadata (company_wallet);
create index campaign_metadata_status_idx on public.campaign_metadata (onchain_status);
create index campaign_metadata_voting_deadline_idx on public.campaign_metadata (voting_deadline);
create index campaign_metadata_category_idx on public.campaign_metadata (category);
create index campaign_metadata_tags_idx on public.campaign_metadata using gin (tags);

create trigger campaign_metadata_set_updated_at
before update on public.campaign_metadata
for each row execute function public.set_updated_at();

create table public.asset_metadata (
  id uuid primary key default gen_random_uuid(),
  campaign_pubkey text not null references public.campaign_metadata (campaign_pubkey) on delete cascade,
  asset_index integer not null,
  asset_pubkey text unique,
  content_hash text not null,
  storage_path text not null unique,
  original_filename text,
  mime_type text not null,
  size_bytes integer not null,
  width integer,
  height integer,
  caption text,
  cached_ai_votes bigint not null default 0,
  cached_human_votes bigint not null default 0,
  cached_total_votes bigint not null default 0,
  cached_result text not null default 'PENDING',
  cached_winning_votes bigint not null default 0,
  cached_reward_pool_lamports bigint not null default 0,
  cached_finalized boolean not null default false,
  register_tx_signature text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_metadata_index_range check (asset_index >= 0 and asset_index < 500),
  constraint asset_metadata_pubkey_format check (asset_pubkey is null or asset_pubkey ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  constraint asset_metadata_hash_format check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint asset_metadata_path_format check (
    storage_path ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}/[0-9a-f]{64}\.(jpg|png|webp)$'
    and starts_with(storage_path, campaign_pubkey || '/')
  ),
  constraint asset_metadata_filename_len check (original_filename is null or char_length(original_filename) <= 255),
  constraint asset_metadata_mime_values check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint asset_metadata_size_range check (size_bytes > 0 and size_bytes <= 10485760),
  constraint asset_metadata_dimensions check ((width is null or width > 0) and (height is null or height > 0)),
  constraint asset_metadata_caption_len check (caption is null or char_length(caption) <= 300),
  constraint asset_metadata_result_values check (
    cached_result in ('PENDING', 'AI_GENERATED', 'HUMAN_CREATED', 'TIE', 'INSUFFICIENT_VOTES')
  ),
  constraint asset_metadata_cached_counts check (
    cached_ai_votes >= 0
    and cached_human_votes >= 0
    and cached_total_votes >= 0
    and cached_winning_votes >= 0
    and cached_reward_pool_lamports >= 0
  ),
  constraint asset_metadata_register_sig_format check (
    register_tx_signature is null or register_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,90}$'
  ),
  constraint asset_metadata_campaign_index_unique unique (campaign_pubkey, asset_index),
  constraint asset_metadata_campaign_hash_unique unique (campaign_pubkey, content_hash)
);

create index asset_metadata_campaign_idx on public.asset_metadata (campaign_pubkey, asset_index);
create index asset_metadata_hash_idx on public.asset_metadata (content_hash);

create or replace function public.enforce_asset_index_bound()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  select expected_asset_count
    into v_count
    from public.campaign_metadata
   where campaign_pubkey = new.campaign_pubkey;
  if v_count is null or new.asset_index >= v_count then
    raise exception 'asset_index % is out of range for this campaign', new.asset_index
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger asset_metadata_enforce_index_bound
before insert on public.asset_metadata
for each row execute function public.enforce_asset_index_bound();

create trigger asset_metadata_set_updated_at
before update on public.asset_metadata
for each row execute function public.set_updated_at();

create table public.chain_transactions (
  id uuid primary key default gen_random_uuid(),
  signature text not null,
  instruction_index integer not null default 0,
  instruction text not null,
  campaign_pubkey text not null references public.campaign_metadata (campaign_pubkey) on delete cascade,
  asset_pubkey text,
  wallet_address text not null,
  amount_lamports bigint,
  slot bigint not null,
  block_time timestamptz,
  event_data jsonb,
  created_at timestamptz not null default now(),
  constraint chain_transactions_signature_format check (signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,90}$'),
  constraint chain_transactions_index_range check (instruction_index >= 0),
  constraint chain_transactions_instruction_values check (
    instruction in (
      'create_campaign',
      'register_asset',
      'fund_campaign',
      'vote',
      'close_campaign',
      'finalize_asset',
      'claim_reward',
      'refund_campaign'
    )
  ),
  constraint chain_transactions_wallet_format check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  constraint chain_transactions_asset_format check (asset_pubkey is null or asset_pubkey ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  constraint chain_transactions_amount_range check (amount_lamports is null or amount_lamports >= 0),
  constraint chain_transactions_slot_range check (slot >= 0),
  constraint chain_transactions_signature_index_unique unique (signature, instruction_index)
);

create index chain_transactions_campaign_time_idx on public.chain_transactions (campaign_pubkey, block_time desc);
create index chain_transactions_wallet_idx on public.chain_transactions (wallet_address, block_time desc);
create index chain_transactions_asset_idx on public.chain_transactions (asset_pubkey);
create index chain_transactions_instruction_idx on public.chain_transactions (instruction);