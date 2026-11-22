import type { EnrichmentProvider, NormalizedItem, ProviderSearchResult } from "./types";
import { timeoutSignal } from "./fetch-timeout";

const SEARCH_URL = "https://openlibrary.org/search.json";
const COVERS_BASE = "https://covers.openlibrary.org/b/id";

type OpenLibraryDoc = {
  key: string; // "/works/OL...W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  subject?: string[];
  ratings_average?: number | null;
};

type OpenLibraryWork = {
  description?: string | { value: string };
  subjects?: string[];
};

function coverUrl(coverId: number | undefined, size: "S" | "M" | "L") {
  return coverId ? `${COVERS_BASE}/${coverId}-${size}.jpg` : null;
}

// Open Library needs no API key or auth (see PROJECT.md provider research); it's used as the
// primary/only books provider for V1.
export const openLibraryProvider: EnrichmentProvider = {
  id: "openlibrary",
  label: "Open Library",

  async search(query) {
    const params = new URLSearchParams({
      q: query,
      fields: "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject,ratings_average",
      limit: "10",
    });
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, { next: { revalidate: 3600 }, signal: timeoutSignal() });
    if (res.status === 429) throw new Error("Open Library rate limit reached — try again shortly.");
    if (!res.ok) throw new Error(`Open Library request failed (${res.status})`);
    const data = await res.json();
    const docs: OpenLibraryDoc[] = data.docs ?? [];

    const results: ProviderSearchResult[] = docs.slice(0, 8).map((d) => ({
      externalId: d.key.replace("/works/", ""),
      title: d.title,
      subtitle: d.author_name?.[0] ?? null,
      imageUrl: coverUrl(d.cover_i, "M"),
      year: d.first_publish_year ? String(d.first_publish_year) : null,
    }));
    return results;
  },

  async getDetails(externalId) {
    const searchRes = await fetch(
      `${SEARCH_URL}?${new URLSearchParams({
        q: `key:/works/${externalId}`,
        fields: "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject,ratings_average",
        limit: "1",
      }).toString()}`,
      { signal: timeoutSignal() },
    );
    if (!searchRes.ok) throw new Error(`Open Library request failed (${searchRes.status})`);
    const searchData = await searchRes.json();
    const doc: OpenLibraryDoc | undefined = searchData.docs?.[0];
    if (!doc) return null;

    let description: string | null = null;
    try {
      const workRes = await fetch(`https://openlibrary.org/works/${externalId}.json`, { signal: timeoutSignal() });
      if (workRes.ok) {
        const work: OpenLibraryWork = await workRes.json();
        description = typeof work.description === "string" ? work.description : work.description?.value ?? null;
      }
    } catch {
      // Description is a nice-to-have; leave it blank rather than fail the whole import.
    }

    const item: NormalizedItem = {
      title: doc.title,
      subtitle: doc.author_name?.[0] ?? null,
      imageUrl: coverUrl(doc.cover_i, "L"),
      backdropUrl: null,
      externalId,
      externalUrl: `https://openlibrary.org/works/${externalId}`,
      fields: {
        author: doc.author_name?.join(", ") || null,
        first_published: doc.first_publish_year ? `${doc.first_publish_year}-01-01` : null,
        page_count: doc.number_of_pages_median ?? null,
        subjects: doc.subject?.slice(0, 10) ?? [],
        description,
        rating_average: doc.ratings_average != null ? Math.round(doc.ratings_average * 10) / 10 : null,
      },
      raw: doc,
    };
    return item;
  },
};
