-- Warung Kita multiplayer phase 3: recruitment, roles, finance, disputes and exits.
-- Apply after 202610240001_add_team.sql and 202610240002_multiplayer_game_state.sql.
-- This migration adds game-accounting records only; it does not move real money.

create table if not exists public.wk_team_vacancies (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  role_key text not null check (role_key in ('chef','cashier','server','stock_manager','operations_manager')),
  title text not null check (char_length(trim(title)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 600),
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists wk_team_vacancies_open_idx on public.wk_team_vacancies(status, created_at desc);

-- Separate job function from authorization role (owner/manager/member).
alter table public.wk_team_members add column if not exists job_role text not null default 'server'
  check (job_role in ('chef','cashier','server','stock_manager','operations_manager'));

create table if not exists public.wk_team_applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.wk_team_vacancies(id) on delete cascade,
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  message text not null default '' check (char_length(message) <= 600),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(vacancy_id, applicant_id)
);
create index if not exists wk_team_applications_team_idx on public.wk_team_applications(team_id, status, created_at desc);

create table if not exists public.wk_team_compensation (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_title text not null default 'Anggota' check (char_length(trim(role_title)) between 1 and 60),
  base_salary numeric(14,2) not null default 0 check (base_salary >= 0),
  bonus_cap numeric(14,2) not null default 0 check (bonus_cap >= 0),
  profit_share_percent numeric(5,2) not null default 0 check (profit_share_percent between 0 and 100),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique(team_id,user_id)
);

create table if not exists public.wk_team_financial_settings (
  team_id uuid primary key references public.wk_teams(id) on delete cascade,
  reserve_percent numeric(5,2) not null default 20 check (reserve_percent between 0 and 80),
  profit_share_enabled boolean not null default false,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table if not exists public.wk_team_financial_entries (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  entry_type text not null check (entry_type in ('income','expense','owner_contribution','salary','bonus','reserve','profit_distribution')),
  amount numeric(14,2) not null check (amount > 0),
  description text not null check (char_length(trim(description)) between 2 and 240),
  related_user_id uuid references auth.users(id) on delete set null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists wk_team_financial_entries_team_idx on public.wk_team_financial_entries(team_id, created_at desc);

create table if not exists public.wk_team_disputes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  opened_by uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  category text not null check (category in ('pay','workload','conduct','authority','finance','other')),
  severity text not null check (severity in ('light','medium','serious')),
  details text not null check (char_length(trim(details)) between 10 and 1200),
  opener_response text,
  target_response text,
  status text not null default 'open' check (status in ('open','mediation','formal_review','resolved','dismissed')),
  resolution text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opened_by <> target_user_id)
);
create index if not exists wk_team_disputes_team_idx on public.wk_team_disputes(team_id, status, created_at desc);

create table if not exists public.wk_team_exit_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists wk_team_exit_requests_team_idx on public.wk_team_exit_requests(team_id, status, created_at desc);

create table if not exists public.wk_team_audit_logs (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(trim(action)) between 2 and 80),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists wk_team_audit_logs_team_idx on public.wk_team_audit_logs(team_id, created_at desc);

-- Open vacancies are visible to signed-in players; application contents remain private.
alter table public.wk_team_vacancies enable row level security;
alter table public.wk_team_applications enable row level security;
alter table public.wk_team_compensation enable row level security;
alter table public.wk_team_financial_settings enable row level security;
alter table public.wk_team_financial_entries enable row level security;
alter table public.wk_team_disputes enable row level security;
alter table public.wk_team_exit_requests enable row level security;
alter table public.wk_team_audit_logs enable row level security;

grant select on public.wk_team_vacancies to authenticated;
grant select on public.wk_team_applications to authenticated;
grant select on public.wk_team_compensation to authenticated;
grant select on public.wk_team_financial_settings to authenticated;
grant select on public.wk_team_financial_entries to authenticated;
grant select on public.wk_team_disputes to authenticated;
grant select on public.wk_team_exit_requests to authenticated;
grant select on public.wk_team_audit_logs to authenticated;

create policy "signed-in players can view open vacancies" on public.wk_team_vacancies
for select to authenticated using (status = 'open' or team_private.is_member(team_id));
create policy "applicants and managers can view applications" on public.wk_team_applications
for select to authenticated using (applicant_id = (select auth.uid()) or team_private.is_manager(team_id));
create policy "members can view their compensation" on public.wk_team_compensation
for select to authenticated using (user_id = (select auth.uid()) or team_private.is_manager(team_id));
create policy "members can view financial settings" on public.wk_team_financial_settings
for select to authenticated using (team_private.is_member(team_id));
create policy "managers can view financial ledger" on public.wk_team_financial_entries
for select to authenticated using (team_private.is_manager(team_id));
create policy "dispute parties and managers can view disputes" on public.wk_team_disputes
for select to authenticated using (opened_by = (select auth.uid()) or target_user_id = (select auth.uid()) or team_private.is_manager(team_id));
create policy "requester and managers can view exit requests" on public.wk_team_exit_requests
for select to authenticated using (user_id = (select auth.uid()) or team_private.is_manager(team_id));
create policy "managers can view audit logs" on public.wk_team_audit_logs
for select to authenticated using (team_private.is_manager(team_id));

revoke insert, update, delete, truncate on public.wk_team_vacancies, public.wk_team_applications,
  public.wk_team_compensation, public.wk_team_financial_settings, public.wk_team_financial_entries,
  public.wk_team_disputes, public.wk_team_exit_requests, public.wk_team_audit_logs from public, anon, authenticated;

create or replace function public.wk_create_vacancy(p_role_key text, p_title text, p_description text default '')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid; v_id uuid;
begin
  select m.team_id into v_team from public.wk_team_members m where m.user_id = v_user;
  if v_user is null or v_team is null or not team_private.is_manager(v_team) then raise exception 'Hanya pemilik atau pengelola yang dapat membuka lowongan.'; end if;
  if p_role_key not in ('chef','cashier','server','stock_manager','operations_manager') then raise exception 'Jabatan lowongan tidak valid.'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 60 or char_length(coalesce(p_description,'')) > 600 then raise exception 'Judul harus 2–60 karakter dan deskripsi maksimal 600 karakter.'; end if;
  insert into public.wk_team_vacancies(team_id,role_key,title,description,created_by)
  values(v_team,p_role_key,trim(p_title),trim(coalesce(p_description,'')),v_user) returning id into v_id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'vacancy_created',jsonb_build_object('vacancy_id',v_id,'role_key',p_role_key));
  return v_id;
