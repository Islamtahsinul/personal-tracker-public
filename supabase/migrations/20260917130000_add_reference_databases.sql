-- Reference databases for Guns and Plants (Foraging): shared, read-only
-- factual lookup tables that back an in-app "search reference data, then
-- add to my tracker" flow — deliberately NOT the same thing as the existing
-- per-user Guns/Plants trackers (trackers/items/item_field_values), which
-- this migration does not touch.
--
-- Design:
--   * No user_id column — this is global reference data, not owned by any
--     one user, so it is never duplicated per account.
--   * Free-text fields throughout (not enums) because coverage is uneven
--     across sources; a missing fact is left null rather than guessed.
--   * A generated `search_text` column + a pg_trgm GIN index (pg_trgm is
--     already enabled, see 20260831120000_init_schema.sql) drives search:
--     ILIKE for substring/partial matches, `%` similarity for typo-tolerant
--     fuzzy matches, both case-insensitive.
--   * source/source_url/license/imported_at columns make provenance a first-
--     class, queryable fact per row rather than tribal knowledge — required
--     given none of this data may be fabricated.
--   * A personal tracker item links back to its source record the same way
--     every other enrichment provider already does in this app: via the
--     existing items.external_source/external_id columns (set to
--     'gun_reference'/'plant_reference' and this row's id) — not a new FK,
--     to stay consistent with the TMDB/IGDB/Wikidata providers, none of
--     which have a local table to FK against either.

-- ============================================================
-- gun_reference
-- ============================================================
create table gun_reference (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manufacturer text,
  model text,
  action_type text,
  caliber text,
  capacity text,
  barrel_length text,
  overall_length text,
  weight text,
  country text,
  production_years text,
  description text,
  image_url text,
  image_attribution text,
  source text not null,
  source_url text,
  license text,
  imported_at timestamptz not null default now(),
  search_text text generated always as (
    coalesce(name, '') || ' ' || coalesce(manufacturer, '') || ' ' || coalesce(model, '') || ' ' || coalesce(caliber, '')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- lower() is STABLE (locale-dependent), not IMMUTABLE, so it can't live in the generated column
-- above — it's applied here instead, in an expression index, which is allowed to use it.
create index gun_reference_search_trgm_idx on gun_reference using gin (lower(search_text) gin_trgm_ops);

-- ============================================================
-- plant_reference
-- ============================================================
create table plant_reference (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  other_common_names text[],
  scientific_name text,
  family text,
  habitat text,
  season text,
  identification_notes text,
  description text,
  edibility text,
  toxicity_notes text,
  safety_caveat text not null default
    'Always verify identification and edibility against multiple authoritative field guides before consuming any foraged plant. This reference entry is informational only and is not a safety guarantee.',
  image_url text,
  image_attribution text,
  source text not null,
  source_url text,
  license text,
  imported_at timestamptz not null default now(),
  -- Not a generated column here (unlike gun_reference.search_text): array_to_string() is
  -- STABLE rather than IMMUTABLE in Postgres, which generated-column expressions reject
  -- (42P17). Kept up to date by the trigger below instead, which has no such restriction.
  search_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plant_reference_search_trgm_idx on plant_reference using gin (lower(search_text) gin_trgm_ops);

create or replace function plant_reference_set_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text :=
    coalesce(new.common_name, '') || ' ' || coalesce(array_to_string(new.other_common_names, ' '), '') || ' ' ||
    coalesce(new.scientific_name, '') || ' ' || coalesce(new.family, '');
  return new;
end;
$$;

create trigger plant_reference_set_search_text before insert or update on plant_reference
  for each row execute function plant_reference_set_search_text();

create trigger gun_reference_set_updated_at before update on gun_reference
  for each row execute function set_updated_at();
create trigger plant_reference_set_updated_at before update on plant_reference
  for each row execute function set_updated_at();

-- ============================================================
-- RLS: readable by any authenticated user, writable by no one at the
-- application layer (only via migrations/service role) — reference data
-- has no owner, so there is nothing for a per-user policy to check.
-- This is purely additive; no existing table's RLS is touched.
-- ============================================================
alter table gun_reference enable row level security;
alter table plant_reference enable row level security;

create policy "gun_reference_read_authenticated" on gun_reference for select
  using (auth.role() = 'authenticated');
create policy "plant_reference_read_authenticated" on plant_reference for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- Search RPCs: partial + case-insensitive (ilike) OR trigram-fuzzy (%)
-- matching over the generated search_text column, ranked by similarity.
-- Deliberately NOT `security definer` — these run with the caller's own
-- privileges, so the "authenticated"-only select policies above still
-- apply exactly as if the caller queried the table directly.
-- ============================================================
create or replace function search_gun_reference(q text, max_results int default 20)
returns setof gun_reference
language sql
stable
as $$
  select *
  from gun_reference
  where lower(search_text) ilike '%' || lower(q) || '%'
     or lower(search_text) % lower(q)
  order by similarity(lower(search_text), lower(q)) desc, name asc
  limit max_results;
$$;

create or replace function search_plant_reference(q text, max_results int default 20)
returns setof plant_reference
language sql
stable
as $$
  select *
  from plant_reference
  where lower(search_text) ilike '%' || lower(q) || '%'
     or lower(search_text) % lower(q)
  order by similarity(lower(search_text), lower(q)) desc, common_name asc
  limit max_results;
$$;

grant execute on function search_gun_reference(text, int) to authenticated;
grant execute on function search_plant_reference(text, int) to authenticated;
