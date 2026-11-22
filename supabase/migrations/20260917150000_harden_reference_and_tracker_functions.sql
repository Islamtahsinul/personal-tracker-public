-- Two fixes surfaced by the Supabase security advisor after the reference-
-- database migrations:
--
-- 1. search_gun_reference / search_plant_reference / plant_reference_set_search_text
--    had a mutable search_path (advisor: function_search_path_mutable) —
--    pinning it matches every other function in this schema (e.g.
--    bootstrap_default_trackers) and closes the search_path-hijacking class
--    of issue. pg_trgm's `%` operator and similarity() live in the
--    `extensions` schema on this project (confirmed via pg_extension), not
--    `public`, so both must be on the path or the trigram operators break.
--
-- 2. add_trackers_for_user (added in the previous session, 20260917120000)
--    is SECURITY DEFINER and was still executable by `anon`/`authenticated`
--    with an arbitrary p_user_id argument (advisor:
--    anon_security_definer_function_executable /
--    authenticated_security_definer_function_executable) — since it runs
--    with elevated privileges and bypasses RLS by design, any signed-in
--    user could have called it via PostgREST to insert trackers into a
--    DIFFERENT user's account. It was only ever meant to be run by a
--    migration/service role, never exposed as a public RPC, so execute is
--    revoked from both roles.

create or replace function search_gun_reference(q text, max_results int default 20)
returns setof gun_reference
language sql
stable
set search_path = public, extensions
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
set search_path = public, extensions
as $$
  select *
  from plant_reference
  where lower(search_text) ilike '%' || lower(q) || '%'
     or lower(search_text) % lower(q)
  order by similarity(lower(search_text), lower(q)) desc, common_name asc
  limit max_results;
$$;

create or replace function plant_reference_set_search_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_text :=
    coalesce(new.common_name, '') || ' ' || coalesce(array_to_string(new.other_common_names, ' '), '') || ' ' ||
    coalesce(new.scientific_name, '') || ' ' || coalesce(new.family, '');
  return new;
end;
$$;

revoke execute on function add_trackers_for_user(uuid, jsonb) from public, anon, authenticated;
