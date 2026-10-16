"use client";

import { ArrowUpRight, CornerDownRight, Crosshair, FilePlus2, Link2, MoreHorizontal, MoveRight, Plus, Trash2, X } from "lucide-react";
import { descendantsOf } from "@/lib/layout";
import { addChildNode, addCrossLink, reparentNode } from "@/lib/map-ops";
import { createRecord, deleteRecords, linkRecords, openRecord, updateRecord, useData } from "@/lib/store";
import { CONTENT_TYPES, CONTENT_TYPE_LABELS, NODE_KINDS, NODE_KIND_LABELS, PRIORITIES, PRIORITY_LABELS, type ID, type MapEdge, type MapNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LinksField, ProductSelect, StatusSelect, TagsInput, TitleInput } from "../records/fields";
import { RecordPicker } from "../records/link-picker";
import { StatusGlyph } from "../records/status";
import { Button } from "../ui/button";
import { Field, Input, Select, Textarea } from "../ui/input";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "../ui/menu";
import { ExampleBadge } from "../ui/misc";

function PanelSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-t border-line px-4 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-2xs font-semibold tracking-wide text-ink-3 uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NodePanel({
  node,
  onClose,
  onSelect,
  onDelete,
  onFocus,
  focusMode,
}: {
  node: MapNode;
  onClose: () => void;
  onSelect: (id: ID) => void;
  onDelete: (id: ID) => void;
  onFocus: () => void;
  focusMode: boolean;
}) {
  const data = useData();
  const set = (patch: Partial<MapNode>) => updateRecord("nodes", node.id, patch);
  const parent = node.parentId ? data.nodes[node.parentId] : null;
  const children = Object.values(data.nodes)
    .filter((n) => n.parentId === node.id)
    .sort((a, b) => a.order - b.order);
  const crossLinks = Object.values(data.edges).filter((e) => e.source === node.id || e.target === node.id);
  const descendants = new Set(descendantsOf(node.id, Object.values(data.nodes)));
  const moveExclude = new Set<string>([`nodes:${node.id}`, ...[...descendants].map((d) => `nodes:${d}`)]);
  if (parent) moveExclude.add(`nodes:${parent.id}`);
  const linkExclude = new Set<string>([
    `nodes:${node.id}`,
    ...crossLinks.map((e) => `nodes:${e.source === node.id ? e.target : e.source}`),
  ]);
  const isStructural = node.kind === "root";

  const createContent = () => {
    const item = createRecord("content", {
      title: node.title,
      summary: node.description,
      productId: node.productId,
      contentType: node.contentType ?? "article",
      status: node.status ?? "idea",
      priority: node.priority ?? "medium",
      owner: node.owner,
      dueDate: node.dueDate,
      tags: node.tags,
    });
    linkRecords({ collection: "nodes", id: node.id }, { collection: "content", id: item.id });
    if (node.kind === "idea") set({ kind: "content" });
    openRecord("content", item.id);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 px-4 pt-3 pb-2">
        <Select
          aria-label="Node type"
          className="w-40"
          value={node.kind}
          disabled={isStructural}
          onChange={(e) => set({ kind: e.target.value as MapNode["kind"] })}
        >
          {NODE_KINDS.filter((k) => k !== "root" || isStructural).map((k) => (
            <option key={k} value={k}>
              {NODE_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
        {node.isExample ? <ExampleBadge /> : null}
        <div className="ml-auto flex items-center">
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Node actions">
                <MoreHorizontal />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => onSelect(addChildNode(node.id).id)} shortcut="Tab">
                <Plus /> Add child
              </MenuItem>
              <MenuItem onSelect={onFocus} shortcut="F">
                <Crosshair /> {focusMode ? "Exit focus mode" : "Focus on this branch"}
              </MenuItem>
              <MenuItem onSelect={createContent}>
                <FilePlus2 /> Create content record
              </MenuItem>
              {node.isExample ? <MenuItem onSelect={() => set({ isExample: false })}>Remove “Example” label</MenuItem> : null}
              {!isStructural ? (
                <>
                  <MenuSeparator />
                  <MenuItem danger onSelect={() => onDelete(node.id)} shortcut="Del">
                    <Trash2 /> Delete node
                  </MenuItem>
                </>
              ) : null}
            </MenuContent>
          </Menu>
          <Button variant="ghost" size="icon-sm" aria-label="Close panel" onClick={onClose}>
            <X />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-4">
          <TitleInput key={node.id} value={node.title} onCommit={(title) => set({ title })} className="text-base" />
          <Textarea
            aria-label="Description"
            className="mt-2"
            rows={3}
            value={node.description}
            placeholder="Describe this node…"
            onChange={(e) => set({ description: e.target.value })}
          />
        </div>

        <PanelSection title="Details">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Product / initiative" className="col-span-2">
              {(id) => <ProductSelect id={id} value={node.productId} onChange={(productId) => set({ productId })} />}
            </Field>
            <Field label="Content type">
              {(id) => (
                <Select id={id} value={node.contentType ?? ""} onChange={(e) => set({ contentType: (e.target.value || null) as MapNode["contentType"] })}>
                  <option value="">None</option>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CONTENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Status">
              {(id) => <StatusSelect id={id} nullable value={node.status} onChange={(v) => set({ status: v as MapNode["status"] })} />}
            </Field>
            <Field label="Priority">
              {(id) => (
                <Select id={id} value={node.priority ?? ""} onChange={(e) => set({ priority: (e.target.value || null) as MapNode["priority"] })}>
                  <option value="">None</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Due date">
              {(id) => <Input id={id} type="date" value={node.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />}
            </Field>
            <Field label="Owner" className="col-span-2">
              {(id) => <Input id={id} value={node.owner} placeholder="Unassigned" onChange={(e) => set({ owner: e.target.value })} />}
            </Field>
            <Field label="Tags" className="col-span-2">
              {(id) => <TagsInput id={id} value={node.tags} onChange={(tags) => set({ tags })} />}
            </Field>
          </div>
        </PanelSection>

        <PanelSection
          title="Hierarchy"
          action={
            !isStructural ? (
              <RecordPicker
                targets={["nodes"]}
                exclude={moveExclude}
                placeholder="Move under…"
                onPick={(_, id) => reparentNode(node.id, id)}
                trigger={
                  <button type="button" className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-ink-3 hover:bg-muted hover:text-ink">
                    <MoveRight className="size-3" /> Move
                  </button>
                }
              />
            ) : null
          }
        >
          <div className="flex flex-col gap-1 text-[13px]">
            {parent ? (
              <button type="button" onClick={() => onSelect(parent.id)} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-ink-3 hover:bg-muted hover:text-ink">
                <ArrowUpRight className="size-3.5" />
                <span className="truncate">{parent.title}</span>
              </button>
            ) : !isStructural ? (
              <p className="px-1.5 text-xs text-ink-4">Floating node — not attached to the tree.</p>
            ) : null}
            {children.map((c) => (
              <button key={c.id} type="button" onClick={() => onSelect(c.id)} className="flex items-center gap-2 rounded-md px-1.5 py-1 pl-5 text-left hover:bg-muted">
                <CornerDownRight className="size-3.5 text-ink-4" />
                <StatusGlyph status={c.status} size={10} />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onSelect(addChildNode(node.id).id)}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 pl-5 text-left text-xs text-ink-3 hover:bg-muted hover:text-ink"
            >
              <Plus className="size-3.5" /> Add child
            </button>
          </div>
        </PanelSection>

        <PanelSection
          title="Cross-links"
          action={
            <RecordPicker
              targets={["nodes"]}
              exclude={linkExclude}
              placeholder="Link to node…"
              onPick={(_, id) => addCrossLink(node.id, id)}
              trigger={
                <button type="button" className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-ink-3 hover:bg-muted hover:text-ink">
                  <Link2 className="size-3" /> Link
                </button>
              }
            />
          }
        >
          {crossLinks.length ? (
            <ul className="flex flex-col gap-1">
              {crossLinks.map((e) => {
                const otherId = e.source === node.id ? e.target : e.source;
                const other = data.nodes[otherId];
                return (
                  <CrossLinkRow key={e.id} edge={e} title={other?.title ?? "Missing node"} outgoing={e.source === node.id} onSelect={() => onSelect(otherId)} />
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-ink-4">Drag from a node’s edge handle to another node, or use Link.</p>
          )}
        </PanelSection>

        <PanelSection title="Linked records">
          <div className="flex flex-col gap-4">
            <LinksField owner={{ collection: "nodes", id: node.id }} target="content" label="Content records" hint="No content records linked." />
            {!isStructural ? (
              <Button size="sm" variant="outline" className="-mt-2 self-start" onClick={createContent}>
                <FilePlus2 /> Create content record from node
              </Button>
            ) : null}
            <LinksField owner={{ collection: "nodes", id: node.id }} target="initiatives" label="Initiatives" />
            <LinksField owner={{ collection: "nodes", id: node.id }} target="research" label="Research" />
          </div>
        </PanelSection>

        <PanelSection title="Notes and next actions">
          <div className="flex flex-col gap-3">
            <Field label="Notes">
              {(id) => <Textarea id={id} rows={3} value={node.notes} onChange={(e) => set({ notes: e.target.value })} />}
            </Field>
            <Field label="Next actions">
              {(id) => <Textarea id={id} rows={3} value={node.nextActions} placeholder="What happens next?" onChange={(e) => set({ nextActions: e.target.value })} />}
            </Field>
          </div>
        </PanelSection>
      </div>
    </div>
  );
}

function CrossLinkRow({ edge, title, outgoing, onSelect }: { edge: MapEdge; title: string; outgoing: boolean; onSelect: () => void }) {
  return (
    <li className="group flex items-center gap-2 rounded-md border border-line px-2 py-1.5">
      <span className="text-2xs text-ink-4">{outgoing ? "→" : "←"}</span>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-[13px] hover:underline">
        {title}
      </button>
      <input
        aria-label="Link label"
        value={edge.label}
        placeholder="label"
        onChange={(e) => updateRecord("edges", edge.id, { label: e.target.value })}
        className={cn("w-20 rounded bg-transparent px-1 text-2xs text-ink-3 outline-none placeholder:text-ink-4 focus:bg-muted focus-visible:outline-none")}
      />
      <button
        type="button"
        aria-label="Remove cross-link"
        onClick={() => deleteRecords([{ collection: "edges", id: edge.id }])}
        className="rounded p-0.5 text-ink-4 opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-ink focus-visible:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

export function EdgePanel({ edge, onClose, onSelect }: { edge: MapEdge; onClose: () => void; onSelect: (id: ID) => void }) {
  const data = useData();
  const source = data.nodes[edge.source];
  const target = data.nodes[edge.target];
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 px-4 pt-3 pb-2">
        <Link2 className="size-4 text-ink-3" />
        <span className="text-xs font-medium text-ink-3">Cross-link</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close panel" onClick={onClose}>
          <X />
        </Button>
      </header>
      <div className="flex flex-col gap-4 px-4 py-3">
        <div className="flex flex-col gap-1.5 text-[13px]">
          <button type="button" onClick={() => onSelect(edge.source)} className="truncate text-left font-medium hover:underline">
            {source?.title}
          </button>
          <span className="text-xs text-ink-4">{edge.label || "relates to"} ↓</span>
          <button type="button" onClick={() => onSelect(edge.target)} className="truncate text-left font-medium hover:underline">
            {target?.title}
          </button>
        </div>
        <Field label="Label" hint="Describe the relationship, e.g. “references” or “informs”.">
          {(id) => <Input id={id} value={edge.label} onChange={(e) => updateRecord("edges", edge.id, { label: e.target.value })} />}
        </Field>
        <Button variant="outline" className="self-start text-danger" onClick={() => deleteRecords([{ collection: "edges", id: edge.id }])}>
          <Trash2 /> Remove cross-link
        </Button>
      </div>
    </div>
  );
}
