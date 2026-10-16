"use client";

import { create } from "zustand";
import { make } from "./factories";
import { AuthRequiredError, supabaseConfigured, type PersistenceAdapter } from "./persistence/adapter";
import { createLocalAdapter } from "./persistence/local";
import type {
  ActivityEntry,
  CollectionKey,
  Collections,
  ID,
  Link,
  RecordRef,
  Workspace,
  WorkspaceData,
} from "./types";
import { nowIso, uid } from "./utils";

export type LoadState = "idle" | "loading" | "ready" | "empty" | "auth" | "error";
export type SaveState = "saved" | "pending" | "saving" | "error";

export interface Toast {
  id: ID;
  message: string;
  tone?: "default" | "error";
  action?: { label: string; run: () => void };
}

interface UIState {
  openRecord: RecordRef | null;
  paletteOpen: boolean;
  captureOpen: boolean;
  captureDefaults: { target?: string; productId?: ID | null } | null;
  shortcutsOpen: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  /** Request the map to select and reveal a node (set before navigating). */
  mapFocusRequest: ID | null;
}

interface StoreState {
  adapter: PersistenceAdapter | null;
  load: LoadState;
  loadError: string | null;
  data: WorkspaceData | null;
  saveState: SaveState;
  saveError: string | null;
  lastSavedAt: string | null;
  externalChange: boolean;
  ui: UIState;
  toasts: Toast[];
}

const MAX_ACTIVITY = 200;

const initialUI: UIState = {
  openRecord: null,
  paletteOpen: false,
  captureOpen: false,
  captureDefaults: null,
  shortcutsOpen: false,
  sidebarCollapsed: false,
  mobileNavOpen: false,
  mapFocusRequest: null,
};

export const useStore = create<StoreState>()(() => ({
  adapter: null,
  load: "idle",
  loadError: null,
  data: null,
  saveState: "saved",
  saveError: null,
  lastSavedAt: null,
  externalChange: false,
  ui: initialUI,
  toasts: [],
}));

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

let lastSaved: WorkspaceData | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving: Promise<void> | null = null;

async function resolveAdapter(): Promise<PersistenceAdapter> {
  if (supabaseConfigured()) {
    const { createSupabaseAdapter } = await import("./persistence/supabase");
    return createSupabaseAdapter();
  }
  return createLocalAdapter();
}

export async function initStore() {
  const s = useStore.getState();
  if (s.load === "loading" || s.load === "ready") return;
  useStore.setState({ load: "loading", loadError: null });
  try {
    const adapter = s.adapter ?? (await resolveAdapter());
    useStore.setState({ adapter });
    const data = await adapter.load();
    lastSaved = data;
    useStore.setState({ data, load: data ? "ready" : "empty", saveState: "saved" });
    adapter.onExternalChange?.(() => useStore.setState({ externalChange: true }));
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      useStore.setState({ load: "auth" });
      return;
    }
    useStore.setState({ load: "error", loadError: err instanceof Error ? err.message : String(err) });
  }
}

async function flush() {
  const { adapter, data } = useStore.getState();
  if (!adapter || !data) return;
  if (saving) await saving;
  const snapshot = useStore.getState().data;
  if (!snapshot || snapshot === lastSaved) {
    useStore.setState({ saveState: "saved" });
    return;
  }
  useStore.setState({ saveState: "saving" });
  saving = adapter
    .save(snapshot, lastSaved)
    .then(() => {
      lastSaved = snapshot;
      const pending = useStore.getState().data !== snapshot;
      useStore.setState({ saveState: pending ? "pending" : "saved", saveError: null, lastSavedAt: nowIso() });
      if (pending) scheduleSave();
    })
    .catch((err: unknown) => {
      useStore.setState({
        saveState: "error",
        saveError: err instanceof Error ? err.message : "Unknown error while saving",
      });
    })
    .finally(() => {
      saving = null;
    });
  await saving;
}

function scheduleSave(delay = 450) {
  useStore.setState({ saveState: "pending" });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flush();
  }, delay);
}

export const retrySave = () => flush();
export const saveNow = () => {
  if (saveTimer) clearTimeout(saveTimer);
  return flush();
};

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

function mutate(fn: (draft: WorkspaceData) => WorkspaceData) {
  const { data } = useStore.getState();
  if (!data) return;
  const next = fn(data);
  if (next === data) return;
  useStore.setState({ data: next });
  scheduleSave();
}

export function titleOf(collection: CollectionKey, record: unknown): string {
  const r = record as Record<string, unknown>;
  return String(r?.title ?? r?.name ?? (collection === "links" ? "Relationship" : "Untitled"));
}

