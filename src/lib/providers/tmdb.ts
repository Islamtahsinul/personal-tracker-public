import type { EnrichmentProvider, NormalizedItem, ProviderSearchResult } from "./types";
import { ProviderUnavailableError } from "./types";
import { timeoutSignal } from "./fetch-timeout";

const API_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

function assertConfigured() {
  if (!process.env.TMDB_API_KEY) {
    throw new ProviderUnavailableError("tmdb", "TMDB_API_KEY is not configured");
  }
}

async function tmdbFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      accept: "application/json",
    },
    // TMDB data changes rarely enough that a short cache is fine and keeps us well under rate limits.
    next: { revalidate: 60 * 60 },
    signal: timeoutSignal(),
  });
  if (res.status === 429) {
    throw new Error("TMDB rate limit reached — try again shortly.");
  }
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status})`);
  }
  return res.json();
}

function img(path: string | null | undefined, size: string) {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  genres?: { name: string }[];
  runtime?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  credits?: { crew?: { job: string; name: string }[]; cast?: { name: string }[] };
};

type TmdbTv = {
  id: number;
  name: string;
  first_air_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  genres?: { name: string }[];
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  created_by?: { name: string }[];
};

/** TMDB reports 0 for both "genuinely rated zero" and "not yet rated" — vote_count
 * is the only way to tell them apart, so an unrated title is left blank rather
 * than shown as a 0/10. */
function ratingOf(voteAverage: number | null | undefined, voteCount: number | null | undefined) {
  if (!voteAverage || !voteCount) return null;
  return Math.round(voteAverage * 10) / 10;
}

export const tmdbMovieProvider: EnrichmentProvider = {
  id: "tmdb_movie",
  label: "TMDB (Movies)",

  async search(query) {
    assertConfigured();
    const data = await tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&include_adult=false`);
    const results: ProviderSearchResult[] = (data.results ?? [])
      .slice(0, 8)
      .map((m: TmdbMovie) => ({
        externalId: String(m.id),
        title: m.title,
        subtitle: m.release_date ? m.release_date.slice(0, 4) : null,
        imageUrl: img(m.poster_path, "w342"),
        year: m.release_date ? m.release_date.slice(0, 4) : null,
      }));
    return results;
  },

  async getDetails(externalId) {
    assertConfigured();
    const m: TmdbMovie = await tmdbFetch(`/movie/${externalId}?append_to_response=credits`);
    if (!m?.id) return null;
    const director = m.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
    const cast = m.credits?.cast?.slice(0, 8).map((c) => c.name).join(", ") || null;

    const item: NormalizedItem = {
      title: m.title,
      subtitle: m.release_date ? m.release_date.slice(0, 4) : null,
      imageUrl: img(m.poster_path, "w500"),
      backdropUrl: img(m.backdrop_path, "w1280"),
      externalId: String(m.id),
      externalUrl: `https://www.themoviedb.org/movie/${m.id}`,
      fields: {
        release_date: m.release_date || null,
        director,
        cast,
        genres: m.genres?.map((g) => g.name) ?? [],
        runtime_minutes: m.runtime ?? null,
        description: m.overview || null,
        tmdb_rating: ratingOf(m.vote_average, m.vote_count),
      },
      raw: m,
    };
    return item;
  },
};

export const tmdbTvProvider: EnrichmentProvider = {
  id: "tmdb_tv",
  label: "TMDB (TV)",

  async search(query) {
    assertConfigured();
    const data = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}&include_adult=false`);
    const results: ProviderSearchResult[] = (data.results ?? [])
      .slice(0, 8)
      .map((t: TmdbTv) => ({
        externalId: String(t.id),
        title: t.name,
        subtitle: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
        imageUrl: img(t.poster_path, "w342"),
        year: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
      }));
    return results;
  },

  async getDetails(externalId) {
    assertConfigured();
    const t: TmdbTv = await tmdbFetch(`/tv/${externalId}`);
    if (!t?.id) return null;

    const item: NormalizedItem = {
      title: t.name,
      subtitle: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
      imageUrl: img(t.poster_path, "w500"),
      backdropUrl: img(t.backdrop_path, "w1280"),
      externalId: String(t.id),
      externalUrl: `https://www.themoviedb.org/tv/${t.id}`,
      fields: {
        first_air_date: t.first_air_date || null,
        creator: t.created_by?.map((c) => c.name).join(", ") || null,
        genres: t.genres?.map((g) => g.name) ?? [],
        seasons: t.number_of_seasons ?? null,
        episodes: t.number_of_episodes ?? null,
        description: t.overview || null,
        tmdb_rating: ratingOf(t.vote_average, t.vote_count),
      },
      raw: t,
    };
    return item;
  },
};
