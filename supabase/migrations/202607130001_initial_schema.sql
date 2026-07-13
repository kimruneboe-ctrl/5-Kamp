create extension if not exists pgcrypto;

create type public.game_status as enum ('lobby', 'active', 'complete', 'abandoned');
create type public.asset_tier as enum ('free', 'premium');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Viking',
  avatar_id text not null default 'warrior',
  total_points integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.avatars (
  id text primary key,
  name text not null,
  tier public.asset_tier not null default 'free',
  image_url text,
  created_at timestamptz not null default now()
);

create table public.themes (
  id text primary key,
  name text not null,
  tier public.asset_tier not null default 'free',
  accent text not null default '#d5a84f',
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid references public.profiles(id) on delete set null,
  status public.game_status not null default 'lobby',
  theme_id text references public.themes(id),
  state jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  seat integer not null,
  display_name text not null,
  avatar_id text references public.avatars(id),
  score integer not null default 0,
  round_wins integer not null default 0,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (game_id, seat)
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_index integer not null,
  title text not null,
  scoring text not null,
  winner_player_id uuid references public.game_players(id),
  complete boolean not null default false,
  created_at timestamptz not null default now(),
  unique (game_id, round_index)
);

create table public.turns (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.game_players(id) on delete cascade,
  round_index integer not null,
  card_id text not null,
  points integer not null,
  created_at timestamptz not null default now()
);

create table public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  medal text not null,
  tier public.asset_tier not null default 'free'
);

create table public.profile_achievements (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (profile_id, achievement_id)
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.rounds enable row level security;
alter table public.turns enable row level security;
alter table public.avatars enable row level security;
alter table public.themes enable row level security;
alter table public.achievements enable row level security;
alter table public.profile_achievements enable row level security;

create policy "profiles are visible to authenticated users" on public.profiles for select to authenticated using (true);
create policy "users manage own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "catalog is readable" on public.avatars for select to anon, authenticated using (true);
create policy "themes are readable" on public.themes for select to anon, authenticated using (true);
create policy "achievements are readable" on public.achievements for select to anon, authenticated using (true);

create policy "games readable by code participants" on public.games for select to anon, authenticated using (true);
create policy "authenticated users create games" on public.games for insert to authenticated with check (auth.uid() = host_id);
create policy "host updates game" on public.games for update to authenticated using (auth.uid() = host_id);

create policy "players readable" on public.game_players for select to anon, authenticated using (true);
create policy "players can join" on public.game_players for insert to authenticated with check (true);
create policy "players can update own seat" on public.game_players for update to authenticated using (profile_id = auth.uid());

create policy "rounds readable" on public.rounds for select to anon, authenticated using (true);
create policy "turns readable" on public.turns for select to anon, authenticated using (true);
create policy "players insert turns" on public.turns for insert to authenticated with check (
  exists (
    select 1 from public.game_players gp
    where gp.id = player_id and gp.profile_id = auth.uid()
  )
);

create policy "profile achievements visible" on public.profile_achievements for select to authenticated using (profile_id = auth.uid());

insert into public.avatars (id, name, tier) values
  ('warrior', 'Vikingkriger', 'free'),
  ('shieldmaiden', 'Skjoldmøy', 'free'),
  ('chieftain', 'Høvding', 'free'),
  ('berserker', 'Berserker', 'free'),
  ('odin', 'Odin', 'premium'),
  ('thor', 'Tor', 'premium'),
  ('loki', 'Loke', 'premium'),
  ('freya', 'Freya', 'premium'),
  ('hel', 'Hel', 'premium'),
  ('fenris', 'Fenris', 'premium')
on conflict (id) do nothing;

insert into public.themes (id, name, tier, accent) values
  ('standard-viking', 'Standard Viking', 'free', '#d5a84f'),
  ('valhalla', 'Valhalla', 'premium', '#f0d083'),
  ('ragnarok', 'Ragnarok', 'premium', '#c75b39'),
  ('midgard', 'Midgard', 'premium', '#74a46b'),
  ('niflheim', 'Niflheim', 'premium', '#8db9c9'),
  ('asgard', 'Asgard', 'premium', '#d7b15b')
on conflict (id) do nothing;

insert into public.achievements (id, name, description, medal, tier) values
  ('first-win', 'Første seier', 'Vinn din første kamp.', 'Bronse', 'free'),
  ('ten-wins', '10 seiere', 'Vinn ti kamper.', 'Sølv', 'free'),
  ('fifty-wins', '50 seiere', 'Vinn femti kamper.', 'Gull', 'premium'),
  ('hundred-wins', '100 seiere', 'Vinn hundre kamper.', 'Runegull', 'premium'),
  ('viking-master', 'Vikingmester', 'Topp 3 i fem kamper på rad.', 'Mester', 'premium'),
  ('legend', 'Legende', 'Dominer en hel sesong.', 'Legende', 'premium')
on conflict (id) do nothing;
