"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Link2 } from "lucide-react";
import { memo, useState } from "react";
import { NODE_SIZE } from "@/lib/layout";
import { CONTENT_TYPE_LABELS, NODE_KIND_LABELS, type MapNode } from "@/lib/types";
import { cn, relativeDay } from "@/lib/utils";
import { StatusGlyph, useStatusLabels } from "../records/status";
import { useMapActions } from "./map-context";

export type MindNodeData = {
  node: MapNode;
  childCount: number;
  side: 1 | -1;
  editing: boolean;
  match: boolean;
  linkCount: number;
};
export type MindFlowNode = Node<MindNodeData, "mind">;

function TitleEditor({ id, initial }: { id: string; initial: string }) {
  const { commitTitle, stopEditing } = useMapActions();
  const [value, setValue] = useState(initial);
  const commit = () => {
    const v = value.trim();
    if (v) commitTitle(id, v);
    stopEditing();
  };
  return (
    <textarea
      autoFocus
      rows={2}
      value={value}
      aria-label="Node title"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          stopEditing();
        }
      }}
      className="nodrag nopan w-full resize-none bg-transparent leading-snug outline-none focus-visible:outline-none"
    />
  );
}

function MindNodeComponent({ id, data, selected }: NodeProps<MindFlowNode>) {
  const { node, childCount, side, editing, match, linkCount } = data;
  const { toggleCollapse, startEditing } = useMapActions();
  const labels = useStatusLabels();
  const size = NODE_SIZE[node.kind];
  const isLeaf = !["root", "product", "category"].includes(node.kind);

  const toggle =
    childCount > 0 && node.kind !== "root" ? (
      <button
        type="button"
        aria-label={node.collapsed ? `Expand ${childCount} children` : "Collapse branch"}
        aria-expanded={!node.collapsed}
        onClick={(e) => {
          e.stopPropagation();
          toggleCollapse(id);
        }}
        className={cn(
          "nodrag absolute top-1/2 z-10 flex h-[18px] min-w-[18px] -translate-y-1/2 items-center justify-center rounded-full border border-ink-4 bg-canvas px-1 font-mono text-[10px] leading-none text-ink-2 transition-colors hover:border-ink hover:text-ink",
          side === 1 ? "-right-[9px] translate-x-full" : "-left-[9px] -translate-x-full",
          node.collapsed && "border-ink bg-ink text-white hover:text-white",
        )}
      >
        {node.collapsed ? childCount : "–"}
      </button>
    ) : null;

  const handles = (
    <>
      <Handle id="l" type="source" position={Position.Left} />
      <Handle id="r" type="source" position={Position.Right} />
      <Handle id="lt" type="target" position={Position.Left} className="!opacity-0" />
      <Handle id="rt" type="target" position={Position.Right} className="!opacity-0" />
    </>
  );

  const common = cn(
    "relative flex flex-col justify-center transition-shadow",
    selected && "ring-2 ring-ink ring-offset-2",
    match && !selected && "ring-2 ring-ink-3 ring-offset-1",
  );

  const title = editing ? <TitleEditor id={id} initial={node.title} /> : <span className="line-clamp-2 break-words">{node.title}</span>;

  if (node.kind === "root") {
    return (
      <div
        className={cn(common, "items-center rounded-xl bg-ink px-5 text-center text-[15px] font-semibold tracking-tight text-white")}
        style={{ width: size.w, minHeight: size.h }}
        onDoubleClick={() => startEditing(id)}
      >
        {handles}
        {title}
      </div>
    );
  }

  if (node.kind === "product") {
    return (
      <div
        className={cn(common, "rounded-lg border-[1.5px] border-ink bg-canvas px-3.5 py-2 text-[13.5px] font-semibold")}
        style={{ width: size.w, minHeight: size.h }}
        onDoubleClick={() => startEditing(id)}
      >
        {handles}
        {title}
        {toggle}
      </div>
    );
  }

  if (node.kind === "category") {
    return (
      <div
        className={cn(common, "rounded-md border border-line-strong bg-subtle px-3 py-1.5 text-[12.5px] font-medium text-ink-2")}
        style={{ width: size.w, minHeight: size.h }}
        onDoubleClick={() => startEditing(id)}
      >
        {handles}
        {title}
        {toggle}
      </div>
    );
  }

  const due = relativeDay(node.dueDate);
  return (
    <div
      className={cn(
        common,
        "gap-1 rounded-lg border bg-canvas px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        node.kind === "note" ? "border-dashed border-line-strong" : "border-line",
        isLeaf && "hover:border-line-strong",
      )}
      style={{ width: size.w, minHeight: size.h }}
      onDoubleClick={() => startEditing(id)}
    >
      {handles}
      <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-ink-4 uppercase">
        {node.status ? <StatusGlyph status={node.status} size={10} /> : null}
        <span className="truncate">{node.contentType ? CONTENT_TYPE_LABELS[node.contentType] : NODE_KIND_LABELS[node.kind]}</span>
        {node.status ? <span className="truncate normal-case tracking-normal text-ink-3">· {labels[node.status]}</span> : null}
        {node.isExample ? <span className="ml-auto shrink-0 rounded border border-dashed border-line-strong px-1 text-[9px] text-ink-4">EXAMPLE</span> : null}
      </div>
      <div className="text-[12.5px] leading-snug font-medium text-ink">{title}</div>
      {due || linkCount ? (
        <div className="flex items-center gap-2 text-[10.5px] text-ink-3">
          {due ? <span className={cn(due.includes("overdue") && "font-medium text-danger")}>{due}</span> : null}
          {linkCount ? (
            <span className="inline-flex items-center gap-0.5">
              <Link2 className="size-3" />
              {linkCount}
            </span>
          ) : null}
        </div>
      ) : null}
      {toggle}
    </div>
  );
}

export const MindNode = memo(MindNodeComponent);
