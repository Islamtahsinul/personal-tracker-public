// Reusable importer for the gun_reference / plant_reference tables.
//
// Pulls real, sourced data from Wikidata (structured claims, CC0) and
// Wikipedia (infobox wikitext + summary extract, CC BY-SA — attribution
// required) for a list of seed names. Never invents a value: any field
// absent from both sources is left null. Prints progress + the resolved
// title for each seed so a human can sanity-check matches before the
// generated SQL is applied.
//
// Usage:
//   node scripts/reference-data/import-reference-data.mjs guns   > out-guns.sql
//   node scripts/reference-data/import-reference-data.mjs plants > out-plants.sql
//
// To add more entries later: add names to GUN_SEEDS / PLANT_SEEDS below and
// re-run — already-imported rows are not deduplicated by this script, so
// check the output (or re-import into a temp table) before applying if
// re-running against an existing dataset. A plant seed can be a plain string
// (used as both the search term and the stored common_name) or
// { name, searchTerm } when the common name itself is too ambiguous to
// search reliably (e.g. "Hawthorn" also names a Melbourne suburb) — in that
// case searchTerm (e.g. a scientific name) is only used to find the right
// Wikidata entity, while `name` is still what's stored as common_name.

const UA = "PersonalTracker-ReferenceImporter/1.0 (personal, non-commercial use)";
const WD_API = "https://www.wikidata.org/w/api.php";

const GUN_SEEDS = ["Glock 17", "AK-47", "AR-15", "Beretta 92", "Remington 700", "M1911 pistol"];
const PLANT_SEEDS = ["Stinging nettle", "Dandelion", { name: "Elder", searchTerm: "Sambucus nigra" }, "Wild garlic", "Hawthorn"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wikidata/Wikimedia ask polite clients to throttle themselves rather than hammer the API; a
 * fixed inter-request delay plus retry-with-backoff on 429 is that politeness, not a workaround. */
async function politeFetch(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(350);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 2 * (attempt + 1);
      console.error(`  (429 rate-limited, waiting ${retryAfter}s...)`);
      await sleep(retryAfter * 1000);
      continue;
    }
    return res;
  }
  throw new Error(`Gave up after repeated 429s for ${url}`);
}

async function wdFetch(params) {
  const url = `${WD_API}?${new URLSearchParams({ format: "json", ...params }).toString()}`;
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`Wikidata request failed (${res.status}) for ${url}`);
  return res.json();
}

async function searchEntity(name) {
  const data = await wdFetch({ action: "wbsearchentities", search: name, language: "en", type: "item", limit: "1" });
  return data.search?.[0] ?? null;
}

/** A bare common name like "Hawthorn" collides with unrelated Wikidata items (there's a Melbourne
 * suburb called Hawthorn) — the top wbsearchentities hit is not necessarily the plant. This checks
 * the top 5 candidates in rank order and returns the first one that is actually a taxon (has a
 * scientific name claim, P225), rather than trusting rank alone. Logs a warning and falls back to
 * the top hit if none of the 5 look like a taxon, so a wrong match is at least visible, not silent. */
async function searchPlantEntity(name) {
  const data = await wdFetch({ action: "wbsearchentities", search: name, language: "en", type: "item", limit: "5" });
  const candidates = data.search ?? [];
  for (const hit of candidates) {
    const entity = await getEntity(hit.id);
    if (entity && claimString(entity, "P225")) return { hit, entity };
  }
  if (candidates.length === 0) return null;
  console.error(`  [WARN] none of the top ${candidates.length} candidates for "${name}" have a scientific-name claim; using top hit anyway — verify manually`);
  return { hit: candidates[0], entity: await getEntity(candidates[0].id) };
}

/** Walks the P171 (parent taxon) chain looking for the ancestor at family rank, rather than
 * assuming the immediate parent is the family — Wikidata's immediate parent of a genus is often
 * a tribe (a rank between genus and family), not the family itself. */
