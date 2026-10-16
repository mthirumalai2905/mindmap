import { NODE_SIZE, ancestorsOf, descendantsOf, sideOf, tidyLayout } from "./layout";
import { createRecord, deleteRecords, patchMany, updateRecord, useStore } from "./store";
import type { ID, MapNode } from "./types";

function nodesState() {
  const data = useStore.getState().data!;
  return { data, byId: data.nodes, list: Object.values(data.nodes) };
}

export function rootNodeId(): ID | null {
  const { list } = nodesState();
  return (list.find((n) => n.kind === "root") ?? list.find((n) => !n.parentId))?.id ?? null;
}

export function relayout() {
  const { list } = nodesState();
  const positions = tidyLayout(list);
  patchMany("nodes", Object.fromEntries(Object.entries(positions).map(([id, position]) => [id, { position }])));
}

function maybeRelayout() {
  if (useStore.getState().data?.workspace.mapAutoLayout) relayout();
}

/** Inherit product, place near the parent, and keep the layout tidy when enabled. */
export function addChildNode(parentId: ID | null, patch: Partial<MapNode> = {}): MapNode {
  const { byId, list } = nodesState();
  const parent = parentId ? byId[parentId] : null;
  const siblings = list.filter((n) => n.parentId === parentId);
  const kind =
    patch.kind ??
    (parent?.kind === "root" ? (parent.productId ? "category" : "product") : parent?.kind === "product" ? "category" : "idea");
  const size = NODE_SIZE[kind];
  let position = { x: 0, y: 0 };
  if (parent) {
    const rid = rootNodeId();
    const positions = Object.fromEntries(list.map((n) => [n.id, n.position]));
    const dir = parent.kind === "root" ? (siblings.length % 2 === 0 ? 1 : -1) : sideOf(parent.id, byId, positions, rid);
    const pw = NODE_SIZE[parent.kind].w;
    const x = dir === 1 ? parent.position.x + pw + 70 : parent.position.x - 70 - size.w;
    const lowest = siblings.reduce((m, s) => Math.max(m, s.position.y + NODE_SIZE[s.kind].h), -Infinity);
    position = { x, y: Number.isFinite(lowest) ? lowest + 14 : parent.position.y };
  }
  const node = createRecord("nodes", {
    kind,
    parentId,
    productId: parent?.productId ?? null,
    status: kind === "product" || kind === "category" ? null : "idea",
    order: siblings.reduce((m, s) => Math.max(m, s.order), -1) + 1,
    position,
    ...patch,
  });
  if (parent?.collapsed) updateRecord("nodes", parent.id, { collapsed: false });
  maybeRelayout();
  return useStore.getState().data!.nodes[node.id] ?? node;
}

export function addSiblingNode(id: ID): MapNode | null {
  const { byId } = nodesState();
  const node = byId[id];
  if (!node || node.kind === "root") return null;
  return addChildNode(node.parentId, { kind: node.kind === "product" ? "product" : node.kind === "category" ? "category" : "idea" });
}

export function canReparent(id: ID, newParentId: ID | null): boolean {
  if (id === newParentId) return false;
  const { byId, list } = nodesState();
  if (byId[id]?.kind === "root") return false;
  if (newParentId && descendantsOf(id, list).includes(newParentId)) return false;
  return true;
}

export function reparentNode(id: ID, newParentId: ID | null) {
  if (!canReparent(id, newParentId)) return false;
  const { byId, list } = nodesState();
  const newParent = newParentId ? byId[newParentId] : null;
  const order = list.filter((n) => n.parentId === newParentId).reduce((m, s) => Math.max(m, s.order), -1) + 1;
  const productId =
    newParent?.kind === "root" && !newParent.productId ? byId[id].productId : newParent?.productId ?? byId[id].productId;
  updateRecord("nodes", id, { parentId: newParentId, order, productId });
  if (newParent?.collapsed) updateRecord("nodes", newParent.id, { collapsed: false });
  maybeRelayout();
  return true;
}

export function deleteNode(id: ID, mode: "branch" | "keep-children") {
  const { byId, list } = nodesState();
  const node = byId[id];
  if (!node) return;
  if (mode === "keep-children") {
    const children = list.filter((n) => n.parentId === id);
    patchMany("nodes", Object.fromEntries(children.map((c) => [c.id, { parentId: node.parentId }])));
    deleteRecords([{ collection: "nodes", id }]);
  } else {
    const ids = [id, ...descendantsOf(id, list)];
    deleteRecords(ids.map((nid) => ({ collection: "nodes" as const, id: nid })));
  }
  maybeRelayout();
}

export function toggleCollapsed(id: ID, collapsed?: boolean) {
  const { byId } = nodesState();
  const node = byId[id];
  if (!node) return;
  updateRecord("nodes", id, { collapsed: collapsed ?? !node.collapsed });
  maybeRelayout();
}

/** Expand every collapsed ancestor so `id` becomes visible. */
export function revealNode(id: ID) {
  const { byId } = nodesState();
  const toOpen = ancestorsOf(id, byId).filter((a) => byId[a].collapsed);
  if (!toOpen.length) return;
  patchMany("nodes", Object.fromEntries(toOpen.map((a) => [a, { collapsed: false }])));
  maybeRelayout();
}

export function setAllCollapsed(collapsed: boolean, depth = 1) {
  const { byId, list } = nodesState();
  const patches: Record<ID, Partial<MapNode>> = {};
  for (const n of list) {
    const level = ancestorsOf(n.id, byId).length;
    const hasKids = list.some((c) => c.parentId === n.id);
    if (!hasKids) continue;
    patches[n.id] = { collapsed: collapsed ? level >= depth : false };
  }
  patchMany("nodes", patches);
  maybeRelayout();
}

export function addCrossLink(source: ID, target: ID, label = "") {
  const data = useStore.getState().data!;
  if (source === target) return null;
  const exists = Object.values(data.edges).some(
    (e) => (e.source === source && e.target === target) || (e.source === target && e.target === source),
  );
  if (exists) return null;
  return createRecord("edges", { source, target, label }, { log: false });
}