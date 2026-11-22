import { describe, it, expect } from "vitest";
import { getProviderForCategory } from "./registry";
import { gunReferenceProvider } from "./gun-reference";
import { plantReferenceProvider } from "./plant-reference";

describe("getProviderForCategory", () => {
  it("wires the gun category to the reference-database provider", () => {
    expect(getProviderForCategory("gun")).toBe(gunReferenceProvider);
  });

  it("wires the plant category to the reference-database provider", () => {
    expect(getProviderForCategory("plant")).toBe(plantReferenceProvider);
  });

  it("still returns null for generic/unregistered categories (manual entry only) — adding gun/plant must not change this", () => {
    expect(getProviderForCategory("generic")).toBeNull();
    expect(getProviderForCategory("some-made-up-category")).toBeNull();
  });

  it("leaves every pre-existing category's provider untouched", () => {
    expect(getProviderForCategory("movie")).not.toBeNull();
    expect(getProviderForCategory("tv")).not.toBeNull();
    expect(getProviderForCategory("game")).not.toBeNull();
    expect(getProviderForCategory("book")).not.toBeNull();
    expect(getProviderForCategory("car")).not.toBeNull();
    expect(getProviderForCategory("motorcycle")).not.toBeNull();
  });
});