async function resolveFamily(entity) {
  let current = entity;
  for (let hop = 0; hop < 6 && current; hop++) {
    const rankId = claimEntityId(current, "P105");
    if (rankId) {
      const rankLabel = await resolveLabel(rankId);
      if (rankLabel && rankLabel.toLowerCase() === "family") {
        return current.labels?.en?.value ?? null;
      }
    }
    const parentId = claimEntityId(current, "P171");
    current = parentId ? await getEntity(parentId) : null;
  }
  return null;
}

async function getEntity(id) {
  const data = await wdFetch({ action: "wbgetentities", ids: id, props: "labels|claims|sitelinks", languages: "en", sitefilter: "enwiki" });
  return data.entities?.[id] ?? null;
}

function claimEntityId(entity, prop) {
  const v = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  return v && typeof v === "object" && "id" in v ? v.id : null;
}
const UNIT_ABBREV = { kilogram: "kg", gram: "g", millimetre: "mm", centimetre: "cm", metre: "m", inch: "in" };

/** Resolves a Wikidata quantity claim (e.g. mass) to "<amount> <unit>" text. Never assumes the
 * unit — Wikidata mass claims for firearms are sometimes grams, sometimes kilograms, and
 * guessing wrong (e.g. reporting a pistol's mass in grams as if it were kilograms) would be
 * worse than leaving the field blank, so the unit's own label is resolved via the API rather
 * than hardcoded. */
async function claimQuantity(entity, prop) {
  const v = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  if (!v || typeof v !== "object" || !("amount" in v)) return null;
  const amount = v.amount.replace(/^\+/, "");
  const unitId = typeof v.unit === "string" ? v.unit.split("/").pop() : null;
  if (!unitId || unitId === "1") return amount; // "1" means unitless
  const unitLabel = await resolveLabel(unitId);
  const abbrev = unitLabel ? UNIT_ABBREV[unitLabel.toLowerCase()] ?? unitLabel : null;
  return abbrev ? `${amount} ${abbrev}` : amount;
}
function claimTime(entity, prop) {
  const v = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  if (!v || typeof v !== "object" || !("time" in v)) return null;
  const m = /^\+?(-?\d+)-\d\d-\d\d/.exec(v.time);
  return m ? m[1] : null;
}
function claimString(entity, prop) {
  const v = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  return typeof v === "string" ? v : null;
}

async function resolveLabel(id) {
  const data = await wdFetch({ action: "wbgetentities", ids: id, props: "labels", languages: "en" });
  return data.entities?.[id]?.labels?.en?.value ?? null;
}

async function getWikitext(title) {
  const url = `${WD_API.replace("www.wikidata.org", "en.wikipedia.org")}?${new URLSearchParams({
    format: "json",
    action: "parse",
    page: title,
    prop: "wikitext",
    section: "0",
  }).toString()}`;
  const res = await politeFetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.parse?.wikitext?.["*"] ?? null;
}

async function getSummary(title) {
  try {
    const res = await politeFetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.extract ?? null;
  } catch {
    return null;
  }
}

/** Extracts the raw (still wiki-markup'd) value of `|param = ...` from an infobox, scanning
 * brace/bracket depth so a value containing `{{convert|880|mm|in}}`-style templates (which
 * contain their own `|`) isn't truncated at the template's internal pipe. Stops at the first
 * depth-0 newline unless the next line is a `*` bullet continuation (common for multi-value
 * fields like a pistol's list of chamberings). Returns null (never a best-guess) if not found. */
function rawInfoboxParam(wikitext, param) {
  if (!wikitext) return null;
  const startRe = new RegExp(`\\|\\s*${param}\\s*=`, "i");
  const startMatch = startRe.exec(wikitext);
  if (!startMatch) return null;

  let i = startMatch.index + startMatch[0].length;
  let depth = 0;
  let value = "";
  while (i < wikitext.length) {
    const two = wikitext.slice(i, i + 2);
    if (two === "{{" || two === "[[") {
      depth++;
      value += two;
      i += 2;
      continue;
    }
    if (two === "}}" || two === "]]") {
      depth = Math.max(0, depth - 1);
      value += two;
      i += 2;
      continue;
    }
    const ch = wikitext[i];
    if (ch === "\n" && depth === 0) {
      const rest = wikitext.slice(i + 1);
      const nextLine = /^\s*(\*[^\n]*)/.exec(rest);
      if (nextLine) {
        value += "\n" + nextLine[1];
        i += 1 + nextLine[0].length;
        continue;
      }
      break;
    }
    if (ch === "|" && depth === 0) break; // next infobox param
    value += ch;
    i++;
  }
  return value.trim() || null;
}

