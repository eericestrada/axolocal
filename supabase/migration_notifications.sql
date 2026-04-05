-- Follows: users follow other users to get notified of their activity
create table follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references auth.users(id) on delete cascade not null,
  followed_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(follower_id, followed_id),
  check (follower_id != followed_id)
);

alter table follows enable row level security;

create policy "Users can read own follows"
  on follows for select using (auth.uid() = follower_id);

create policy "Users can insert own follows"
  on follows for insert with check (auth.uid() = follower_id);

create policy "Users can delete own follows"
  on follows for delete using (auth.uid() = follower_id);

-- Push subscriptions: browser push endpoints per user
create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz default now() not null,
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "Users can read own subscriptions"
  on push_subscriptions for select using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on push_subscriptions for insert with check (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on push_subscriptions for delete using (auth.uid() = user_id);
