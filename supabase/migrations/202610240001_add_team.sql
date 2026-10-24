-- Warung Kita: Add Team/Teman foundation
-- Apply in Supabase SQL Editor or with Supabase CLI after reviewing this migration.
create schema if not exists team_private;
revoke all on schema team_private from public, anon, authenticated;

create table if not exists public.wk_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  invite_code text not null unique check (invite_code ~ '^[A-F0-9]{8}$'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.wk_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  role text not null default 'member' check (role in ('owner','manager','member')),
  joined_at timestamptz not null default now(),
  unique(team_id,user_id)
);
create table if not exists public.wk_team_activity (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('team_created','member_joined','task_update','shared_action','reputation_review','member_left')),
  message text not null check (char_length(trim(message)) between 1 and 240),
  created_at timestamptz not null default now()
);
create table if not exists public.wk_reputation_reports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  category text not null check (category in ('harassment','retaliation','false_claim','access_abuse','other')),
  details text not null check (char_length(trim(details)) between 10 and 1200),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reporter_id <> target_user_id)
);
create index if not exists wk_team_activity_team_created_idx on public.wk_team_activity(team_id,created_at desc);
create index if not exists wk_reputation_reports_team_created_idx on public.wk_reputation_reports(team_id,created_at desc);

create or replace function team_private.is_member(p_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.wk_team_members m
    where m.team_id = p_team_id and m.user_id = (select auth.uid())
  );
$$;
create or replace function team_private.is_manager(p_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.wk_team_members m
    where m.team_id = p_team_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')
  );
$$;
revoke all on function team_private.is_member(uuid) from public, anon;
revoke all on function team_private.is_manager(uuid) from public, anon;
grant usage on schema team_private to authenticated;
grant execute on function team_private.is_member(uuid) to authenticated;
grant execute on function team_private.is_manager(uuid) to authenticated;

create or replace function public.wk_create_team(p_name text, p_display_name text)
returns table(team_id uuid, invite_code text)
language plpgsql security definer set search_path = ''
as $$
declare v_team public.wk_teams%rowtype; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Silakan masuk terlebih dahulu.'; end if;
  if exists (select 1 from public.wk_team_members where user_id = v_user) then
    raise exception 'Akun ini sudah menjadi anggota tim.';
  end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 60 then raise exception 'Nama tim harus 2–60 karakter.'; end if;
  if char_length(trim(coalesce(p_display_name,''))) not between 1 and 40 then raise exception 'Nama pemain harus 1–40 karakter.'; end if;
  insert into public.wk_teams(name,invite_code,owner_id)
  values (trim(p_name), upper(substr(md5(random()::text || clock_timestamp()::text),1,8)), v_user)
  returning * into v_team;
  insert into public.wk_team_members(team_id,user_id,display_name,role)
  values (v_team.id,v_user,trim(p_display_name),'owner');
  insert into public.wk_team_activity(team_id,actor_id,event_type,message)
  values (v_team.id,v_user,'team_created','Tim dibuat oleh pemilik.');
  return query select v_team.id,v_team.invite_code;
end;
$$;

