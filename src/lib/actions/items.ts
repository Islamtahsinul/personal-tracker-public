"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { itemFormSchema } from "@/lib/validation/schemas";
import type { NormalizedItem } from "@/lib/providers/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Non-blocking duplicate check. Matches on the same external item (same
 * provider + external ID) or a case-insensitive exact title match within the
 * same tracker. Callers surface this as a warning, not a hard block — a
 * second copy is sometimes legitimate (different edition, a rewatch entry
 * under a different status, etc.).
 */
export async function findPossibleDuplicates(
  trackerId: string,
  title: string,
  externalSource?: string | null,
  externalId?: string | null,
): Promise<{ id: string; title: string; image_url: string | null }[]> {
  const supabase = await createClient();
  const trimmed = title.trim();
  if (!trimmed) return [];

  if (externalSource && externalId) {
    const { data } = await supabase
      .from("items")
      .select("id, title, image_url")
      .eq("tracker_id", trackerId)
      .eq("external_source", externalSource)
      .eq("external_id", externalId)
      .is("archived_at", null)
      .limit(5);
    if (data?.length) return data;
  }

  const { data } = await supabase
    .from("items")
    .select("id, title, image_url")
    .eq("tracker_id", trackerId)
    .ilike("title", trimmed)
    .is("archived_at", null)
    .limit(5);
  return data ?? [];
}

type CreateItemInput = {
  trackerId: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  backdrop_url?: string | null;
  status_id?: string | null;
  fieldValues?: Record<string, unknown>;
  enrichment?: {
    providerId: string;
    externalId: string;
    externalUrl?: string | null;
    raw: unknown;
  };
};

async function setFieldValues(itemId: string, trackerId: string, values: Record<string, unknown>) {
  if (!values || Object.keys(values).length === 0) return;
  const supabase = await createClient();
  const { data: fields } = await supabase.from("tracker_fields").select("id, key").eq("tracker_id", trackerId);
  const keyToId = new Map((fields ?? []).map((f) => [f.key, f.id]));

  const rows = Object.entries(values)
    .filter(([key]) => keyToId.has(key))
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ({
      item_id: itemId,
      field_id: keyToId.get(key)!,
      value: value as never,
    }));

  if (rows.length === 0) return;
  await supabase.from("item_field_values").upsert(rows, { onConflict: "item_id,field_id" });
}

export async function createItem(input: CreateItemInput): Promise<ActionResult & { itemId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.title?.trim()) return { ok: false, error: "Title is required" };

  const { data: item, error } = await supabase
    .from("items")
    .insert({
      tracker_id: input.trackerId,
      user_id: user.id,
      title: input.title.trim(),
      subtitle: input.subtitle || null,
      image_url: input.image_url || null,
      backdrop_url: input.backdrop_url || null,
      status_id: input.status_id || null,
      external_source: input.enrichment?.providerId ?? null,
      external_id: input.enrichment?.externalId ?? null,
      external_url: input.enrichment?.externalUrl ?? null,
    })
    .select()
    .single();

  if (error || !item) return { ok: false, error: error?.message ?? "Failed to create item" };

  if (input.fieldValues) {
    await setFieldValues(item.id, input.trackerId, input.fieldValues);
  }

  if (input.enrichment) {
    await supabase.from("item_enrichment_records").insert({
      item_id: item.id,
      provider: input.enrichment.providerId,
      external_id: input.enrichment.externalId,
      external_url: input.enrichment.externalUrl ?? null,
      raw_data: input.enrichment.raw as never,
    });
  }

  revalidatePath("/t/[slug]", "page");
  revalidatePath("/dashboard");
  return { ok: true, itemId: item.id };
}

export async function createItemFromEnrichment(
  trackerId: string,
  providerId: string,
  normalized: NormalizedItem,
  statusId?: string | null,
): Promise<ActionResult & { itemId?: string }> {
  return createItem({
    trackerId,
    title: normalized.title,
    subtitle: normalized.subtitle,
    image_url: normalized.imageUrl,
    backdrop_url: normalized.backdropUrl,
    status_id: statusId ?? null,
    fieldValues: normalized.fields,
    enrichment: {
      providerId,
      externalId: normalized.externalId,
      externalUrl: normalized.externalUrl,
      raw: normalized.raw,
    },
  });
}

export async function updateItemCore(itemId: string, input: unknown): Promise<ActionResult> {
  const parsed = itemFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("items")
    .update({
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      image_url: parsed.data.image_url || null,
      backdrop_url: parsed.data.backdrop_url || null,
      status_id: parsed.data.status_id || null,
      rating: parsed.data.rating ?? null,
      notes: parsed.data.notes || null,
    })
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/i/[id]", "page");
  revalidatePath("/t/[slug]", "page");
  return { ok: true };
}

export async function updateItemFieldValues(itemId: string, trackerId: string, values: Record<string, unknown>): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await setFieldValues(itemId, trackerId, values);

    // Explicitly-cleared fields (empty string / null) should delete the row rather than being skipped.
    const { data: fields } = await supabase.from("tracker_fields").select("id, key").eq("tracker_id", trackerId);
    const keyToId = new Map((fields ?? []).map((f) => [f.key, f.id]));
    const clearedFieldIds = Object.entries(values)
      .filter(([key, value]) => keyToId.has(key) && (value === null || value === ""))
      .map(([key]) => keyToId.get(key)!);
    if (clearedFieldIds.length) {
      await supabase.from("item_field_values").delete().eq("item_id", itemId).in("field_id", clearedFieldIds);
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save fields" };
  }
  revalidatePath("/i/[id]", "page");
  return { ok: true };
}

export async function setItemFavorite(itemId: string, favorite: boolean): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("items").update({ is_favorite: favorite }).eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/i/[id]", "page");
  revalidatePath("/t/[slug]", "page");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setItemStatus(itemId: string, statusId: string | null): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("items").update({ status_id: statusId }).eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/i/[id]", "page");
  revalidatePath("/t/[slug]", "page");
  return { ok: true };
}

export async function setItemRating(itemId: string, rating: number | null): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("items").update({ rating }).eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/i/[id]", "page");
  revalidatePath("/t/[slug]", "page");
  return { ok: true };
}

export async function setItemNotes(itemId: string, notes: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("items").update({ notes: notes || null }).eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/i/[id]", "page");
  return { ok: true };
}

export async function archiveItem(itemId: string, archived: boolean): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("items")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/t/[slug]", "page");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteItem(itemId: string, trackerSlug: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/t/${trackerSlug}`);
  redirect(`/t/${trackerSlug}`);
}

export async function setItemTags(itemId: string, tagNames: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const cleanNames = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];

  const tagIds: string[] = [];
  for (const name of cleanNames) {
    // Case-insensitive lookup so "Sci-Fi" and "sci-fi" reuse one tag instead of
    // silently accumulating near-duplicates that differ only by casing.
    const { data: existing } = await supabase.from("tags").select("id").eq("user_id", user.id).ilike("name", name).maybeSingle();
    if (existing) {
      tagIds.push(existing.id);
    } else {
      const { data: created, error } = await supabase.from("tags").insert({ user_id: user.id, name }).select("id").single();
      if (!error && created) tagIds.push(created.id);
    }
  }

  await supabase.from("item_tags").delete().eq("item_id", itemId);
  if (tagIds.length) {
    await supabase.from("item_tags").insert(tagIds.map((tag_id) => ({ item_id: itemId, tag_id })));
  }

  revalidatePath("/i/[id]", "page");
  return { ok: true };
}
