-- Per-user hidden places
create table hidden_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  place_id uuid references places(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, place_id)
);

alter table hidden_places enable row level security;

create policy "Users can view own hidden places"
  on hidden_places for select
  using (user_id = auth.uid());

create policy "Users can hide places"
  on hidden_places for insert
  with check (user_id = auth.uid());

create policy "Users can unhide places"
  on hidden_places for delete
  using (user_id = auth.uid());
