-- Personal Tracker: generic tracker engine schema
-- Concepts: trackers -> tracker_fields/tracker_statuses -> items -> item_field_values
-- Design notes:
--   * item_field_values.value is jsonb because field types are heterogeneous
--     (text, number, date, arrays for multi_select). The relation itself
--     (item_id, field_id) is fully structured/indexed/FK-constrained; only
--     the leaf value is dynamically typed, which mirrors how Notion/Airtable-
--     style dynamic schemas are pragmatically modeled without over-normalizing
--     into a table-per-type.
--   * status / rating / favorite / notes live as first-class columns on
--     items because every tracker needs them and they get dedicated UI
--     (status pill, star rating, heart icon) and need to be fast to sort/filter.
--   * tracker_fields.is_personal distinguishes "External information" (usually
--     enrichment-sourced, e.g. director, engine) from tracker-specific
--     "My information" (e.g. hours played, date watched) shown in the
--     personal section of the item detail page.

create extension if not exists pg_trgm;

-- ============================================================
-- trackers
-- ============================================================
create table trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  icon text not null default 'library',
  color text not null default '#6366f1',
  category text not null default 'generic', -- drives default enrichment provider selection (movie, tv, game, book, car, motorcycle, generic)
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index trackers_user_id_idx on trackers (user_id);

-- ============================================================
-- tracker_statuses (configurable status pipeline per tracker)
-- ============================================================
create table tracker_statuses (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  key text not null,
  label text not null,
  color text not null default '#6366f1',
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tracker_id, key)
);

create index tracker_statuses_tracker_id_idx on tracker_statuses (tracker_id);

-- ============================================================
-- tracker_fields (custom field definitions)
-- ============================================================
create table tracker_fields (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null check (field_type in (
    'text', 'long_text', 'number', 'decimal', 'date', 'datetime',
    'url', 'image', 'boolean', 'select', 'multi_select', 'rating'
  )),
  is_personal boolean not null default false,
  is_required boolean not null default false,
  show_in_card boolean not null default false,
  help_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tracker_id, key)
);

create index tracker_fields_tracker_id_idx on tracker_fields (tracker_id);

-- ============================================================
-- tracker_field_options (choices for select / multi_select fields)
-- ============================================================
create table tracker_field_options (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references tracker_fields(id) on delete cascade,
  value text not null,
  label text not null,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (field_id, value)
);

create index tracker_field_options_field_id_idx on tracker_field_options (field_id);

-- ============================================================
-- items
-- ============================================================
create table items (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text,
  image_url text,
  backdrop_url text,
  status_id uuid references tracker_statuses(id) on delete set null,
  rating numeric(3, 1) check (rating is null or (rating >= 0 and rating <= 10)),
  is_favorite boolean not null default false,
  notes text,
  external_source text,
  external_id text,
  external_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_tracker_id_idx on items (tracker_id);
create index items_user_id_idx on items (user_id);
create index items_status_id_idx on items (status_id);
create index items_title_trgm_idx on items using gin (title gin_trgm_ops);
create index items_tracker_archived_idx on items (tracker_id, archived_at);

-- ============================================================
-- item_field_values (typed-by-field, EAV-style values)
-- ============================================================
create table item_field_values (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  field_id uuid not null references tracker_fields(id) on delete cascade,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, field_id)
);

create index item_field_values_item_id_idx on item_field_values (item_id);
create index item_field_values_field_id_idx on item_field_values (field_id);

-- ============================================================
-- tags (global, reusable across trackers) + item_tags
-- ============================================================
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index tags_user_id_idx on tags (user_id);

create table item_tags (
  item_id uuid not null references items(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

create index item_tags_tag_id_idx on item_tags (tag_id);

-- ============================================================
-- item_enrichment_records (provenance / raw payload cache)
-- ============================================================
create table item_enrichment_records (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  provider text not null,
  external_id text,
  external_url text,
  raw_data jsonb,
  fetched_at timestamptz not null default now()
);

create index item_enrichment_records_item_id_idx on item_enrichment_records (item_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trackers_set_updated_at before update on trackers
  for each row execute function set_updated_at();
create trigger items_set_updated_at before update on items
  for each row execute function set_updated_at();
create trigger item_field_values_set_updated_at before update on item_field_values
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security — every row is owned by auth.uid()
-- ============================================================
alter table trackers enable row level security;
alter table tracker_statuses enable row level security;
alter table tracker_fields enable row level security;
alter table tracker_field_options enable row level security;
alter table items enable row level security;
alter table item_field_values enable row level security;
alter table tags enable row level security;
alter table item_tags enable row level security;
alter table item_enrichment_records enable row level security;

create policy "trackers_owner" on trackers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tracker_statuses_owner" on tracker_statuses for all
  using (exists (select 1 from trackers t where t.id = tracker_id and t.user_id = auth.uid()))
  with check (exists (select 1 from trackers t where t.id = tracker_id and t.user_id = auth.uid()));

create policy "tracker_fields_owner" on tracker_fields for all
  using (exists (select 1 from trackers t where t.id = tracker_id and t.user_id = auth.uid()))
  with check (exists (select 1 from trackers t where t.id = tracker_id and t.user_id = auth.uid()));

create policy "tracker_field_options_owner" on tracker_field_options for all
  using (exists (
    select 1 from tracker_fields f join trackers t on t.id = f.tracker_id
    where f.id = field_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from tracker_fields f join trackers t on t.id = f.tracker_id
    where f.id = field_id and t.user_id = auth.uid()
  ));

create policy "items_owner" on items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "item_field_values_owner" on item_field_values for all
  using (exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()));

create policy "tags_owner" on tags for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "item_tags_owner" on item_tags for all
  using (exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()));

create policy "item_enrichment_records_owner" on item_enrichment_records for all
  using (exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()));
