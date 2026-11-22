# Personal Tracker

A private, single-user web app for tracking anything you're into — cars, movies,
games, books, whatever — through one generic tracker engine instead of a
bespoke app per category.

## Product vision

The user has hobbies and interests across many unrelated categories (cars,
movies, games, books, watches, ...). Rather than building N separate mini-apps,
Personal Tracker is **one generic "tracker" concept** configured differently
per category:

```
Tracker (e.g. "Movies")
  → Statuses (Want to Watch, Watching, Watched, ...)
  → Fields   (Director, Genres, Runtime, ...)
  → Items    (Interstellar, Whiplash, ...)
       → Field values (per item, per field)
       → Personal info (status, rating, notes, favourite, tags, dates)
```

New trackers — including ones nobody anticipated, e.g. "Watches" — can be
created entirely from the UI: name, icon, color, category, statuses, and
custom fields. No source changes required. This was verified during
development by creating a "Watches" tracker with a custom `Brand` select
field purely through the app UI.

The other headline feature is **automatic data enrichment**: typing "Ferrari
F40" or "Project Hail Mary" searches an appropriate external source, lets you
disambiguate between candidates, and pre-fills the item so you only have to
review and save — never fabricated, missing fields are just left blank.

## V1 scope

In scope: the generic tracker engine, six starter trackers (Cars,
Motorcycles, Movies, TV Shows, Games, Books), automatic enrichment for those
six, manual entry, personal metadata (status/rating/notes/tags/favourites),
global search, dashboard, tracker settings (custom fields/statuses), dark UI,
responsive layout, Supabase auth.

**Explicitly out of scope for V1** (see "V2 ideas" below): upcoming
events/releases, calendar integration, notifications, monitoring.

## Architecture

- **Framework**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4.
- **Backend**: Supabase (Postgres 17 + Auth), accessed via `@supabase/ssr`
  (separate browser/server/middleware clients — see `src/lib/supabase/`).
- **Auth**: Supabase email/password auth. Middleware (`src/proxy.ts`, Next.js
  16's renamed middleware convention) redirects unauthenticated requests to
  `/login` and authenticated requests away from it.
- **Data layer** (`src/lib/data/`): read-only Server Component helpers
  (`getTrackers`, `getItemsForTracker`, `getItemById`, `searchAllItems`, ...).
- **Actions** (`src/lib/actions/`): `"use server"` mutations, called directly
  from Client Components. Validated with Zod (`src/lib/validation/schemas.ts`).
- **Domain types** (`src/lib/types/domain.ts`): the app-level shapes
  (`Tracker`, `TrackerField`, `ItemWithValues`, ...) built on top of the
  generated `Database` type (`src/lib/supabase/database.types.ts`).

### Database schema

Nine tables, all owned per-user via RLS (`auth.uid() = user_id`, or via an
`EXISTS` join up to the owning tracker/item for child tables):

| Table | Purpose |
|---|---|
| `trackers` | One row per tracker (name, icon, color, category, archived). |
| `tracker_statuses` | Configurable status pipeline per tracker. |
| `tracker_fields` | Custom field definitions (key, label, type, personal/external, show-on-card). |
| `tracker_field_options` | Choices for `select`/`multi_select` fields. |
| `items` | One row per tracked thing. Universal personal attributes (status, rating, favourite, notes) are first-class columns — every tracker needs them and they get dedicated UI, so they aren't modeled as dynamic fields. |
| `item_field_values` | Typed-by-field values. `value` is `jsonb` because field types are heterogeneous (text, number, date, string arrays for multi-select) — the relation itself (`item_id`, `field_id`) is fully structured and FK-constrained; only the leaf value is dynamically typed. This mirrors how Notion/Airtable-style dynamic schemas are pragmatically modeled without a table-per-type. |
| `tags` / `item_tags` | Free-form, reusable, user-scoped tags — distinct from a tracker's structured `multi_select` fields (e.g. "Genres"). |
| `item_enrichment_records` | Provenance: which provider/external ID supplied an item, plus the raw payload, for future re-sync/debugging. |

`tracker_fields.is_personal` is what separates "External Information" (Director,
Engine, ...) from "My Information" (Date Watched, Hours Played, ...) on the
item detail page — it's a per-field flag, not a hardcoded set of columns, so a
new tracker can define its own personal fields freely.

Every new user gets six starter trackers automatically via a `SECURITY
DEFINER` Postgres function (`bootstrap_default_trackers`) triggered on
`auth.users` insert (see `supabase/migrations/20260831121000_seed_default_trackers.sql`).
It's data-driven (a JSON template fed through the same tables the app itself
writes to), which doubles as proof the generic engine can express these six
categories without bespoke code.

