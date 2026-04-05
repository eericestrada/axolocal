-- Category bundles: admin-configurable place type groupings
create table category_bundles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  label text not null,
  slug text not null,
  color text not null default '#3b82f6',
  google_types jsonb not null default '[]',
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique(group_id, slug)
);

alter table category_bundles enable row level security;

create policy "Group members can view bundles"
  on category_bundles for select
  using (is_group_member(group_id));

create policy "Admins can manage bundles"
  on category_bundles for all
  using (
    exists (
      select 1 from group_members
      where group_id = category_bundles.group_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Seed default bundles for existing groups
insert into category_bundles (group_id, label, slug, color, google_types, sort_order)
select
  g.id,
  b.label,
  b.slug,
  b.color,
  b.google_types::jsonb,
  b.sort_order
from groups g
cross join (values
  ('Parks & Outdoors', 'park', '#16a34a', '["park","playground","dog_park","national_park","campground","recreation_center","community_center","swimming_pool"]', 0),
  ('Coffee & Workspaces', 'cafe', '#92400e', '["cafe","coffee_shop","library"]', 1),
  ('Restaurants', 'restaurant', '#dc2626', '["restaurant","fast_food_restaurant","chinese_restaurant","italian_restaurant","japanese_restaurant","mexican_restaurant","thai_restaurant","indian_restaurant","american_restaurant","barbecue_restaurant","seafood_restaurant","steak_house","pizza_restaurant","sushi_restaurant","hamburger_restaurant","sandwich_shop"]', 2),
  ('Bars & Nightlife', 'bar', '#7c3aed', '["bar","night_club","wine_bar"]', 3),
  ('Bakeries & Treats', 'bakery', '#ea580c', '["bakery","ice_cream_shop","dessert_shop"]', 4),
  ('Fitness', 'gym', '#0891b2', '["gym","fitness_center","sports_club"]', 5)
) as b(label, slug, color, google_types, sort_order);

-- Function to seed default bundles for new groups
create or replace function seed_default_bundles()
returns trigger as $$
begin
  insert into category_bundles (group_id, label, slug, color, google_types, sort_order) values
    (new.id, 'Parks & Outdoors', 'park', '#16a34a', '["park","playground","dog_park","national_park","campground","recreation_center","community_center","swimming_pool"]'::jsonb, 0),
    (new.id, 'Coffee & Workspaces', 'cafe', '#92400e', '["cafe","coffee_shop","library"]'::jsonb, 1),
    (new.id, 'Restaurants', 'restaurant', '#dc2626', '["restaurant","fast_food_restaurant","chinese_restaurant","italian_restaurant","japanese_restaurant","mexican_restaurant","thai_restaurant","indian_restaurant","american_restaurant","barbecue_restaurant","seafood_restaurant","steak_house","pizza_restaurant","sushi_restaurant","hamburger_restaurant","sandwich_shop"]'::jsonb, 2),
    (new.id, 'Bars & Nightlife', 'bar', '#7c3aed', '["bar","night_club","wine_bar"]'::jsonb, 3),
    (new.id, 'Bakeries & Treats', 'bakery', '#ea580c', '["bakery","ice_cream_shop","dessert_shop"]'::jsonb, 4),
    (new.id, 'Fitness', 'gym', '#0891b2', '["gym","fitness_center","sports_club"]'::jsonb, 5);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_group_created
  after insert on groups
  for each row execute function seed_default_bundles();
