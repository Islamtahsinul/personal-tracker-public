import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: rpcMock, from: fromMock })),
}));

const { plantReferenceProvider } = await import("./plant-reference");

const FULL_ROW = {
  id: "row-1",
  common_name: "Stinging nettle",
  other_common_names: null,
  scientific_name: "Urtica dioica",
  family: "Urticaceae",
  habitat: "Woodland, hedgerows, riverbanks",
  season: null,
  identification_notes: null,
  description: "A herbaceous perennial flowering plant.",
  edibility: null,
  toxicity_notes: null,
  safety_caveat: "Always verify identification and edibility against multiple authoritative field guides before consuming any foraged plant.",
  image_url: "https://example.com/nettle.jpg",
  image_attribution: "Example, CC BY-SA 3.0",
  source: "Wikidata (Q155909) + Wikipedia",
  source_url: "https://en.wikipedia.org/wiki/Urtica_dioica",
  license: "CC0 / CC BY-SA 4.0",
};

describe("plantReferenceProvider.search", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it("calls the search_plant_reference RPC and maps rows to search results", async () => {
    rpcMock.mockResolvedValue({ data: [FULL_ROW], error: null });

    const results = await plantReferenceProvider.search("nettle");

    expect(rpcMock).toHaveBeenCalledWith("search_plant_reference", { q: "nettle", max_results: 20 });
    expect(results).toEqual([
      { externalId: "row-1", title: "Stinging nettle", subtitle: "Urtica dioica", imageUrl: "https://example.com/nettle.jpg", year: null },
    ]);
  });

  it("returns an empty array for a query with no matches", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const results = await plantReferenceProvider.search("not-a-real-plant-zzz");

    expect(results).toEqual([]);
  });

  it("falls back subtitle to family when scientific_name is unavailable, rather than fabricating one", async () => {
    rpcMock.mockResolvedValue({ data: [{ ...FULL_ROW, scientific_name: null }], error: null });

    const [result] = await plantReferenceProvider.search("x");

    expect(result.subtitle).toBe("Urticaceae");
  });

  it("throws a descriptive error when the RPC call fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "timeout" } });

    await expect(plantReferenceProvider.search("x")).rejects.toThrow(/Plant reference search failed/);
  });
});

describe("plantReferenceProvider.getDetails", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  function mockRowLookup(data: unknown) {
    const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    fromMock.mockReturnValue({ select });
  }

  it("maps taxonomy/description fields and always appends the safety caveat to the description", async () => {
    mockRowLookup(FULL_ROW);

    const item = await plantReferenceProvider.getDetails("row-1");

    expect(item?.fields.scientific_name).toBe("Urtica dioica");
    expect(item?.fields.family).toBe("Urticaceae");
    expect(item?.fields.description).toContain("herbaceous perennial");
    expect(item?.fields.description).toContain("Always verify identification and edibility");
  });

  it("SAFETY: never fabricates an edibility verdict — null in the source stays null, it is not defaulted to a value", async () => {
    mockRowLookup(FULL_ROW);

    const item = await plantReferenceProvider.getDetails("row-1");

    expect(item?.fields.edibility).toBeNull();
  });

  it("never includes the Plants tracker's personal-only fields (date_found, location_found)", async () => {
    mockRowLookup(FULL_ROW);

    const item = await plantReferenceProvider.getDetails("row-1");

    expect(item?.fields).not.toHaveProperty("date_found");
    expect(item?.fields).not.toHaveProperty("location_found");
  });

  it("returns null (not an error) when the id doesn't match any reference row", async () => {
    mockRowLookup(null);

    const item = await plantReferenceProvider.getDetails("does-not-exist");

    expect(item).toBeNull();
  });
});
