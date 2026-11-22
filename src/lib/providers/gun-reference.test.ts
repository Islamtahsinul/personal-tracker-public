import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: rpcMock, from: fromMock })),
}));

const { gunReferenceProvider } = await import("./gun-reference");

const FULL_ROW = {
  id: "row-1",
  name: "Glock 17",
  manufacturer: "Glock Ges.m.b.H.",
  model: null,
  action_type: null,
  caliber: "9x19mm",
  capacity: null,
  barrel_length: null,
  overall_length: null,
  weight: "710 g",
  country: "Austria",
  production_years: "1980",
  description: "A polymer-framed pistol.",
  image_url: "https://example.com/glock.jpg",
  image_attribution: "Example, CC BY-SA",
  source: "Wikidata (Q172172) + Wikipedia",
  source_url: "https://en.wikipedia.org/wiki/Glock_17",
  license: "CC0 / CC BY-SA 4.0",
};

describe("gunReferenceProvider.search", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it("calls the search_gun_reference RPC with the trimmed query and maps rows to search results", async () => {
    rpcMock.mockResolvedValue({ data: [FULL_ROW], error: null });

    const results = await gunReferenceProvider.search("glock 17");

    expect(rpcMock).toHaveBeenCalledWith("search_gun_reference", { q: "glock 17", max_results: 20 });
    expect(results).toEqual([
      { externalId: "row-1", title: "Glock 17", subtitle: "Glock Ges.m.b.H. · 9x19mm", imageUrl: "https://example.com/glock.jpg", year: null },
    ]);
  });

  it("returns an empty array for a query with no matches, not an error", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const results = await gunReferenceProvider.search("nonexistent-firearm-xyz");

    expect(results).toEqual([]);
  });

  it("still returns a result when manufacturer/caliber are both null (no subtitle fabricated)", async () => {
    rpcMock.mockResolvedValue({ data: [{ ...FULL_ROW, manufacturer: null, caliber: null }], error: null });

    const [result] = await gunReferenceProvider.search("x");

    expect(result.subtitle).toBeNull();
  });

  it("throws a descriptive error when the RPC call itself fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection reset" } });

    await expect(gunReferenceProvider.search("x")).rejects.toThrow(/Gun reference search failed/);
  });
});

describe("gunReferenceProvider.getDetails", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  function mockRowLookup(data: unknown) {
    const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    fromMock.mockReturnValue({ select });
    return { select, eq, maybeSingle };
  }

  it("maps every catalog field, never fabricating a value the source didn't supply", async () => {
    mockRowLookup(FULL_ROW);

    const item = await gunReferenceProvider.getDetails("row-1");

    expect(item?.fields).toMatchObject({
      manufacturer: "Glock Ges.m.b.H.",
      caliber: "9x19mm",
      weight: "710 g",
      country: "Austria",
      production_years: "1980",
      description: "A polymer-framed pistol.",
    });
    // Absent-in-source fields stay null rather than being defaulted to "" or silently dropped.
    expect(item?.fields.action_type).toBeNull();
  });

  it("never includes the Guns tracker's personal-only fields (date_acquired, serial_number)", async () => {
    mockRowLookup(FULL_ROW);

    const item = await gunReferenceProvider.getDetails("row-1");

    expect(item?.fields).not.toHaveProperty("date_acquired");
    expect(item?.fields).not.toHaveProperty("serial_number");
  });

  it("returns null (not an error) when the id doesn't match any reference row", async () => {
    mockRowLookup(null);

    const item = await gunReferenceProvider.getDetails("does-not-exist");

    expect(item).toBeNull();
  });
});
