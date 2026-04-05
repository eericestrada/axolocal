# Axolocal — Local Discovery & Rating App

## Overview

A mobile-first web app for a small group of friends to collaboratively discover, rate, tag, and track local places. The core value proposition is curating places through a personal lens that Google Maps doesn't offer — like which restaurants have playgrounds, which coffee shops are good for working, and which parks are actually worth visiting.

Built as a Next.js 15 App Router project deployed on Vercel with Supabase for auth, database, and RLS.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database/Auth**: Supabase (new dedicated project, separate from any existing personal projects)
- **Hosting**: Vercel (new project under existing account)
- **Maps**: Google Maps JavaScript SDK + Places API
- **Styling**: Tailwind CSS
- **Language**: JavaScript (no TypeScript)
- **PWA**: Service worker + web app manifest (set up in Phase A, not deferred)

## Core Concepts

### Place Data Model

Every place has:
- **One primary type** (sourced from Google Places): park, restaurant, coffee shop, bar, etc. The app normalizes Google's type array into a single primary type using a mapping layer (see Google Maps section).
- **A display name** (from Google) and an optional **nickname** (user-set, e.g., "The good taco place" for a restaurant with a forgettable name)
- **Cross-cutting use-case tags** (user-applied, available on any place type): kid-friendly, work-friendly, good hangout, date night, outdoor seating, dog-friendly, etc. Tags use a **per-user voting system** — each member votes yes/no, and the tag shows a confidence percentage.
- **Category-specific attributes** (determined by primary type): e.g., coffee shops get WiFi quality, noise level, outlet availability; restaurants get cuisine type, price range; parks get playground, shaded, restrooms, trails. Attributes are also **per-user** — each member records their own assessment.
- **Individual ratings** from each group member (5-star scale)
- **Optional short notes** from each member (one-liner, e.g., "get the brisket tacos" or "parking is terrible")
- **Check-ins** — lightweight, timestamped "I'm here" taps
- **Events** — user-created, attached to places, one-time or recurring

### Place Progression (Three Stages)

Every place in the database moves through a lifecycle as the group interacts with it:

**Stage 1: Known but unexplored.** Grey pin on the map. The place exists in the database (either seeded or manually added) but nobody has visited, rated, or tagged it. No tags, no ratings, no check-ins. It's just a dot representing an unknown.

**Stage 2: Visited but untagged.** Someone has checked in or left a rating, but hasn't applied use-case tags or category attributes. You know the group has been there but not *what it's good for*.

**Stage 3: Fully characterized.** Rated, tagged with use-case tags, category attributes filled in, maybe has notes. "This park is kid-friendly, has a playground, good shade, 4 stars." Now it's useful for answering the core browsing questions.

The visual treatment on the map should reflect this progression — grey/faded for Stage 1, colored but minimal for Stage 2, fully colored with indicators for Stage 3.

### The Four Core Questions

The app is designed to answer four questions that drive how your friend group picks places:
1. **Can I hang out there with the kids?** → Kid-friendly tag + attributes like playground, splash pad, kid menu
2. **Can I hang out there and do some work?** → Work-friendly tag + attributes like WiFi quality, noise level, outlets
3. **Is it a cool place to hang out?** → Good hangout tag + vibe/ambiance attributes
4. **Is it a good version of what it is?** → Group ratings (star average). A 4-star Chinese restaurant vs a 2-star one. Quality lives on the rating, not the tags.

### Two Types of Place Properties

There is an important distinction between "what a place is good for" and "what a place is":

**Primary type (what it is):** Sourced from Google Places — park, restaurant, cafe, bar, etc. One per place. Determined by normalizing Google's type array through a mapping layer (Google often returns multiple types like `["cafe", "restaurant", "food"]` — the app picks the best match). Determines which category-specific attributes are shown. Drives the first layer of filtering and pin color on the map.

