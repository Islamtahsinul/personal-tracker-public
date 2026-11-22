import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Static checks against the migration SQL itself — the RLS/security properties this feature
 * depends on ("reference data is read-only to regular users", "no existing table's RLS changes")
 * can't be exercised end-to-end without a second live test account (which this project
 * deliberately doesn't create), so this asserts the actual applied migration text has the
 * shape it's supposed to.
 */
const REFERENCE_MIGRATION = "20260917130000_add_reference_databases.sql";
const TRACKER_MIGRATION = "20260917120000_add_guns_plants_trackers.sql";

let referenceSql: string;
let trackerSql: string;

beforeAll(() => {
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  referenceSql = readFileSync(path.join(migrationsDir, REFERENCE_MIGRATION), "utf-8");
  trackerSql = readFileSync(path.join(migrationsDir, TRACKER_MIGRATION), "utf-8");
});

describe("gun_reference / plant_reference RLS", () => {
  it("enables row level security on both reference tables", () => {
    expect(referenceSql).toMatch(/alter table gun_reference enable row level security/i);
    expect(referenceSql).toMatch(/alter table plant_reference enable row level security/i);
  });

  it("grants authenticated users read access", () => {
    expect(referenceSql).toMatch(/create policy "gun_reference_read_authenticated" on gun_reference for select/i);
    expect(referenceSql).toMatch(/create policy "plant_reference_read_authenticated" on plant_reference for select/i);
  });

  it("defines no insert/update/delete/all policy for either table — regular users must not be able to write reference data", () => {
    const writePolicy = /create policy "[^"]*"\s+on\s+(gun_reference|plant_reference)\s+for\s+(insert|update|delete|all)/i;
    expect(writePolicy.test(referenceSql)).toBe(false);
  });

  it("does not touch any pre-existing table's RLS (trackers/items/etc. from the init migration)", () => {
    expect(referenceSql).not.toMatch(/alter table (trackers|items|item_field_values|tracker_statuses|tracker_fields) /i);
  });
});

describe("reference provider field keys vs. the real tracker schema", () => {
  function fieldKeys(sql: string, trackerSlug: string): string[] {
    const trackerBlock = sql.split(`"slug": "${trackerSlug}"`)[1]?.split(/"slug":/)[0] ?? "";
    // "key" appears in both this tracker's "statuses" and "fields" arrays — only the latter
    // are candidates for a reference-table column, so isolate that sub-block first.
    const fieldsBlock = trackerBlock.split(/"fields":\s*\[/)[1] ?? "";
    return [...fieldsBlock.matchAll(/"key":\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
  }

  it("every non-personal Guns tracker field has a corresponding gun_reference column", () => {
    const keys = fieldKeys(trackerSql, "guns");
    const personalKeys = ["date_acquired", "serial_number"];
    const referenceColumns = referenceSql.match(/create table gun_reference \(([\s\S]*?)\);/i)?.[1] ?? "";
    for (const key of keys.filter((k) => !personalKeys.includes(k))) {
      expect(referenceColumns).toMatch(new RegExp(`\\b${key}\\s+text`));
    }
  });

  it("every non-personal Plants tracker field has a corresponding plant_reference column", () => {
    const keys = fieldKeys(trackerSql, "plants");
    const personalKeys = ["date_found", "location_found"];
    const referenceColumns = referenceSql.match(/create table plant_reference \(([\s\S]*?)\);/i)?.[1] ?? "";
    for (const key of keys.filter((k) => !personalKeys.includes(k))) {
      expect(referenceColumns).toMatch(new RegExp(`\\b${key}\\s+text`));
    }
  });
});
