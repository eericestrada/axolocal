-- ============================================================
-- Axolocal v1 Database Schema
-- Run this in the Supabase SQL editor to set up all tables
-- ============================================================

-- ============================================================
-- USERS & GROUPS
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text unique not null,
  invite_expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

create table follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references profiles(id) on delete cascade,
  followed_id uuid references profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, followed_id, group_id)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- ============================================================
-- REGIONS
-- ============================================================

create table regions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  name text not null,
  auto_detected boolean default false,
  bounds jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- PLACES
-- ============================================================

create table places (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  name text not null,
  nickname text,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  primary_type text not null,
  google_types jsonb,
  google_metadata jsonb,
  google_metadata_fetched_at timestamptz,
  source text not null default 'manual',
  added_by uuid references profiles(id),
  group_id uuid references groups(id) on delete cascade,
  region_id uuid references regions(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TAGS & ATTRIBUTES
-- ============================================================

create table use_case_tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  icon text,
  sort_order int default 0
);

create table place_tag_votes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  tag_id uuid references use_case_tags(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  vote boolean not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(place_id, tag_id, user_id)
);

create table category_attributes (
  id uuid primary key default gen_random_uuid(),
  primary_type text not null,
  slug text not null,
  label text not null,
  input_type text not null,
  options jsonb,
  sort_order int default 0,
  unique(primary_type, slug)
);

create table place_attribute_votes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  attribute_id uuid references category_attributes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(place_id, attribute_id, user_id)
);

-- ============================================================
-- RATINGS & NOTES
-- ============================================================

create table ratings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  score int not null check (score >= 1 and score <= 5),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(place_id, user_id)
);

-- ============================================================
-- CHECK-INS
-- ============================================================

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  checked_in_at timestamptz default now()
);

-- ============================================================
-- EVENTS
-- ============================================================

