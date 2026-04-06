-- Per-user place flags (wishlist, not_interested)
-- Replaces the need for separate tables per flag type
create table place_user_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  place_id uuid references places(id) on delete cascade not null,
  flag text not null check (flag in ('wishlist', 'not_interested')),
  created_at timestamptz default now() not null,
  unique(user_id, place_id, flag)
);

alter table place_user_flags enable row level security;

create policy "Users can view own flags"
  on place_user_flags for select
  using (user_id = auth.uid());

create policy "Users can insert own flags"
  on place_user_flags for insert
  with check (user_id = auth.uid());

create policy "Users can delete own flags"
  on place_user_flags for delete
  using (user_id = auth.uid());
