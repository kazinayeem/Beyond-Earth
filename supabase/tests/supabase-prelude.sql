-- Minimal Supabase environment for running the migrations in a plain Postgres
-- (used by scripts/testDatabase.ts with PGlite). NOT applied to the real project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants broad default privileges on public; the migration must revoke them.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  -- columns the demo seed writes (subset of the hosted auth.users)
  instance_id uuid, aud text, role text, encrypted_password text, email_confirmed_at timestamptz,
  updated_at timestamptz, confirmation_token text, recovery_token text, email_change_token_new text, email_change text
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- pgcrypto lives in the "extensions" schema on Supabase; PGlite has no pgcrypto, so stub the two calls
-- public.join_game() uses (the test only checks that a hash is stored, not bcrypt itself).
create schema if not exists extensions;
create or replace function extensions.gen_salt(text) returns text language sql immutable as $$ select 'test-salt' $$;
create or replace function extensions.crypt(text, text) returns text language sql immutable as $$ select 'hash:' || md5($1 || $2) $$;
