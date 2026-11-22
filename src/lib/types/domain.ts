import type { Tables } from "@/lib/supabase/database.types";

export type FieldType =
  | "text"
  | "long_text"
  | "number"
  | "decimal"
  | "date"
  | "datetime"
  | "url"
  | "image"
  | "boolean"
  | "select"
  | "multi_select"
  | "rating";

export type Tracker = Tables<"trackers">;
export type TrackerStatus = Tables<"tracker_statuses">;
export type TrackerFieldOption = Tables<"tracker_field_options">;

export type TrackerField = Omit<Tables<"tracker_fields">, "field_type"> & {
  field_type: FieldType;
  options: TrackerFieldOption[];
};

export type TrackerWithConfig = Tracker & {
  statuses: TrackerStatus[];
  fields: TrackerField[];
};

export type Item = Tables<"items">;

export type ItemFieldValue = Tables<"item_field_values">;

/** A tracker item joined with its typed field values, status, and tags — the shape used throughout the UI. */
export type ItemWithValues = Item & {
  status: TrackerStatus | null;
  fieldValues: Record<string, unknown>; // keyed by tracker_fields.key
  tags: { id: string; name: string; color: string }[];
};

/** Category drives which enrichment provider(s) and default templates apply. Not a closed enum in the DB — new categories degrade to "generic" (manual entry only). */
export type TrackerCategory =
  | "movie"
  | "tv"
  | "game"
  | "book"
  | "car"
  | "motorcycle"
  | "gun"
  | "plant"
  | "generic";
