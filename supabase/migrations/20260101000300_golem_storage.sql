insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-assets',
  'campaign-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "campaign assets readable for listed campaigns"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'campaign-assets'
  and exists (
    select 1
      from public.asset_metadata a
      join public.campaign_metadata c on c.campaign_pubkey = a.campaign_pubkey
     where a.storage_path = storage.objects.name
       and c.is_listed
  )
);