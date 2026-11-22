-- Adds a "provider rating" field to Movies/TV (TMDB), Games (IGDB), and Books
-- (Open Library) so autofill can populate the source's own rating alongside
-- the user's personal rating (items.rating, unaffected — this is a separate,
-- is_personal=false field, matching the existing external/personal split).
--
-- Two parts:
--   1. Re-create bootstrap_default_trackers with the new fields so future
--      signups get them from the start.
--   2. Backfill the same fields onto already-existing trackers (idempotent —
--      the anti-join skips a tracker that already has the field), since the
--      bootstrap function only runs once, at signup.

create or replace function bootstrap_default_trackers(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  trackers_json jsonb := $json$
[
  {
    "slug": "movies", "name": "Movies", "description": "Films I want to watch, am watching, or have watched.",
    "icon": "clapperboard", "color": "#8b5cf6", "category": "movie", "sort_order": 0,
    "statuses": [
      {"key": "want_to_watch", "label": "Want to Watch", "color": "#94a3b8", "sort_order": 0, "is_default": true},
      {"key": "watching", "label": "Watching", "color": "#3b82f6", "sort_order": 1, "is_default": false},
      {"key": "watched", "label": "Watched", "color": "#22c55e", "sort_order": 2, "is_default": false},
      {"key": "rewatch", "label": "Rewatch", "color": "#a855f7", "sort_order": 3, "is_default": false},
      {"key": "dropped", "label": "Dropped", "color": "#ef4444", "sort_order": 4, "is_default": false}
    ],
    "fields": [
      {"key": "release_date", "label": "Release Date", "field_type": "date", "show_in_card": true, "sort_order": 0},
      {"key": "director", "label": "Director", "field_type": "text", "show_in_card": true, "sort_order": 1},
      {"key": "cast", "label": "Cast", "field_type": "long_text", "sort_order": 2},
      {"key": "genres", "label": "Genres", "field_type": "multi_select", "show_in_card": true, "sort_order": 3,
        "options": [
          {"value": "action", "label": "Action", "sort_order": 0}, {"value": "adventure", "label": "Adventure", "sort_order": 1},
          {"value": "animation", "label": "Animation", "sort_order": 2}, {"value": "comedy", "label": "Comedy", "sort_order": 3},
          {"value": "crime", "label": "Crime", "sort_order": 4}, {"value": "documentary", "label": "Documentary", "sort_order": 5},
          {"value": "drama", "label": "Drama", "sort_order": 6}, {"value": "family", "label": "Family", "sort_order": 7},
          {"value": "fantasy", "label": "Fantasy", "sort_order": 8}, {"value": "history", "label": "History", "sort_order": 9},
          {"value": "horror", "label": "Horror", "sort_order": 10}, {"value": "music", "label": "Music", "sort_order": 11},
          {"value": "mystery", "label": "Mystery", "sort_order": 12}, {"value": "romance", "label": "Romance", "sort_order": 13},
          {"value": "science_fiction", "label": "Science Fiction", "sort_order": 14}, {"value": "thriller", "label": "Thriller", "sort_order": 15},
          {"value": "war", "label": "War", "sort_order": 16}, {"value": "western", "label": "Western", "sort_order": 17}
        ]},
      {"key": "runtime_minutes", "label": "Runtime (minutes)", "field_type": "number", "sort_order": 4},
      {"key": "description", "label": "Description", "field_type": "long_text", "sort_order": 5},
      {"key": "tmdb_rating", "label": "Rating (TMDB)", "field_type": "decimal", "sort_order": 6},
      {"key": "date_watched", "label": "Date Watched", "field_type": "date", "is_personal": true, "sort_order": 7}
    ]
  },
  {
    "slug": "tv-shows", "name": "TV Shows", "description": "Series I'm tracking across seasons.",
    "icon": "tv", "color": "#06b6d4", "category": "tv", "sort_order": 1,
    "statuses": [
      {"key": "want_to_watch", "label": "Want to Watch", "color": "#94a3b8", "sort_order": 0, "is_default": true},
      {"key": "watching", "label": "Watching", "color": "#3b82f6", "sort_order": 1, "is_default": false},
      {"key": "watched", "label": "Watched", "color": "#22c55e", "sort_order": 2, "is_default": false},
      {"key": "rewatching", "label": "Rewatch", "color": "#a855f7", "sort_order": 3, "is_default": false},
      {"key": "dropped", "label": "Dropped", "color": "#ef4444", "sort_order": 4, "is_default": false}
    ],
    "fields": [
      {"key": "first_air_date", "label": "First Air Date", "field_type": "date", "show_in_card": true, "sort_order": 0},
      {"key": "creator", "label": "Creator", "field_type": "text", "show_in_card": true, "sort_order": 1},
      {"key": "genres", "label": "Genres", "field_type": "multi_select", "show_in_card": true, "sort_order": 2,
        "options": [
          {"value": "action", "label": "Action & Adventure", "sort_order": 0}, {"value": "animation", "label": "Animation", "sort_order": 1},
          {"value": "comedy", "label": "Comedy", "sort_order": 2}, {"value": "crime", "label": "Crime", "sort_order": 3},
          {"value": "documentary", "label": "Documentary", "sort_order": 4}, {"value": "drama", "label": "Drama", "sort_order": 5},
          {"value": "family", "label": "Family", "sort_order": 6}, {"value": "kids", "label": "Kids", "sort_order": 7},
          {"value": "mystery", "label": "Mystery", "sort_order": 8}, {"value": "reality", "label": "Reality", "sort_order": 9},
          {"value": "scifi_fantasy", "label": "Sci-Fi & Fantasy", "sort_order": 10}, {"value": "soap", "label": "Soap", "sort_order": 11},
          {"value": "war_politics", "label": "War & Politics", "sort_order": 12}, {"value": "western", "label": "Western", "sort_order": 13}
        ]},
      {"key": "seasons", "label": "Seasons", "field_type": "number", "sort_order": 3},
      {"key": "episodes", "label": "Episodes", "field_type": "number", "sort_order": 4},
      {"key": "description", "label": "Description", "field_type": "long_text", "sort_order": 5},
      {"key": "tmdb_rating", "label": "Rating (TMDB)", "field_type": "decimal", "sort_order": 6},
      {"key": "current_season", "label": "Current Season", "field_type": "number", "is_personal": true, "sort_order": 7},
      {"key": "current_episode", "label": "Current Episode", "field_type": "number", "is_personal": true, "sort_order": 8}
    ]
  },
  {
    "slug": "games", "name": "Games", "description": "Video games to play, playing, or completed.",
    "icon": "gamepad-2", "color": "#22c55e", "category": "game", "sort_order": 2,
    "statuses": [
      {"key": "want_to_play", "label": "Want to Play", "color": "#94a3b8", "sort_order": 0, "is_default": true},
      {"key": "playing", "label": "Playing", "color": "#3b82f6", "sort_order": 1, "is_default": false},
      {"key": "completed", "label": "Completed", "color": "#22c55e", "sort_order": 2, "is_default": false},
      {"key": "dropped", "label": "Dropped", "color": "#ef4444", "sort_order": 3, "is_default": false}
    ],
    "fields": [
      {"key": "release_date", "label": "Release Date", "field_type": "date", "show_in_card": true, "sort_order": 0},
      {"key": "developer", "label": "Developer", "field_type": "text", "show_in_card": true, "sort_order": 1},
      {"key": "publisher", "label": "Publisher", "field_type": "text", "sort_order": 2},
      {"key": "platforms", "label": "Platforms", "field_type": "multi_select", "show_in_card": true, "sort_order": 3,
        "options": [
          {"value": "pc", "label": "PC", "sort_order": 0}, {"value": "ps5", "label": "PlayStation 5", "sort_order": 1},
          {"value": "ps4", "label": "PlayStation 4", "sort_order": 2}, {"value": "xbox_series", "label": "Xbox Series X|S", "sort_order": 3},
          {"value": "xbox_one", "label": "Xbox One", "sort_order": 4}, {"value": "switch", "label": "Nintendo Switch", "sort_order": 5},
          {"value": "mac", "label": "Mac", "sort_order": 6}, {"value": "linux", "label": "Linux", "sort_order": 7}
        ]},
      {"key": "genres", "label": "Genres", "field_type": "multi_select", "sort_order": 4,
        "options": [
          {"value": "action", "label": "Action", "sort_order": 0}, {"value": "adventure", "label": "Adventure", "sort_order": 1},
          {"value": "rpg", "label": "RPG", "sort_order": 2}, {"value": "shooter", "label": "Shooter", "sort_order": 3},
          {"value": "strategy", "label": "Strategy", "sort_order": 4}, {"value": "simulation", "label": "Simulation", "sort_order": 5},
          {"value": "sports", "label": "Sports", "sort_order": 6}, {"value": "racing", "label": "Racing", "sort_order": 7},
          {"value": "puzzle", "label": "Puzzle", "sort_order": 8}, {"value": "platformer", "label": "Platformer", "sort_order": 9},
          {"value": "fighting", "label": "Fighting", "sort_order": 10}, {"value": "horror", "label": "Horror", "sort_order": 11}
        ]},
      {"key": "description", "label": "Description", "field_type": "long_text", "sort_order": 5},
      {"key": "igdb_rating", "label": "Rating (IGDB, 0-100)", "field_type": "decimal", "sort_order": 6},
      {"key": "hours_played", "label": "Hours Played", "field_type": "decimal", "is_personal": true, "sort_order": 7},
      {"key": "platform_played", "label": "Platform Played On", "field_type": "text", "is_personal": true, "sort_order": 8}
    ]
  },
  {
    "slug": "books", "name": "Books", "description": "A reading list and log.",
    "icon": "book-open", "color": "#eab308", "category": "book", "sort_order": 3,
    "statuses": [
      {"key": "want_to_read", "label": "Want to Read", "color": "#94a3b8", "sort_order": 0, "is_default": true},
      {"key": "reading", "label": "Reading", "color": "#3b82f6", "sort_order": 1, "is_default": false},
      {"key": "finished", "label": "Finished", "color": "#22c55e", "sort_order": 2, "is_default": false},
      {"key": "dropped", "label": "Dropped", "color": "#ef4444", "sort_order": 3, "is_default": false}
    ],
    "fields": [
      {"key": "author", "label": "Author", "field_type": "text", "show_in_card": true, "sort_order": 0},
      {"key": "first_published", "label": "First Published", "field_type": "date", "show_in_card": true, "sort_order": 1},
      {"key": "page_count", "label": "Page Count", "field_type": "number", "sort_order": 2},
      {"key": "subjects", "label": "Subjects", "field_type": "multi_select", "sort_order": 3,
        "options": [
          {"value": "fiction", "label": "Fiction", "sort_order": 0}, {"value": "non_fiction", "label": "Non-fiction", "sort_order": 1},
          {"value": "science_fiction", "label": "Science Fiction", "sort_order": 2}, {"value": "fantasy", "label": "Fantasy", "sort_order": 3},
          {"value": "mystery", "label": "Mystery", "sort_order": 4}, {"value": "thriller", "label": "Thriller", "sort_order": 5},
          {"value": "biography", "label": "Biography", "sort_order": 6}, {"value": "history", "label": "History", "sort_order": 7},
          {"value": "philosophy", "label": "Philosophy", "sort_order": 8}, {"value": "self_help", "label": "Self-help", "sort_order": 9},
          {"value": "business", "label": "Business", "sort_order": 10}, {"value": "science", "label": "Science", "sort_order": 11},
          {"value": "poetry", "label": "Poetry", "sort_order": 12}, {"value": "classic", "label": "Classic", "sort_order": 13}
        ]},
      {"key": "description", "label": "Description", "field_type": "long_text", "sort_order": 4},
      {"key": "rating_average", "label": "Rating (Open Library)", "field_type": "decimal", "sort_order": 5},
      {"key": "date_finished", "label": "Date Finished", "field_type": "date", "is_personal": true, "sort_order": 6}
    ]
  },
  {
    "slug": "cars", "name": "Cars", "description": "Cars I know about, want, own, or have owned.",
    "icon": "car", "color": "#ef4444", "category": "car", "sort_order": 4,
    "statuses": [
      {"key": "want_to_learn", "label": "Want to Learn", "color": "#94a3b8", "sort_order": 0, "is_default": true},
      {"key": "learned_about", "label": "Learned About", "color": "#3b82f6", "sort_order": 1, "is_default": false},
      {"key": "owned", "label": "Owned", "color": "#22c55e", "sort_order": 2, "is_default": false},
      {"key": "previously_owned", "label": "Previously Owned", "color": "#a855f7", "sort_order": 3, "is_default": false},
      {"key": "dream_car", "label": "Dream Car", "color": "#ec4899", "sort_order": 4, "is_default": false}
    ],
    "fields": [
      {"key": "manufacturer", "label": "Manufacturer", "field_type": "text", "show_in_card": true, "sort_order": 0},
      {"key": "production_years", "label": "Production Years", "field_type": "text", "show_in_card": true, "sort_order": 1},
      {"key": "engine", "label": "Engine", "field_type": "text", "sort_order": 2},
      {"key": "engine_configuration", "label": "Engine Configuration", "field_type": "text", "sort_order": 3},
      {"key": "power", "label": "Power", "field_type": "text", "sort_order": 4},
      {"key": "torque", "label": "Torque", "field_type": "text", "sort_order": 5},
      {"key": "transmission", "label": "Transmission", "field_type": "text", "sort_order": 6},
      {"key": "drivetrain", "label": "Drivetrain", "field_type": "text", "sort_order": 7},
      {"key": "top_speed", "label": "Top Speed", "field_type": "text", "sort_order": 8},
      {"key": "zero_to_sixty", "label": "0-60 mph", "field_type": "text", "sort_order": 9},
      {"key": "body_type", "label": "Body Type", "field_type": "text", "sort_order": 10},
      {"key": "country", "label": "Country", "field_type": "text", "sort_order": 11},
      {"key": "description", "label": "Description", "field_type": "long_text", "sort_order": 12}
    ]
  },
  {
    "slug": "motorcycles", "name": "Motorcycles", "description": "Motorcycles I know about, want, own, or have owned.",
    "icon": "bike", "color": "#f97316", "category": "motorcycle", "sort_order": 5,
    "statuses": [
      {"key": "want_to_learn", "label": "Want to Learn", "color": "#94a3b8", "sort_order": 0, "is_default": true},
      {"key": "learned_about", "label": "Learned About", "color": "#3b82f6", "sort_order": 1, "is_default": false},
      {"key": "owned", "label": "Owned", "color": "#22c55e", "sort_order": 2, "is_default": false},
      {"key": "previously_owned", "label": "Previously Owned", "color": "#a855f7", "sort_order": 3, "is_default": false},
      {"key": "dream_bike", "label": "Dream Bike", "color": "#ec4899", "sort_order": 4, "is_default": false}
    ],
    "fields": [
      {"key": "manufacturer", "label": "Manufacturer", "field_type": "text", "show_in_card": true, "sort_order": 0},
      {"key": "production_years", "label": "Production Years", "field_type": "text", "show_in_card": true, "sort_order": 1},
      {"key": "engine", "label": "Engine", "field_type": "text", "sort_order": 2},
      {"key": "power", "label": "Power", "field_type": "text", "sort_order": 3},
      {"key": "top_speed", "label": "Top Speed", "field_type": "text", "sort_order": 4},
      {"key": "transmission", "label": "Transmission", "field_type": "text", "sort_order": 5},
      {"key": "body_type", "label": "Body Type", "field_type": "text", "sort_order": 6},
      {"key": "country", "label": "Country", "field_type": "text", "sort_order": 7},
      {"key": "description", "label": "Description", "field_type": "long_text", "sort_order": 8}
    ]
  }
]
  $json$;
  tracker_rec jsonb;
  status_rec jsonb;
  field_rec jsonb;
  option_rec jsonb;
  v_tracker_id uuid;
  v_field_id uuid;
begin
  for tracker_rec in select * from jsonb_array_elements(trackers_json)
  loop
    insert into trackers (user_id, slug, name, description, icon, color, category, sort_order)
    values (
      p_user_id,
      tracker_rec->>'slug', tracker_rec->>'name', tracker_rec->>'description',
      tracker_rec->>'icon', tracker_rec->>'color', tracker_rec->>'category',
      (tracker_rec->>'sort_order')::int
    )
    returning id into v_tracker_id;

    for status_rec in select * from jsonb_array_elements(tracker_rec->'statuses')
    loop
      insert into tracker_statuses (tracker_id, key, label, color, sort_order, is_default)
      values (
        v_tracker_id, status_rec->>'key', status_rec->>'label', status_rec->>'color',
        (status_rec->>'sort_order')::int, (status_rec->>'is_default')::boolean
      );
    end loop;

    for field_rec in select * from jsonb_array_elements(tracker_rec->'fields')
    loop
      insert into tracker_fields (tracker_id, key, label, field_type, is_personal, show_in_card, sort_order)
      values (
        v_tracker_id, field_rec->>'key', field_rec->>'label', field_rec->>'field_type',
        coalesce((field_rec->>'is_personal')::boolean, false),
        coalesce((field_rec->>'show_in_card')::boolean, false),
        (field_rec->>'sort_order')::int
      )
      returning id into v_field_id;

      if field_rec ? 'options' then
        for option_rec in select * from jsonb_array_elements(field_rec->'options')
        loop
          insert into tracker_field_options (field_id, value, label, sort_order)
          values (v_field_id, option_rec->>'value', option_rec->>'label', (option_rec->>'sort_order')::int);
        end loop;
      end if;
    end loop;
  end loop;
end;
$$;

-- Backfill: give already-existing trackers (created before this migration) the
-- same new fields. Anti-joined on key so this is safe to run more than once.
insert into tracker_fields (tracker_id, key, label, field_type, is_personal, show_in_card, sort_order)
select t.id, 'tmdb_rating', 'Rating (TMDB)', 'decimal', false, false,
  coalesce((select max(sort_order) + 1 from tracker_fields f2 where f2.tracker_id = t.id), 0)
from trackers t
where t.slug in ('movies', 'tv-shows')
  and not exists (select 1 from tracker_fields f where f.tracker_id = t.id and f.key = 'tmdb_rating');

insert into tracker_fields (tracker_id, key, label, field_type, is_personal, show_in_card, sort_order)
select t.id, 'igdb_rating', 'Rating (IGDB, 0-100)', 'decimal', false, false,
  coalesce((select max(sort_order) + 1 from tracker_fields f2 where f2.tracker_id = t.id), 0)
from trackers t
where t.slug = 'games'
  and not exists (select 1 from tracker_fields f where f.tracker_id = t.id and f.key = 'igdb_rating');

insert into tracker_fields (tracker_id, key, label, field_type, is_personal, show_in_card, sort_order)
select t.id, 'rating_average', 'Rating (Open Library)', 'decimal', false, false,
  coalesce((select max(sort_order) + 1 from tracker_fields f2 where f2.tracker_id = t.id), 0)
from trackers t
where t.slug = 'books'
  and not exists (select 1 from tracker_fields f where f.tracker_id = t.id and f.key = 'rating_average');
