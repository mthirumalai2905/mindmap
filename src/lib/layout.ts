import type { ID, MapNode, NodeKind } from "./types";

export const NODE_SIZE: Record<NodeKind, { w: number; h: number }> = {
  root: { w: 260, h: 64 },
  product: { w: 220, h: 52 },
  category: { w: 200, h: 44 },
  idea: { w: 240, h: 58 },
  content: { w: 240, h: 58 },
  initiative: { w: 240, h: 58 },
  research: { w: 240, h: 58 },
  note: { w: 240, h: 58 },
};

/** Rendered sizes reported by the map canvas; preferred over the defaults. */
export const measuredSizes = new Map<ID, { w: number; h: number }>();

function sizeOf(n: MapNode) {
  const m = measuredSizes.get(n.id);
  const d = NODE_SIZE[n.kind];
  return m ? { w: d.w, h: Math.max(d.h, m.h) } : d;
}

const LEVEL_GAP = 70; // horizontal gap between a parent's edge and child column
const SIBLING_GAP = 14;
const BRANCH_GAP = 34; // extra space between first-level branches

type Positions = Record<ID, { x: number; y: number }>;

export function childrenIndex(nodes: MapNode[]): Map<ID | null, MapNode[]> {
  const index = new Map<ID | null, MapNode[]>();
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    const key = n.parentId && ids.has(n.parentId) ? n.parentId : null;
    const list = index.get(key) ?? [];
    list.push(n);
    index.set(key, list);
  }
  for (const list of index.values()) list.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  return index;
}

/**
 * Two-sided mind-map layout: first-level branches are balanced to the right
 * and left of the root; deeper levels grow outward. Collapsed subtrees are skipped.
 */
export function tidyLayout(nodes: MapNode[]): Positions {
  const index = childrenIndex(nodes);
  const positions: Positions = {};
  const kids = (id: ID) => {
    const node = nodes.find((n) => n.id === id);
    if (node?.collapsed) return [];
    return index.get(id) ?? [];
  };

  const heightCache = new Map<ID, number>();
  const subtreeHeight = (n: MapNode): number => {
    const cached = heightCache.get(n.id);
    if (cached !== undefined) return cached;
    const children = kids(n.id);
    const own = sizeOf(n).h;
    const total = children.length
      ? children.reduce((sum, c) => sum + subtreeHeight(c), 0) + SIBLING_GAP * (children.length - 1)
      : 0;
    const h = Math.max(own, total);
    heightCache.set(n.id, h);
    return h;
  };

  // Place a node by its center point, then its children in the given direction.
  const place = (n: MapNode, cx: number, cy: number, dir: 1 | -1) => {
    const size = sizeOf(n);
    positions[n.id] = { x: cx - size.w / 2, y: cy - size.h / 2 };
    const children = kids(n.id);
    if (!children.length) return;
    const total = children.reduce((s, c) => s + subtreeHeight(c), 0) + SIBLING_GAP * (children.length - 1);
    let y = cy - total / 2;
    for (const c of children) {
      const h = subtreeHeight(c);
      const cw = NODE_SIZE[c.kind].w;
      const childCx = cx + dir * (size.w / 2 + LEVEL_GAP + cw / 2);
      place(c, childCx, y + h / 2, dir);
      y += h + SIBLING_GAP;
    }
  };

  const roots = index.get(null) ?? [];
  const main = roots.find((r) => r.kind === "root") ?? roots[0];
  if (!main) return positions;

  const rootSize = NODE_SIZE[main.kind];
  positions[main.id] = { x: -rootSize.w / 2, y: -rootSize.h / 2 };
  const branches = kids(main.id);
  const weights = branches.map((b) => subtreeHeight(b));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const right: MapNode[] = [];
  const left: MapNode[] = [];
  let acc = 0;
  branches.forEach((b, i) => {
    if (acc + weights[i] / 2 <= totalWeight / 2 || right.length === 0) {
      right.push(b);
      acc += weights[i];
    } else left.push(b);
  });

  let maxBottom = rootSize.h / 2;
  const placeSide = (list: MapNode[], dir: 1 | -1) => {
    if (!list.length) return;
    const total = list.reduce((s, c) => s + subtreeHeight(c), 0) + BRANCH_GAP * (list.length - 1);
    let y = -total / 2;
    for (const b of list) {
      const h = subtreeHeight(b);
      const bw = NODE_SIZE[b.kind].w;
      place(b, dir * (rootSize.w / 2 + LEVEL_GAP + 40 + bw / 2), y + h / 2, dir);
      y += h + BRANCH_GAP;
    }
    maxBottom = Math.max(maxBottom, total / 2);
  };
  placeSide(right, 1);
  // Left side is listed bottom-to-top so the order reads clockwise.
  placeSide([...left].reverse(), -1);

  // Floating trees (no parent) go below the main map.
  let floatY = maxBottom + 120;
  for (const r of roots) {
    if (r.id === main.id) continue;
    const h = subtreeHeight(r);
    place(r, rootSize.w / 2 + LEVEL_GAP + NODE_SIZE[r.kind].w / 2, floatY + h / 2, 1);
    floatY += h + BRANCH_GAP;
  }
  return positions;
}

/** Ancestors of `id`, nearest first. */
export function ancestorsOf(id: ID, byId: Record<ID, MapNode>): ID[] {
  const out: ID[] = [];
  const seen = new Set<ID>();
  let cur = byId[id]?.parentId ?? null;
  while (cur && byId[cur] && !seen.has(cur)) {
    out.push(cur);
    seen.add(cur);
    cur = byId[cur].parentId;
  }
  return out;
}

export function descendantsOf(id: ID, nodes: MapNode[]): ID[] {
  const index = childrenIndex(nodes);
  const out: ID[] = [];
  const stack = [...(index.get(id) ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n.id);
    stack.push(...(index.get(n.id) ?? []));
  }
  return out;
}

/** Nodes hidden because an ancestor is collapsed. */
export function hiddenNodeIds(byId: Record<ID, MapNode>): Set<ID> {
  const hidden = new Set<ID>();
  for (const n of Object.values(byId)) {
    if (ancestorsOf(n.id, byId).some((a) => byId[a]?.collapsed)) hidden.add(n.id);
  }
  return hidden;
}

/** Which side of the root a node sits on, used to pick edge handles. */
export function sideOf(id: ID, byId: Record<ID, MapNode>, positions: Positions, rootId: ID | null): 1 | -1 {
  if (!rootId || !positions[rootId] || !positions[id]) return 1;
  const node = byId[id];
  const root = positions[rootId];
  const p = positions[id];
  const nodeCenter = p.x + NODE_SIZE[node?.kind ?? "idea"].w / 2;
  const rootCenter = root.x + NODE_SIZE.root.w / 2;
  return nodeCenter >= rootCenter ? 1 : -1;
}
