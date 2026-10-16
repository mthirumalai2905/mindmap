"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type OnSelectionChangeParams,
  type Viewport,
} from "@xyflow/react";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  FilePlus2,
  Filter,
  HelpCircle,
  LayoutGrid,
  Maximize,
  MoveRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NODE_SIZE, ancestorsOf, descendantsOf, hiddenNodeIds, measuredSizes, sideOf } from "@/lib/layout";
import {
  addChildNode,
  addCrossLink,
  addSiblingNode,
  canReparent,
  deleteNode,
  relayout,
  reparentNode,
  revealNode,
  rootNodeId,
  setAllCollapsed,
  toggleCollapsed,
} from "@/lib/map-ops";
import { createRecord, deleteRecords, linkRecords, openRecord, patchMany, setUI, toast, updateRecord, updateWorkspace, useCollection, useStore } from "@/lib/store";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  NODE_KINDS,
  NODE_KIND_LABELS,
  STATUSES,
  type ID,
  type MapNode,
  type NodeKind,
  type Status,
} from "@/lib/types";
import { cn, includesText, isTypingTarget, pluralize } from "@/lib/utils";
import { StatusGlyph, useStatusLabels } from "../records/status";
import { Button } from "../ui/button";
import { confirmDialog } from "../ui/confirm";
import { Menu, MenuCheckItem, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, SubMenu } from "../ui/menu";
import { Kbd } from "../ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tooltip } from "../ui/tooltip";
import { MapActionsContext, type MapActions } from "./map-context";
import { MindNode, type MindFlowNode } from "./map-node";
import { EdgePanel, NodePanel } from "./node-panel";

const nodeTypes = { mind: MindNode };
const VIEWPORT_KEY = "mindmap:map-viewport";

interface Filters {
  products: ID[];
  types: string[];
  statuses: Status[];
}
const NO_FILTERS: Filters = { products: [], types: [], statuses: [] };

function readViewport(): Viewport | null {
  try {
    const raw = window.localStorage.getItem(VIEWPORT_KEY);
    return raw ? (JSON.parse(raw) as Viewport) : null;
  } catch {
    return null;
  }
}

export function MindMap() {
  return (
    <ReactFlowProvider>
      <MindMapCanvas />
    </ReactFlowProvider>
  );
}