end;
$$;

create or replace function public.wk_apply_to_vacancy(p_vacancy_id uuid, p_display_name text, p_message text default '')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_vacancy public.wk_team_vacancies%rowtype; v_id uuid;
begin
  if v_user is null then raise exception 'Silakan masuk terlebih dahulu.'; end if;
  if exists(select 1 from public.wk_team_members where user_id=v_user) then raise exception 'Keluar dari tim saat ini sebelum melamar ke warung lain.'; end if;
  if char_length(trim(coalesce(p_display_name,''))) not between 1 and 40 or char_length(coalesce(p_message,'')) > 600 then raise exception 'Nama pemain harus 1–40 karakter dan pesan maksimal 600 karakter.'; end if;
  select * into v_vacancy from public.wk_team_vacancies where id=p_vacancy_id and status='open' for update;
  if not found then raise exception 'Lowongan sudah ditutup atau tidak tersedia.'; end if;
  insert into public.wk_team_applications(vacancy_id,team_id,applicant_id,display_name,message)
  values(v_vacancy.id,v_vacancy.team_id,v_user,trim(p_display_name),trim(coalesce(p_message,''))) returning id into v_id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_vacancy.team_id,v_user,'application_submitted',jsonb_build_object('application_id',v_id,'vacancy_id',v_vacancy.id));
  return v_id;
end;
$$;

