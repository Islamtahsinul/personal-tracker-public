import type { EnrichmentProvider, NormalizedItem, ProviderSearchResult } from "./types";
import { createClient } from "@/lib/supabase/server";

/**
 * Backs the Guns tracker's "search then add" flow with the app's own
 * gun_reference table instead of an external API — there is no reliable
 * free firearms-spec API (see scripts/reference-data/import-reference-data.mjs
 * for the sourcing this table is actually populated from: Wikidata + Wikipedia).
 * Search runs server-side via the search_gun_reference() RPC (partial +
 * trigram-fuzzy matching over a generated search_text column), which is
 * subject to the same "authenticated users only" RLS policy as querying the
 * table directly — this provider never bypasses that.
 */
type GunReferenceRow = {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  action_type: string | null;
  caliber: string | null;
  capacity: string | null;
  barrel_length: string | null;
  overall_length: string | null;
  weight: string | null;
  country: string | null;
  production_years: string | null;
  description: string | null;
  image_url: string | null;
  image_attribution: string | null;
  source: string;
  source_url: string | null;
  license: string | null;
};

function toNormalizedItem(row: GunReferenceRow): NormalizedItem {
  return {
    title: row.name,
    subtitle: row.manufacturer,
    imageUrl: row.image_url,
    backdropUrl: null,
    externalId: row.id,
    externalUrl: row.source_url,
    // Keys must match the Guns tracker's tracker_fields.key values exactly (see
    // supabase/migrations/20260917120000_add_guns_plants_trackers.sql). Personal fields
    // (date_acquired, serial_number) are deliberately absent here — createItem() only
    // ever writes the keys present in this object, so they're left for the user to fill in.
    fields: {
      manufacturer: row.manufacturer,
      action_type: row.action_type,
      caliber: row.caliber,
      capacity: row.capacity,
      barrel_length: row.barrel_length,
      overall_length: row.overall_length,
      weight: row.weight,
      country: row.country,
      production_years: row.production_years,
      description: row.description,
    },
    raw: row,
  };
}

export const gunReferenceProvider: EnrichmentProvider = {
  id: "gun_reference",
  label: "Gun Reference Database",

  async search(query): Promise<ProviderSearchResult[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_gun_reference", { q: query, max_results: 20 });
    if (error) throw new Error(`Gun reference search failed: ${error.message}`);
    return ((data ?? []) as GunReferenceRow[]).map((row) => ({
      externalId: row.id,
      title: row.name,
      subtitle: [row.manufacturer, row.caliber].filter(Boolean).join(" · ") || null,
      imageUrl: row.image_url,
      year: null,
    }));
  },

  async getDetails(externalId): Promise<NormalizedItem | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("gun_reference").select("*").eq("id", externalId).maybeSingle();
    if (error) throw new Error(`Gun reference lookup failed: ${error.message}`);
    return data ? toNormalizedItem(data as GunReferenceRow) : null;
  },
};
