import type { EnrichmentProvider, NormalizedItem, ProviderSearchResult } from "./types";
import { createClient } from "@/lib/supabase/server";

/**
 * Backs the Plants (Foraging) tracker's "search then add" flow with the
 * app's own plant_reference table (see
 * scripts/reference-data/import-reference-data.mjs for sourcing — Wikidata
 * + Wikipedia). Edibility/toxicity are never auto-filled by the importer
 * (no source checked carries a verified structured field for them), so
 * those columns are typically null here too — surfaced as-is, never
 * invented at this layer either.
 */
type PlantReferenceRow = {
  id: string;
  common_name: string;
  other_common_names: string[] | null;
  scientific_name: string | null;
  family: string | null;
  habitat: string | null;
  season: string | null;
  identification_notes: string | null;
  description: string | null;
  edibility: string | null;
  toxicity_notes: string | null;
  safety_caveat: string;
  image_url: string | null;
  image_attribution: string | null;
  source: string;
  source_url: string | null;
  license: string | null;
};

function toNormalizedItem(row: PlantReferenceRow): NormalizedItem {
  const description = [row.description, row.toxicity_notes ? `Toxicity notes: ${row.toxicity_notes}` : null, row.safety_caveat]
    .filter(Boolean)
    .join("\n\n");
  return {
    title: row.common_name,
    subtitle: row.scientific_name,
    imageUrl: row.image_url,
    backdropUrl: null,
    externalId: row.id,
    externalUrl: row.source_url,
    // Keys must match the Plants tracker's tracker_fields.key values exactly (see
    // supabase/migrations/20260917120000_add_guns_plants_trackers.sql). Personal fields
    // (date_found, location_found) are deliberately absent — createItem() only writes the
    // keys present here, so they're left for the user to fill in.
    fields: {
      scientific_name: row.scientific_name,
      family: row.family,
      habitat: row.habitat,
      season: row.season,
      edibility: row.edibility,
      identification_notes: row.identification_notes,
      description,
    },
    raw: row,
  };
}

export const plantReferenceProvider: EnrichmentProvider = {
  id: "plant_reference",
  label: "Plant Reference Database",

  async search(query): Promise<ProviderSearchResult[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_plant_reference", { q: query, max_results: 20 });
    if (error) throw new Error(`Plant reference search failed: ${error.message}`);
    return ((data ?? []) as PlantReferenceRow[]).map((row) => ({
      externalId: row.id,
      title: row.common_name,
      subtitle: row.scientific_name ?? row.family ?? null,
      imageUrl: row.image_url,
      year: null,
    }));
  },

  async getDetails(externalId): Promise<NormalizedItem | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("plant_reference").select("*").eq("id", externalId).maybeSingle();
    if (error) throw new Error(`Plant reference lookup failed: ${error.message}`);
    return data ? toNormalizedItem(data as PlantReferenceRow) : null;
  },
};
