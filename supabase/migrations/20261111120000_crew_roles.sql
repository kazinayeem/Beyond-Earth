-- =============================================================================
-- Mission Control: Beyond Earth — squad crew roles
--
-- Every squad member has a crew role: Space Engineer, Mission Scientist,
-- Flight Navigator or Communications Officer. The inviter picks the role when
-- sending an invitation; it carries over when the invitation is accepted.
-- The squad leader can reassign anyone's role, and members can change their own.
--
-- Apply after 20261108130000_health_and_participants.sql. Safe to run more than once.
-- =============================================================================

create or replace function private.crew_role_label(r text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case r
    when 'engineer'  then 'Space Engineer'
    when 'scientist' then 'Mission Scientist'
    when 'navigator' then 'Flight Navigator'
    when 'comms'     then 'Communications Officer'
  end;
$$;
revoke all on function private.crew_role_label(text) from public;

alter table public.group_members     add column if not exists crew_role text not null default 'engineer';
alter table public.group_invitations add column if not exists crew_role text not null default 'engineer';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'group_members_crew_role_check') then
    alter table public.group_members add constraint group_members_crew_role_check
      check (crew_role in ('engineer', 'scientist', 'navigator', 'comms'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'group_invitations_crew_role_check') then
    alter table public.group_invitations add constraint group_invitations_crew_role_check
      check (crew_role in ('engineer', 'scientist', 'navigator', 'comms'));
  end if;
end;
$$;

-- New notification kind for role changes
alter table public.player_notifications drop constraint if exists player_notifications_kind_check;
alter table public.player_notifications add constraint player_notifications_kind_check
  check (kind in ('invite', 'invite_accepted', 'invite_declined', 'member_joined', 'member_left', 'member_removed',
                  'leadership', 'group_mission', 'mission_result', 'achievement', 'squad_bonus', 'crew_role'));

-- The one-argument version is replaced by one with an optional crew role
drop function if exists public.invite_to_group(uuid);

-- Invite a player into the caller's squad with a crew role (any squad member may invite)
create or replace function public.invite_to_group(p_invitee uuid, p_crew_role text default 'engineer')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := private.require_uid();
  gid   uuid;
  gname text;
  me    text;
  inv   uuid;
begin
  if p_crew_role is null or private.crew_role_label(p_crew_role) is null then raise exception 'INVALID_CREW_ROLE'; end if;
  select m.group_id into gid from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP' using hint = 'Create or join a squad first.'; end if;
  if p_invitee = uid then raise exception 'CANNOT_INVITE_SELF'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_invitee) then raise exception 'PLAYER_NOT_FOUND'; end if;
  if exists (select 1 from public.group_members m where m.player_id = p_invitee and m.group_id = gid) then
    raise exception 'ALREADY_MEMBER';
  end if;

  -- lock the squad so capacity checks and invite inserts serialise
  select g.name into gname from public.groups g where g.id = gid for update;
  if (select count(*) from public.group_members m where m.group_id = gid) >= 3 then
    raise exception 'GROUP_FULL' using hint = 'Squads are limited to 3 members.';
  end if;

  -- expire stale invitations so they don't block a fresh one
  update public.group_invitations set status = 'expired'
   where group_id = gid and invitee_id = p_invitee and status = 'pending' and expires_at <= now();
  if exists (select 1 from public.group_invitations i
             where i.group_id = gid and i.invitee_id = p_invitee and i.status = 'pending') then
    raise exception 'INVITE_ALREADY_PENDING';
  end if;

  insert into public.group_invitations (group_id, inviter_id, invitee_id, crew_role)
  values (gid, uid, p_invitee, p_crew_role) returning id into inv;

  select p.display_name into me from public.profiles p where p.id = uid;
  perform private.notify(p_invitee, 'invite', 'Squad invitation',
    me || ' invited you to join ' || gname || ' as ' || private.crew_role_label(p_crew_role),
    jsonb_build_object('invitation_id', inv, 'group_id', gid, 'crew_role', p_crew_role));
  return inv;