/** Resolves the handful of citation/measurement templates that actually show up in firearm/plant
 * infoboxes into plain text, then strips wiki markup. Anything left inside an unresolved
 * template is a citation, not content, so it's dropped rather than guessed at. */
function cleanWikitext(raw) {
  if (!raw) return null;
  let val = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    // {{convert|880|mm|in|abbr=on}} -> "880 mm"; {{cvt|...}} is the same template's alias.
    .replace(/\{\{\s*(?:convert|cvt)\s*\|\s*([^|{}]+?)\s*\|\s*([^|{}]+?)(?:\|[^{}]*)?\}\}/gi, "$1 $2");
  // Anything still wrapped in {{...}} at this point is a template we don't special-case
  // (usually a citation) — drop templates from the inside out so nested ones fully resolve.
  let prev;
  do {
    prev = val;
    val = val.replace(/\{\{[^{}]*\}\}/g, "");
  } while (val !== prev);
  val = val
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<br\s*\/?>/gi, "; ")
    .replace(/^\*\s*/gm, "")
    .replace(/\n+/g, "; ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .replace(/^[;\s]+|[;\s]+$/g, "")
    .trim();
  return val || null;
}

/** Pulls `|param = value` out of the first infobox in wikitext, resolved to plain text. Returns
 * null if the param isn't present in the page at all — never a guessed/fabricated value. */
function infoboxParam(wikitext, param) {
  return cleanWikitext(rawInfoboxParam(wikitext, param));
}

async function commonsImage(entity) {
  const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!filename || typeof filename !== "string") return { imageUrl: null, attribution: null };
  const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
  try {
    const res = await politeFetch(
      `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
        format: "json",
        action: "query",
        titles: `File:${filename}`,
        prop: "imageinfo",
        iiprop: "extmetadata",
      }).toString()}`,
    );
    const data = await res.json();
    const page = Object.values(data.query?.pages ?? {})[0];
    const meta = page?.imageinfo?.[0]?.extmetadata;
    const artist = meta?.Artist?.value?.replace(/<[^>]*>/g, "").trim();
    const license = meta?.LicenseShortName?.value;
    const attribution = [artist, license].filter(Boolean).join(", ") || "Wikimedia Commons";
    return { imageUrl, attribution: `${attribution} — via Wikimedia Commons (${filename})` };
  } catch {
    return { imageUrl, attribution: `Wikimedia Commons (${filename})` };
  }
}

function sqlStr(v) {
  return v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`;
}

async function importGun(name) {
  const hit = await searchEntity(name);
  if (!hit) {
    console.error(`  [SKIP] no Wikidata entity found for "${name}"`);
    return null;
  }
  const entity = await getEntity(hit.id);
  const title = entity.sitelinks?.enwiki?.title ?? entity.labels?.en?.value ?? name;
  console.error(`  resolved "${name}" -> ${hit.id} "${entity.labels?.en?.value}" (enwiki: ${title})`);

  const wikitext = entity.sitelinks?.enwiki ? await getWikitext(title) : null;
  const description = entity.sitelinks?.enwiki ? await getSummary(title) : null;
  const { imageUrl, attribution } = await commonsImage(entity);

  const manufacturerId = claimEntityId(entity, "P176");
  const manufacturer = infoboxParam(wikitext, "manufacturer") ?? (manufacturerId ? await resolveLabel(manufacturerId) : null);
  const countryId = claimEntityId(entity, "P495") ?? claimEntityId(entity, "P17");
  const country = countryId ? await resolveLabel(countryId) : infoboxParam(wikitext, "origin");
  const mass = await claimQuantity(entity, "P2067");

  return {
    table: "gun_reference",
    name: entity.labels?.en?.value ?? name,
    manufacturer,
    model: null,
    action_type: infoboxParam(wikitext, "action"),
    caliber: infoboxParam(wikitext, "cartridge") ?? claimString(entity, "P4403"),
    capacity: null, // not reliably present as a distinct structured/infobox field across these seeds — left null rather than guessed
    barrel_length: infoboxParam(wikitext, "part_length"),
    overall_length: infoboxParam(wikitext, "length"),
    weight: infoboxParam(wikitext, "weight") ?? mass,
    country,
    production_years: infoboxParam(wikitext, "production_date") ?? claimTime(entity, "P571"),
    description,
    image_url: imageUrl,
    image_attribution: attribution,
    source: `Wikidata (${hit.id}) + Wikipedia${entity.sitelinks?.enwiki ? ` ("${title}")` : ""}`,
    source_url: entity.sitelinks?.enwiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}` : `https://www.wikidata.org/wiki/${hit.id}`,
    license: "Wikidata claims: CC0. Wikipedia text: CC BY-SA 4.0 (attribution required on reuse). Image: see image_attribution.",
  };
}

