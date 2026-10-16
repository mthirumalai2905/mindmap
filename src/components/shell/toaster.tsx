"use client";

import { X } from "lucide-react";
import { dismissToast, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-lg border bg-ink px-3.5 py-2.5 text-[13px] text-white shadow-lg animate-pop",
            t.tone === "error" ? "border-danger" : "border-ink",
          )}
        >
          <span className="min-w-0 flex-1">{t.message}</span>
          {t.action ? (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
              className="rounded px-1.5 py-0.5 text-xs font-medium underline-offset-2 hover:underline"
            >
              {t.action.label}
            </button>
          ) : null}
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="rounded p-0.5 text-white/60 hover:text-white">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