**Use-case tags (what it's good for):** User-applied, cross-cutting, available on any place type. A restaurant can be kid-friendly AND a good hangout. A coffee shop can be work-friendly AND dog-friendly. These answer the four core questions above and drive the second layer of filtering. Multiple tags per place. Each tag is voted on by group members (yes/no) — the confidence percentage reflects group consensus.

**Category-specific attributes (the details):** Determined by primary type. Parks get: has playground, shaded, restrooms, trails, splash pad. Cafes get: WiFi quality, noise level, outlets, OK to camp. Restaurants get: cuisine type, price range, has playground, typical wait. These provide detail within a type and enable fine-grained filtering. Like tags, attribute values are recorded per-user, with the group view showing the consensus (majority for booleans, mode/average for selects and ratings).

## Discovery Model

### The Unknown Unknowns Problem

For categories like coffee shops and restaurants, word-of-mouth and search work fine for discovery. You hear about a place, search for it, add it. But parks are different — nobody recommends the random city park three neighborhoods over with a great splash pad. You can't search for what you don't know exists.

### Seeded vs. Search-Added Places

The app supports two ways places enter the database:

**Search-added (default for most categories):** A group member searches Google Places, finds a coffee shop or restaurant, and manually adds it. The place enters at Stage 1 or Stage 2 depending on whether they rate/tag it at add time. This is the standard flow for restaurants, cafes, bars, etc.

**Seeded (for completionist categories like parks):** On group setup or on-demand, the app bulk-imports all places of a given type from Google Places within a defined geographic area. These enter at Stage 1 — known but unexplored. The group can then visit and characterize them over time. "We've been to 34 of 97 parks" is inherently motivating.

### Seeding Cost Estimation

Park seeding uses a grid of Nearby Search requests across the target area. For a metro area like San Antonio, estimate the grid size and API calls before triggering: a 30x30 mile area at ~1 mile grid spacing is ~900 requests. Google Places Nearby Search costs $32 per 1000 requests, so a full metro seed is ~$29. The free $200/month credit covers this comfortably, but the app should show the estimated call count before the user confirms a seed, and cap grid resolution for very large areas.

### On-Demand Discovery ("Discover Here")

When a user pans the map to an area with no loaded places (e.g., on a road trip outside their home area), the app offers a "Discover Parks Here" button (or similar for other seedable categories). This triggers the same bulk-import flow as the initial seed, but scoped to the current map viewport.

Implementation: same Google Places API grid search as the home-area seed, same insert logic, triggered by user action rather than onboarding.

### Regions

Each batch of seeded/discovered places gets tagged with a **region** — either auto-detected via reverse geocoding (city/county) or user-named ("Austin trip," "Hill Country weekend"). This keeps progress tracking scoped and meaningful:
- "34 of 97 parks in San Antonio"
- "3 of 12 parks in Fredericksburg"
- "8 of 8 parks in New Braunfels — complete!"

Regions prevent remote discoveries from muddying the home-area progress denominator. They also create a natural travel journal — your Fredericksburg collection from that weekend trip.

The data model needs a `region` concept on the places table or a separate `regions` table with a `region_id` foreign key on places:

```sql
create table regions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  name text not null,          -- "San Antonio", "Hill Country Weekend"
  auto_detected boolean default false,
  bounds jsonb,                -- optional: bounding box used for the seed query
  created_at timestamptz default now()
);

-- Add to places table:
-- region_id uuid references regions(id)
```

## Filtering & Browsing UX

### Three-Layer Filter Model

Filters stack on top of each other. Each narrows the visible set of places on the map.

**Layer 1 — Primary type (what is it?):**
Horizontally scrollable row of chips at the top of the map view: `[All] [Parks] [Coffee] [Restaurants] [Bars] ...`
- Single-select with an "All" option (start simple; multi-select can be added later)
- Tapping a type shows only that type on the map
- Controls pin visibility and color

**Layer 2 — Use-case / function tags (what's it good for?):**
Second row of chips below the type filter: `[Kid-Friendly] [Work-Friendly] [Good Hangout] [Date Night] [Dog-Friendly] ...`
- Multi-select — a place can match multiple function tags
- These tags are universal across all place types
- Could be always-visible or collapsible to save screen space; start collapsible with a "Filter" toggle

**Layer 3 — Category-specific attributes (the details):**
Only shown when a specific type is selected (because attributes are type-dependent). Accessible via a "More Filters" option or within a list/detail view:
- Parks: has playground, has splash pad, shaded, restrooms, trails
- Cafes: WiFi quality, noise level, outlets, OK to camp
- Restaurants: cuisine type, price range, has playground, typical wait
- These are refinement filters, not primary browsing controls

### How Filters Handle Untagged Places

This is a critical UX decision. When filtering by function tags (e.g., "Kid-Friendly"), most seeded places won't have tags yet. The UI must distinguish between "not kid-friendly" and "we don't know yet."

**Behavior when a function filter is active:**
- Places tagged with the selected function (at least one yes vote): shown as **full, prominent pins** (colored by type). Confidence percentage visible on tap.
- Places NOT tagged (zero votes — unknown): shown as **faded/ghost pins** or pins with a "?" indicator
- Places with majority "no" votes: hidden
- Places with mixed votes (some yes, some no): shown but with a lower-confidence indicator

This prevents the false impression that untagged means "not kid-friendly." It also creates a subtle motivation — users can see there are 40 parks nobody's checked out yet.

### Additional Filter: Visited / Unvisited

A toggle (not a chip — more like a switch in the filter bar): "Show unvisited"
- Default: ON (show everything, including grey Stage 1 pins)
- When OFF: only shows places where at least one group member has checked in or rated
- Useful for browsing only proven/rated places vs. exploring new ones

### Filter Persistence

Filter state should persist during a session. Navigating from the map to a place detail and back should retain active filters. Filters reset on app close or can be manually cleared.

### Practical Browsing Flows

These are the real-world scenarios the filtering system enables:

- **"Saturday with kids"** → tap Kid-Friendly tag → see all kid-friendly places across all types, untagged places faded
- **"Need to get some work done"** → tap Work-Friendly tag → mostly coffee shops and quiet restaurants surface
- **"Where should we eat tonight?"** → tap Restaurants type → sort/browse by group rating
- **"What's actually good around here?"** → no filters, just browse highly-rated places
- **"What haven't we explored yet?"** → show unvisited toggle ON, look for grey pins
- **"Kid-friendly parks with splash pads"** → Parks type + Kid-Friendly tag + splash pad attribute filter

## Function Tag Layer: Behavior & UX Details

### How Tags Get Applied (Voting)

Tags are voted on by group members, not applied as a single boolean. Each member can vote "yes" (this place is kid-friendly), "no" (this place is not kid-friendly), or leave no vote (no opinion). There are three moments voting happens:

1. **At add time:** When someone adds a new place (search-added), the "add place" flow includes toggle chips for use-case tags. Tapping a tag is a "yes" vote. Optional but encouraged.
2. **At check-in / visit time:** After checking in, the app prompts "What's this place good for?" with the same toggle chips. This is the primary tagging moment — you just visited, you know firsthand. Two taps and you've characterized the place.
3. **Retroactively from place detail:** Even without a check-in, anyone can vote on tags from the detail screen. The detail screen shows the current vote breakdown and lets you cast or change your vote. Maybe Sarah knows that park across town is great for kids even though she hasn't checked in through the app.

### Tag Confidence (Vote-Based)

Each tag on a place shows its confidence based on group votes:
- **"Kid-Friendly" 3/3 (100%)** — three people voted, all said yes. High confidence.
- **"Kid-Friendly" 4/6 (67%)** — most agree, but some disagree.
- **"Work-Friendly" 1/5 (20%)** — one person thinks so, most disagree.
- **No votes** — tag doesn't appear on the place. Place shows as "?" in filtered views.

The UI could use visual weight to reflect confidence — bolder/more prominent for high-confidence tags, lighter for low-confidence. The filtering system considers a tag "active" on a place if it has at least one yes vote, but the confidence signal helps users judge how reliable it is.

### Category Attributes Are Also Per-User

Same philosophy as tags — attributes are empty on seeded places and filled in by group members as they visit. Each member records their own assessment:
- **Boolean attributes** (has playground, has restrooms): per-user yes/no, displayed as majority consensus with vote count
- **Select attributes** (noise level, price range): per-user selection, displayed as the mode (most common answer) with distribution
- **Rating attributes** (WiFi quality): per-user rating, displayed as the average

The check-in prompt can include a few key attribute questions based on place type. Keep it light: 2-3 quick toggles or selects, not a full survey.

## Check-In System

### Design Philosophy

Check-ins are a passive quality signal. They answer the question "where do we actually keep going back to?" without requiring anyone to write a review. Repeat visit count tells you more than any star rating — if three people have each been to the same taco spot 8+ times, it's great.

### UX Flow

- **From map view:** If user's location is near a known place, show a floating "I'm here" button or a nearby-places list with one-tap check-in.
- **From place detail:** Prominent "Check In" button. One tap, confirmation toast, done.
- **Zero friction:** No note, no rating, no tags required. Just a timestamp. Optionally prompt for tags/rating after check-in but never require them.

### Offline Check-Ins

Check-ins (and ratings) work offline. When the device has no network connection:
- The check-in is saved to a local queue (IndexedDB or localStorage)
- A subtle indicator shows "1 pending sync" or similar
- When connectivity returns, queued actions are synced to Supabase automatically
- Conflict resolution: check-ins are append-only so no conflicts; ratings use last-write-wins with a timestamp

This matters because the app is used at parks and outdoor places where signal can be unreliable.

### Derived Insights from Check-Ins

- **Repeat visit count per user per place:** "Eric has been here 12 times"
- **Group frequency:** "This place has 47 total check-ins from 5 members"
- **Recency:** A place visited 12 times last year but not in 6 months is different from one visited last week
- **Unrated but visited:** Places with check-ins but no ratings — a signal that someone should rate it
- **Group favorites view:** Derived entirely from check-in frequency, no manual curation needed
- **"Places added but unrated by you":** Discovery nudge for places the group knows about but you haven't experienced

## Events on Places

### User-Created Events

No reliable free API exists for local event data. Instead, group members manually attach events to places:
- "Jazz night at this coffee shop every Thursday"
- "Farmers market at this park Saturdays 9am-1pm"
- "Food truck rally at Confluence Park, March 15"

This turns the group into the data source, which fits the curation ethos of the app.

### Event Model

Events are either one-time (with a start/end datetime) or recurring (with an iCal RRULE). They're attached to a place and visible on the place detail screen and in the activity feed. Recurring events support a `cancelled_dates` field for skipping individual occurrences (e.g., "no farmers market this Saturday due to weather").

### Events + Check-Ins

Check-ins at a place that has a recurring event tell you which events your group actually attends vs. which ones they just bookmarked. This is an emergent insight — no extra feature needed.

## Deletion & Editing

Users can delete their own content:
- **Ratings**: delete your own rating on a place
- **Check-ins**: delete your own check-ins
- **Tag votes**: remove or change your vote on any tag
- **Attribute values**: remove or change your attribute assessments
- **Events**: delete events you created

Place editing:
- **Place name**: any group member can edit/correct the display name (sourced from Google but overridable)
- **Nickname**: any group member can set an optional nickname for a place (e.g., "The good taco place"). Nicknames are displayed alongside or instead of the formal name.
- **Place removal**: group admins can remove a place entirely from the group

## Notifications & Following

### Push Notifications (PWA)

The app supports push notifications via the PWA Push API + a server-side push service (web-push library or Supabase Edge Function).

### Follow Model

Rather than notifying everyone about everything, users opt-in to follow specific group members:
- "Follow Sarah" means you get notified when Sarah checks in, rates a place, or adds a new place
- Following is one-directional and private — Sarah doesn't know who follows her (unless we decide to show it later)
- Users manage their follows from the group page or profile page

### Notification Types
- **Check-in**: "Sarah checked in at Blue Star Coffee"
- **New rating**: "Mike rated Brackenridge Park ★★★★"
- **New place added**: "Lisa added Taco Cabana"
- **Event created**: "Eric added an event at Confluence Park: Farmers Market"

### Data Model for Notifications

```sql
-- follows: who follows whom within a group
create table follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references profiles(id) on delete cascade,
  followed_id uuid references profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, followed_id, group_id)
);

-- push_subscriptions: store PWA push subscription per user per device
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subscription jsonb not null,    -- PushSubscription object from the browser
  created_at timestamptz default now()
);
```

When a user performs an action (check-in, rating, etc.), the server looks up who follows them in that group, checks their push subscriptions, and sends notifications.

## Phase Plan

### v1 (Build Now)
- Invite-only single group
- Everything shared within the group
- Core map/browse/rate/check-in experience
- Per-user tag voting with confidence percentages
- Per-user category attributes
- User-created events on places
- Park seeding for home area
- On-demand "Discover Here" for new areas
- Place nicknames and name editing
- Deletion of own content (ratings, check-ins, tag votes)
- Offline check-in/rating queue with background sync
- Push notifications with follow model
- PWA from day one

### v2 (Future)
- Multiple groups per user
- Default visibility setting per user (private, group, public)
- Per-item visibility overrides on ratings, notes, check-ins

### v3 (Future)
- Public discovery layer
- Profile pages
- Discovery beyond your own group

## Data Model (Supabase / PostgreSQL)

Design for v1 functionality but include `group_id` foreign keys on core tables now to avoid migration pain when v2 adds multi-group support.

### Tables

```sql
-- ============================================================
-- USERS & GROUPS
-- ============================================================

-- profiles: extends Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text unique not null, -- short unique code for invite links
  invite_expires_at timestamptz,    -- optional expiration for invite links
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- group_members
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member', -- 'admin' or 'member'
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- follows: who follows whom within a group (for push notifications)
create table follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references profiles(id) on delete cascade,
  followed_id uuid references profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, followed_id, group_id)
);

-- push_subscriptions: PWA push subscription per user per device
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subscription jsonb not null,      -- PushSubscription object from the browser
  created_at timestamptz default now()
);

-- ============================================================
-- REGIONS (for scoped discovery / progress tracking)
-- ============================================================

create table regions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  name text not null,              -- "San Antonio", "Hill Country Weekend"
  auto_detected boolean default false,
  bounds jsonb,                    -- optional: bounding box used for seed query
  created_at timestamptz default now()
);

-- ============================================================
-- PLACES
-- ============================================================

-- places: one row per unique location known to the app
create table places (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  name text not null,
  nickname text,                   -- optional user-set nickname ("The good taco place")
  address text,
  latitude double precision not null,
  longitude double precision not null,
  primary_type text not null,      -- normalized from Google's type array (see type mapping)
  google_types jsonb,              -- raw Google types array for reference
  google_metadata jsonb,           -- cached Google Places details (photos, hours, phone, etc.)
  google_metadata_fetched_at timestamptz, -- when Google data was last refreshed
  source text not null default 'manual', -- 'manual' (search-added) or 'seeded' (bulk import)
  added_by uuid references profiles(id), -- null for seeded places
  group_id uuid references groups(id) on delete cascade,
  region_id uuid references regions(id), -- null for non-regional places
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TAGS & ATTRIBUTES
-- ============================================================

-- use_case_tags: cross-cutting tags available on any place
-- these are system-defined but could become user-created in v2
create table use_case_tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,       -- e.g., 'kid-friendly', 'work-friendly'
  label text not null,             -- e.g., 'Kid-Friendly', 'Work-Friendly'
  icon text,                       -- optional icon identifier
  sort_order int default 0
);

-- place_tag_votes: per-user yes/no votes on whether a tag applies to a place
-- no row = no opinion, vote=true = yes, vote=false = actively no
create table place_tag_votes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  tag_id uuid references use_case_tags(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  vote boolean not null,           -- true = "yes, this applies", false = "no, it doesn't"
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(place_id, tag_id, user_id)
);

-- category_attributes: type-specific attributes
-- defines which attributes exist for each primary_type
create table category_attributes (
  id uuid primary key default gen_random_uuid(),
  primary_type text not null,       -- e.g., 'cafe', 'restaurant', 'park'
  slug text not null,               -- e.g., 'wifi-quality', 'noise-level', 'has-playground'
  label text not null,              -- e.g., 'WiFi Quality', 'Noise Level'
  input_type text not null,         -- 'boolean', 'rating', 'select'
  options jsonb,                    -- for 'select' type: ["quiet","moderate","loud"]
  sort_order int default 0,
  unique(primary_type, slug)
);

-- place_attribute_votes: per-user attribute values for a place
-- each user records their own assessment; UI shows consensus (majority/mode/average)
create table place_attribute_votes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  attribute_id uuid references category_attributes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  value text not null,              -- stored as text, interpreted by input_type
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(place_id, attribute_id, user_id)
);

-- ============================================================
-- RATINGS & NOTES
-- ============================================================

-- ratings: one per user per place
create table ratings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  score int not null check (score >= 1 and score <= 5),
  note text,                        -- optional one-liner
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(place_id, user_id)
);

-- ============================================================
-- CHECK-INS
-- ============================================================

-- check_ins: lightweight timestamp per user per visit
create table check_ins (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  checked_in_at timestamptz default now()
);

-- ============================================================
-- EVENTS
-- ============================================================

-- events: user-created, attached to a place
create table events (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_recurring boolean default false,
  recurrence_rule text,             -- iCal RRULE string for recurring events
  cancelled_dates jsonb,            -- array of dates where recurring event is skipped
  created_by uuid references profiles(id),
  group_id uuid references groups(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ACTIVITY FEED
-- ============================================================

-- activity: dedicated table for group activity (insert on each action)
-- denormalized for fast feed queries; source of truth remains the original tables
create table activity (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  place_id uuid references places(id) on delete cascade,
  action_type text not null,        -- 'check_in', 'rating', 'place_added', 'event_created', 'tag_vote', 'discovery'
  metadata jsonb,                   -- action-specific data: { score: 4, note: "great tacos" } or { tag: "kid-friendly", vote: true }
  created_at timestamptz default now()
);

-- index for fast feed queries
create index idx_activity_group_created on activity (group_id, created_at desc);
create index idx_activity_user on activity (user_id, created_at desc);
```

### Seed Data: Use-Case Tags (v1)

```sql
insert into use_case_tags (slug, label, sort_order) values
  ('kid-friendly', 'Kid-Friendly', 1),
  ('work-friendly', 'Work-Friendly', 2),
  ('good-hangout', 'Good Hangout', 3),
  ('date-night', 'Date Night', 4),
  ('outdoor-seating', 'Outdoor Seating', 5),
  ('dog-friendly', 'Dog-Friendly', 6);
```

### Seed Data: Category Attributes (v1 starter set)

```sql
-- Coffee shops / cafes
insert into category_attributes (primary_type, slug, label, input_type, options, sort_order) values
  ('cafe', 'wifi-quality', 'WiFi Quality', 'rating', null, 1),
  ('cafe', 'noise-level', 'Noise Level', 'select', '["quiet","moderate","loud"]', 2),
  ('cafe', 'outlets', 'Outlet Availability', 'select', '["none","few","plenty"]', 3),
  ('cafe', 'ok-to-camp', 'OK to Camp Out', 'boolean', null, 4);

-- Restaurants
insert into category_attributes (primary_type, slug, label, input_type, options, sort_order) values
  ('restaurant', 'cuisine', 'Cuisine Type', 'select', '["mexican","chinese","italian","japanese","american","bbq","thai","indian","vietnamese","other"]', 1),
  ('restaurant', 'price-range', 'Price Range', 'select', '["$","$$","$$$","$$$$"]', 2),
  ('restaurant', 'has-playground', 'Has Playground', 'boolean', null, 3),
  ('restaurant', 'wait-time', 'Typical Wait', 'select', '["none","short","moderate","long"]', 4);

-- Parks
insert into category_attributes (primary_type, slug, label, input_type, options, sort_order) values
  ('park', 'has-playground', 'Has Playground', 'boolean', null, 1),
  ('park', 'shaded', 'Good Shade', 'boolean', null, 2),
  ('park', 'restrooms', 'Has Restrooms', 'boolean', null, 3),
  ('park', 'trails', 'Has Trails', 'boolean', null, 4),
  ('park', 'splash-pad', 'Has Splash Pad', 'boolean', null, 5);
```

## Row-Level Security (RLS)

Enable RLS on all tables. v1 policy: users can read/write data for groups they belong to. Users can only delete their own ratings, check-ins, tag votes, and attribute votes.

```sql
-- Example pattern for places table:
alter table places enable row level security;

create policy "Group members can view places"
  on places for select
  using (
    group_id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

create policy "Group members can insert places"
  on places for insert
  with check (
    group_id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

create policy "Group members can update places"
  on places for update
  using (
    group_id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

-- Example pattern for user-owned content (ratings, check-ins, tag votes):
alter table ratings enable row level security;

create policy "Group members can view ratings"
  on ratings for select
  using (
    place_id in (
      select id from places where group_id in (
        select group_id from group_members where user_id = auth.uid()
      )
    )
  );

create policy "Users can insert own ratings"
  on ratings for insert
  with check (user_id = auth.uid());

create policy "Users can update own ratings"
  on ratings for update
  using (user_id = auth.uid());

create policy "Users can delete own ratings"
  on ratings for delete
  using (user_id = auth.uid());

-- Apply similar pattern to: check_ins, place_tag_votes, place_attribute_votes, events
-- profiles: users can read all, update own
-- use_case_tags / category_attributes: readable by all authenticated users
-- regions: readable/writable by group members
-- follows: users can manage own follows within their groups
-- push_subscriptions: users can manage own subscriptions
-- activity: readable by group members, insertable by system/server actions
```

## Google Maps & Places API Setup

- Create a Google Cloud project
- Enable: Maps JavaScript API, Places API, Geocoding API (for region auto-detection)
- Create an API key, restrict to your Vercel domain(s) + localhost
- Store the API key in environment variables (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for client, GOOGLE_PLACES_API_KEY for server)
- The free $200/month credit covers normal usage; see Seeding Cost Estimation section for bulk import costs

### Google Places Type Mapping

Google Places returns an array of types for each place (e.g., `["cafe", "restaurant", "food", "point_of_interest", "establishment"]`). The app needs a mapping layer to normalize this into a single `primary_type`:

```javascript
// Priority order — first match wins
const TYPE_PRIORITY = [
  'park', 'playground',           // → 'park'
  'cafe',                         // → 'cafe'
  'restaurant',                   // → 'restaurant'
  'bar', 'night_club',           // → 'bar'
  'bakery',                       // → 'bakery'
  'gym',                          // → 'gym'
  // ... extend as needed
];

// Store raw types in google_types column for reference
// Use normalized primary_type for filtering and attribute assignment
```

This prevents a cafe that Google also classifies as a restaurant from getting restaurant attributes instead of cafe attributes.

## App Structure (Next.js App Router)

```
/public
  /manifest.json                 -- PWA manifest
  /sw.js                         -- service worker (must be at root for correct scope)
  /icons/                        -- PWA icons (192x192, 512x512, etc.)
/app
  /layout.js                     -- root layout, auth provider, map loader
  /page.js                       -- landing/login page
  /(auth)
    /login/page.js
    /signup/page.js
    /join/[inviteCode]/page.js   -- join a group via invite link
  /(app)                         -- authenticated routes
    /layout.js                   -- app shell: bottom nav, map context, offline sync manager
    /map/page.js                 -- main map view (default screen)
    /places/[id]/page.js         -- place detail: ratings, tags, check-ins, events
    /places/[id]/rate/page.js    -- rate/tag a place
    /add/page.js                 -- search Google Places, add a new place
    /discover/page.js            -- "Discover Here" flow for seeding new areas
    /activity/page.js            -- recent group activity feed
    /profile/page.js             -- your ratings, check-ins, stats
    /group/page.js               -- group members, invite link, follows, settings
    /regions/page.js             -- region progress overview
/components
  /map                           -- MapView, PlacePin, PlaceCard, DiscoverHereBanner
  /places                        -- PlaceDetail, RatingForm, TagVoter, AttributeForm
  /check-in                      -- CheckInButton, CheckInHistory, NearbyCheckIn
  /events                        -- EventForm, EventList, EventCard
  /activity                      -- ActivityFeed, ActivityItem
  /filters                       -- TypeFilterBar, FunctionTagChips, AttributeFilters, VisitedToggle
  /regions                       -- RegionCard, RegionProgress
  /notifications                 -- FollowButton, NotificationPrompt
  /ui                            -- Button, Modal, BottomSheet, StarRating, Toggle, ConfidenceBadge
/lib
  /supabase.js                   -- Supabase client init
  /google-maps.js                -- Google Maps loader and helpers
  /google-places.js              -- Places API helpers: search, seed, detail fetch, type mapping
  /offline-queue.js              -- IndexedDB-backed queue for offline check-ins/ratings
  /push-notifications.js         -- Push subscription management and notification helpers
  /hooks
    /useLocation.js              -- browser geolocation hook
    /usePlaces.js                -- fetch/search places
    /useGroup.js                 -- group membership context
    /useFilters.js               -- filter state management (persists during session)
    /useOfflineSync.js           -- monitor queue and sync when online
/utils
  /constants.js                  -- tag definitions, attribute configs, pin colors
  /seed.js                       -- park seeding logic: grid search, dedup, bulk insert
  /type-mapping.js               -- Google Places type → primary_type normalization
```

## Key Screens & UX Flows

### 1. Main Map View (`/map`)
- Full-screen Google Map as the primary interface
- **Pin states reflect place progression:**
  - Stage 1 (known/unexplored): grey/faded pin
  - Stage 2 (visited/untagged): colored pin by type, minimal
  - Stage 3 (fully characterized): colored pin by type, prominent, may show rating badge
- **Filter bar (top of screen):**
  - Row 1: Type chips — `[All] [Parks] [Coffee] [Restaurants] [Bars] ...` (horizontally scrollable, single-select)
  - Row 2 (collapsible): Function tag chips — `[Kid-Friendly] [Work-Friendly] [Good Hangout] ...` (multi-select, revealed by "Filter" toggle)
  - Visited/unvisited toggle available in filter controls
- **Filtered view behavior:**
  - When function tag filter is active: matching tagged places shown prominently with confidence indicator, untagged places shown as faded/ghost pins with "?" indicator, majority-no places hidden
  - This prevents false negatives ("not tagged" ≠ "not kid-friendly")
- Tapping a pin opens a bottom sheet with: place name (and nickname if set), average group rating, your rating, tag chips with confidence, check-in count, and a "Details" button
- If user's location is available, show a "Check In" button for nearby places
- **"Discover Here" banner:** When the map viewport is in an area with no loaded places, show a subtle prompt: "No parks loaded here — discover nearby?" Tap to trigger the seed flow for the current viewport.
- FAB or bottom nav button to add a new place
- **Filter state persists** when navigating to place detail and back
- **Offline indicator:** When offline, show a subtle banner and queue any check-ins/ratings for later sync

### 2. Add a Place (`/add`)
- Google Places search bar at top
- Results list shows name, address, type
- Tapping a result shows a confirmation screen:
  - Pre-filled: name, address, type (from Google, normalized)
  - Optional nickname field
  - User votes on use-case tags (toggle chips — tap = yes vote) — optional but encouraged
  - User fills category-specific attributes (based on type) — optional
  - User adds their rating (optional at this step)
  - User adds a note (optional)
  - "Add to Group" button saves everything
- Place enters database as Stage 1 (if no rating/tags) or Stage 2/3 (if rated/tagged)

### 3. Discover Here (`/discover`)
- Triggered from map view "Discover Here" banner or from a dedicated menu option
- Shows the current map viewport area
- User selects which type to seed (e.g., Parks) — could expand to other types later
- Option to name the region or auto-detect via reverse geocoding
- Shows estimated API call count before confirming
- "Find [Parks] in this area" button triggers Google Places grid search
- Results preview: "Found 23 parks in this area. Add them to your map?"
- Confirm adds all as Stage 1 places tagged with the region
- Progress indicator: "0 of 23 explored"

### 4. Place Detail (`/places/[id]`)
- Header: name, nickname (if set), address, primary type badge, average group rating
- **Place stage indicator** (subtle — e.g., "Not yet visited" or "Visited by 3 members")
- Map snippet showing location
- **Use-case tag section**: shows tags with vote counts and confidence (e.g., "Kid-Friendly 3/4 75%"). Each tag shows your current vote and lets you change it (yes/no/remove vote).
- **Category-specific attributes**: displayed as pills or a small table showing group consensus with your value highlighted. Editable — tap to change your assessment.
- **Ratings section**: list of individual group member ratings with names, scores, and notes
- **Check-in section**: total check-in count, who checked in recently, frequency stats ("Sarah has been here 12 times")
- **Events section**: upcoming events at this place
- "Check In" button (prominent, one tap)
- "Rate / Edit My Rating" button
- "Edit Name / Set Nickname" option
- **Delete options**: delete your own rating, check-ins, tag votes from this screen
- **Post-check-in prompt**: after checking in, a gentle prompt appears: "What's this place good for?" with toggle chips for use-case tags and a few key category attributes. Quick to dismiss, quick to fill in.

### 5. Check-In Flow
- One-tap from map view (if near a known place) or from place detail page
- Confirm screen is optional — could be truly one-tap
- After check-in: brief confirmation toast, optional tag/attribute prompt, updates activity feed
- No note or rating required (zero friction)
- Works offline — queued and synced when back online

### 6. Activity Feed (`/activity`)
- Chronological feed of group activity (backed by the `activity` table):
  - "Eric rated Blue Star Coffee ★★★★★"
  - "Sarah checked in at Brackenridge Park"
  - "Mike added Taco Cabana — kid-friendly, good hangout"
  - "Lisa added an event at Confluence Park: Farmers Market, Saturdays 9am-1pm"
  - "23 parks discovered in Fredericksburg"
- Tapping any item navigates to the place detail

### 7. Group Management (`/group`)
- Group name and description
- Member list with roles
- **Follow/unfollow toggles** for each member (for push notifications)
- Shareable invite link (uses invite_code from groups table)
- Home area / region setup
- Leave group option

### 8. Profile (`/profile`)
- Your stats: places rated, check-ins, top-visited places
- List of your ratings
- Your check-in history
- **"Places to explore"**: places added by the group but unrated/unvisited by you
- Notification settings: manage push subscription, see who you follow

### 9. Region Progress (`/regions`)
- List of regions the group has discovered
- Per-region progress: "San Antonio Parks: 34 of 97 explored"
- Tap into a region to see its places on a filtered map view
- Gamification potential: completion badges, "fully explored" markers

## API Routes / Server Actions

Using Next.js server actions or route handlers with Supabase server client:

- **Places**: CRUD, search (proxy to Google Places API to keep API key server-side), nearby query, update name/nickname
- **Seed/Discover**: grid search Google Places by type within bounds, normalize types, bulk insert, deduplicate by google_place_id, create/assign region, return estimated call count
- **Ratings**: create/update/delete per user per place
- **Tag Votes**: cast/update/remove vote per user per tag per place
- **Attribute Votes**: set/update/remove attribute value per user per place
- **Check-ins**: create (timestamp only), delete own, query by place or user, frequency aggregations
- **Events**: CRUD attached to places (with cancelled_dates support for recurring)
- **Groups**: create, join via invite code, manage members
- **Follows**: follow/unfollow group members
- **Push**: register/unregister push subscription, send notifications on followed-user actions
- **Regions**: create, list, progress stats (explored/total counts)
- **Activity**: insert activity records (triggered by other actions), query recent group activity
- **Offline Sync**: endpoint to accept batched queued actions (check-ins, ratings, tag votes)

## Environment Variables

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # Google Maps JS SDK (client-side)
GOOGLE_PLACES_API_KEY=              # Google Places API (server-side only)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-side only, for admin operations
VAPID_PUBLIC_KEY=                   # for PWA push notifications (client + server)
VAPID_PRIVATE_KEY=                  # for PWA push notifications (server only)
```

## Build Order (Suggested Implementation Sequence)

### Phase A: Foundation + PWA
1. Initialize Next.js 15 project with App Router, Tailwind
2. **PWA setup: web app manifest in `/public`, meta tags for mobile, basic service worker at `/public/sw.js` with app-shell caching strategy (cache UI shell, always fetch fresh data from Supabase). This must be done now, not deferred — the app is mobile-first and install-to-homescreen is the distribution model. Setting up the service worker early means all subsequent development is tested against the real mobile experience.**
3. Set up Supabase project: create tables (including regions, activity, follows, push_subscriptions), enable RLS, configure auth (email + magic link or OAuth)
4. Implement auth flow: signup, login, profile creation
5. Create group: auto-create a default group, generate invite code
6. Join group flow: `/join/[inviteCode]` route

### Phase B: Core Places + Discovery
7. Google Maps integration: render map, get user location
8. Google Places search: server-side proxy for Place search, **type normalization/mapping layer**
9. Add a place: search → select → save to Supabase with Google Place ID, optional nickname
10. **Park seeding flow: define home area, grid search Google Places with type=park, bulk insert as Stage 1 places, create home region, show estimated API cost, show initial progress count**
11. **"Discover Here" flow: detect empty viewport, show banner, trigger seed for new area, create region**
12. Display places on map: colored pins by type, three-stage visual treatment (grey → colored → prominent)
13. Place detail page: show all info, ratings, attributes, stage indicator, name/nickname editing

### Phase C: Rating, Tagging & Filtering
14. Rating flow: star selector + optional note, save per user, support delete own rating
15. **Tag voting on places: three-state per-user votes (yes/no/abstain), confidence display (vote count + percentage)**
16. **Per-user category attribute form (dynamic based on primary_type, consensus display)**
17. **Filter bar on map view: Layer 1 type chips (single-select), Layer 2 function tag chips (multi-select, collapsible)**
18. **Filtered map behavior: tagged places prominent with confidence, untagged places faded with "?" indicator, majority-no hidden**
19. **Visited/unvisited toggle**
20. **Filter persistence during session**

### Phase D: Check-Ins + Offline
21. Check-in button on place detail
22. Proximity-based check-in from map view
23. **Post-check-in tagging prompt (gentle, dismissible)**
24. **Offline queue: IndexedDB-backed queue for check-ins and ratings, sync on reconnect, pending indicator**
25. Check-in history and frequency stats on place detail
26. "Group favorites" derived view (most checked-in places)
27. "Places to explore" view (unrated by you)
28. Delete own check-ins

### Phase E: Events & Activity
29. Create/view/delete events on places (with cancelled_dates for recurring)
30. **Activity feed backed by dedicated activity table (insert on each action: check-in, rating, place added, event created, tag vote, discovery)**
31. Profile page with personal stats
32. **Region progress page with exploration stats**

### Phase F: Notifications
33. **Push notification infrastructure: VAPID keys, push subscription registration, service worker push handler**
34. **Follow/unfollow group members from group page**
35. **Send push notifications on followed-user actions (check-in, rating, new place, event)**
36. Notification settings in profile

### Phase G: Polish
37. Mobile responsiveness pass (this is mobile-first)
38. Empty states, loading states, error handling
39. Invite flow polish (shareable link, OG meta for previews, optional expiration)
40. Performance optimization: pin clustering for zoomed-out views, lazy loading
41. Offline experience polish: clear sync status, retry logic, conflict indicators

## Design Notes

- **Mobile-first**: design for phone screens, the map is the primary interface
- **Bottom sheets over modals**: place details, filters, and forms should slide up from bottom on mobile
- **Minimal friction**: check-ins are one tap, ratings are one tap + optional note, adding a place is search + confirm, tag voting is toggle chips
- **Color-coded pins**: establish a consistent color palette for place types and use it everywhere (pins, badges, filter chips). Suggested: parks green, cafes brown, restaurants red, bars purple, other blue.
- **Three-stage pin treatment**: grey/faded → colored → colored+prominent. The map should feel like it "lights up" as the group explores.
- **Ghost pins for untagged places in filtered views**: critical for avoiding false negatives when filtering by function tags
- **Confidence indicators**: tag chips should show vote counts or percentages so users can gauge consensus at a glance
- **Filter bar design**: compact, scrollable, doesn't eat too much map real estate. Type chips always visible, function chips collapsible.
- Keep the UI simple and fast — this is a utility for friends, not a consumer product launch
- **PWA feel**: app-shell architecture, smooth transitions, bottom nav, no browser chrome when installed to homescreen
- **Service worker caching**: cache the app shell (HTML, CSS, JS, icons) aggressively. Never cache API data — always fetch fresh from Supabase. Queue offline actions in IndexedDB for sync.
- **Nicknames**: where a place has a nickname, show it prominently (possibly as the display name) with the official name smaller below it
