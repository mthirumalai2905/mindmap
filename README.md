# mindmap

Strategic planning workspace for the Synx ecosystem (Real Time Web, Synx Tools, Skalle AI, Morph Space), built around an interactive master mind map.

> Work in progress. Working today: the mind map, onboarding, record editing, global search (Ctrl K), quick capture (N), and Supabase persistence with live sync. Still being built: the overview, content library, product, PR, research, universe, roadmap, calendar and settings pages.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by `npm run dev`. The first visit walks you through creating the workspace.

## Persistence

### Supabase (shared, no sign-in)

Create `.env.local` (it is gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<url-encoded password>@<pooler-host>:5432/postgres
```

Apply the schema with `npm run db:migrate`. `SUPABASE_DB_URL` is only used by the scripts and is never sent to the browser.

How it behaves:

- **One shared workspace.** Everyone who opens the app reads and writes the same workspace: the most recently created one.
- **No sign-in.** Anyone with the app URL can read and change all data, because the publishable key ships in the browser bundle. Row-level security is enabled with explicit open policies (`supabase/migrations/0002_open_access.sql`); replace those policies to restrict access later.
- **Last write wins per record.** Edits autosave after about half a second. Supabase Realtime pushes other people's changes in live. An incoming change replaces your copy unless you have an unsaved edit to that record with a newer timestamp, in which case your edit is saved and overwrites it. When the tab regains focus or reconnects, the app re-reads the workspace to catch anything it missed.
- **Failed saves** show "Not saved · Retry" in the top bar, and the browser warns before you close the tab with unsaved changes.

Scripts:

- `npm run db:migrate` — apply `supabase/migrations/*.sql` in order.
- `npm run db:status` — row counts per workspace.
- `npm run test:e2e` — create a temporary workspace, check that every collection round-trips and that edits and deletes sync live to a second client, then delete it.

### Development mode

Without the Supabase variables, data is saved in your browser's `localStorage` and isn't shared with anyone.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, React Flow (`@xyflow/react`), Zustand, Zod, Radix UI, cmdk, Lucide, Supabase.
