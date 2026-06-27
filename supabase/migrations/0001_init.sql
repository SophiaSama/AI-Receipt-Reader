-- 0001_init.sql
-- SmartReceiptReader: initial Supabase schema, RLS, private storage bucket + policies.
-- Replaces AWS DynamoDB (data) + S3 (images).

-- ---------------------------------------------------------------------------
-- Table: public.receipts
-- ---------------------------------------------------------------------------
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date text,                       -- YYYY-MM-DD
  total numeric,
  currency text,
  merchant_name text,
  items jsonb not null default '[]'::jsonb,  -- [{ description, price }]
  image_url text,                  -- storage object path (NOT a signed url)
  image_hash text,                 -- duplicate detection
  ocr_fingerprint text,            -- duplicate detection
  raw_text text,
  ocr_route text,
  processing_metrics jsonb,
  created_at timestamptz not null default now()
);

-- Indexes scoped per user for duplicate detection + listing.
create index if not exists receipts_user_image_hash_idx
  on public.receipts (user_id, image_hash);
create index if not exists receipts_user_ocr_fingerprint_idx
  on public.receipts (user_id, ocr_fingerprint);
create index if not exists receipts_user_created_at_idx
  on public.receipts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Table privileges.
-- Hosted Supabase auto-grants these to anon/authenticated/service_role via
-- default privileges, but the local CLI stack (used in CI) does NOT, so without
-- explicit grants every PostgREST request is denied at the privilege level
-- (before RLS is evaluated): authenticated insert/select fail and the
-- service_role cleanup returns 403. RLS below still restricts row access for
-- anon/authenticated; service_role bypasses RLS.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.receipts to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security: a user can only touch their own rows.
-- ---------------------------------------------------------------------------
alter table public.receipts enable row level security;

drop policy if exists "receipts_select_own" on public.receipts;
create policy "receipts_select_own"
  on public.receipts for select
  using (user_id = auth.uid());

drop policy if exists "receipts_insert_own" on public.receipts;
create policy "receipts_insert_own"
  on public.receipts for insert
  with check (user_id = auth.uid());

drop policy if exists "receipts_update_own" on public.receipts;
create policy "receipts_update_own"
  on public.receipts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "receipts_delete_own" on public.receipts;
create policy "receipts_delete_own"
  on public.receipts for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Private storage bucket: receipts  (per-user folders {user_id}/{uuid.ext})
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Object-level policies: first path segment must equal the caller's uid.
drop policy if exists "receipts_objects_select_own" on storage.objects;
create policy "receipts_objects_select_own"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_objects_insert_own" on storage.objects;
create policy "receipts_objects_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_objects_update_own" on storage.objects;
create policy "receipts_objects_update_own"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_objects_delete_own" on storage.objects;
create policy "receipts_objects_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