create table events (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_recurring boolean default false,
  recurrence_rule text,
  cancelled_dates jsonb,
  created_by uuid references profiles(id),
  group_id uuid references groups(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ACTIVITY FEED
-- ============================================================

create table activity (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  place_id uuid references places(id) on delete cascade,
  action_type text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_activity_group_created on activity (group_id, created_at desc);
create index idx_activity_user on activity (user_id, created_at desc);

-- ============================================================
-- USEFUL INDEXES
-- ============================================================

create index idx_places_group on places (group_id);
create index idx_places_type on places (group_id, primary_type);
create index idx_places_region on places (region_id);
create index idx_ratings_place on ratings (place_id);
create index idx_check_ins_place on check_ins (place_id);
create index idx_check_ins_user on check_ins (user_id);
create index idx_tag_votes_place on place_tag_votes (place_id);
create index idx_attribute_votes_place on place_attribute_votes (place_id);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

-- Helper: is the current user a member of the given group?
create or replace function is_group_member(gid uuid)
returns boolean as $$
  select exists (
    select 1 from group_members where group_id = gid and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Profiles
alter table profiles enable row level security;

create policy "Anyone can view profiles"
  on profiles for select using (true);

create policy "Users can insert own profile"
  on profiles for insert with check (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

-- Groups
alter table groups enable row level security;

create policy "Group members can view their groups"
  on groups for select using (is_group_member(id));

create policy "Authenticated users can create groups"
  on groups for insert with check (auth.uid() is not null);

create policy "Group members can update their groups"
  on groups for update using (is_group_member(id));

-- Allow reading a group by invite code (for the join flow)
create policy "Anyone can view group by invite code"
  on groups for select using (invite_code is not null);

-- Group members
alter table group_members enable row level security;

create policy "Group members can view members"
  on group_members for select using (is_group_member(group_id));

create policy "Authenticated users can join groups"
  on group_members for insert with check (user_id = auth.uid());

create policy "Users can leave groups"
  on group_members for delete using (user_id = auth.uid());

-- Follows
alter table follows enable row level security;

create policy "Group members can view follows"
  on follows for select using (is_group_member(group_id));

create policy "Users can manage own follows"
  on follows for insert with check (follower_id = auth.uid());

create policy "Users can delete own follows"
  on follows for delete using (follower_id = auth.uid());

-- Push subscriptions
alter table push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on push_subscriptions for all using (user_id = auth.uid());

-- Regions
alter table regions enable row level security;

create policy "Group members can view regions"
  on regions for select using (is_group_member(group_id));

create policy "Group members can create regions"
  on regions for insert with check (is_group_member(group_id));

-- Places
alter table places enable row level security;

create policy "Group members can view places"
  on places for select using (is_group_member(group_id));

create policy "Group members can insert places"
  on places for insert with check (is_group_member(group_id));

create policy "Group members can update places"
  on places for update using (is_group_member(group_id));

create policy "Group members can delete places"
  on places for delete using (is_group_member(group_id));

-- Use case tags (system-defined, readable by all)
alter table use_case_tags enable row level security;

create policy "Anyone can view tags"
  on use_case_tags for select using (true);

-- Place tag votes
alter table place_tag_votes enable row level security;

create policy "Group members can view tag votes"
  on place_tag_votes for select using (
    place_id in (select id from places where is_group_member(group_id))
  );

create policy "Users can insert own tag votes"
  on place_tag_votes for insert with check (user_id = auth.uid());

create policy "Users can update own tag votes"
  on place_tag_votes for update using (user_id = auth.uid());

create policy "Users can delete own tag votes"
  on place_tag_votes for delete using (user_id = auth.uid());

-- Category attributes (system-defined, readable by all)
alter table category_attributes enable row level security;

create policy "Anyone can view category attributes"
  on category_attributes for select using (true);

-- Place attribute votes
alter table place_attribute_votes enable row level security;

create policy "Group members can view attribute votes"
  on place_attribute_votes for select using (
    place_id in (select id from places where is_group_member(group_id))
  );

create policy "Users can insert own attribute votes"
  on place_attribute_votes for insert with check (user_id = auth.uid());

create policy "Users can update own attribute votes"
  on place_attribute_votes for update using (user_id = auth.uid());

create policy "Users can delete own attribute votes"
  on place_attribute_votes for delete using (user_id = auth.uid());

-- Ratings
alter table ratings enable row level security;

create policy "Group members can view ratings"
  on ratings for select using (
    place_id in (select id from places where is_group_member(group_id))
  );

create policy "Users can insert own ratings"
  on ratings for insert with check (user_id = auth.uid());

create policy "Users can update own ratings"
  on ratings for update using (user_id = auth.uid());

create policy "Users can delete own ratings"
  on ratings for delete using (user_id = auth.uid());

-- Check-ins
alter table check_ins enable row level security;

create policy "Group members can view check-ins"
  on check_ins for select using (
    place_id in (select id from places where is_group_member(group_id))
  );

create policy "Users can insert own check-ins"
  on check_ins for insert with check (user_id = auth.uid());

create policy "Users can delete own check-ins"
  on check_ins for delete using (user_id = auth.uid());

-- Events
alter table events enable row level security;

create policy "Group members can view events"
  on events for select using (is_group_member(group_id));

create policy "Group members can create events"
  on events for insert with check (is_group_member(group_id));

create policy "Event creators can update events"
  on events for update using (created_by = auth.uid());

create policy "Event creators can delete events"
  on events for delete using (created_by = auth.uid());

-- Activity
alter table activity enable row level security;

create policy "Group members can view activity"
  on activity for select using (is_group_member(group_id));

create policy "Group members can insert activity"
  on activity for insert with check (is_group_member(group_id));

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on places
  for each row execute function update_updated_at();

create trigger set_updated_at before update on ratings
  for each row execute function update_updated_at();

create trigger set_updated_at before update on events
  for each row execute function update_updated_at();

create trigger set_updated_at before update on place_tag_votes
  for each row execute function update_updated_at();

create trigger set_updated_at before update on place_attribute_votes
  for each row execute function update_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Use-case tags
insert into use_case_tags (slug, label, sort_order) values
  ('kid-friendly', 'Kid-Friendly', 1),
  ('work-friendly', 'Work-Friendly', 2),
  ('good-hangout', 'Good Hangout', 3),
  ('date-night', 'Date Night', 4),
  ('outdoor-seating', 'Outdoor Seating', 5),
  ('dog-friendly', 'Dog-Friendly', 6);

-- Category attributes: Cafes
insert into category_attributes (primary_type, slug, label, input_type, options, sort_order) values
  ('cafe', 'wifi-quality', 'WiFi Quality', 'rating', null, 1),
  ('cafe', 'noise-level', 'Noise Level', 'select', '["quiet","moderate","loud"]', 2),
  ('cafe', 'outlets', 'Outlet Availability', 'select', '["none","few","plenty"]', 3),
  ('cafe', 'ok-to-camp', 'OK to Camp Out', 'boolean', null, 4);

-- Category attributes: Restaurants
insert into category_attributes (primary_type, slug, label, input_type, options, sort_order) values
  ('restaurant', 'cuisine', 'Cuisine Type', 'select', '["mexican","chinese","italian","japanese","american","bbq","thai","indian","vietnamese","other"]', 1),
  ('restaurant', 'price-range', 'Price Range', 'select', '["$","$$","$$$","$$$$"]', 2),
  ('restaurant', 'has-playground', 'Has Playground', 'boolean', null, 3),
  ('restaurant', 'wait-time', 'Typical Wait', 'select', '["none","short","moderate","long"]', 4);

-- Category attributes: Parks
insert into category_attributes (primary_type, slug, label, input_type, options, sort_order) values
  ('park', 'has-playground', 'Has Playground', 'boolean', null, 1),
  ('park', 'shaded', 'Good Shade', 'boolean', null, 2),
  ('park', 'restrooms', 'Has Restrooms', 'boolean', null, 3),
  ('park', 'trails', 'Has Trails', 'boolean', null, 4),
  ('park', 'splash-pad', 'Has Splash Pad', 'boolean', null, 5);
