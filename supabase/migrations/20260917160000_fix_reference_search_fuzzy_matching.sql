-- word_similarity (rather than plain similarity/`%`) because the query is short (a firearm
-- or plant name) but search_text concatenates several fields — plain trigram similarity over
-- the whole string dilutes a short query's score too much to clear even a low threshold (e.g.
-- "nettel" vs. "Stinging nettle Urtica dioica Urticaceae" scored 0.11, below the 0.3 default,
-- so a genuine one-letter-transposed typo of "nettle" matched nothing at all). word_similarity
-- instead scores the query against its best-matching substring, which is what "does this
-- typo'd word appear in here" actually means; 0.35 was picked empirically against this seed
-- data ("nettel" then scores ~0.57 against the nettle row, unrelated rows score under 0.15).
create or replace function search_gun_reference(q text, max_results int default 20)
returns setof gun_reference
language sql
stable
set search_path = public, extensions
as $$
  select *
  from gun_reference
  where lower(search_text) ilike '%' || lower(q) || '%'
     or extensions.word_similarity(lower(q), lower(search_text)) > 0.35
  order by extensions.word_similarity(lower(q), lower(search_text)) desc, name asc
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
     or extensions.word_similarity(lower(q), lower(search_text)) > 0.35
  order by extensions.word_similarity(lower(q), lower(search_text)) desc, common_name asc
  limit max_results;
$$;
