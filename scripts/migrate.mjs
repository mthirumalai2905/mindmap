// Applies supabase/migrations/*.sql in order. Usage: npm run db:migrate
import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

config({ path: ".env.local" });
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is not set in .env.local");
  process.exit(1);
}

const dir = path.join(process.cwd(), "supabase", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("create table if not exists public._mm_migrations (name text primary key, applied_at timestamptz default now())");
  // RLS with no policies: invisible to API clients.
  await client.query("alter table public._mm_migrations enable row level security");
  const { rows } = await client.query("select name from public._mm_migrations");
  const done = new Set(rows.map((r) => r.name));
  for (const f of files) {
    if (done.has(f)) {
      console.log(`skip  ${f}`);
      continue;
    }
    const sql = await readFile(path.join(dir, f), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public._mm_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log(`apply ${f}`);
    } catch (e) {
      await client.query("rollback");
      throw new Error(`${f}: ${e.message}`);
    }
  }
} finally {
  await client.end();
}