function withActivity(
  data: WorkspaceData,
  action: ActivityEntry["action"],
  collection: ActivityEntry["collection"],
  entityId: ID,
  title: string,
): ActivityEntry[] {
  if (collection === "links" || collection === "edges") return data.activity;
  const at = nowIso();
  const last = data.activity[data.activity.length - 1];
  // Coalesce bursts of edits to the same record into one entry.
  if (
    action === "updated" &&
    last &&
    last.action === "updated" &&
    last.entityId === entityId &&
    Date.now() - new Date(last.at).getTime() < 10 * 60 * 1000
  ) {
    return [...data.activity.slice(0, -1), { ...last, at, title }];
  }
  return [...data.activity, { id: uid(), at, action, collection, entityId, title }].slice(-MAX_ACTIVITY);
}

export function createRecord<K extends CollectionKey>(
  key: K,
  patch: Partial<Collections[K]> = {},
  opts: { log?: boolean } = {},
): Collections[K] {
  const record = make(key, patch);
  mutate((d) => ({
    ...d,
    [key]: { ...d[key], [record.id]: record },
    activity: opts.log === false ? d.activity : withActivity(d, "created", key, record.id, titleOf(key, record)),
  }));
  return record;
}

export function createMany<K extends CollectionKey>(key: K, records: Collections[K][]) {
  mutate((d) => {
    const map = { ...d[key] } as Record<ID, Collections[K]>;
    for (const r of records) map[r.id] = r;
    return { ...d, [key]: map };
  });
}

export function updateRecord<K extends CollectionKey>(key: K, id: ID, patch: Partial<Collections[K]>) {
  mutate((d) => {
    const current = d[key][id] as Collections[K] | undefined;
    if (!current) return d;
    const changed = Object.entries(patch).some(
      ([k, v]) => JSON.stringify((current as unknown as Record<string, unknown>)[k]) !== JSON.stringify(v),
    );
    if (!changed) return d;
    const next = { ...current, ...patch, updatedAt: nowIso() } as Collections[K];
    const isLayoutOnly = Object.keys(patch).every((k) => k === "position" || k === "collapsed");
    return {
      ...d,
      [key]: { ...d[key], [id]: next },
      activity: isLayoutOnly ? d.activity : withActivity(d, "updated", key, id, titleOf(key, next)),
    };
  });
}

/** Batch position/structure updates without activity noise. */
export function patchMany<K extends CollectionKey>(key: K, patches: Record<ID, Partial<Collections[K]>>) {
  mutate((d) => {
    const map = { ...d[key] } as Record<ID, Collections[K]>;
    let changed = false;
    for (const [id, patch] of Object.entries(patches)) {
      const current = map[id] as unknown as Record<string, unknown> | undefined;
      if (!current) continue;
      const differs = Object.entries(patch).some(([k, v]) => JSON.stringify(current[k]) !== JSON.stringify(v));
      if (!differs) continue;
      map[id] = { ...map[id], ...patch };
      changed = true;
    }
    return changed ? { ...d, [key]: map } : d;
  });
}

/** Remove records and everything that only makes sense alongside them. */
export function deleteRecords(refs: RecordRef[]) {
  mutate((d) => {
    const next: WorkspaceData = { ...d };
    const doomed = new Map<CollectionKey, Set<ID>>();
    const mark = (c: CollectionKey, id: ID) => {
      if (!doomed.has(c)) doomed.set(c, new Set());
      doomed.get(c)!.add(id);
    };
    refs.forEach((r) => mark(r.collection, r.id));

    // Cascades.
    const nodeIds = doomed.get("nodes");
    if (nodeIds) {
      Object.values(d.edges).forEach((e) => {
        if (nodeIds.has(e.source) || nodeIds.has(e.target)) mark("edges", e.id);
      });
    }
    const productIds = doomed.get("products");
    if (productIds) {
      Object.values(d.categories).forEach((c) => productIds.has(c.productId) && mark("categories", c.id));
    }
    Object.values(d.links).forEach((l) => {
      if (doomed.get(l.aType)?.has(l.aId) || doomed.get(l.bType)?.has(l.bId)) mark("links", l.id);
    });

    let activity = d.activity;
    for (const [c, ids] of doomed) {
      const map = { ...d[c] } as Record<ID, unknown>;
      for (const id of ids) {
        if (!map[id]) continue;
        if (refs.some((r) => r.collection === c && r.id === id)) {
          activity = withActivity({ ...d, activity }, "deleted", c, id, titleOf(c, map[id]));
        }
        delete map[id];
      }
      (next as unknown as Record<string, unknown>)[c] = map;
    }
    next.activity = activity;

    // Null out dangling references.
    const nullify = <K extends CollectionKey>(c: K, field: keyof Collections[K], gone?: Set<ID>) => {
      if (!gone) return;
      const map = next[c] as Record<ID, Collections[K]>;
      let copy: Record<ID, Collections[K]> | null = null;
      for (const r of Object.values(map)) {
        const v = r[field] as unknown;
        if (typeof v === "string" && gone.has(v)) {
          copy ??= { ...map };
          copy[r.id] = { ...r, [field]: null };
        }
      }
      if (copy) (next as unknown as Record<string, unknown>)[c] = copy;
    };
    nullify("content", "productId", doomed.get("products"));
    nullify("content", "categoryId", doomed.get("categories"));
    nullify("nodes", "productId", doomed.get("products"));
    nullify("nodes", "parentId", doomed.get("nodes"));
    nullify("initiatives", "productId", doomed.get("products"));
    nullify("research", "productId", doomed.get("products"));
    nullify("tasks", "productId", doomed.get("products"));
    nullify("issues", "arcId", doomed.get("arcs"));
    const taskIds = doomed.get("tasks");
    if (taskIds) {
      const tasks = { ...next.tasks };
      for (const t of Object.values(tasks)) {
        if (t.dependsOn.some((id) => taskIds.has(id)))
          tasks[t.id] = { ...t, dependsOn: t.dependsOn.filter((id) => !taskIds.has(id)) };
      }
      next.tasks = tasks;
    }
    return next;
  });
  const { ui } = useStore.getState();
  if (ui.openRecord && refs.some((r) => r.collection === ui.openRecord!.collection && r.id === ui.openRecord!.id)) {
    setUI({ openRecord: null });
  }
}