create or replace function public.wk_review_application(p_application_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_app public.wk_team_applications%rowtype;
begin
  if p_decision not in ('accepted','rejected') then raise exception 'Keputusan lamaran tidak valid.'; end if;
  select * into v_app from public.wk_team_applications where id=p_application_id for update;
  if not found or not team_private.is_manager(v_app.team_id) then raise exception 'Lamaran tidak ditemukan atau kamu tidak berwenang.'; end if;
  if v_app.status <> 'pending' then raise exception 'Lamaran ini sudah diproses.'; end if;
  if p_decision='accepted' then
    perform 1 from public.wk_teams where id=v_app.team_id and status='open' for update;
    if not found then raise exception 'Warung sudah ditutup atau tidak menerima anggota.'; end if;
    if (select count(*) from public.wk_team_members where team_id=v_app.team_id) >= 8 then raise exception 'Tim sudah mencapai batas 8 pemain.'; end if;
    if exists(select 1 from public.wk_team_members where user_id=v_app.applicant_id) then raise exception 'Pelamar sudah menjadi anggota tim lain.'; end if;
    insert into public.wk_team_members(team_id,user_id,display_name,role,job_role) values(v_app.team_id,v_app.applicant_id,v_app.display_name,'member',(select role_key from public.wk_team_vacancies where id=v_app.vacancy_id));
    insert into public.wk_team_activity(team_id,actor_id,event_type,message) values(v_app.team_id,v_user,'member_joined','Lamaran anggota diterima oleh pengelola.');
  end if;
  update public.wk_team_applications set status=p_decision,reviewed_by=v_user,reviewed_at=now() where id=v_app.id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_app.team_id,v_user,'application_reviewed',jsonb_build_object('application_id',v_app.id,'decision',p_decision));
end;
$$;

create or replace function public.wk_close_vacancy(p_vacancy_id uuid)
returns void language plpgsql security definer set search_path = ''
as $
declare v_user uuid := (select auth.uid()); v_vacancy public.wk_team_vacancies%rowtype;
begin
  select * into v_vacancy from public.wk_team_vacancies where id=p_vacancy_id for update;
  if not found or not team_private.is_manager(v_vacancy.team_id) then raise exception 'Lowongan tidak ditemukan atau kamu tidak berwenang.'; end if;
  update public.wk_team_vacancies set status='closed',closed_at=now() where id=p_vacancy_id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_vacancy.team_id,v_user,'vacancy_closed',jsonb_build_object('vacancy_id',p_vacancy_id));
end;
$;

create or replace function public.wk_transfer_team_ownership(p_target_user uuid)
returns void language plpgsql security definer set search_path = ''
as $
declare v_user uuid := (select auth.uid()); v_team uuid;
begin
  select t.id into v_team from public.wk_teams t where t.owner_id=v_user and t.status='open' for update;
  if v_team is null then raise exception 'Hanya pemilik saat ini yang dapat mentransfer kepemilikan.'; end if;
  if p_target_user=v_user or not exists(select 1 from public.wk_team_members where team_id=v_team and user_id=p_target_user) then raise exception 'Pilih anggota lain dari tim yang sama.'; end if;
  update public.wk_team_members set role='manager' where team_id=v_team and user_id=v_user;
  update public.wk_team_members set role='owner' where team_id=v_team and user_id=p_target_user;
  update public.wk_teams set owner_id=p_target_user where id=v_team;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'ownership_transferred',jsonb_build_object('new_owner_id',p_target_user));
end;
$;

create or replace function public.wk_set_job_role(p_target_user uuid, p_job_role text)
returns void language plpgsql security definer set search_path = ''
as $
declare v_user uuid := (select auth.uid()); v_team uuid;
begin
  select t.id into v_team from public.wk_teams t where t.owner_id=v_user and t.status='open';
  if v_team is null then raise exception 'Hanya pemilik warung yang dapat menetapkan pekerjaan.'; end if;
  if p_job_role not in ('chef','cashier','server','stock_manager','operations_manager') then raise exception 'Pekerjaan tidak valid.'; end if;
  if p_target_user=v_user or not exists(select 1 from public.wk_team_members where team_id=v_team and user_id=p_target_user) then raise exception 'Anggota tidak ditemukan atau pemilik tidak dapat mengubah pekerjaannya sendiri.'; end if;
  update public.wk_team_members set job_role=p_job_role where team_id=v_team and user_id=p_target_user;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'member_job_role_changed',jsonb_build_object('target_user_id',p_target_user,'job_role',p_job_role));
end;
$;

create or replace function public.wk_set_member_role(p_target_user uuid, p_role text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid;
begin
  select m.team_id into v_team from public.wk_team_members m where m.user_id=v_user and m.role='owner';
  if v_team is null then raise exception 'Hanya pemilik warung yang dapat mengubah jabatan anggota.'; end if;
  if p_role not in ('manager','member') then raise exception 'Jabatan tidak valid.'; end if;
  if p_target_user=v_user or not exists(select 1 from public.wk_team_members where team_id=v_team and user_id=p_target_user) then raise exception 'Anggota tidak ditemukan.'; end if;
  update public.wk_team_members set role=p_role where team_id=v_team and user_id=p_target_user;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'member_role_changed',jsonb_build_object('target_user_id',p_target_user,'role',p_role));