end;
$$;

-- Accept or decline an invitation (invitee only). Capacity enforced under a row lock.
create or replace function public.respond_to_invitation(p_invitation uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := private.require_uid();
  inv  public.group_invitations;
  me   text;
  gname text;
  rec  record;
begin
  select * into inv from public.group_invitations where id = p_invitation for update;
  if not found or inv.invitee_id <> uid then raise exception 'INVITATION_NOT_FOUND'; end if;
  if inv.status <> 'pending' then raise exception 'INVITATION_CLOSED'; end if;
  if inv.expires_at <= now() then
    update public.group_invitations set status = 'expired', responded_at = now() where id = inv.id;
    return 'expired';
  end if;
  select p.display_name into me from public.profiles p where p.id = uid;

  if not p_accept then
    update public.group_invitations set status = 'declined', responded_at = now() where id = inv.id;
    perform private.notify(inv.inviter_id, 'invite_declined', 'Invitation declined', me || ' declined your squad invitation', jsonb_build_object('group_id', inv.group_id));
    return 'declined';
  end if;

  if exists (select 1 from public.group_members m where m.player_id = uid) then
    raise exception 'ALREADY_IN_GROUP' using hint = 'Leave your current squad before accepting.';
  end if;
  select g.name into gname from public.groups g where g.id = inv.group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if (select count(*) from public.group_members m where m.group_id = inv.group_id) >= 3 then
    update public.group_invitations set status = 'expired', responded_at = now() where id = inv.id;
    raise exception 'GROUP_FULL' using hint = 'This squad already has 3 members.';
  end if;

  insert into public.group_members (group_id, player_id, role, crew_role) values (inv.group_id, uid, 'member', inv.crew_role);
  update public.group_invitations set status = 'accepted', responded_at = now() where id = inv.id;
  -- one squad per player: withdraw the player's other open invitations
  update public.group_invitations set status = 'cancelled', responded_at = now()
   where invitee_id = uid and status = 'pending' and id <> inv.id;

  for rec in select m.player_id from public.group_members m where m.group_id = inv.group_id and m.player_id <> uid loop
    perform private.notify(rec.player_id, 'member_joined', 'New squad member', me || ' joined ' || gname || ' as ' || private.crew_role_label(inv.crew_role), jsonb_build_object('group_id', inv.group_id));
  end loop;
  return 'accepted';
end;
$$;

-- Change a squad member's crew role: the leader for anyone, a member for themselves
create or replace function public.set_crew_role(p_player uuid, p_crew_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := private.require_uid();
  gid  uuid;
  lead boolean;
  me   text;
begin
  if p_crew_role is null or private.crew_role_label(p_crew_role) is null then raise exception 'INVALID_CREW_ROLE'; end if;
  select m.group_id, m.role = 'leader' into gid, lead from public.group_members m where m.player_id = uid;
  if gid is null then raise exception 'NOT_IN_GROUP'; end if;
  if p_player <> uid and not lead then raise exception 'NOT_GROUP_LEADER'; end if;
  update public.group_members set crew_role = p_crew_role where group_id = gid and player_id = p_player;
  if not found then raise exception 'NOT_A_MEMBER'; end if;
  if p_player <> uid then
    select p.display_name into me from public.profiles p where p.id = uid;
    perform private.notify(p_player, 'crew_role', 'New crew role',
      me || ' assigned you as ' || private.crew_role_label(p_crew_role), jsonb_build_object('group_id', gid, 'crew_role', p_crew_role));
  end if;
end;
$$;

revoke all on function public.invite_to_group(uuid, text), public.respond_to_invitation(uuid, boolean), public.set_crew_role(uuid, text) from public, anon;
grant execute on function public.invite_to_group(uuid, text), public.respond_to_invitation(uuid, boolean), public.set_crew_role(uuid, text) to authenticated;