async function importPlant(seed) {
  const name = typeof seed === "string" ? seed : seed.name;
  const searchTerm = typeof seed === "string" ? seed : seed.searchTerm;
  const found = await searchPlantEntity(searchTerm);
  if (!found) {
    console.error(`  [SKIP] no Wikidata entity found for "${searchTerm}"`);
    return null;
  }
  const { hit, entity } = found;
  const title = entity.sitelinks?.enwiki?.title ?? entity.labels?.en?.value ?? name;
  console.error(`  resolved "${name}" (search: "${searchTerm}") -> ${hit.id} "${entity.labels?.en?.value}" (enwiki: ${title})`);

  const wikitext = entity.sitelinks?.enwiki ? await getWikitext(title) : null;
  const description = entity.sitelinks?.enwiki ? await getSummary(title) : null;
  const { imageUrl, attribution } = await commonsImage(entity);

  const scientificName = claimString(entity, "P225");
  const family = await resolveFamily(entity);

  return {
    table: "plant_reference",
    common_name: name,
    other_common_names: null, // Wikidata aliases could populate this later; left null here rather than guessed from the search query alone
    scientific_name: scientificName,
    family,
    habitat: infoboxParam(wikitext, "habitat"),
    season: null, // not reliably structured on any of the sources checked — left for manual entry
    identification_notes: null, // deliberately left for the user's own manual notes — not something to synthesize from a summary
    description,
    edibility: null, // SAFETY: never auto-filled — no source checked (Wikidata/GBIF/Wikipedia) carries a verified, structured edibility field
    toxicity_notes: null,
    image_url: imageUrl,
    image_attribution: attribution,
    source: `Wikidata (${hit.id}) + Wikipedia${entity.sitelinks?.enwiki ? ` ("${title}")` : ""}`,
    source_url: entity.sitelinks?.enwiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}` : `https://www.wikidata.org/wiki/${hit.id}`,
    license: "Wikidata claims: CC0. Wikipedia text: CC BY-SA 4.0 (attribution required on reuse). Image: see image_attribution.",
  };
}

function toInsertSql(rows) {
  if (rows.length === 0) return "-- no rows fetched\n";
  const table = rows[0].table;
  const cols = Object.keys(rows[0]).filter((c) => c !== "table");
  const lines = rows.map((r) => `  (${cols.map((c) => sqlStr(r[c])).join(", ")})`);
  return `insert into ${table} (${cols.join(", ")})\nvalues\n${lines.join(",\n")};\n`;
}

async function main() {
  const kind = process.argv[2];
  if (kind !== "guns" && kind !== "plants") {
    console.error("Usage: node import-reference-data.mjs <guns|plants>");
    process.exit(1);
  }
  const seeds = kind === "guns" ? GUN_SEEDS : PLANT_SEEDS;
  const importFn = kind === "guns" ? importGun : importPlant;
  const rows = [];
  for (const seed of seeds) {
    console.error(`Importing "${typeof seed === "string" ? seed : seed.name}"...`);
    const row = await importFn(seed);
    if (row) rows.push(row);
  }
  console.error(`\nFetched ${rows.length}/${seeds.length} rows.\n`);
  process.stdout.write(toInsertSql(rows));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
