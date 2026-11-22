import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Item, ItemWithValues } from "@/lib/types/domain";

export type ItemListFilters = {
  search?: string;
  statusId?: string | null;
  favoritesOnly?: boolean;
  sort?: "recently_added" | "recently_updated" | "title_asc" | "title_desc" | "rating_desc";
  includeArchived?: boolean;
  /** 1-indexed. Without pagination a tracker with thousands of items would fetch its
   * entire contents (plus every field value and tag) in one request. */
  page?: number;
};

export const ITEMS_PAGE_SIZE = 60;

async function hydrateItems(itemRows: Item[]) {
  const supabase = await createClient();
  if (itemRows.length === 0) return [] as ItemWithValues[];

  const itemIds = itemRows.map((i) => i.id);
  const statusIds = [...new Set(itemRows.map((i) => i.status_id).filter(Boolean))] as string[];

  const [{ data: statuses }, { data: fieldValues }, { data: itemTags }] = await Promise.all([
    statusIds.length
      ? supabase.from("tracker_statuses").select("*").in("id", statusIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("item_field_values").select("*, tracker_fields!inner(key)").in("item_id", itemIds),
    supabase
      .from("item_tags")
      .select("item_id, tags(id, name, color)")
      .in("item_id", itemIds),
  ]);

  const statusMap = new Map((statuses ?? []).map((s) => [s.id, s]));

  return itemRows.map((item) => {
    const values: Record<string, unknown> = {};
    for (const fv of fieldValues ?? []) {
      const key = (fv as unknown as { tracker_fields: { key: string } }).tracker_fields?.key;
      if (key) values[key] = fv.value;
    }
    const tags = (itemTags ?? [])
      .filter((it) => it.item_id === item.id)
      .map((it) => it.tags as unknown as { id: string; name: string; color: string })
      .filter(Boolean);

    return {
      ...item,
      status: item.status_id ? statusMap.get(item.status_id) ?? null : null,
      fieldValues: values,
      tags,
    } satisfies ItemWithValues;
  });
}

export async function getItemsForTracker(trackerId: string, filters: ItemListFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("items").select("*", { count: "exact" }).eq("tracker_id", trackerId);

  if (!filters.includeArchived) query = query.is("archived_at", null);
  if (filters.statusId) query = query.eq("status_id", filters.statusId);
  if (filters.favoritesOnly) query = query.eq("is_favorite", true);
  if (filters.search?.trim()) query = query.ilike("title", `%${filters.search.trim()}%`);

  switch (filters.sort) {
    case "recently_updated":
      query = query.order("updated_at", { ascending: false });
      break;
    case "title_asc":
      query = query.order("title", { ascending: true });
      break;
    case "title_desc":
      query = query.order("title", { ascending: false });
      break;
    case "rating_desc":
      query = query.order("rating", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * ITEMS_PAGE_SIZE;
  query = query.range(from, from + ITEMS_PAGE_SIZE - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  const items = await hydrateItems(data ?? []);
  return { items, totalCount: count ?? 0, page, pageSize: ITEMS_PAGE_SIZE };
}

export async function getItemById(id: string): Promise<ItemWithValues | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("*").eq("id", id).single();
  if (error || !data) return null;
  const [hydrated] = await hydrateItems([data]);
  return hydrated ?? null;
}

export async function getRecentItems(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateItems(data ?? []);
}

export async function getFavoriteItems(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("archived_at", null)
    .eq("is_favorite", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateItems(data ?? []);
}

export async function searchAllItems(query: string, limit = 30) {
  const supabase = await createClient();
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("archived_at", null)
    .ilike("title", `%${query.trim()}%`)
    .order("title", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return hydrateItems(data ?? []);
}

export async function getItemCountsByTracker() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("tracker_id").is("archived_at", null);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.tracker_id, (counts.get(row.tracker_id) ?? 0) + 1);
  }
  return counts;
}
