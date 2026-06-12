-- seed.sql
-- Seeds two confirmed test users for the LOCAL / CI Supabase stack only.
-- Credentials must match the E2E_USER_* env values used by conftest.py / CI:
--   test-user-a@example.com / test-password-a
--   test-user-b@example.com / test-password-b
-- Safe to re-run (idempotent via ON CONFLICT). NEVER use these in production.

-- pgcrypto provides crypt()/gen_salt() for bcrypt password hashing.
create extension if not exists pgcrypto;

-- User A -------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'test-user-a@example.com',
  crypt('test-password-a', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"test-user-a@example.com"}',
  'email', now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

-- User B -------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'test-user-b@example.com',
  crypt('test-password-b', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"test-user-b@example.com"}',
  'email', now(), now(), now()
)
on conflict (provider_id, provider) do nothing;
