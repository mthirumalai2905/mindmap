// End-to-end check of Supabase persistence and live sync using the app's own
// seed and adapter code. Run: npx tsx scripts/e2e-supabase.mts
// Creates a temporary workspace and deletes it afterwards.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

const { buildWorkspace } = await import("../src/lib/seed");
const { createSupabaseAdapter } = await import("../src/lib/persistence/supabase");
type RemoteChange = import("../src/lib/persistence/adapter").RemoteChange;

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok   ${msg}`);
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const writer = createSupabaseAdapter();
const data = buildWorkspace({ workspaceName: "E2E test workspace", includeTemplate: true, includeExamples: true });
let cleanupId: string | null = data.workspace.id;

try {
  await writer.save(data, null);
  assert(true, "first save of a full seeded workspace");

  const reader = createSupabaseAdapter();
  const loaded = await reader.load();
  assert(loaded?.workspace.id === data.workspace.id, "reader loads the newest workspace");
  for (const key of ["products", "categories", "nodes", "edges", "content", "initiatives", "research", "tasks", "characters", "arcs", "issues", "lore", "links"] as const) {
    assert(Object.keys(loaded![key]).length === Object.keys(data[key]).length, `${key}: ${Object.keys(data[key]).length} rows round-trip`);
  }
  const someContent = Object.values(data.content).find((c) => c.dueDate)!;
  const back = loaded!.content[someContent.id];
  assert(back.dueDate === someContent.dueDate && back.title === someContent.title, "dates and text survive the round trip");
  const research = Object.values(data.research).find((r) => r.evidence.length)!;
  const canon = (v: unknown) => JSON.stringify(v, (_k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort()) : val));
  assert(canon(loaded!.research[research.id].evidence) === canon(research.evidence), "jsonb evidence survives");
  assert(Boolean(loaded!.workspace.joinCode), "server-generated fields are read back");

  const changes: RemoteChange[] = [];
  reader.onRemoteChange!((c) => changes.push(c));
  await wait(2500); // let the Realtime channel subscribe

  const node = Object.values(data.nodes).find((n) => n.kind === "idea")!;
  const edited = { ...node, title: "Edited by writer", updatedAt: new Date().toISOString() };
  const v2 = { ...data, nodes: { ...data.nodes, [node.id]: edited } };
  await writer.save(v2, data);
  await wait(3000);
  const upsert = changes.find((c) => c.kind === "upsert" && c.record.id === node.id);
  assert(upsert && upsert.kind === "upsert" && (upsert.record as { title?: string }).title === "Edited by writer", "reader receives the edit live");

  const doomed = Object.values(v2.tasks)[0];
  const v3 = { ...v2, tasks: { ...v2.tasks } };
  delete v3.tasks[doomed.id];
  await writer.save(v3, v2);
  await wait(3000);
  assert(changes.some((c) => c.kind === "delete" && c.id === doomed.id), "reader receives the delete live");

  const reloaded = await createSupabaseAdapter().load();
  assert(reloaded!.nodes[node.id].title === "Edited by writer" && !reloaded!.tasks[doomed.id], "a fresh load sees the latest writes");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  if (cleanupId) {
    await writer.clear();
    cleanupId = null;
    console.log("cleaned up test workspace");
  }
  process.exit(process.exitCode ?? 0);
}
