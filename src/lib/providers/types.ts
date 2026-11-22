import type { TrackerCategory } from "@/lib/types/domain";

/** One candidate returned from a provider search, shown to the user to disambiguate before import. */
export type ProviderSearchResult = {
  externalId: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  year?: string | null;
};

/** Normalized, ready-to-save item data. `fields` keys must match the target tracker's `tracker_fields.key`. Any field this provider could not find is simply absent — never fabricated. */
export type NormalizedItem = {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  backdropUrl?: string | null;
  externalId: string;
  externalUrl?: string | null;
  fields: Record<string, unknown>;
  raw: unknown;
};

export interface EnrichmentProvider {
  id: string;
  label: string;
  search(query: string): Promise<ProviderSearchResult[]>;
  getDetails(externalId: string): Promise<NormalizedItem | null>;
}

export class ProviderUnavailableError extends Error {
  constructor(providerId: string, reason: string) {
    super(`Provider "${providerId}" is unavailable: ${reason}`);
    this.name = "ProviderUnavailableError";
  }
}

export type EnrichmentCategory = TrackerCategory;
