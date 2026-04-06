-- Track which places a user has viewed (tapped the pin)
create table viewed_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  place_id uuid references places(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, place_id)
);

alter table viewed_places enable row level security;

create policy "Users can view own viewed places"
  on viewed_places for select
  using (user_id = auth.uid());

create policy "Users can insert own viewed places"
  on viewed_places for insert
  with check (user_id = auth.uid());
