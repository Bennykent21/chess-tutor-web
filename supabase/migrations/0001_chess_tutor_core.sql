-- Chess Tutor shared web/Android data model
-- Apply this migration to the shared Supabase project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  title text not null default 'Novice',
  rating integer not null default 1200 check (rating >= 0),
  puzzle_rating integer not null default 700 check (puzzle_rating >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_accuracy integer not null default 0 check (weekly_accuracy between 0 and 100),
  review_due integer not null default 0 check (review_due >= 0),
  streak integer not null default 0 check (streak >= 0),
  solved_positions integer not null default 0 check (solved_positions >= 0),
  recorded_mistakes integer not null default 0 check (recorded_mistakes >= 0),
  last_active_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  status text not null default 'started' check (status in ('started', 'completed')),
  mastery integer not null default 0 check (mastery between 0 and 100),
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.training_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text,
  puzzle_key text not null,
  fen text not null,
  expected_move text not null,
  played_move text,
  correct boolean not null,
  hints_used integer not null default 0 check (hints_used >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_key text not null,
  due_at timestamptz not null default now(),
  interval_days integer not null default 1 check (interval_days >= 1),
  repetitions integer not null default 0 check (repetitions >= 0),
  last_result text check (last_result in ('correct', 'wrong')),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, puzzle_key)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opponent_name text not null,
  opponent_elo integer,
  player_color text not null check (player_color in ('white', 'black')),
  result text not null check (result in ('win', 'loss', 'draw', 'unfinished')),
  opening text,
  pgn text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists training_attempts_user_created_idx
  on public.training_attempts(user_id, created_at desc);

create index if not exists review_items_user_due_idx
  on public.review_items(user_id, due_at);

create index if not exists games_user_started_idx
  on public.games(user_id, started_at desc);

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.training_attempts enable row level security;
alter table public.review_items enable row level security;
alter table public.games enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "user progress own row" on public.user_progress;
create policy "user progress own row"
  on public.user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "lesson progress own rows" on public.lesson_progress;
create policy "lesson progress own rows"
  on public.lesson_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "training attempts own rows" on public.training_attempts;
create policy "training attempts own rows"
  on public.training_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "review items own rows" on public.review_items;
create policy "review items own rows"
  on public.review_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "games own rows" on public.games;
create policy "games own rows"
  on public.games for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
