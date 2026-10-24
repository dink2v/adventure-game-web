-- Shared gameplay snapshot for Warung Kita multiplayer.
-- Apply after 202610240001_add_team.sql.
create table if not exists public.wk_team_game_state (
  team_id uuid primary key references public.wk_teams(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (pg_column_size(state) <= 65536)
);

alter table public.wk_team_game_state enable row level security;
grant select on public.wk_team_game_state to authenticated;
create policy "team members can read shared game state"
  on public.wk_team_game_state for select to authenticated
  using (team_private.is_member(team_id));
revoke insert, update, delete, truncate on public.wk_team_game_state from public, anon, authenticated;

create or replace function public.wk_save_game_state(p_state jsonb, p_expected_revision bigint default null)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_team uuid;
  v_revision bigint;
  v_updated timestamptz;
begin
  if v_user is null then raise exception 'Silakan masuk terlebih dahulu.'; end if;
  select m.team_id into v_team from public.wk_team_members m where m.user_id = v_user;
  if v_team is null then raise exception 'Kamu belum tergabung dalam tim.'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then raise exception 'Data permainan tidak valid.'; end if;
  if pg_column_size(p_state) > 65536 then raise exception 'Data permainan terlalu besar (maksimal 64 KiB).'; end if;
  if p_expected_revision is null then
    insert into public.wk_team_game_state(team_id,state,revision,updated_by,updated_at)
    values(v_team,p_state,1,v_user,now())
    on conflict (team_id) do nothing
    returning wk_team_game_state.revision, wk_team_game_state.updated_at into v_revision,v_updated;
    if v_revision is null then raise exception 'Progres tim sudah ada. Muat progres terbaru sebelum menyimpan.'; end if;
  else
    update public.wk_team_game_state
      set state=p_state, revision=revision+1, updated_by=v_user, updated_at=now()
      where team_id=v_team and revision=p_expected_revision
      returning wk_team_game_state.revision, wk_team_game_state.updated_at into v_revision,v_updated;
    if v_revision is null then raise exception 'Progres tim berubah sejak terakhir dimuat. Muat ulang sebelum menyimpan agar perubahan teman tidak tertimpa.'; end if;
  end if;
  return query select v_revision,v_updated;
end;
$$;

revoke all on function public.wk_save_game_state(jsonb,bigint) from public, anon;
grant execute on function public.wk_save_game_state(jsonb,bigint) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.wk_team_game_state;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
