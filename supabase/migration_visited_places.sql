-- Migration: visited_places table
-- Lightweight "been here" flag, separate from check-ins

create table visited_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  place_id uuid references places(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, place_id)
);

-- RLS
alter table visited_places enable row level security;

create policy "Users can view visited_places in their group"
  on visited_places for select using (
    exists (
      select 1 from places p
      join group_members gm on gm.group_id = p.group_id
      where p.id = visited_places.place_id
        and gm.user_id = auth.uid()
    )
  );

create policy "Users can mark places visited"
  on visited_places for insert with check (
    auth.uid() = user_id
  );

create policy "Users can unmark visited"
  on visited_places for delete using (
    auth.uid() = user_id
  );