end;
$$;

create or replace function public.wk_set_compensation(p_target_user uuid, p_role_title text, p_base_salary numeric, p_bonus_cap numeric, p_profit_share_percent numeric)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid;
begin
  select t.id into v_team from public.wk_teams t where t.owner_id=v_user and t.status='open';
  if v_team is null then raise exception 'Hanya pemilik warung yang dapat menetapkan kompensasi.'; end if;
  if not exists(select 1 from public.wk_team_members where team_id=v_team and user_id=p_target_user) then raise exception 'Anggota tidak ditemukan di warung ini.'; end if;
  if char_length(trim(coalesce(p_role_title,''))) not between 1 and 60 or p_base_salary < 0 or p_bonus_cap < 0 or p_profit_share_percent not between 0 and 100 then raise exception 'Nilai kompensasi tidak valid.'; end if;
  insert into public.wk_team_compensation(team_id,user_id,role_title,base_salary,bonus_cap,profit_share_percent,updated_by,updated_at)
  values(v_team,p_target_user,trim(p_role_title),p_base_salary,p_bonus_cap,p_profit_share_percent,v_user,now())
  on conflict(team_id,user_id) do update set role_title=excluded.role_title,base_salary=excluded.base_salary,bonus_cap=excluded.bonus_cap,profit_share_percent=excluded.profit_share_percent,updated_by=v_user,updated_at=now();
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'compensation_updated',jsonb_build_object('target_user_id',p_target_user,'role_title',p_role_title));
end;
$$;

create or replace function public.wk_set_financial_settings(p_reserve_percent numeric, p_profit_share_enabled boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid;
begin
  select t.id into v_team from public.wk_teams t where t.owner_id=v_user and t.status='open';
  if v_team is null then raise exception 'Hanya pemilik warung yang dapat mengubah aturan keuntungan.'; end if;
  if p_reserve_percent not between 0 and 80 then raise exception 'Cadangan harus antara 0% dan 80%.'; end if;
  insert into public.wk_team_financial_settings(team_id,reserve_percent,profit_share_enabled,updated_by,updated_at)
  values(v_team,p_reserve_percent,p_profit_share_enabled,v_user,now())
  on conflict(team_id) do update set reserve_percent=excluded.reserve_percent,profit_share_enabled=excluded.profit_share_enabled,updated_by=v_user,updated_at=now();
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'financial_settings_updated',jsonb_build_object('reserve_percent',p_reserve_percent,'profit_share_enabled',p_profit_share_enabled));
end;
$$;

create or replace function public.wk_record_financial_entry(p_entry_type text, p_amount numeric, p_description text, p_related_user uuid default null)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid; v_id bigint;
begin
  select m.team_id into v_team from public.wk_team_members m where m.user_id=v_user;
  if v_user is null or v_team is null or not team_private.is_manager(v_team) then raise exception 'Hanya pemilik atau pengelola yang dapat mencatat transaksi.'; end if;
  if p_entry_type not in ('income','expense','owner_contribution','salary','bonus','reserve','profit_distribution') or p_amount is null or p_amount <= 0 then raise exception 'Jenis atau nominal transaksi tidak valid.'; end if;
  if char_length(trim(coalesce(p_description,''))) not between 2 and 240 then raise exception 'Deskripsi harus 2–240 karakter.'; end if;
  if p_related_user is not null and not exists(select 1 from public.wk_team_members where team_id=v_team and user_id=p_related_user) then raise exception 'Anggota terkait tidak ditemukan.'; end if;
  insert into public.wk_team_financial_entries(team_id,entry_type,amount,description,related_user_id,actor_id)
  values(v_team,p_entry_type,p_amount,trim(p_description),p_related_user,v_user) returning id into v_id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'financial_entry_created',jsonb_build_object('entry_id',v_id,'entry_type',p_entry_type,'amount',p_amount,'related_user_id',p_related_user));
  return v_id;
end;
$$;

