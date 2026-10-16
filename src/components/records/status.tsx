"use client";

import { useStore } from "@/lib/store";
import {
  DEFAULT_STATUS_LABELS,
  PRIORITY_LABELS,
  STATUSES,
  TASK_STATUS_LABELS,
  type Priority,
  type Status,
  type TaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function useStatusLabels(): Record<Status, string> {
  return useStore((s) => s.data?.workspace.statusLabels ?? DEFAULT_STATUS_LABELS);
}

/** Lifecycle progress as a pie that fills from Idea (empty) to Published (full). */
export function StatusGlyph({ status, size = 12, className }: { status: Status | null; size?: number; className?: string }) {
  if (!status) return null;
  const r = size / 2 - 1;
  const c = size / 2;
  if (status === "archived") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("shrink-0 text-ink-4", className)} aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={1.25} />
        <line x1={c - r * 0.6} y1={c + r * 0.6} x2={c + r * 0.6} y2={c - r * 0.6} stroke="currentColor" strokeWidth={1.25} />
      </svg>
    );
  }
  const index = STATUSES.indexOf(status);
  const fraction = index / 6; // idea → 0, published → 1
  const inner = r - 1.6;
  const angle = fraction * Math.PI * 2;
  const x = c + inner * Math.sin(angle);
  const y = c - inner * Math.cos(angle);
  const large = fraction > 0.5 ? 1 : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("shrink-0 text-ink", className)} aria-hidden>
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeDasharray={status === "idea" ? "2 1.6" : undefined}
        opacity={status === "idea" ? 0.6 : 1}
      />
      {fraction >= 1 ? (
        <circle cx={c} cy={c} r={inner} fill="currentColor" />
      ) : fraction > 0 ? (
        <path d={`M ${c} ${c} L ${c} ${c - inner} A ${inner} ${inner} 0 ${large} 1 ${x} ${y} Z`} fill="currentColor" />
      ) : null}
    </svg>
  );
}

export function StatusLabel({ status, className }: { status: Status | null; className?: string }) {
  const labels = useStatusLabels();
  if (!status) return <span className="text-ink-4">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-2", className)}>
      <StatusGlyph status={status} />
      {labels[status]}
    </span>
  );
}

export function PriorityMark({ priority, showLabel = true }: { priority: Priority | null; showLabel?: boolean }) {
  if (!priority) return <span className="text-ink-4">—</span>;
  const bars = { urgent: 4, high: 3, medium: 2, low: 1 }[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-2" title={`${PRIORITY_LABELS[priority]} priority`}>
      <span className="flex h-2.5 items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span key={b} className={cn("w-[3px] rounded-[1px]", b <= bars ? "bg-ink" : "bg-line-strong")} style={{ height: `${b * 25}%` }} />
        ))}
      </span>
      {showLabel ? PRIORITY_LABELS[priority] : <span className="sr-only">{PRIORITY_LABELS[priority]}</span>}
    </span>
  );
}

export function TaskStatusMark({ status }: { status: TaskStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-2">
      <span
        className={cn(
          "size-2.5 rounded-sm border",
          status === "todo" && "border-ink-4",
          status === "in_progress" && "border-ink bg-[linear-gradient(90deg,var(--color-ink)_50%,transparent_50%)]",
          status === "blocked" && "border-danger",
          status === "done" && "border-ink bg-ink",
        )}
        aria-hidden
      />
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