create or replace function public.wk_join_team(p_invite_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_team public.wk_teams%rowtype; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Silakan masuk terlebih dahulu.'; end if;
  if exists (select 1 from public.wk_team_members where user_id = v_user) then raise exception 'Akun ini sudah menjadi anggota tim.'; end if;
  if char_length(trim(coalesce(p_display_name,''))) not between 1 and 40 then raise exception 'Nama pemain harus 1–40 karakter.'; end if;
  select * into v_team from public.wk_teams where invite_code = upper(trim(coalesce(p_invite_code,''))) and status='open' for update;
  if not found then raise exception 'Kode undangan tidak valid atau tim sudah ditutup.'; end if;
  if (select count(*) from public.wk_team_members where team_id=v_team.id) >= 8 then raise exception 'Tim sudah mencapai batas 8 pemain.'; end if;
  insert into public.wk_team_members(team_id,user_id,display_name,role)
  values(v_team.id,v_user,trim(p_display_name),'member');
  insert into public.wk_team_activity(team_id,actor_id,event_type,message)
  values(v_team.id,v_user,'member_joined','Pemain baru bergabung dengan tim.');
  return v_team.id;
end;
$$;

create or replace function public.wk_log_team_activity(p_event_type text, p_message text)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid; v_id bigint;
begin
  select m.team_id into v_team from public.wk_team_members m where m.user_id=v_user;
  if v_user is null or v_team is null then raise exception 'Kamu belum tergabung dalam tim.'; end if;
  if p_event_type not in ('task_update','shared_action','reputation_review') then raise exception 'Jenis aktivitas tidak diizinkan.'; end if;
  if char_length(trim(coalesce(p_message,''))) not between 1 and 240 then raise exception 'Catatan harus 1–240 karakter.'; end if;
  insert into public.wk_team_activity(team_id,actor_id,event_type,message)
  values(v_team,v_user,p_event_type,trim(p_message)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wk_submit_reputation_report(p_target_user uuid, p_category text, p_details text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid; v_id uuid;
begin
  select m.team_id into v_team from public.wk_team_members m where m.user_id=v_user;
  if v_user is null or v_team is null then raise exception 'Kamu belum tergabung dalam tim.'; end if;
  if p_target_user = v_user then raise exception 'Kamu tidak dapat melaporkan akun sendiri.'; end if;
  if not exists(select 1 from public.wk_team_members m where m.team_id=v_team and m.user_id=p_target_user) then raise exception 'Pemain yang dilaporkan bukan anggota tim ini.'; end if;
  if p_category not in ('harassment','retaliation','false_claim','access_abuse','other') then raise exception 'Kategori laporan tidak valid.'; end if;
  if char_length(trim(coalesce(p_details,''))) not between 10 and 1200 then raise exception 'Jelaskan laporan dalam 10–1200 karakter.'; end if;
  insert into public.wk_reputation_reports(team_id,reporter_id,target_user_id,category,details)
  values(v_team,v_user,p_target_user,p_category,trim(p_details)) returning id into v_id;
  insert into public.wk_team_activity(team_id,actor_id,event_type,message)
  values(v_team,v_user,'reputation_review','Laporan perlindungan reputasi diajukan; rincian hanya dapat dilihat pihak berizin.');
  return v_id;
end;
$$;

create or replace function public.wk_leave_team()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid;
begin
  select m.team_id into v_team from public.wk_team_members m where m.user_id=v_user and m.role <> 'owner';
  if v_team is null then raise exception 'Pemilik tim harus menyerahkan kepemilikan sebelum keluar.'; end if;
  delete from public.wk_team_members where user_id=v_user and team_id=v_team;
  insert into public.wk_team_activity(team_id,actor_id,event_type,message)
  values(v_team,v_user,'member_left','Seorang anggota meninggalkan tim.');
end;
$$;

revoke all on function public.wk_create_team(text,text) from public, anon;
revoke all on function public.wk_join_team(text,text) from public, anon;
revoke all on function public.wk_log_team_activity(text,text) from public, anon;
revoke all on function public.wk_submit_reputation_report(uuid,text,text) from public, anon;
revoke all on function public.wk_leave_team() from public, anon;
grant execute on function public.wk_create_team(text,text) to authenticated;
grant execute on function public.wk_join_team(text,text) to authenticated;
grant execute on function public.wk_log_team_activity(text,text) to authenticated;
grant execute on function public.wk_submit_reputation_report(uuid,text,text) to authenticated;
grant execute on function public.wk_leave_team() to authenticated;

alter table public.wk_teams enable row level security;
alter table public.wk_team_members enable row level security;
alter table public.wk_team_activity enable row level security;
alter table public.wk_reputation_reports enable row level security;

grant select on public.wk_teams, public.wk_team_members, public.wk_team_activity, public.wk_reputation_reports to authenticated;
grant update(name,status) on public.wk_teams to authenticated;
grant update(display_name) on public.wk_team_members to authenticated;

create policy "team members can view their team" on public.wk_teams
for select to authenticated using (team_private.is_member(id));
create policy "team managers can update team settings" on public.wk_teams
for update to authenticated using (team_private.is_manager(id)) with check (team_private.is_manager(id));
create policy "members can view roster" on public.wk_team_members
for select to authenticated using (team_private.is_member(team_id));
create policy "players can update own display name" on public.wk_team_members
for update to authenticated using (user_id=(select auth.uid()) and team_private.is_member(team_id))
with check (user_id=(select auth.uid()) and team_private.is_member(team_id));
create policy "members can view team activity" on public.wk_team_activity
for select to authenticated using (team_private.is_member(team_id));
create policy "reporters and managers can read reputation reports" on public.wk_reputation_reports
for select to authenticated using (reporter_id=(select auth.uid()) or team_private.is_manager(team_id));
create policy "managers can update report review status" on public.wk_reputation_reports
for update to authenticated using (team_private.is_manager(team_id))
with check (team_private.is_manager(team_id));

-- Audit activity is append-only for browser clients; all writes go through validated RPCs.
revoke insert, update, delete, truncate on public.wk_team_activity from anon, authenticated;
revoke insert, update, delete, truncate on public.wk_reputation_reports from anon, authenticated;
revoke insert, delete, truncate on public.wk_teams, public.wk_team_members from anon, authenticated;

-- Reports can be submitted only via wk_submit_reputation_report; managers can only update review fields.
revoke update on public.wk_reputation_reports from authenticated;
grant update(status,reviewer_note,reviewed_at) on public.wk_reputation_reports to authenticated;

-- Enable Realtime for the roster and append-only activity feed.
do $$ begin
  alter publication supabase_realtime add table public.wk_team_members;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.wk_team_activity;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