create or replace function public.wk_open_team_dispute(p_target_user uuid, p_category text, p_severity text, p_details text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid; v_id uuid;
begin
  select m.team_id into v_team from public.wk_team_members m where m.user_id=v_user;
  if v_user is null or v_team is null then raise exception 'Kamu belum bergabung dengan tim.'; end if;
  if p_target_user=v_user or not exists(select 1 from public.wk_team_members where team_id=v_team and user_id=p_target_user) then raise exception 'Pilih anggota lain dari tim yang sama.'; end if;
  if p_category not in ('pay','workload','conduct','authority','finance','other') or p_severity not in ('light','medium','serious') then raise exception 'Kategori atau tingkat konflik tidak valid.'; end if;
  if char_length(trim(coalesce(p_details,''))) not between 10 and 1200 then raise exception 'Rincian harus 10–1.200 karakter.'; end if;
  insert into public.wk_team_disputes(team_id,opened_by,target_user_id,category,severity,details)
  values(v_team,v_user,p_target_user,p_category,p_severity,trim(p_details)) returning id into v_id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'dispute_opened',jsonb_build_object('dispute_id',v_id,'severity',p_severity));
  return v_id;
end;
$$;

create or replace function public.wk_respond_team_dispute(p_dispute_id uuid, p_response text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_dispute public.wk_team_disputes%rowtype;
begin
  if char_length(trim(coalesce(p_response,''))) not between 5 and 1200 then raise exception 'Tanggapan harus 5–1.200 karakter.'; end if;
  select * into v_dispute from public.wk_team_disputes where id=p_dispute_id for update;
  if not found or v_user not in (v_dispute.opened_by,v_dispute.target_user_id) then raise exception 'Perselisihan tidak ditemukan atau kamu tidak terlibat.'; end if;
  if v_dispute.status in ('resolved','dismissed') then raise exception 'Perselisihan sudah ditutup.'; end if;
  if v_user=v_dispute.opened_by then update public.wk_team_disputes set opener_response=trim(p_response),updated_at=now() where id=p_dispute_id;
  else update public.wk_team_disputes set target_response=trim(p_response),updated_at=now() where id=p_dispute_id; end if;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_dispute.team_id,v_user,'dispute_response_added',jsonb_build_object('dispute_id',p_dispute_id));
end;
$$;

create or replace function public.wk_review_team_dispute(p_dispute_id uuid, p_status text, p_resolution text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_dispute public.wk_team_disputes%rowtype;
begin
  select * into v_dispute from public.wk_team_disputes where id=p_dispute_id for update;
  if not found or not team_private.is_manager(v_dispute.team_id) then raise exception 'Perselisihan tidak ditemukan atau kamu tidak berwenang.'; end if;
  if v_user in (v_dispute.opened_by,v_dispute.target_user_id) then raise exception 'Pihak yang terlibat tidak boleh meninjau perselisihan itu sendiri.'; end if;
  if p_status not in ('mediation','formal_review','resolved','dismissed') then raise exception 'Status penanganan tidak valid.'; end if;
  if p_status in ('resolved','dismissed') and char_length(trim(coalesce(p_resolution,''))) < 5 then raise exception 'Catatan penyelesaian minimal 5 karakter.'; end if;
  update public.wk_team_disputes set status=p_status,resolution=case when p_resolution is null then resolution else trim(p_resolution) end,reviewed_by=v_user,updated_at=now() where id=p_dispute_id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_dispute.team_id,v_user,'dispute_reviewed',jsonb_build_object('dispute_id',p_dispute_id,'status',p_status));
end;
$$;

create or replace function public.wk_request_team_exit(p_reason text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_team uuid; v_id uuid;
begin
  select m.team_id into v_team from public.wk_team_members m where m.user_id=v_user and m.role <> 'owner';
  if v_user is null or v_team is null then raise exception 'Pemilik harus mentransfer kepemilikan sebelum meninggalkan warung.'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'Alasan keluar harus 5–500 karakter.'; end if;
  if exists(select 1 from public.wk_team_exit_requests where team_id=v_team and user_id=v_user and status='pending') then raise exception 'Permintaan keluar kamu masih menunggu keputusan.'; end if;
  insert into public.wk_team_exit_requests(team_id,user_id,reason) values(v_team,v_user,trim(p_reason)) returning id into v_id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_team,v_user,'exit_requested',jsonb_build_object('request_id',v_id));
  return v_id;
