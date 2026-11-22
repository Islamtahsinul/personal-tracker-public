import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tracker, TrackerWithConfig, FieldType } from "@/lib/types/domain";

export async function getTrackers(includeArchived = false) {
  const supabase = await createClient();
  let query = supabase.from("trackers").select("*").order("sort_order", { ascending: true });
  if (!includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTrackerWithConfig(slug: string): Promise<TrackerWithConfig | null> {
  const supabase = await createClient();
  const { data: tracker, error } = await supabase.from("trackers").select("*").eq("slug", slug).single();
  if (error || !tracker) return null;
  return hydrateTrackerConfig(tracker);
}

export async function getTrackerWithConfigById(id: string): Promise<TrackerWithConfig | null> {
  const supabase = await createClient();
  const { data: tracker, error } = await supabase.from("trackers").select("*").eq("id", id).single();
  if (error || !tracker) return null;
  return hydrateTrackerConfig(tracker);
}

async function hydrateTrackerConfig(tracker: Tracker): Promise<TrackerWithConfig> {
  const supabase = await createClient();
  const [{ data: statuses }, { data: fields }] = await Promise.all([
    supabase.from("tracker_statuses").select("*").eq("tracker_id", tracker.id).order("sort_order"),
    supabase.from("tracker_fields").select("*").eq("tracker_id", tracker.id).order("sort_order"),
  ]);

  const fieldIds = (fields ?? []).map((f) => f.id);
  const { data: options } =
    fieldIds.length > 0
      ? await supabase.from("tracker_field_options").select("*").in("field_id", fieldIds).order("sort_order")
      : { data: [] as never[] };

  const fieldsWithOptions = (fields ?? []).map((f) => ({
    ...f,
    field_type: f.field_type as FieldType,
    options: (options ?? []).filter((o) => o.field_id === f.id),
  }));

  return {
    ...tracker,
    statuses: statuses ?? [],
    fields: fieldsWithOptions,
  };
}

export async function getTrackerById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trackers").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}
