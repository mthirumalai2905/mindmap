# mindmap

Strategic planning workspace for the Synx ecosystem (Real Time Web, Synx Tools, Skalle AI, Morph Space), built around an interactive master mind map.

> Work in progress. The mind map, onboarding, record editing, global search (Ctrl K) and quick capture (N) work today. The overview, content library, product, PR, research, universe, roadmap, calendar and settings pages are still being built.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 (Next.js picks the next free port if 3000 is taken). The first visit walks you through creating a workspace.

## Storage modes

- **Development mode (default):** with no Supabase environment variables, data is saved in your browser's `localStorage`. It isn't shared, synced, or access-controlled.
- **Supabase:** set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. The migrations and sign-in flow are still in progress.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, React Flow (`@xyflow/react`), Zustand, Zod, Radix UI, cmdk, Lucide.