end;
$$;

create or replace function public.wk_review_team_exit(p_request_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_req public.wk_team_exit_requests%rowtype;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Keputusan permintaan keluar tidak valid.'; end if;
  select * into v_req from public.wk_team_exit_requests where id=p_request_id for update;
  if not found or not team_private.is_manager(v_req.team_id) then raise exception 'Permintaan tidak ditemukan atau kamu tidak berwenang.'; end if;
  if v_req.status <> 'pending' then raise exception 'Permintaan ini sudah diproses.'; end if;
  if p_decision='approved' then
    if exists(select 1 from public.wk_team_members where user_id=v_req.user_id and role='owner') then raise exception 'Pemilik harus mentransfer kepemilikan terlebih dahulu.'; end if;
    delete from public.wk_team_members where team_id=v_req.team_id and user_id=v_req.user_id;
  end if;
  update public.wk_team_exit_requests set status=p_decision,reviewed_by=v_user,reviewed_at=now() where id=p_request_id;
  insert into public.wk_team_audit_logs(team_id,actor_id,action,details) values(v_req.team_id,v_user,'exit_request_reviewed',jsonb_build_object('request_id',p_request_id,'decision',p_decision));
end;
$$;

revoke all on function public.wk_create_vacancy(text,text,text) from public, anon;
revoke all on function public.wk_apply_to_vacancy(uuid,text,text) from public, anon;
revoke all on function public.wk_review_application(uuid,text) from public, anon;
revoke all on function public.wk_close_vacancy(uuid) from public, anon;
revoke all on function public.wk_transfer_team_ownership(uuid) from public, anon;
revoke all on function public.wk_set_job_role(uuid,text) from public, anon;
revoke all on function public.wk_set_member_role(uuid,text) from public, anon;
revoke all on function public.wk_set_compensation(uuid,text,numeric,numeric,numeric) from public, anon;
revoke all on function public.wk_set_financial_settings(numeric,boolean) from public, anon;
revoke all on function public.wk_record_financial_entry(text,numeric,text,uuid) from public, anon;
revoke all on function public.wk_open_team_dispute(uuid,text,text,text) from public, anon;
revoke all on function public.wk_respond_team_dispute(uuid,text) from public, anon;
revoke all on function public.wk_review_team_dispute(uuid,text,text) from public, anon;
revoke all on function public.wk_request_team_exit(text) from public, anon;
revoke all on function public.wk_review_team_exit(uuid,text) from public, anon;

grant execute on function public.wk_create_vacancy(text,text,text) to authenticated;
grant execute on function public.wk_apply_to_vacancy(uuid,text,text) to authenticated;
grant execute on function public.wk_review_application(uuid,text) to authenticated;
grant execute on function public.wk_close_vacancy(uuid) to authenticated;
grant execute on function public.wk_transfer_team_ownership(uuid) to authenticated;
grant execute on function public.wk_set_job_role(uuid,text) to authenticated;
grant execute on function public.wk_set_member_role(uuid,text) to authenticated;
grant execute on function public.wk_set_compensation(uuid,text,numeric,numeric,numeric) to authenticated;
grant execute on function public.wk_set_financial_settings(numeric,boolean) to authenticated;
grant execute on function public.wk_record_financial_entry(text,numeric,text,uuid) to authenticated;
grant execute on function public.wk_open_team_dispute(uuid,text,text,text) to authenticated;
grant execute on function public.wk_respond_team_dispute(uuid,text) to authenticated;
grant execute on function public.wk_review_team_dispute(uuid,text,text) to authenticated;
grant execute on function public.wk_request_team_exit(text) to authenticated;
grant execute on function public.wk_review_team_exit(uuid,text) to authenticated;

-- Keep realtime feeds useful without exposing private application/report details.
do $$ begin alter publication supabase_realtime add table public.wk_team_vacancies; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wk_team_applications; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wk_team_disputes; exception when duplicate_object then null; when undefined_object then null; end $$;

do $$ begin alter publication supabase_realtime add table public.wk_team_compensation; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wk_team_financial_settings; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wk_team_financial_entries; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wk_team_exit_requests; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wk_team_audit_logs; exception when duplicate_object then null; when undefined_object then null; end $$;