### Enrichment architecture

```
Tracker.category ("movie", "car", ...)
      │
      ▼
getProviderForCategory()          ← src/lib/providers/registry.ts
      │                             the ONLY place that knows which
      ▼                             provider serves which category
EnrichmentProvider                ← src/lib/providers/types.ts
  .search(query)                    (interface every provider implements)
  .getDetails(externalId)
      │
      ▼
NormalizedItem { title, images, fields: Record<fieldKey, value>, raw }
      │
      ▼
User reviews/edits in a form, then saves  →  items + item_field_values +
                                              item_enrichment_records
```

Nothing outside `src/lib/providers/registry.ts` knows which provider serves
which category. `/api/enrich/search` and `/api/enrich/details` are thin,
auth-gated route handlers that call the registry and return normalized JSON —
API keys never reach the client. If a category has no configured provider (or
the provider throws), the UI shows a clear "no automatic source configured"
message and falls back to manual entry; it never crashes and never fabricates
data. **The database is the source of truth** — once saved, an item is fully
independent of whether its provider is still configured or online.

### Provider research & decisions

Researched before integrating (see chat history for full findings; summarized
here since it's the part V1 instructions explicitly required):

| Category | Provider | Why | Auth |
|---|---|---|---|
| Movies / TV | **TMDB** | Industry-standard, high-quality images/data, generous free tier. | API key (`TMDB_API_KEY`) |
| Games | **IGDB** (via Twitch OAuth) | Better-curated than RAWG (RAWG's crowd-submitted data has more dupes/gaps) — worth IGDB's one-time OAuth setup cost for a personal-use app. | Twitch Client ID + Secret |
| Books | **Open Library** | No auth, generous limits, solid ISBN/subjects/covers; a `/works/{id}.json` follow-up call fills in description when missing. | None |
| Cars / Motorcycles | **Wikidata** + Wikipedia REST summary | See below — the only viable free option, with an important caveat. | None |

**Cars/motorcycles caveat (verified, not assumed):** live-tested against
Wikidata (e.g. Q463627, "Ferrari F40") before shipping. Wikidata reliably has
manufacturer, country (via the manufacturer's own country claim), an image,
and — via the linked Wikipedia article — a real description. It does **not**
reliably have engine, power, torque, top speed, transmission, drivetrain, or
production years for most vehicle-model items; those live only in Wikipedia
infobox prose, which isn't practical to parse reliably for V1. The provider
(`src/lib/providers/wikidata.ts`) only populates what's actually structured
and leaves the rest blank — per the "never fabricate" requirement, the
alternative (guessing property mappings) was tried during development and
caught a real near-miss: an early draft almost mapped Wikidata property P287
("designed by") to "engine," which would have been actively wrong data. Real
specs still need to be filled in by hand for now; a future iteration could add
a second provider or parse infoboxes if this proves a real friction point in
practice.

### Images

Item images are stored as external URLs (TMDB CDN, IGDB CDN, Open Library
covers, Wikimedia Commons) — never downloaded/re-hosted, keeping storage cost
at zero. `ImageWithFallback` (`src/components/ui/image-with-fallback.tsx`)
handles broken URLs with an `onError` fallback to a tracker-colored icon
placeholder. Plain `<img>` is used instead of `next/image` because sources
span many unpredictable external hosts that would each need allow-listing.
If this ever needs to move to Supabase Storage (e.g. for images the user
uploads directly), only that one component and the upload flow would need to
change — nothing else references image URLs directly.

## V1 audit (2026-08-31)

A full engineering + end-user audit was performed after the initial V1 build,
covering architecture, RLS/security, auth, error/loading/empty states,
accessibility, TypeScript quality, performance, race conditions, provider
failure handling, and CRUD correctness. The generic tracker architecture was
re-verified end-to-end by creating a brand-new "Watches" tracker through the
UI — custom field (`Brand`, select, with options, shown on card), custom
status (`On Wrist`), three items, search, status filter, sort, favourite,
rating (including via simulated keyboard activation), notes, tags, item edit,
item archive, item delete, tracker archive, and tracker delete — all
verified correct via direct database checks, then the existing trackers
(Books/Open Library, Cars/Wikidata) were regression-tested to confirm no
fixes broke working enrichment flows.

**Secrets scan:** clean. No API keys, tokens, or passwords in any tracked
file, commit, README, or PROJECT.md — verified via `git grep` for known key
patterns and a full history scan for `.env*` files. `.env.local` was never
committed.

**Real bugs found and fixed:**

- **RLS performance (all 9 policies).** Every owner policy called
  `auth.uid()` per-row instead of `(select auth.uid())`, which Postgres can't
  cache across rows — flagged by Supabase's advisor and fixed in
  `20260831130000_rls_performance_fix.sql`.
- **Race condition on every "instant save" control** (favourite, status,
  rating, tags, notes, personal fields). Each fired an independent
  fire-and-forget write; rapid interaction (e.g. removing two tags quickly)
  could let responses resolve out of order and silently overwrite newer data
  with an older snapshot. Fixed with a serial write queue
  (`src/lib/hooks/use-serial-queue.ts`) that guarantees writes commit in
  trigger order. Reproduced and verified fixed live: three rapid-fire tag
  adds all persisted correctly afterward.
- **Missing auth checks on mutations.** Most server actions relied solely on
  RLS, which correctly blocks cross-user access but means an unauthenticated
  call silently returned `{ ok: true }` (Postgres "0 rows updated" isn't an
  error) instead of a reported failure. Added an explicit check
  (`src/lib/supabase/require-user.ts`) to every mutating action.
- **Batch-insert default-value bug.** `createTracker`'s default-status insert
  omitted `is_default` on two of three rows; PostgREST sends a missing key as
  `NULL` rather than falling back to the column default, which violated the
  `not null` constraint and silently dropped all three statuses — new
  trackers had zero statuses. Root-caused via server-log debugging (not
  guessed) and fixed by making every row explicit.
- **`RatingStars` was mouse-only.** Its click handler computed a value from
  pointer position; a keyboard-triggered click (Enter/Space) has no real
  pointer coordinate, silently producing wrong values. Fixed by detecting
  keyboard activation (`event.detail === 0`) and treating it as "set this
  whole star." Verified live via a simulated keyboard click.
- **No route-level loading/error/not-found states anywhere.** Zero
  `loading.tsx`, `error.tsx`, or `not-found.tsx` files existed — navigation
  showed a blank page during data fetches, any unhandled Server Component
  error fell through to Next's default unstyled error page, and 404s weren't
  branded. Added all four (including `global-error.tsx` for the rare
  root-layout-failure case), matching the app's dark UI and keeping the
  sidebar shell where relevant.
- **No pagination on tracker item lists.** `getItemsForTracker` fetched every
  item in a tracker unconditionally — directly against the spec's "work well
  with... thousands of items" requirement. Added `.range()`-based pagination
  (60/page) with a `Pager` component and an exact count from the same query.
- **No duplicate-item detection.** Nothing warned when adding something
  already in a tracker. Added a non-blocking check (matches on same
  external ID+provider, or same title) shown as a dismissible warning in the
  review step — informational, not a hard block, since a second copy is
  sometimes legitimate (a rewatch, a different edition).
- **Deleting a custom field or status had no confirmation**, unlike
  item/tracker deletion, despite being equally destructive (cascades to
  every item's value / clears every item's status). Added matching confirm
  dialogs.
- **Delete-button failure was invisible.** The item/tracker delete buttons
  called their (redirect-on-success) server action without awaiting the
  result; a failure left the button stuck in a loading state with no error
  shown. Fixed to await and surface the failure.
- **Provider fetches had no timeout.** A hung external API would leave the
  Add Item search spinning indefinitely. Added a 10s `AbortSignal.timeout()`
  to every fetch across all four providers, plus explicit 429 detection with
  a clear "rate limit reached" message instead of a generic failure.
- **Tag matching was case-sensitive.** "Sci-Fi" and "sci-fi" would silently
  become two different tags. Changed the lookup to case-insensitive so
  existing tags are reused regardless of casing.
- **Accessibility gaps**: several icon-only buttons (remove-tag ×, icon
  picker swatches, color picker swatches, star rating) had no accessible
  name; toggle-style buttons (favourite, favourites filter, category picker)
  had no `aria-pressed`. Fixed across `field-input.tsx`,
  `item-detail-panel.tsx`, `icon-color-picker.tsx`, `rating-stars.tsx`,
  `tracker-toolbar.tsx`, `tracker-form-dialog.tsx`.
- **Server→Client boundary crash** (pre-existing from initial build, caught
  during this audit's regression pass): a resolved Lucide icon component was
  passed as a prop from a Server Component into a Client Component, which
  React 19 rejects — crashed item cards whenever any item existed. Fixed by
  passing the icon *key* string instead and resolving it inside the Client
  Component.
- **Minor:** duplicate field/status names produced a raw Postgres constraint
  error; now a friendly "already exists" message. A Wikidata lookup made a
  redundant extra round-trip for the manufacturer's label that its own
  response already contained; removed.

**Reviewed and confirmed correct, no change needed:** database schema
(indexes, FKs, `CHECK` constraints, `ON DELETE CASCADE` are all appropriate
for a personal-scale app), RLS ownership model (ownership enforced at the DB
layer via ownership joins, not just app logic), TypeScript strictness (no
`any`, no `@ts-ignore` anywhere), image fallback handling (verified live —
broken/missing image URLs degrade to a tracker-colored icon, never a broken
image), enrichment failure handling (verified live for an unconfigured
provider — clear message, no crash, manual entry still works), dependency
security (`npm audit`: 0 vulnerabilities).

**One environment note, not an app bug:** during this audit's live browser
testing, a background/hidden browser tab in the automation pane would
intermittently show a stuck React Suspense fallback (spinner) even though
the server had already streamed the correct, complete content — confirmed
by fetching the same page directly via `curl` with the session cookie, which
returned the real page content every time. This is the automation
environment throttling a backgrounded tab's client-side scheduler, not a
defect in the app; every affected page rendered correctly on a fresh tab's
first navigation.

## Deployment readiness (2026-09-02)

Moved from "locally-tested V1" toward a real production deployment on
Vercel. All providers described in "Provider research & decisions" above
were already implemented in code from V1 — this pass verified that (no
providers were replaced), closed a couple of real gaps, and confirmed the
codebase has zero localhost/dev-only assumptions.

**Code changes:**
- **Provider ratings.** TMDB (movies/TV), IGDB (games), and Open Library
  (books) all return a rating in their API responses, but nothing populated
  it. Added `tmdb_rating`, `igdb_rating`, `rating_average` fields (each kept
  in the source's native scale rather than invented a conversion) —
  migration `20260901120000_add_provider_rating_fields.sql` both updates the
  bootstrap template for future signups and backfills the same fields onto
  already-existing trackers. Verified live: Open Library correctly returned
  `4.5` for "Project Hail Mary" end-to-end into the review form.
- **Search request staleness/dedup** in `AddItemDialog`: typing quickly could
  let an older in-flight search resolve after a newer one and show the wrong
  results. Added `AbortController`-based cancellation of superseded
  searches — the same class of fix as the V1 audit's write-side race
  condition, applied to the read side.
- Confirmed (no code needed): item detail pages never call an external
  provider — reopening an item is DB-only, so browsing a large library
  doesn't re-hit rate limits. Confirmed via `grep`, not just assumption.

**Verified live at realistic scale:** seeded 65 items into TV Shows via SQL
(cleaned up after), confirmed pagination ("61–65 of 65", "Page 2 of 2"),
sort, and search (`ilike` + trigram index) all remained correct and fast.
Also re-verified the missing-API-key path (TMDB/IGDB unconfigured) degrades
cleanly to manual entry with a clear message, on both Movies and TV Shows.

**Deployment architecture** is already exactly `Browser → Vercel → Supabase
→ external APIs` with no code changes required: every Supabase client reads
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from env,
every internal API call uses a relative path, and `grep` for
`localhost`/`127.0.0.1` across `src/` returns nothing. The one manual step
that matters for production auth flows (password reset, future signups) is
setting the Supabase project's Site URL / Redirect URLs to the Vercel
domain — see the deployment checklist given to the user in chat.

## Known limitations / honest gaps

- **Car/motorcycle specs** (engine, power, torque, top speed, transmission,
  drivetrain, 0-60, production years) are usually blank after enrichment —
  Wikidata doesn't structure this data for most vehicles. Documented above.
- **IGDB requires one-time setup** (a free Twitch developer account) that I
  can't complete on the user's behalf — see README for the exact steps.
  Until configured, Games enrichment gracefully falls back to manual entry.
- **No drag-and-drop reordering** for tracker fields/statuses in V1 — new
  ones are appended at the end. Reordering would need a `sort_order` PATCH UI;
  deferred as a nice-to-have, not a blocker.
- **No password reset flow** in the UI yet (Supabase supports it; just not
  wired into the login form). For a single-user private app this was judged
  lower priority than the core tracker features.
- **Leaked-password-protection** (Supabase Auth's HaveIBeenPwned check) is
  off by default and can only be toggled from the Supabase dashboard, not via
  migration/API — recommended one-time step, see README.
- Multi-select field values are plain strings (not strictly validated against
  `tracker_field_options`), so enrichment can add a genre/subject the preset
  option list doesn't know about (e.g. "Kids", "Mini-Series"). This is
  intentional — real-world provider data doesn't always match a fixed list —
  but means the options table is a *suggestion* list, not an enforced
  constraint.
- **No automated test suite.** No Jest/Vitest/Playwright setup exists;
  correctness has been verified through extensive manual/live browser QA
  (both the initial build and the V1 audit) plus `lint`/`tsc`/production
  `build` on every change, not through a repeatable automated suite. Adding
  one is the top recommended next step (see below) — it wasn't built during
  the audit because that's new infrastructure, not a fix to something
  broken, and the audit's brief was fixing V1, not expanding it.
- Tag/field/status name collisions are handled (friendly error or
  case-insensitive reuse), but there's no UI affordance to *rename* a tag
  once created, or merge two near-duplicate tags after the fact.

## Current V1 status

Solid. The generic tracker engine works for both the six built-in categories
and an arbitrary new one, verified end-to-end live rather than assumed. RLS,
auth, and data-ownership are enforced at the database layer and were
re-verified during the audit. Error handling degrades gracefully everywhere
it was tested (provider failures, hung requests, unhandled exceptions,
missing routes, auth failures). Production `lint` + `tsc` + `build` all pass
clean, `npm audit` reports 0 vulnerabilities, and no secrets exist anywhere
in the repository or its history. Not deployed yet (by instruction — this
audit was scoped to local robustness, not shipping).

## Roadmap (near-term, still V1 polish)

**Recommended next step: add an automated test suite** (Vitest for the
provider normalization/registry logic and Zod schemas, Playwright for the
core user journeys this audit exercised manually — create tracker, add item,
edit, search/filter/sort, archive/delete). Everything in this audit was
verified by hand; a suite would let that verification survive future changes
without re-doing it manually each time, which is the single highest-leverage
thing left before either deploying or adding more features.

Other near-term items:
- Password reset flow.
- Drag-to-reorder for custom fields/statuses.
- Bulk actions on the tracker item grid (multi-select archive/tag).
- Optional second source for cars/motorcycles if Wikidata's spec gaps prove
  too limiting in practice (candidates: manually parsing a Wikipedia
  infobox, or a paid API if the free options remain unsatisfying).

## V2 ideas (explicitly NOT built in V1 — documented only)

- Upcoming release tracking: UFC events, football fixtures, movie/TV/game
  release dates.
- Google Calendar integration.
- Notifications for upcoming things the user follows.
- Automated background monitoring/polling of external sources.
- More advanced AI-assisted features (e.g. auto-tagging, recommendations) —
  only if a genuine benefit emerges and cost stays negligible; V1
  deliberately avoids calling an LLM for routine operations.

## Cost

Everything used is free-tier: Supabase (Postgres + Auth), Vercel (hosting,
once deployed), TMDB/Open Library/Wikidata (no cost), IGDB (free via Twitch
OAuth). No paid services are required to run this app.

## Setup

See `README.md` for environment variables and the one-time IGDB/TMDB signup
steps.
