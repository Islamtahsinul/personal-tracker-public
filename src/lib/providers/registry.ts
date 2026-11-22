import type { EnrichmentCategory, EnrichmentProvider } from "./types";
import { tmdbMovieProvider, tmdbTvProvider } from "./tmdb";
import { igdbProvider } from "./igdb";
import { openLibraryProvider } from "./openlibrary";
import { wikidataCarProvider, wikidataMotorcycleProvider } from "./wikidata";
import { gunReferenceProvider } from "./gun-reference";
import { plantReferenceProvider } from "./plant-reference";

/**
 * The rest of the app only ever asks "give me the provider for this category" —
 * nothing outside this file knows that Movies means TMDB or Games means IGDB.
 * Swapping a provider later means changing one line here.
 */
const REGISTRY: Partial<Record<EnrichmentCategory, EnrichmentProvider>> = {
  movie: tmdbMovieProvider,
  tv: tmdbTvProvider,
  game: igdbProvider,
  book: openLibraryProvider,
  car: wikidataCarProvider,
  motorcycle: wikidataMotorcycleProvider,
  gun: gunReferenceProvider,
  plant: plantReferenceProvider,
};

export function getProviderForCategory(category: string): EnrichmentProvider | null {
  return REGISTRY[category as EnrichmentCategory] ?? null;
}
