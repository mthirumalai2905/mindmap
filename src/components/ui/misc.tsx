"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className, variant = "outline" }: { children: ReactNode; className?: string; variant?: "outline" | "solid" | "soft" | "dashed" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded px-1.5 text-2xs font-medium whitespace-nowrap",
        variant === "outline" && "border border-line text-ink-2",
        variant === "solid" && "bg-ink text-white",
        variant === "soft" && "bg-muted text-ink-2",
        variant === "dashed" && "border border-dashed border-line-strong text-ink-3",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ExampleBadge() {
  return (
    <Badge variant="dashed" className="tracking-wide uppercase">
      Example
    </Badge>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-subtle px-1 font-mono text-[10px] text-ink-3">
      {children}
    </kbd>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-3 text-ink-4 [&_svg]:size-6">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-3">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-8 items-center rounded-md border border-line bg-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-full items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium text-ink-3 transition-colors hover:text-ink [&_svg]:size-3.5",
            value === o.value && "bg-canvas text-ink shadow-[0_0_0_1px_var(--color-line)]",
          )}
        >
          {o.icon}
          <span className={cn(o.icon && "max-sm:sr-only")}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line px-4 pt-6 pb-4 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-[13px] text-ink-3">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
