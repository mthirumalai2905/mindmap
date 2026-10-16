// Prints a row count per table for every workspace. Pass --prune-empty to delete
// workspaces that have no map nodes (left behind by a failed first save).
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const tables = ["products", "categories", "map_nodes", "map_edges", "content_items", "initiatives", "research_ideas", "tasks", "characters", "story_arcs", "comic_issues", "lore_entries", "relationships", "activity_log"];
if (process.argv.includes("--prune-empty")) {
  const { rowCount } = await client.query("delete from public.workspaces w where not exists (select 1 from public.map_nodes n where n.workspace_id = w.id)");
  console.log(`pruned ${rowCount} empty workspace(s)`);
}
const { rows: workspaces } = await client.query("select id, name, created_at from public.workspaces order by created_at desc");
for (const ws of workspaces) {
  const counts = [];
  for (const t of tables) {
    const { rows } = await client.query(`select count(*)::int as n from public.${t} where workspace_id = $1`, [ws.id]);
    if (rows[0].n) counts.push(`${t}=${rows[0].n}`);
  }
  console.log(`${ws.name} (${ws.id}) ${ws.created_at.toISOString()}\n  ${counts.join(" ") || "empty"}`);
}
if (!workspaces.length) console.log("no workspaces");
await client.end();