function MindMapCanvas() {
  const rf = useReactFlow<MindFlowNode>();
  const nodesMap = useCollection("nodes");
  const edgesMap = useCollection("edges");
  const links = useCollection("links");
  const products = useCollection("products");
  const autoLayout = useStore((s) => s.data?.workspace.mapAutoLayout ?? true);
  const focusRequest = useStore((s) => s.ui.mapFocusRequest);
  const labels = useStatusLabels();

  const [selectedIds, setSelectedIds] = useState<ID[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<ID | null>(null);
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [focusMode, setFocusMode] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: ID | null } | null>(null);
  const [dropTarget, setDropTarget] = useState<ID | null>(null);
  const [initialViewport] = useState<Viewport | null>(() => (typeof window === "undefined" ? null : readViewport()));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => Object.values(nodesMap), [nodesMap]);
  const hidden = useMemo(() => hiddenNodeIds(nodesMap), [nodesMap]);
  const rootId = useMemo(() => (list.find((n) => n.kind === "root") ?? list.find((n) => !n.parentId))?.id ?? null, [list]);
  const selected = selectedIds.length === 1 ? nodesMap[selectedIds[0]] ?? null : null;

  const childCount = useMemo(() => {
    const m = new Map<ID, number>();
    for (const n of list) if (n.parentId) m.set(n.parentId, (m.get(n.parentId) ?? 0) + 1);
    return m;
  }, [list]);

  const linkCount = useMemo(() => {
    const m = new Map<ID, number>();
    for (const l of Object.values(links)) {
      if (l.aType === "nodes") m.set(l.aId, (m.get(l.aId) ?? 0) + 1);
      if (l.bType === "nodes") m.set(l.bId, (m.get(l.bId) ?? 0) + 1);
    }
    return m;
  }, [links]);

  const searchMatches = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return list.filter((n) => includesText([n.title, n.description, n.notes, n.owner, ...n.tags], q)).map((n) => n.id);
  }, [list, query]);
  const searchSet = useMemo(() => (searchMatches ? new Set(searchMatches) : null), [searchMatches]);
  const hiddenMatches = searchMatches?.filter((id) => hidden.has(id)) ?? [];

  const filtersActive = filters.products.length + filters.types.length + filters.statuses.length > 0;
  const filterKeep = useMemo(() => {
    if (!filtersActive) return null;
    const keep = new Set<ID>();
    for (const n of list) {
      const ok =
        (!filters.products.length || (n.productId && filters.products.includes(n.productId))) &&
        (!filters.types.length || filters.types.includes(n.contentType ?? `kind:${n.kind}`)) &&
        (!filters.statuses.length || (n.status && filters.statuses.includes(n.status)));
      if (ok) {
        keep.add(n.id);
        ancestorsOf(n.id, nodesMap).forEach((a) => keep.add(a));
      }
    }
    return keep;
  }, [filtersActive, filters, list, nodesMap]);

  const focusSet = useMemo(() => {
    if (!focusMode || !selected) return null;
    const s = new Set<ID>([selected.id, ...ancestorsOf(selected.id, nodesMap), ...descendantsOf(selected.id, list)]);
    for (const e of Object.values(edgesMap)) {
      if (e.source === selected.id) s.add(e.target);
      if (e.target === selected.id) s.add(e.source);
    }
    return s;
  }, [focusMode, selected, nodesMap, list, edgesMap]);

  const isDim = useCallback(
    (id: ID) => Boolean((searchSet && !searchSet.has(id)) || (filterKeep && !filterKeep.has(id)) || (focusSet && !focusSet.has(id))),
    [searchSet, filterKeep, focusSet],
  );

  const positions = useMemo(() => Object.fromEntries(list.map((n) => [n.id, n.position])), [list]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const derivedNodes = useMemo<MindFlowNode[]>(
    () =>
      list
        .filter((n) => !hidden.has(n.id))
        .map((n) => ({
          id: n.id,
          type: "mind" as const,
          position: n.position,
          selected: selectedSet.has(n.id),
          className: cn(isDim(n.id) && "dimmed", dropTarget === n.id && "[&>div]:outline-2 [&>div]:outline-dashed [&>div]:outline-offset-4 [&>div]:outline-ink"),
          data: {
            node: n,
            childCount: childCount.get(n.id) ?? 0,
            side: n.kind === "root" ? 1 : sideOf(n.id, nodesMap, positions, rootId),
            editing: editingId === n.id,
            match: Boolean(searchSet?.has(n.id)),
            linkCount: linkCount.get(n.id) ?? 0,
          },
        })),
    [list, hidden, selectedSet, isDim, dropTarget, childCount, nodesMap, positions, rootId, editingId, searchSet, linkCount],
  );

  const [rfNodes, setRfNodes] = useState<MindFlowNode[]>(derivedNodes);
  const [syncedFrom, setSyncedFrom] = useState(derivedNodes);
  if (syncedFrom !== derivedNodes) {
    // Store changed: rebuild nodes but keep React Flow's measurements.
    setSyncedFrom(derivedNodes);
    const byId = new Map(rfNodes.map((n) => [n.id, n]));
    setRfNodes(
      derivedNodes.map((d) => {
        const p = byId.get(d.id);
        return p ? { ...d, measured: p.measured, width: p.width, height: p.height } : d;
      }),
    );
  }

  const rfEdges = useMemo<Edge[]>(() => {
    const out: Edge[] = [];
    for (const n of list) {
      if (!n.parentId || hidden.has(n.id) || !nodesMap[n.parentId]) continue;
      const side = sideOf(n.id, nodesMap, positions, rootId);
      const depth = ancestorsOf(n.id, nodesMap).length;
      out.push({
        id: `h-${n.id}`,
        source: n.parentId,
        target: n.id,
        sourceHandle: side === 1 ? "r" : "l",
        targetHandle: side === 1 ? "lt" : "rt",
        selectable: false,
        focusable: false,
        className: isDim(n.id) || isDim(n.parentId) ? "dimmed" : undefined,
        style: { stroke: depth <= 1 ? "#a1a1aa" : "#d4d4d8", strokeWidth: depth <= 1 ? 1.75 : 1.25 },
      });
    }
    for (const e of Object.values(edgesMap)) {
      const s = nodesMap[e.source];
      const t = nodesMap[e.target];
      if (!s || !t || hidden.has(s.id) || hidden.has(t.id)) continue;
      const sCx = s.position.x + NODE_SIZE[s.kind].w / 2;
      const tCx = t.position.x + NODE_SIZE[t.kind].w / 2;
      const forward = tCx >= sCx;
      const isSel = selectedEdge === e.id;
      out.push({
        id: `x-${e.id}`,
        source: e.source,
        target: e.target,
        sourceHandle: forward ? "r" : "l",
        targetHandle: forward ? "lt" : "rt",
        label: e.label || undefined,
        selected: isSel,
        className: isDim(e.source) && isDim(e.target) ? "dimmed" : undefined,
        style: { stroke: isSel ? "#0a0a0a" : "#52525b", strokeWidth: isSel ? 2 : 1.25, strokeDasharray: "5 4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: isSel ? "#0a0a0a" : "#52525b", width: 14, height: 14 },
        labelStyle: { fontSize: 10.5, fill: "#3f3f46", fontWeight: 500 },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 3,
        interactionWidth: 16,
      });
    }
    return out;
  }, [list, hidden, nodesMap, positions, rootId, isDim, edgesMap, selectedEdge]);

  /* ---------- Selection & focus ---------- */

  const selectNode = useCallback(
    (id: ID | null, center = false) => {
      setSelectedEdge(null);
      setSelectedIds(id ? [id] : []);
      if (id && center) {
        requestAnimationFrame(() => {
          const n = useStore.getState().data?.nodes[id];
          if (!n) return;
          const size = NODE_SIZE[n.kind];
          rf.setCenter(n.position.x + size.w / 2, n.position.y + size.h / 2, { zoom: Math.max(rf.getZoom(), 0.9), duration: 350 });
        });
      }
    },
    [rf],
  );

  useEffect(() => {
    if (!focusRequest) return;
    setUI({ mapFocusRequest: null });
    if (!useStore.getState().data?.nodes[focusRequest]) return;
    revealNode(focusRequest);
    setTimeout(() => selectNode(focusRequest, true), 60);
  }, [focusRequest, selectNode]);

  const onSelectionChange = useCallback(({ nodes, edges }: OnSelectionChangeParams) => {
    const ids = nodes.map((n) => n.id);
    setSelectedIds((prev) => (prev.length === ids.length && prev.every((p, i) => p === ids[i]) ? prev : ids));
    if (edges.length && !nodes.length) {
      const id = edges[0].id;
      if (id.startsWith("x-")) setSelectedEdge(id.slice(2));
    }
  }, []);

  /* ---------- Changes from React Flow ---------- */

  const relayoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNodesChange = useCallback((changes: NodeChange<MindFlowNode>[]) => {
    let resized = false;
    for (const c of changes) {
      if (c.type === "dimensions" && c.dimensions) {
        const prev = measuredSizes.get(c.id);
        if (!prev || Math.abs(prev.h - c.dimensions.height) > 1) resized = true;
        measuredSizes.set(c.id, { w: c.dimensions.width, h: c.dimensions.height });
      }
    }
    setRfNodes((nds) => applyNodeChanges(changes, nds));
    if (resized && useStore.getState().data?.workspace.mapAutoLayout) {
      if (relayoutTimer.current) clearTimeout(relayoutTimer.current);
      relayoutTimer.current = setTimeout(relayout, 120);
    }
  }, []);

  const findDropTarget = useCallback(
    (event: MouseEvent | TouchEvent, dragged: ID[]) => {
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) return null;
      const p = rf.screenToFlowPosition({ x: point.clientX, y: point.clientY });
      const draggedSet = new Set(dragged);
      const nodes = useStore.getState().data!.nodes;
      for (const n of Object.values(nodes)) {
        if (draggedSet.has(n.id) || hidden.has(n.id)) continue;
        const size = measuredSizes.get(n.id) ?? NODE_SIZE[n.kind];
        if (p.x >= n.position.x && p.x <= n.position.x + size.w && p.y >= n.position.y && p.y <= n.position.y + size.h) {
          return dragged.length === 1 && canReparent(dragged[0], n.id) && nodes[dragged[0]].parentId !== n.id ? n.id : null;
        }
      }
      return null;
    },
    [rf, hidden],
  );

  const onNodeDrag = useCallback(
    (event: MouseEvent | TouchEvent, _node: MindFlowNode, nodes: MindFlowNode[]) => {
      const target = findDropTarget(event, nodes.map((n) => n.id));
      setDropTarget((prev) => (prev === target ? prev : target));
    },
    [findDropTarget],
  );

  const onNodeDragStop = useCallback(
    (event: MouseEvent | TouchEvent, _node: MindFlowNode, nodes: MindFlowNode[]) => {
      setDropTarget(null);
      const data = useStore.getState().data!;
      const target = findDropTarget(event, nodes.map((n) => n.id));
      if (target && nodes.length === 1) {
        const id = nodes[0].id;
        const before = { parentId: data.nodes[id].parentId, positions: Object.fromEntries(Object.values(data.nodes).map((n) => [n.id, n.position])) };
        const moved = data.nodes[id];
        // Restore its position first; the reparent decides where it goes.
        reparentNode(id, target);
        toast(`Moved “${moved.title}” under “${data.nodes[target].title}”`, {
          action: {
            label: "Undo",
            run: () => {
              reparentNode(id, before.parentId);
              patchMany("nodes", Object.fromEntries(Object.entries(before.positions).map(([nid, position]) => [nid, { position }])));
            },
          },
        });
        if (!data.workspace.mapAutoLayout) {
          const parent = useStore.getState().data!.nodes[target];
          const pw = NODE_SIZE[parent.kind].w;
          patchMany("nodes", { [id]: { position: { x: parent.position.x + pw + 70, y: parent.position.y } } });
        }
        return;
      }
      patchMany("nodes", Object.fromEntries(nodes.map((n) => [n.id, { position: n.position }])));
      if (data.workspace.mapAutoLayout) {
        updateWorkspace({ mapAutoLayout: false });
        toast("Switched to manual layout so your positions are kept", {
          action: { label: "Re-arrange", run: () => (updateWorkspace({ mapAutoLayout: true }), relayout()) },
        });
      }
    },
    [findDropTarget],
  );

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    const edge = addCrossLink(c.source, c.target);
    if (edge) {
      setSelectedIds([]);
      setSelectedEdge(edge.id);
      toast("Cross-link created — add a label in the panel");
    } else toast("These nodes are already linked");
  }, []);

  /* ---------- Commands ---------- */

  const requestDelete = useCallback(
    async (ids: ID[]) => {
      const data = useStore.getState().data!;
      const deletable = ids.filter((id) => data.nodes[id] && data.nodes[id].kind !== "root");
      if (!deletable.length) {
        toast("The root node can’t be deleted");
        return;
      }
      const all = Object.values(data.nodes);
      if (deletable.length === 1) {
        const id = deletable[0];
        const n = data.nodes[id];
        const desc = descendantsOf(id, all).length;
        const choice = await confirmDialog({
          title: `Delete “${n.title}”?`,
          description: desc
            ? `This node has ${pluralize(desc, "descendant node")}. Linked content records are kept; only their links to these nodes are removed.`
            : "Linked content records are kept; only their links to this node are removed.",
          actions: desc
            ? [
                { id: "keep-children", label: "Delete node, keep children" },
                { id: "branch", label: `Delete branch (${desc + 1})`, danger: true },
              ]
            : [{ id: "branch", label: "Delete", danger: true }],
        });
        if (!choice) return;
        deleteNode(id, choice as "branch" | "keep-children");
      } else {
        const total = new Set(deletable.flatMap((id) => [id, ...descendantsOf(id, all)])).size;
        const choice = await confirmDialog({
          title: `Delete ${deletable.length} selected nodes?`,
          description: `Their branches are deleted too (${pluralize(total, "node")} in total).`,
          confirmLabel: "Delete",
        });
        if (!choice) return;
        deletable.forEach((id) => useStore.getState().data!.nodes[id] && deleteNode(id, "branch"));
      }
      setSelectedIds([]);
    },
    [],
  );

  const addChild = useCallback(
    (parentId: ID | null) => {
      const pid = parentId ?? rootNodeId();
      const n = addChildNode(pid);
      selectNode(n.id, true);
      setEditingId(n.id);
    },
    [selectNode],
  );

  const addSibling = useCallback(
    (id: ID) => {
      const n = addSiblingNode(id);
      if (!n) return addChild(id);
      selectNode(n.id, true);
      setEditingId(n.id);
    },
    [addChild, selectNode],
  );

  const actions = useMemo<MapActions>(
    () => ({
      toggleCollapse: (id) => toggleCollapsed(id),
      commitTitle: (id, title) => updateRecord("nodes", id, { title }),
      stopEditing: () => {
        setEditingId(null);
        wrapperRef.current?.focus();
      },
      startEditing: (id) => setEditingId(id),
    }),
    [],
  );

  const fit = useCallback(() => rf.fitView({ padding: 0.15, duration: 300 }), [rf]);

  const resetView = useCallback(() => {
    setQuery("");
    setFilters(NO_FILTERS);
    setFocusMode(false);
    setSelectedIds([]);
    setSelectedEdge(null);
    window.localStorage.removeItem(VIEWPORT_KEY);
    requestAnimationFrame(() => rf.fitView({ padding: 0.15, duration: 300 }));
  }, [rf]);

  const cycleMatch = useCallback(
    (dir: 1 | -1) => {
      if (!searchMatches?.length) return;
      const i = (matchIndex + dir + searchMatches.length) % searchMatches.length;
      setMatchIndex(i);
      const id = searchMatches[i];
      revealNode(id);
      setTimeout(() => selectNode(id, true), 30);
    },
    [searchMatches, matchIndex, selectNode],
  );

  const createContentFromNode = useCallback((id: ID) => {
    const node = useStore.getState().data!.nodes[id];
    const item = createRecord("content", {
      title: node.title,
      summary: node.description,
      productId: node.productId,
      contentType: node.contentType ?? "article",
      status: node.status ?? "idea",
      priority: node.priority ?? "medium",
      dueDate: node.dueDate,
      owner: node.owner,
      tags: node.tags,
    });
    linkRecords({ collection: "nodes", id }, { collection: "content", id: item.id });
    openRecord("content", item.id);
  }, []);

  /* ---------- Keyboard ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const ui = useStore.getState().ui;
      if (ui.openRecord || ui.paletteOpen || ui.captureOpen || document.querySelector("[role=dialog],[role=alertdialog],[role=menu]")) return;
      if (editingId) return;
      const nodes = useStore.getState().data!.nodes;
      const sel = selectedIds.length === 1 ? nodes[selectedIds[0]] : null;
      if (e.key === "Escape") {
        setSelectedIds([]);
        setSelectedEdge(null);
        setFocusMode(false);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && (selectedIds.length || selectedEdge)) {
        e.preventDefault();
        if (selectedEdge) {
          deleteRecords([{ collection: "edges", id: selectedEdge }]);
          setSelectedEdge(null);
        } else void requestDelete(selectedIds);
        return;
      }
      if (!sel) return;
      if (e.key === "Tab") {
        e.preventDefault();
        addChild(sel.id);
      } else if (e.key === "Enter") {
        e.preventDefault();
        addSibling(sel.id);
      } else if (e.key === "F2") {
        e.preventDefault();
        setEditingId(sel.id);
      } else if (e.key === " ") {
        e.preventDefault();
        toggleCollapsed(sel.id);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFocusMode((f) => !f);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const all = Object.values(nodes);
        const siblings = all.filter((n) => n.parentId === sel.parentId && !hidden.has(n.id)).sort((a, b) => a.position.y - b.position.y);
        const kids = sel.collapsed ? [] : all.filter((n) => n.parentId === sel.id).sort((a, b) => a.position.y - b.position.y);
        const side = sideOf(sel.id, nodes, positions, rootId);
        let next: MapNode | undefined;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const i = siblings.findIndex((s) => s.id === sel.id);
          next = siblings[i + (e.key === "ArrowUp" ? -1 : 1)];
        } else {
          const outward = (e.key === "ArrowRight" && side === 1) || (e.key === "ArrowLeft" && side === -1);
          if (sel.kind === "root") {
            next = kids.find((k) => sideOf(k.id, nodes, positions, rootId) === (e.key === "ArrowRight" ? 1 : -1));
          } else next = outward ? kids[0] : sel.parentId ? nodes[sel.parentId] : undefined;
        }
        if (next) selectNode(next.id, true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, selectedEdge, editingId, hidden, positions, rootId, requestDelete, addChild, addSibling, selectNode]);

  /* ---------- Render ---------- */

  const productList = useMemo(() => Object.values(products).sort((a, b) => a.order - b.order), [products]);
  const menuNode = menu?.nodeId ? nodesMap[menu.nodeId] : null;
  const structural = list.filter((n) => n.kind === "root" || n.kind === "product" || n.kind === "category");
  const selectedEdgeRecord = selectedEdge ? edgesMap[selectedEdge] : null;
  const panelOpen = Boolean(selected || selectedEdgeRecord || selectedIds.length > 1);
  const filterCount = filters.products.length + filters.types.length + filters.statuses.length;

  const toggleFilter = <K extends keyof Filters>(key: K, value: Filters[K][number]) =>
    setFilters((f) => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });

  return (
    <MapActionsContext.Provider value={actions}>
      <div className="flex h-full min-h-0">
        <div ref={wrapperRef} tabIndex={-1} className="relative min-w-0 flex-1 outline-none" aria-label="Mind map canvas">
          <ReactFlow<MindFlowNode>
            className="mindmap-flow bg-subtle"
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onSelectionChange={onSelectionChange}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onEdgeClick={(_, edge) => {
              if (edge.id.startsWith("x-")) {
                setSelectedIds([]);
                setSelectedEdge(edge.id.slice(2));
              }
            }}
            onPaneClick={() => {
              setSelectedIds([]);
              setSelectedEdge(null);
              setMenu(null);
            }}
            onNodeContextMenu={(e, n) => {
              e.preventDefault();
              selectNode(n.id);
              setMenu({ x: e.clientX, y: e.clientY, nodeId: n.id });
            }}
            onPaneContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, nodeId: null });
            }}
            onMoveEnd={(_, vp) => window.localStorage.setItem(VIEWPORT_KEY, JSON.stringify(vp))}
            defaultViewport={initialViewport ?? undefined}
            fitView={!initialViewport}
            fitViewOptions={{ padding: 0.15 }}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode={null}
            selectionKeyCode="Shift"
            multiSelectionKeyCode={["Meta", "Control"]}
            minZoom={0.15}
            maxZoom={2}
            onlyRenderVisibleElements
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#d4d4d8" />
            <Controls showInteractive={false} position="bottom-left" className="!rounded-lg !border !border-line !bg-canvas [&_button]:!border-line" />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              className="max-md:!hidden"
              maskColor="rgba(250,250,250,0.7)"
              nodeColor={(n) => {
                const k = (n.data as { node?: MapNode })?.node?.kind;
                return k === "root" ? "#0a0a0a" : k === "product" ? "#52525b" : "#d4d4d8";
              }}
              nodeBorderRadius={3}
            />
          </ReactFlow>

          {/* Toolbar */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">
            <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-line bg-canvas p-1 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 size-3.5 text-ink-4" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setMatchIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      cycleMatch(e.shiftKey ? -1 : 1);
                    } else if (e.key === "Escape") {
                      setQuery("");
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Search map…"
                  aria-label="Search map"
                  className="h-7 w-36 rounded-md bg-transparent pr-2 pl-7 text-[13px] outline-none placeholder:text-ink-4 focus:bg-subtle focus-visible:outline-none sm:w-48"
                />
                {query ? (
                  <span className="flex items-center gap-1 pr-1 text-2xs whitespace-nowrap text-ink-3">
                    {searchMatches?.length ? `${matchIndex >= 0 ? matchIndex + 1 : "–"}/${searchMatches.length}` : "0"}
                    <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="rounded p-0.5 hover:bg-muted">
                      <X className="size-3" />
                    </button>
                  </span>
                ) : null}
              </div>
              <span className="h-5 w-px bg-line" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Filters" className={cn(filterCount && "text-ink")}>
                    <Filter /> <span className="max-sm:hidden">Filter</span>
                    {filterCount ? <span className="rounded bg-ink px-1 text-[10px] text-white">{filterCount}</span> : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <FilterGroup title="Product">
                    {productList.map((p) => (
                      <FilterChip key={p.id} active={filters.products.includes(p.id)} onClick={() => toggleFilter("products", p.id)}>
                        {p.name}
                      </FilterChip>
                    ))}
                  </FilterGroup>
                  <FilterGroup title="Status">
                    {STATUSES.map((s) => (
                      <FilterChip key={s} active={filters.statuses.includes(s)} onClick={() => toggleFilter("statuses", s)}>
                        <StatusGlyph status={s} size={10} /> {labels[s]}
                      </FilterChip>
                    ))}
                  </FilterGroup>
                  <FilterGroup title="Content type">
                    {CONTENT_TYPES.filter((t) => list.some((n) => n.contentType === t)).map((t) => (
                      <FilterChip key={t} active={filters.types.includes(t)} onClick={() => toggleFilter("types", t)}>
                        {CONTENT_TYPE_LABELS[t]}
                      </FilterChip>
                    ))}
                    {(["idea", "initiative", "research", "note"] as NodeKind[]).map((k) => (
                      <FilterChip key={k} active={filters.types.includes(`kind:${k}`)} onClick={() => toggleFilter("types", `kind:${k}`)}>
                        {NODE_KIND_LABELS[k]} (untyped)
                      </FilterChip>
                    ))}
                  </FilterGroup>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-2xs text-ink-3">
                    <span>Non-matching nodes are dimmed, not hidden.</span>
                    <button type="button" className="font-medium text-ink hover:underline disabled:opacity-40" disabled={!filterCount} onClick={() => setFilters(NO_FILTERS)}>
                      Clear
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              <Tooltip content={selected ? "Emphasize the selected node’s branch and links (F)" : "Select a node to use focus mode"}>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={focusMode}
                  disabled={!selected && !focusMode}
                  onClick={() => setFocusMode((f) => !f)}
                  className={cn(focusMode && "bg-ink text-white hover:bg-ink-2 hover:text-white")}
                >
                  <Crosshair /> <span className="max-sm:hidden">Focus</span>
                </Button>
              </Tooltip>
            </div>

            {hiddenMatches.length ? (
              <div className="pointer-events-auto flex h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-xs text-ink-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                {pluralize(hiddenMatches.length, "match", "matches")} inside collapsed branches
                <button type="button" className="font-medium text-ink underline underline-offset-2" onClick={() => hiddenMatches.forEach(revealNode)}>
                  Reveal
                </button>
              </div>
            ) : null}

            <div className="pointer-events-auto ml-auto flex items-center gap-1 rounded-lg border border-line bg-canvas p-1 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <Tooltip content={selected ? "Add a child to the selected node (Tab)" : "Add a branch to the root"}>
                <Button variant="ghost" size="sm" onClick={() => addChild(selected?.id ?? null)}>
                  <Plus /> <span className="max-sm:hidden">Add node</span>
                </Button>
              </Tooltip>
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Layout options">
                    <LayoutGrid /> <span className="max-sm:hidden">Layout</span>
                  </Button>
                </MenuTrigger>
                <MenuContent className="w-64">
                  <MenuCheckItem
                    checked={autoLayout}
                    onSelect={() => {
                      updateWorkspace({ mapAutoLayout: !autoLayout });
                      if (!autoLayout) relayout();
                    }}
                  >
                    Auto-arrange
                  </MenuCheckItem>
                  <p className="px-2 pb-1.5 pl-8 text-2xs leading-snug text-ink-4">
                    Re-runs the layout when nodes are added, moved between branches, or collapsed. Dragging a node turns it off.
                  </p>
                  <MenuSeparator />
                  <MenuItem onSelect={() => relayout()}>
                    <Wand2 /> Tidy layout now
                  </MenuItem>
                  <MenuItem onSelect={() => setAllCollapsed(false)}>
                    <ChevronsUpDown /> Expand all
                  </MenuItem>
                  <MenuItem onSelect={() => setAllCollapsed(true, 1)}>
                    <ChevronsDownUp /> Collapse to products
                  </MenuItem>
                  <MenuItem onSelect={() => setAllCollapsed(true, 2)}>
                    <ChevronsDownUp /> Collapse to categories
                  </MenuItem>
                </MenuContent>
              </Menu>
              <Tooltip content="Fit to screen">
                <Button variant="ghost" size="icon-sm" aria-label="Fit to screen" onClick={fit}>
                  <Maximize />
                </Button>
              </Tooltip>
              <Tooltip content="Reset view, search, filters and focus">
                <Button variant="ghost" size="icon-sm" aria-label="Reset view" onClick={resetView}>
                  <RotateCcw />
                </Button>
              </Tooltip>
              <Legend />
            </div>
          </div>

          {/* Context menu */}
          {menu ? (
            <Menu open onOpenChange={(o) => !o && setMenu(null)}>
              <MenuTrigger asChild>
                <span className="fixed size-px" style={{ left: menu.x, top: menu.y }} />
              </MenuTrigger>
              <MenuContent align="start" className="w-56">
                {menuNode ? (
                  <>
                    <MenuLabel>{menuNode.title.slice(0, 40)}</MenuLabel>
                    <MenuItem onSelect={() => addChild(menuNode.id)} shortcut="Tab">
                      <Plus /> Add child
                    </MenuItem>
                    {menuNode.kind !== "root" ? (
                      <MenuItem onSelect={() => addSibling(menuNode.id)} shortcut="Enter">
                        <Plus /> Add sibling
                      </MenuItem>
                    ) : null}
                    <MenuItem onSelect={() => setEditingId(menuNode.id)} shortcut="F2">
                      <Pencil /> Rename
                    </MenuItem>
                    {menuNode.kind !== "root" ? (
                      <SubMenu label="Change type">
                        {NODE_KINDS.filter((k) => k !== "root").map((k) => (
                          <MenuCheckItem key={k} checked={menuNode.kind === k} onSelect={() => updateRecord("nodes", menuNode.id, { kind: k })}>
                            {NODE_KIND_LABELS[k]}
                          </MenuCheckItem>
                        ))}
                      </SubMenu>
                    ) : null}
                    {menuNode.kind !== "root" ? (
                      <SubMenu label="Set status">
                        {STATUSES.map((s) => (
                          <MenuCheckItem key={s} checked={menuNode.status === s} onSelect={() => updateRecord("nodes", menuNode.id, { status: s })}>
                            {labels[s]}
                          </MenuCheckItem>
                        ))}
                      </SubMenu>
                    ) : null}
                    {menuNode.kind !== "root" ? (
                      <SubMenu label="Move under" icon={<MoveRight />}>
                        {structural
                          .filter((s) => canReparent(menuNode.id, s.id) && s.id !== menuNode.parentId)
                          .map((s) => (
                            <MenuItem key={s.id} onSelect={() => reparentNode(menuNode.id, s.id)}>
                              <span className={cn(s.kind === "category" && "pl-3")}>{s.title}</span>
                            </MenuItem>
                          ))}
                      </SubMenu>
                    ) : null}
                    {childCount.get(menuNode.id) ? (
                      <MenuItem onSelect={() => toggleCollapsed(menuNode.id)} shortcut="Space">
                        {menuNode.collapsed ? <ChevronsUpDown /> : <ChevronsDownUp />}
                        {menuNode.collapsed ? "Expand branch" : "Collapse branch"}
                      </MenuItem>
                    ) : null}
                    <MenuItem
                      onSelect={() => {
                        selectNode(menuNode.id);
                        setFocusMode(true);
                      }}
                      shortcut="F"
                    >
                      <Crosshair /> Focus on branch
                    </MenuItem>
                    {menuNode.kind !== "root" ? (
                      <MenuItem onSelect={() => createContentFromNode(menuNode.id)}>
                        <FilePlus2 /> Create content record
                      </MenuItem>
                    ) : null}
                    {menuNode.kind !== "root" ? (
                      <>
                        <MenuSeparator />
                        <MenuItem danger onSelect={() => void requestDelete([menuNode.id])} shortcut="Del">
                          <Trash2 /> Delete
                        </MenuItem>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <MenuItem onSelect={() => addChild(null)}>
                      <Plus /> Add branch to root
                    </MenuItem>
                    <MenuItem onSelect={() => relayout()}>
                      <Wand2 /> Tidy layout
                    </MenuItem>
                    <MenuItem onSelect={fit}>
                      <Maximize /> Fit to screen
                    </MenuItem>
                    <MenuItem onSelect={() => setAllCollapsed(false)}>
                      <ChevronsUpDown /> Expand all
                    </MenuItem>
                  </>
                )}
              </MenuContent>
            </Menu>
          ) : null}

          {list.length <= 1 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center">
              <div className="pointer-events-auto rounded-lg border border-line bg-canvas px-4 py-3 text-center text-[13px] shadow-sm">
                <p className="font-medium">Your map is empty</p>
                <p className="mt-0.5 text-xs text-ink-3">Select the root and press Tab, or use “Add node”, to create your first branch.</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right panel */}
        {panelOpen ? (
          <aside
            className="fixed inset-0 z-30 bg-canvas animate-slide-in-right md:static md:z-auto md:w-[380px] md:shrink-0 md:border-l md:border-line"
            aria-label="Node details"
          >
            {selected ? (
              <NodePanel
                key={selected.id}
                node={selected}
                focusMode={focusMode}
                onClose={() => setSelectedIds([])}
                onSelect={(id) => {
                  revealNode(id);
                  selectNode(id, true);
                }}
                onDelete={(id) => void requestDelete([id])}
                onFocus={() => setFocusMode((f) => !f)}
              />
            ) : selectedEdgeRecord ? (
              <EdgePanel edge={selectedEdgeRecord} onClose={() => setSelectedEdge(null)} onSelect={(id) => selectNode(id, true)} />
            ) : (
              <div className="flex h-full flex-col p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{pluralize(selectedIds.length, "node")} selected</p>
                  <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={() => setSelectedIds([])}>
                    <X />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-ink-3">Drag to move them together, or apply a status.</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      onClick={() => selectedIds.forEach((id) => nodesMap[id]?.kind !== "root" && updateRecord("nodes", id, { status: s }))}
                    >
                      <StatusGlyph status={s} size={10} /> {labels[s]}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" className="mt-6 self-start text-danger" onClick={() => void requestDelete(selectedIds)}>
                  <Trash2 /> Delete selected
                </Button>
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </MapActionsContext.Provider>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-2xs font-semibold tracking-wide text-ink-3 uppercase">{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-xs transition-colors",
        active ? "border-ink bg-ink text-white [&_svg]:text-white" : "border-line text-ink-2 hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}

function Legend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Map legend and help">
          <HelpCircle />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 text-xs text-ink-2">
        <p className="mb-2 text-2xs font-semibold tracking-wide text-ink-3 uppercase">Legend</p>
        <ul className="flex flex-col gap-2">
          <li className="flex items-center gap-2.5">
            <svg width="36" height="8" aria-hidden>
              <path d="M0 4 H36" stroke="#a1a1aa" strokeWidth="1.75" />
            </svg>
            Hierarchy (parent → child)
          </li>
          <li className="flex items-center gap-2.5">
            <svg width="36" height="8" aria-hidden>
              <path d="M0 4 H32" stroke="#52525b" strokeWidth="1.25" strokeDasharray="5 4" />
              <path d="M30 1 L36 4 L30 7 Z" fill="#52525b" />
            </svg>
            Cross-reference link
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex gap-1">
              {(["idea", "drafting", "in_review", "published"] as Status[]).map((s) => (
                <StatusGlyph key={s} status={s} />
              ))}
            </span>
            Status fills as work progresses
          </li>
        </ul>
        <p className="mt-3 mb-1.5 text-2xs font-semibold tracking-wide text-ink-3 uppercase">How to</p>
        <ul className="flex flex-col gap-1 leading-relaxed">
          <li>Double-click a node to rename it.</li>
          <li>Drag a node onto another to move it under that node.</li>
          <li>Drag from a node’s side handle to another node to cross-link.</li>
          <li>Right-click for more actions. Shift-drag to select several.</li>
          <li>
            <Kbd>Tab</Kbd> child · <Kbd>Enter</Kbd> sibling · <Kbd>Space</Kbd> collapse · arrows navigate
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
