-- Adds two new trackers (Guns, Plants/Foraging) for an existing user, using
-- the same data-driven jsonb-template approach as bootstrap_default_trackers
-- (20260831121000) rather than bespoke insert logic. Unlike that function,
-- this one is idempotent per-slug (skips a tracker the user already has) so
-- it's safe to reuse for future one-off tracker additions to an existing
-- account, and it reports back what it did/skipped via its return table
-- instead of requiring a separate read to confirm.

create or replace function add_trackers_for_user(p_user_id uuid, p_trackers_json jsonb)
returns table(slug text, name text, inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  tracker_rec jsonb;
  status_rec jsonb;
  field_rec jsonb;
  option_rec jsonb;
  v_tracker_id uuid;
  v_field_id uuid;
  v_sort_order int;
  v_exists boolean;
begin
  for tracker_rec in select * from jsonb_array_elements(p_trackers_json)
  loop
    select exists(
      select 1 from trackers t where t.user_id = p_user_id and t.slug = tracker_rec->>'slug'
    ) into v_exists;

    if v_exists then
      slug := tracker_rec->>'slug';
      name := tracker_rec->>'name';
      inserted := false;
      return next;
      continue;
    end if;

    select coalesce(max(t.sort_order), -1) + 1 into v_sort_order from trackers t where t.user_id = p_user_id;

    insert into trackers (user_id, slug, name, description, icon, color, category, sort_order)
    values (
      p_user_id, tracker_rec->>'slug', tracker_rec->>'name', tracker_rec->>'description',
      tracker_rec->>'icon', tracker_rec->>'color', tracker_rec->>'category', v_sort_order
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
      insert into tracker_fields (tracker_id, key, label, field_type, is_personal, show_in_card, help_text, sort_order)
      values (
        v_tracker_id, field_rec->>'key', field_rec->>'label', field_rec->>'field_type',
        coalesce((field_rec->>'is_personal')::boolean, false),
        coalesce((field_rec->>'show_in_card')::boolean, false),
        field_rec->>'help_text',
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

    slug := tracker_rec->>'slug';
    name := tracker_rec->>'name';
    inserted := true;
    return next;
  end loop;
end;
$$;

-- Add Guns and Plants (Foraging) to every account that exists when this
-- migration runs. Idempotent per slug (an account that already has a tracker
-- with that slug is skipped) and a no-op on a fresh database with no users.
select t.*
from auth.users u
cross join lateral add_trackers_for_user(
  u.id,
  $trackers$
[
  {
    "slug": "guns", "name": "Guns", "description": "Firearms I know about, want, own, or have owned.",
    "icon": "crosshair", "color": "#71717a", "category": "gun",
    "statuses": [
      {"key": "want_to_learn", "label": "Want to Learn", "color": "#94a3b8", "sort_order": 0, "is_default": true},
      {"key": "learned_about", "label": "Learned About", "color": "#3b82f6", "sort_order": 1, "is_default": false},
      {"key": "owned", "label": "Owned", "color": "#22c55e", "sort_order": 2, "is_default": false},
      {"key": "previously_owned", "label": "Previously Owned", "color": "#a855f7", "sort_order": 3, "is_default": false},
      {"key": "wishlist", "label": "Wishlist", "color": "#ec4899", "sort_order": 4, "is_default": false}
    ],
    "fields": [
      {"key": "manufacturer", "label": "Manufacturer", "field_type": "text", "show_in_card": true, "sort_order": 0},
      {"key": "action_type", "label": "Action Type", "field_type": "select", "show_in_card": true, "sort_order": 1,
        "options": [
          {"value": "bolt_action", "label": "Bolt-Action", "sort_order": 0},
          {"value": "semi_automatic", "label": "Semi-Automatic", "sort_order": 1},
          {"value": "lever_action", "label": "Lever-Action", "sort_order": 2},
          {"value": "pump_action", "label": "Pump-Action", "sort_order": 3},
          {"value": "break_action", "label": "Break-Action", "sort_order": 4},
          {"value": "single_shot", "label": "Single-Shot", "sort_order": 5},
          {"value": "revolver", "label": "Revolver", "sort_order": 6},
          {"value": "automatic", "label": "Automatic", "sort_order": 7},
          {"value": "other", "label": "Other", "sort_order": 8}
        ]},
      {"key": "caliber", "label": "Caliber / Cartridge", "field_type": "text", "sort_order": 2},
      {"key": "capacity", "label": "Capacity", "field_type": "text", "sort_order": 3},
      {"key": "barrel_length", "label": "Barrel Length", "field_type": "text", "sort_order": 4},
      {"key": "overall_length", "label": "Overall Length", "field_type": "text", "sort_order": 5},
      {"key": "weight", "label": "Weight", "field_type": "text", "sort_order": 6},
      {"key": "country", "label": "Country of Origin", "field_type": "text", "sort_order": 7},
      {"key": "production_years", "label": "Production Years", "field_type": "text", "sort_order": 8},
      {"key": "description", "label": "Description", "field_type": "long_text", "sort_order": 9},
      {"key": "date_acquired", "label": "Date Acquired", "field_type": "date", "is_personal": true, "sort_order": 10},
      {"key": "serial_number", "label": "Serial Number", "field_type": "text", "is_personal": true, "sort_order": 11,
        "help_text": "Kept private to your account - useful for insurance or loss/theft records."}
    ]
  },
  {
    "slug": "plants", "name": "Plants (Foraging)", "description": "Wild plants and fungi I'm learning to identify or have foraged.",
    "icon": "leaf", "color": "#65a30d", "category": "plant",
    "statuses": [
      {"key": "want_to_identify", "label": "Want to Identify", "color": "#94a3b8", "sort_order": 0, "is_default": true},
      {"key": "identified", "label": "Identified", "color": "#3b82f6", "sort_order": 1, "is_default": false},
      {"key": "foraged", "label": "Foraged", "color": "#22c55e", "sort_order": 2, "is_default": false},
      {"key": "avoid", "label": "Avoid - Unsafe", "color": "#ef4444", "sort_order": 3, "is_default": false}
    ],
    "fields": [
      {"key": "scientific_name", "label": "Scientific Name", "field_type": "text", "show_in_card": true, "sort_order": 0},
      {"key": "family", "label": "Family", "field_type": "text", "sort_order": 1},
      {"key": "habitat", "label": "Habitat", "field_type": "text", "show_in_card": true, "sort_order": 2},
      {"key": "season", "label": "Season", "field_type": "multi_select", "sort_order": 3,
        "options": [
          {"value": "spring", "label": "Spring", "sort_order": 0},
          {"value": "summer", "label": "Summer", "sort_order": 1},
          {"value": "autumn", "label": "Autumn", "sort_order": 2},
          {"value": "winter", "label": "Winter", "sort_order": 3}
        ]},
      {"key": "edibility", "label": "Edibility", "field_type": "select", "sort_order": 4,
        "help_text": "Your own assessment - always verify with multiple reliable field guides before eating anything foraged.",
        "options": [
          {"value": "edible", "label": "Edible", "sort_order": 0},
          {"value": "edible_prepared", "label": "Edible (needs preparation)", "sort_order": 1},
          {"value": "medicinal", "label": "Medicinal", "sort_order": 2},
          {"value": "inedible", "label": "Inedible", "sort_order": 3},
          {"value": "toxic", "label": "Toxic", "sort_order": 4},
          {"value": "unknown", "label": "Unknown", "sort_order": 5}
        ]},
      {"key": "identification_notes", "label": "Identification Notes", "field_type": "long_text", "sort_order": 5,
        "help_text": "Key features you use to ID it, and any dangerous look-alikes to watch for."},
      {"key": "description", "label": "Description", "field_type": "long_text", "sort_order": 6},
      {"key": "date_found", "label": "Date Found", "field_type": "date", "is_personal": true, "sort_order": 7},
      {"key": "location_found", "label": "Location Found", "field_type": "text", "is_personal": true, "sort_order": 8}
    ]
  }
]
  $trackers$::jsonb
) as t;
