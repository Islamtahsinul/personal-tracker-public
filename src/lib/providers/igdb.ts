import type { EnrichmentProvider, NormalizedItem, ProviderSearchResult } from "./types";
import { ProviderUnavailableError } from "./types";
import { timeoutSignal } from "./fetch-timeout";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const API_BASE = "https://api.igdb.com/v4";

let cachedToken: { token: string; expiresAt: number } | null = null;

function assertConfigured() {
  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET) {
    throw new ProviderUnavailableError("igdb", "IGDB_CLIENT_ID / IGDB_CLIENT_SECRET are not configured");
  }
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const params = new URLSearchParams({
    client_id: process.env.IGDB_CLIENT_ID!,
    client_secret: process.env.IGDB_CLIENT_SECRET!,
    grant_type: "client_credentials",
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`, { method: "POST", signal: timeoutSignal() });
  if (!res.ok) throw new Error(`Twitch OAuth token request failed (${res.status})`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

async function igdbQuery(endpoint: string, body: string) {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
    cache: "no-store",
    signal: timeoutSignal(),
  });
  if (res.status === 429) throw new Error("IGDB rate limit reached — try again shortly.");
  if (!res.ok) throw new Error(`IGDB request failed (${res.status})`);
  return res.json();
}

function coverUrl(imageId: string | undefined | null, size: string) {
  return imageId ? `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg` : null;
}

type IgdbGame = {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  cover?: { image_id: string };
  genres?: { name: string }[];
  platforms?: { name: string }[];
  involved_companies?: { developer: boolean; publisher: boolean; company: { name: string } }[];
  url?: string;
  total_rating?: number | null;
};

function unixToIso(seconds: number | undefined) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

export const igdbProvider: EnrichmentProvider = {
  id: "igdb",
  label: "IGDB (Games)",

  async search(query) {
    assertConfigured();
    const escaped = query.replace(/"/g, '\\"');
    const data: IgdbGame[] = await igdbQuery(
      "games",
      `search "${escaped}"; fields name,first_release_date,cover.image_id; where version_parent = null; limit 10;`,
    );
    const results: ProviderSearchResult[] = data.map((g) => ({
      externalId: String(g.id),
      title: g.name,
      subtitle: unixToIso(g.first_release_date)?.slice(0, 4) ?? null,
      imageUrl: coverUrl(g.cover?.image_id, "cover_small"),
      year: unixToIso(g.first_release_date)?.slice(0, 4) ?? null,
    }));
    return results;
  },

  async getDetails(externalId) {
    assertConfigured();
    const data: IgdbGame[] = await igdbQuery(
      "games",
      `fields name,summary,first_release_date,cover.image_id,genres.name,platforms.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,url,total_rating; where id = ${Number(externalId)};`,
    );
    const g = data[0];
    if (!g) return null;

    const developer = g.involved_companies?.find((c) => c.developer)?.company?.name ?? null;
    const publisher = g.involved_companies?.find((c) => c.publisher)?.company?.name ?? null;

    const item: NormalizedItem = {
      title: g.name,
      subtitle: unixToIso(g.first_release_date)?.slice(0, 4) ?? null,
      imageUrl: coverUrl(g.cover?.image_id, "cover_big"),
      backdropUrl: null,
      externalId: String(g.id),
      externalUrl: g.url ?? null,
      fields: {
        release_date: unixToIso(g.first_release_date),
        developer,
        publisher,
        platforms: g.platforms?.map((p) => p.name) ?? [],
        genres: g.genres?.map((gg) => gg.name) ?? [],
        description: g.summary || null,
        // IGDB's blended critic+user score, 0-100 — left as-is rather than rescaled to
        // avoid inventing a conversion; the field label makes the scale explicit.
        igdb_rating: g.total_rating != null ? Math.round(g.total_rating) : null,
      },
      raw: g,
    };
    return item;
  },
};
