-- Join the game with a username only (no email, no password).
--
-- NASA Space Apps judging asks for no email/password sign-up. Every player is now identified by their
-- unique username. "Join game" with a new username creates the pilot; joining with an existing username
-- (including accounts created earlier with email + password) continues as that pilot.
--
-- How it works: Supabase Auth still issues the session, so every RLS policy and RPC keeps using
-- auth.uid() unchanged. public.join_game() gives the pilot's auth user a username-based login alias
-- (<username>@players.beyond-earth.invalid, a reserved domain that never receives mail) and sets a
-- one-time random secret chosen by the app server, which then signs in with it immediately.
--
-- Trade-off (intended, for judging): anyone who knows a username can play as that pilot.
-- An earlier account's real email is moved to private.legacy_emails (not readable by any API role)
-- so it is never exposed and is not lost.
--
-- Safe to re-apply.

create table if not exists private.legacy_emails (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text not null,
  saved_at timestamptz not null default now()
);
revoke all on table private.legacy_emails from public, anon, authenticated;

create or replace function public.join_game(p_username text, p_secret text, p_mode text default 'auto')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uname   text := lower(btrim(coalesce(p_username, '')));
  mode    text := lower(coalesce(p_mode, 'auto'));
  alias   text;
  uid     uuid;
  cur     text;
  created boolean := false;
begin
  if uname !~ '^[a-z0-9_]{3,20}$' then raise exception 'INVALID_USERNAME'; end if;
  if mode not in ('auto', 'new', 'existing') then raise exception 'INVALID_PAYLOAD'; end if;
  if p_secret is null or char_length(p_secret) < 24 or char_length(p_secret) > 72 then raise exception 'INVALID_PAYLOAD'; end if;
  alias := uname || '@players.beyond-earth.invalid';

  select p.id into uid from public.profiles p where lower(p.username) = uname;

  if uid is null then
    if mode = 'existing' then raise exception 'USERNAME_NOT_FOUND'; end if;
    -- a login alias without a profile (interrupted earlier join): reuse it, the app repairs the profile
    select u.id into uid from auth.users u where lower(u.email) = alias;
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', alias,
        extensions.crypt(p_secret, extensions.gen_salt('bf')), now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'username_login', true),
        jsonb_build_object('username', uname, 'display_name', uname),
        now(), now(), '', '', '', ''
      );
      if to_regclass('auth.identities') is not null then
        execute 'insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
                 values ($1, $2, $3, ''email'', now(), now(), now())'
          using uid::text, uid, jsonb_build_object('sub', uid::text, 'email', alias, 'email_verified', true);
      end if;
      -- the signup trigger created the profile; if another join took the name at the same moment it fell back
      if not exists (select 1 from public.profiles p where p.id = uid and p.username = uname) then
        raise exception 'USERNAME_TAKEN';
      end if;
      return jsonb_build_object('login', alias, 'created', true);
    end if;
    created := true;
  elsif mode = 'new' then
    raise exception 'USERNAME_TAKEN';
  end if;

  -- existing pilot: switch the login to the username alias (keeping any old email privately) and set the secret
  select u.email into cur from auth.users u where u.id = uid;
  if cur is distinct from alias then
    if cur is not null and cur <> '' then
      insert into private.legacy_emails (user_id, email) values (uid, cur) on conflict (user_id) do nothing;
    end if;
    update auth.users set email = alias where id = uid;
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_secret, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = uid;
  return jsonb_build_object('login', alias, 'created', created);
end;
$$;

revoke all on function public.join_game(text, text, text) from public;
grant execute on function public.join_game(text, text, text) to anon, authenticated;
