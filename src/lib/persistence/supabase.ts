import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseSnapshot } from "../schemas";
import { COLLECTION_KEYS, type CollectionKey, type WorkspaceData } from "../types";
import { AuthRequiredError, type PersistenceAdapter } from "./adapter";

export const TABLES: Record<CollectionKey, string> = {
  products: "products",
  categories: "categories",
  nodes: "map_nodes",
  edges: "map_edges",
  content: "content_items",
  initiatives: "initiatives",
  research: "research_ideas",
  tasks: "tasks",
  characters: "characters",
  arcs: "story_arcs",
  issues: "comic_issues",
  lore: "lore_entries",
  links: "relationships",
};

/** Parents before children so foreign keys resolve. */
const WRITE_ORDER: CollectionKey[] = [
  "products",
  "categories",
  "nodes",
  "edges",
  "content",
  "initiatives",
  "research",
  "tasks",
  "arcs",
  "issues",
  "characters",
  "lore",
  "links",
];

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const isDateKey = (k: string) => /Date$/.test(k);

function toRow(record: object, workspaceId: string) {
  const row: Record<string, unknown> = { workspace_id: workspaceId };
  for (const [k, v] of Object.entries(record)) row[snake(k)] = isDateKey(k) && v === "" ? null : v;
  return row;
}

function workspaceRow(data: WorkspaceData) {
  const row = toRow(data.workspace, data.workspace.id);
  delete row.workspace_id;
  return row;
}

function fromRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "workspace_id") continue;
    const key = camel(k);
    out[key] = isDateKey(key) && v === null ? "" : v;
  }
  return out;
}

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/**
 * Supabase persistence. All access goes through the anon key and the signed-in
 * user's session; row-level security (see supabase/migrations) restricts rows
 * to workspace members. No service-role key is used in the browser.
 */
export function createSupabaseAdapter(): PersistenceAdapter {
  const sb = getSupabase();
  let workspaceId: string | null = null;

  const check = (error: { message: string } | null, context: string) => {
    if (error) throw new Error(`${context}: ${error.message}`);
  };

  return {
    mode: "supabase",
    description: "Synced to Supabase. Access is limited to workspace members.",
    async load() {
      const { data: auth } = await sb.auth.getSession();
      const user = auth.session?.user;
      if (!user) throw new AuthRequiredError();

      const { data: membership, error: mErr } = await sb
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      check(mErr, "Loading membership");
      if (!membership) return null;
      workspaceId = membership.workspace_id as string;

      const { data: ws, error: wErr } = await sb.from("workspaces").select("*").eq("id", workspaceId).single();
      check(wErr, "Loading workspace");

      const snapshot: Record<string, unknown> = { version: 1, workspace: fromRow(ws as Record<string, unknown>) };
      await Promise.all(
        COLLECTION_KEYS.map(async (key) => {
          const { data, error } = await sb.from(TABLES[key]).select("*").eq("workspace_id", workspaceId);
          check(error, `Loading ${key}`);
          snapshot[key] = Object.fromEntries((data ?? []).map((r) => [r.id, fromRow(r)]));
        }),
      );
      const { data: activity, error: aErr } = await sb
        .from("activity_log")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("at", { ascending: false })
        .limit(200);
      check(aErr, "Loading activity");
      snapshot.activity = (activity ?? []).map(fromRow).reverse();

      const parsed = parseSnapshot(snapshot);
      if (!parsed.ok) throw new Error(parsed.error);
      return parsed.data;
    },

    async save(next, previous) {
      const { data: auth } = await sb.auth.getSession();
      const user = auth.session?.user;
      if (!user) throw new AuthRequiredError();

      if (!previous || workspaceId !== next.workspace.id) {
        // New workspace: create it and the owner membership first.
        const { error } = await sb.from("workspaces").upsert({ ...workspaceRow(next), created_by: user.id });
        check(error, "Creating workspace");
        const { error: memErr } = await sb
          .from("workspace_members")
          .upsert({ workspace_id: next.workspace.id, user_id: user.id, role: "owner" });
        check(memErr, "Creating membership");
        workspaceId = next.workspace.id;
      } else if (previous.workspace !== next.workspace) {
        const { error } = await sb.from("workspaces").update(workspaceRow(next)).eq("id", workspaceId);
        check(error, "Saving workspace");
      }
      const wid = workspaceId!;

      for (const key of WRITE_ORDER) {
        const prev = previous?.[key] ?? {};
        const curr = next[key];
        const changed = Object.values(curr).filter((r) => prev[r.id] !== r);
        if (changed.length) {
          const { error } = await sb.from(TABLES[key]).upsert(changed.map((r) => toRow(r, wid)));
          check(error, `Saving ${key}`);
        }
      }
      for (const key of [...WRITE_ORDER].reverse()) {
        const prev = previous?.[key] ?? {};
        const removed = Object.keys(prev).filter((id) => !next[key][id]);
        if (removed.length) {
          const { error } = await sb.from(TABLES[key]).delete().in("id", removed);
          check(error, `Deleting ${key}`);
        }
      }
      const known = new Set((previous?.activity ?? []).map((a) => a.id));
      const fresh = next.activity.filter((a) => !known.has(a.id));
      if (fresh.length) {
        const { error } = await sb.from("activity_log").upsert(fresh.map((a) => toRow(a, wid)));
        check(error, "Saving activity");
      }
    },

    async clear() {
      if (!workspaceId) return;
      const { error } = await sb.from("workspaces").delete().eq("id", workspaceId);
      check(error, "Deleting workspace");
      workspaceId = null;
    },

    async signOut() {
      await sb.auth.signOut();
    },
  };
}