export function updateWorkspace(patch: Partial<Workspace>) {
  mutate((d) => ({ ...d, workspace: { ...d.workspace, ...patch, updatedAt: nowIso() } }));
}

/* ---------- Relationships ---------- */

export function linkRecords(a: RecordRef, b: RecordRef, label = "") {
  const { data } = useStore.getState();
  if (!data || (a.collection === b.collection && a.id === b.id)) return;
  const exists = Object.values(data.links).some(
    (l) =>
      (l.aType === a.collection && l.aId === a.id && l.bType === b.collection && l.bId === b.id) ||
      (l.aType === b.collection && l.aId === b.id && l.bType === a.collection && l.bId === a.id),
  );
  if (exists) return;
  createRecord("links", { aType: a.collection, aId: a.id, bType: b.collection, bId: b.id, label }, { log: false });
}

export function unlinkRecords(a: RecordRef, b: RecordRef) {
  const { data } = useStore.getState();
  if (!data) return;
  const ids = Object.values(data.links)
    .filter(
      (l) =>
        (l.aType === a.collection && l.aId === a.id && l.bType === b.collection && l.bId === b.id) ||
        (l.aType === b.collection && l.aId === b.id && l.bType === a.collection && l.bId === a.id),
    )
    .map((l) => ({ collection: "links" as const, id: l.id }));
  if (ids.length) deleteRecords(ids);
}

/** Records of `target` type linked to `ref`, with the link that joins them. */
export function linkedIds(data: WorkspaceData, ref: RecordRef, target: CollectionKey): { id: ID; link: Link }[] {
  const out: { id: ID; link: Link }[] = [];
  for (const l of Object.values(data.links)) {
    if (l.aType === ref.collection && l.aId === ref.id && l.bType === target) out.push({ id: l.bId, link: l });
    else if (l.bType === ref.collection && l.bId === ref.id && l.aType === target) out.push({ id: l.aId, link: l });
  }
  return out.filter((x) => Boolean((data[target] as Record<ID, unknown>)[x.id]));
}

/* ---------- Whole-workspace operations ---------- */

export async function replaceWorkspace(data: WorkspaceData) {
  const { adapter } = useStore.getState();
  if (!adapter) return;
  if (saveTimer) clearTimeout(saveTimer);
  useStore.setState({ data, load: "ready", ui: initialUI });
  // A replaced workspace is saved in full, not diffed against the old one.
  lastSaved = null;
  await flush();
}

export async function clearWorkspace() {
  const { adapter } = useStore.getState();
  if (!adapter) return;
  if (saveTimer) clearTimeout(saveTimer);
  await adapter.clear();
  lastSaved = null;
  useStore.setState({ data: null, load: "empty", saveState: "saved", ui: initialUI });
}

/* ---------- UI ---------- */

export function setUI(patch: Partial<UIState>) {
  useStore.setState((s) => ({ ui: { ...s.ui, ...patch } }));
}

export function openRecord(collection: CollectionKey, id: ID) {
  setUI({ openRecord: { collection, id }, paletteOpen: false });
}

export function toast(message: string, opts: Omit<Toast, "id" | "message"> = {}) {
  const id = uid();
  useStore.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, ...opts }] }));
  setTimeout(() => dismissToast(id), opts.action ? 7000 : 4000);
  return id;
}

export function dismissToast(id: ID) {
  useStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}

/* ---------- Hooks ---------- */

export function useData(): WorkspaceData {
  const data = useStore((s) => s.data);
  if (!data) throw new Error("Workspace data accessed before it was loaded");
  return data;
}

export function useCollection<K extends CollectionKey>(key: K): Record<ID, Collections[K]> {
  return useStore((s) => (s.data ? s.data[key] : EMPTY)) as Record<ID, Collections[K]>;
}
const EMPTY = {};
