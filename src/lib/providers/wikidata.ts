import type { EnrichmentProvider, NormalizedItem, ProviderSearchResult } from "./types";
import { timeoutSignal } from "./fetch-timeout";

const WD_API = "https://www.wikidata.org/w/api.php";
const UA = "PersonalTracker/1.0 (personal use)";

// IMPORTANT: these property IDs were verified against live Wikidata entities
// (e.g. Q463627 "Ferrari F40") before shipping, not guessed. Verification
// found Wikidata does NOT reliably model enthusiast specs — engine, power,
// torque, top speed, transmission, production years are absent on most
// vehicle-model items (that data usually lives only in Wikipedia's
// prose/infobox, which isn't practical to parse reliably for V1). So this
// provider only fills what's actually structured: manufacturer, country
// (via the manufacturer's own country claim), image, and a description
// pulled from the linked Wikipedia article. Every other spec field is left
// blank for the user to fill in — never fabricated.
const P_MANUFACTURER = "P176";
const P_COUNTRY = "P17";

type WdEntity = {
  id: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, { mainsnak: { datavalue?: { value: unknown } } }[]>;
  sitelinks?: Record<string, { title: string }>;
};

async function wdFetch(params: Record<string, string>) {
  const url = `${WD_API}?${new URLSearchParams({ format: "json", ...params }).toString()}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 3600 }, signal: timeoutSignal() });
  if (!res.ok) throw new Error(`Wikidata request failed (${res.status})`);
  return res.json();
}

function entityIdOf(entity: WdEntity, prop: string): string | null {
  const claim = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value as
    | { id?: string }
    | undefined;
  return claim?.id ?? null;
}

async function getEntity(id: string): Promise<WdEntity | null> {
  const data = await wdFetch({
    action: "wbgetentities",
    ids: id,
    props: "labels|claims|sitelinks",
    languages: "en",
    sitefilter: "enwiki",
  });
  return data.entities?.[id] ?? null;
}

async function getLabel(id: string): Promise<string | null> {
  const data = await wdFetch({ action: "wbgetentities", ids: id, props: "labels", languages: "en" });
  return data.entities?.[id]?.labels?.en?.value ?? null;
}

async function getWikipediaSummary(title: string): Promise<{ extract: string | null; image: string | null }> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
      signal: timeoutSignal(),
    });
    if (!res.ok) return { extract: null, image: null };
    const data = await res.json();
    return {
      extract: data.extract ?? null,
      image: data.originalimage?.source ?? data.thumbnail?.source ?? null,
    };
  } catch {
    return { extract: null, image: null };
  }
}

function makeProvider(id: string, label: string, instanceOfDescription: string): EnrichmentProvider {
  return {
    id,
    label,

    async search(query) {
      const data = await wdFetch({
        action: "wbsearchentities",
        search: query,
        language: "en",
        type: "item",
        limit: "10",
      });
      const results: ProviderSearchResult[] = (data.search ?? []).map(
        (s: { id: string; label: string; description?: string }) => ({
          externalId: s.id,
          title: s.label,
          subtitle: s.description ?? instanceOfDescription,
          imageUrl: null,
          year: null,
        }),
      );
      return results;
    },

    async getDetails(externalId) {
      const entity = await getEntity(externalId);
      if (!entity) return null;

      const title = entity.labels?.en?.value ?? externalId;
      const manufacturerId = entityIdOf(entity, P_MANUFACTURER);

      // getEntity() already fetches labels, so reuse that response for the manufacturer's
      // name instead of a second round-trip via getLabel().
      let manufacturer: string | null = null;
      let country: string | null = null;
      if (manufacturerId) {
        const manufacturerEntity = await getEntity(manufacturerId);
        manufacturer = manufacturerEntity?.labels?.en?.value ?? null;
        const countryId = manufacturerEntity ? entityIdOf(manufacturerEntity, P_COUNTRY) : null;
        country = countryId ? await getLabel(countryId) : null;
      }

      const enwikiTitle = entity.sitelinks?.enwiki?.title ?? null;
      const { extract, image } = enwikiTitle
        ? await getWikipediaSummary(enwikiTitle)
        : { extract: null, image: null };

      const item: NormalizedItem = {
        title,
        subtitle: manufacturer,
        imageUrl: image,
        backdropUrl: null,
        externalId,
        externalUrl: `https://www.wikidata.org/wiki/${externalId}`,
        fields: {
          manufacturer,
          country,
          description: extract,
        },
        raw: entity,
      };
      return item;
    },
  };
}

export const wikidataCarProvider = makeProvider("wikidata_car", "Wikidata (Cars)", "car model");
export const wikidataMotorcycleProvider = makeProvider(
  "wikidata_motorcycle",
  "Wikidata (Motorcycles)",
  "motorcycle model",
);
