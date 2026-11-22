"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { slugify } from "@/lib/utils";
import { trackerFormSchema, fieldFormSchema, statusFormSchema } from "@/lib/validation/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createTracker(input: unknown): Promise<ActionResult & { slug?: string }> {
  const parsed = trackerFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const baseSlug = slugify(parsed.data.name) || "tracker";
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { data: existing } = await supabase.from("trackers").select("id").eq("user_id", user.id).eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data: maxSort } = await supabase
    .from("trackers")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: tracker, error } = await supabase
    .from("trackers")
    .insert({
      user_id: user.id,
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      icon: parsed.data.icon,
      color: parsed.data.color,
      category: parsed.data.category,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !tracker) return { ok: false, error: error?.message ?? "Failed to create tracker" };

  // Every tracker gets a sensible default status pipeline so items are usable immediately.
  // Note: every row must list the same keys explicitly — PostgREST's batch insert sends a
  // missing key as NULL rather than falling back to the column default, which would violate
  // the not-null constraint on is_default here.
  const { error: statusError } = await supabase.from("tracker_statuses").insert([
    { tracker_id: tracker.id, key: "backlog", label: "Backlog", color: "#94a3b8", sort_order: 0, is_default: true },
    { tracker_id: tracker.id, key: "active", label: "In Progress", color: "#3b82f6", sort_order: 1, is_default: false },
    { tracker_id: tracker.id, key: "done", label: "Done", color: "#22c55e", sort_order: 2, is_default: false },
  ]);
  if (statusError) return { ok: false, error: statusError.message };

  revalidatePath("/dashboard");
  return { ok: true, slug };
}

export async function updateTracker(trackerId: string, input: unknown): Promise<ActionResult> {
  const parsed = trackerFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("trackers")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      icon: parsed.data.icon,
      color: parsed.data.color,
      category: parsed.data.category,
    })
    .eq("id", trackerId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/t/[slug]", "page");
  return { ok: true };
}

export async function setTrackerArchived(trackerId: string, archived: boolean): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("trackers").update({ is_archived: archived }).eq("id", trackerId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTracker(trackerId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("trackers").delete().eq("id", trackerId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createField(trackerId: string, input: unknown): Promise<ActionResult> {
  const parsed = fieldFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { data: maxSort } = await supabase
    .from("tracker_fields")
    .select("sort_order")
    .eq("tracker_id", trackerId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: field, error } = await supabase
    .from("tracker_fields")
    .insert({
      tracker_id: trackerId,
      key: parsed.data.key,
      label: parsed.data.label,
      field_type: parsed.data.field_type,
      is_personal: parsed.data.is_personal,
      is_required: parsed.data.is_required,
      show_in_card: parsed.data.show_in_card,
      help_text: parsed.data.help_text || null,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
    })
    .select()
    .single();
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "A field with that name already exists on this tracker." : error.message,
    };
  }

  if (parsed.data.options?.length && field) {
    await supabase.from("tracker_field_options").insert(
      parsed.data.options.map((o, idx) => ({
        field_id: field.id,
        value: o.value,
        label: o.label,
        sort_order: idx,
      })),
    );
  }

  revalidatePath("/t/[slug]", "page");
  revalidatePath("/t/[slug]/settings", "page");
  return { ok: true };
}

export async function deleteField(fieldId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("tracker_fields").delete().eq("id", fieldId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/t/[slug]", "page");
  revalidatePath("/t/[slug]/settings", "page");
  return { ok: true };
}

export async function createStatus(trackerId: string, input: unknown): Promise<ActionResult> {
  const parsed = statusFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { data: maxSort } = await supabase
    .from("tracker_statuses")
    .select("sort_order")
    .eq("tracker_id", trackerId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (parsed.data.is_default) {
    await supabase.from("tracker_statuses").update({ is_default: false }).eq("tracker_id", trackerId);
  }

  const { error } = await supabase.from("tracker_statuses").insert({
    tracker_id: trackerId,
    key: parsed.data.key,
    label: parsed.data.label,
    color: parsed.data.color,
    is_default: parsed.data.is_default,
    sort_order: (maxSort?.sort_order ?? -1) + 1,
  });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "A status with that name already exists on this tracker." : error.message,
    };
  }

  revalidatePath("/t/[slug]", "page");
  revalidatePath("/t/[slug]/settings", "page");
  return { ok: true };
}

export async function deleteStatus(statusId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("tracker_statuses").delete().eq("id", statusId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/t/[slug]", "page");
  revalidatePath("/t/[slug]/settings", "page");
  return { ok: true };
}
