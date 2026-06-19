-- ─── Golf Tournament Schema ───────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor after creating your project.

-- Courses (reusable across tournaments)
create table courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  tee_color   text not null default 'White',
  created_at  timestamptz not null default now()
);

-- Holes (18 rows per course)
create table holes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  hole        int  not null check (hole between 1 and 18),
  par         int  not null check (par  between 3 and 5),
  hcp         int  not null check (hcp  between 1 and 18),
  yards       int,
  unique (course_id, hole)
);

-- Tournaments
create table tournaments (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  date        date not null,
  status      text not null default 'setup' check (status in ('setup','active','complete')),
  course_id   uuid references courses(id),
  created_at  timestamptz not null default now()
);

-- Admin tokens stored separately so they never appear in public SELECT queries
create table tournament_secrets (
  tournament_id  uuid primary key references tournaments(id) on delete cascade,
  admin_token    uuid not null default gen_random_uuid()
);

-- Teams (2 per tournament; sort_order 0 = "upper/team1", 1 = "lower/team2")
create table teams (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  name            text not null,
  color_hex       text not null default '#2471a3',
  light_hex       text not null default '#7fb3d3',
  sort_order      int  not null default 0
);

-- Players
create table players (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  team_id        uuid not null references teams(id) on delete cascade,
  name           text not null,
  handicap       int  not null default 0 check (handicap >= 0 and handicap <= 54),
  created_at     timestamptz not null default now()
);

-- Matches (upper = team sort_order 0, lower = team sort_order 1)
create table matches (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  label          text not null,
  upper_p1       uuid references players(id) on delete set null,
  upper_p2       uuid references players(id) on delete set null,
  lower_p1       uuid references players(id) on delete set null,
  lower_p2       uuid references players(id) on delete set null,
  sort_order     int  not null default 0
);

-- Scores (tournament_id denormalized for real-time filtering)
create table scores (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  player_id      uuid not null references players(id) on delete cascade,
  hole           int  not null check (hole between 1 and 18),
  raw_score      int  not null check (raw_score > 0 and raw_score <= 20),
  updated_at     timestamptz not null default now(),
  unique (player_id, hole)
);

-- Audit log — append-only, no delete policy
create table score_audit (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id),
  hole        int  not null,
  old_value   int,
  new_value   int,
  changed_at  timestamptz not null default now(),
  session_id  text not null
);

-- Bonus config (one row per tournament)
create table bonus_config (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null unique references tournaments(id) on delete cascade,
  scat_enabled   boolean not null default true,
  scat_amount    int     not null default 5
);

-- Bonus results (per hole)
create table bonus_results (
  id                    uuid primary key default gen_random_uuid(),
  tournament_id         uuid not null references tournaments(id) on delete cascade,
  hole                  int  not null check (hole between 1 and 18),
  scat_winner_team_id   uuid references teams(id)   on delete set null,
  ctp_winner_player_id  uuid references players(id) on delete set null,
  unique (tournament_id, hole)
);


-- ─── RPC Functions ────────────────────────────────────────────────────────────

-- Upsert a score and write to audit log atomically.
-- Called directly from the browser client (security definer bypasses RLS).
create or replace function upsert_score(
  p_player_id      uuid,
  p_tournament_id  uuid,
  p_hole           int,
  p_raw_score      int,
  p_session_id     text
) returns void language plpgsql security definer as $$
declare
  v_old int;
begin
  select raw_score into v_old
  from   scores
  where  player_id = p_player_id and hole = p_hole;

  insert into scores (tournament_id, player_id, hole, raw_score, updated_at)
  values (p_tournament_id, p_player_id, p_hole, p_raw_score, now())
  on conflict (player_id, hole)
  do update set raw_score = excluded.raw_score, updated_at = now();

  insert into score_audit (player_id, hole, old_value, new_value, session_id)
  values (p_player_id, p_hole, v_old, p_raw_score, p_session_id);
end;
$$;

-- Upsert a bonus result for one hole.
create or replace function upsert_bonus(
  p_tournament_id   uuid,
  p_hole            int,
  p_scat_team_id    uuid,
  p_ctp_player_id   uuid
) returns void language plpgsql security definer as $$
begin
  insert into bonus_results (tournament_id, hole, scat_winner_team_id, ctp_winner_player_id)
  values (p_tournament_id, p_hole, p_scat_team_id, p_ctp_player_id)
  on conflict (tournament_id, hole)
  do update set
    scat_winner_team_id  = excluded.scat_winner_team_id,
    ctp_winner_player_id = excluded.ctp_winner_player_id;
end;
$$;


-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table tournaments        enable row level security;
alter table tournament_secrets enable row level security;
alter table courses            enable row level security;
alter table holes              enable row level security;
alter table teams              enable row level security;
alter table players            enable row level security;
alter table matches            enable row level security;
alter table scores             enable row level security;
alter table score_audit        enable row level security;
alter table bonus_config       enable row level security;
alter table bonus_results      enable row level security;

-- Public read on everything except tournament_secrets
create policy "anon read" on tournaments     for select using (true);
create policy "anon read" on courses         for select using (true);
create policy "anon read" on holes           for select using (true);
create policy "anon read" on teams           for select using (true);
create policy "anon read" on players         for select using (true);
create policy "anon read" on matches         for select using (true);
create policy "anon read" on scores          for select using (true);
create policy "anon read" on bonus_config    for select using (true);
create policy "anon read" on bonus_results   for select using (true);
-- score_audit: no public read (admin-only via service key)

-- Audit log: insert-only for anon (the upsert_score RPC inserts here)
create policy "anon insert audit" on score_audit for insert with check (true);

-- All writes to admin tables (tournaments, teams, players, matches, courses,
-- holes, bonus_config, tournament_secrets) go through API routes that use the
-- service role key, which bypasses RLS. No additional policies needed.


-- ─── Function grants ─────────────────────────────────────────────────────────
grant execute on function upsert_score(uuid, uuid, int, int, text) to anon;
grant execute on function upsert_bonus(uuid, int, uuid, uuid)       to anon;
