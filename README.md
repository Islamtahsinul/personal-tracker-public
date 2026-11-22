# Personal Tracker

A private personal library for tracking hobbies and interests — cars, movies,
games, books, and anything else — through one generic, configurable tracker
engine. See [PROJECT.md](./PROJECT.md) for the full architecture, provider
research, and roadmap.

## Getting started

You need Node.js 20.9+ and a free [Supabase](https://supabase.com) project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project, then apply the SQL migrations in
   `supabase/migrations/` in filename order — either with the
   [Supabase CLI](https://supabase.com/docs/guides/cli)
   (`npx supabase link --project-ref <your-project-ref>`, then
   `npx supabase db push`) or by running each file in the dashboard's
   **SQL Editor**.
3. Copy `.env.example` to `.env.local` and fill in your project's values
   (see below).
4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign up with an
   email/password. Every new account gets six starter trackers automatically.

## Environment variables

Copy `.env.example` to `.env.local` (gitignored) and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Optional — enrichment providers. The app works fully without these
# (manual entry always works); each just unlocks automatic data lookup
# for its category.
TMDB_API_KEY=
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
```

### Getting a TMDB API key (Movies + TV enrichment)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API** and request an API key (choose "Developer").
3. Copy the **API Read Access Token** (the long JWT-looking string, not the
   short v3 key) into `TMDB_API_KEY`.

### Getting IGDB credentials (Games enrichment)

IGDB's API is accessed through Twitch's developer platform:

1. Create a free account at [dev.twitch.tv](https://dev.twitch.tv) (a Twitch
   account works).
2. Go to the [Developer Console → Applications](https://dev.twitch.tv/console/apps)
   and register a new application (any name/URL, category "Application
   Integration" or similar; OAuth Redirect URL can be `http://localhost`
   since this app only uses the server-to-server client-credentials flow).
3. Copy the generated **Client ID** into `IGDB_CLIENT_ID`.
4. Generate a **Client Secret** and copy it into `IGDB_CLIENT_SECRET`.

Books (Open Library) and Cars/Motorcycles (Wikidata) need no setup — they're
public, keyless APIs.

## Recommended one-time Supabase settings

- **Turn off open sign-ups once your own account exists.** Anyone who can
  reach your deployment can otherwise create an account on it (they can't
  see your data — every table is per-user via RLS — but they can use your
  instance). In the Supabase dashboard, under **Authentication**, disable
  **Allow new users to sign up**.
- **Leaked-password protection** (checks new passwords against
  HaveIBeenPwned) is off by default and can only be toggled from the
  dashboard: **Authentication → Policies → Password Security** in your
  project's [Supabase dashboard](https://supabase.com/dashboard). Optional
  but recommended.

## Deploying to Vercel

The app needs zero code changes to deploy — every Supabase client reads from
env vars and every internal API call is a relative path. Steps:

1. Push this repo to GitHub (or your Git provider of choice).
2. In Vercel, "Add New Project" → import the repo. Framework preset
   (Next.js) is auto-detected; no build command overrides needed.
3. Add the environment variables listed above (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and optionally
   `TMDB_API_KEY`/`IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET`) under
   **Project Settings → Environment Variables**, scoped to Production (and
   Preview if you want provider-backed previews too).
4. Deploy.
5. In the Supabase dashboard, **Authentication → URL Configuration**, set
   **Site URL** to your Vercel production URL and add it (plus
   `https://*.vercel.app` if you want preview deployments to work) under
   **Redirect URLs**. This only affects email confirmation / password reset
   links — signing in with an existing confirmed account works immediately
   without this step.

## Scripts

```bash
npm run dev     # start the dev server (Turbopack, localhost only)
npm run build   # production build (also type-checks)
npm run start   # run the production build
npm run lint    # ESLint
npm test        # Vitest unit tests
```

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + Auth) · Zod · sonner (toasts) · lucide-react (icons)

## Reference data

The Guns and Plants reference tables are seeded
(`supabase/migrations/20260917140000_seed_reference_data.sql`) from Wikidata
(CC0) and English Wikipedia (CC BY-SA 4.0). That data keeps its original
licences; each row stores its source, licence and image attribution.

## License

The code is released under the [MIT License](./LICENSE). The reference data
above is not covered by it and keeps its original licences.
