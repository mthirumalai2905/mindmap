"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { setUI, useStore } from "@/lib/store";
import { isTypingTarget } from "@/lib/utils";
import { Dialog, DialogContent } from "../ui/dialog";
import { Kbd } from "../ui/misc";
import { NAV } from "./nav";

export function useGlobalShortcuts() {
  const router = useRouter();
  useEffect(() => {
    let gPressedAt = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setUI({ paletteOpen: !useStore.getState().ui.paletteOpen });
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const ui = useStore.getState().ui;
      if (ui.paletteOpen || ui.captureOpen || ui.openRecord || document.querySelector("[role=dialog],[role=alertdialog]")) return;
      if (Date.now() - gPressedAt < 1000) {
        const item = NAV.find((n) => n.key === e.key.toLowerCase());
        gPressedAt = 0;
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
        return;
      }
      if (e.key === "g") gPressedAt = Date.now();
      else if (e.key === "n") {
        e.preventDefault();
        setUI({ captureOpen: true, captureDefaults: null });
      } else if (e.key === "/") {
        e.preventDefault();
        setUI({ paletteOpen: true });
      } else if (e.key === "?") {
        e.preventDefault();
        setUI({ shortcutsOpen: true });
      } else if (e.key === "[") {
        setUI({ sidebarCollapsed: !ui.sidebarCollapsed });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Global",
    items: [
      ["Ctrl K  or  /", "Search everything"],
      ["N", "Quick capture"],
      ["[", "Toggle sidebar"],
      ["?", "Show shortcuts"],
    ],
  },
  { title: "Go to (press G, then…)", items: NAV.map((n) => [`G ${n.key!.toUpperCase()}`, n.label] as [string, string]) },
  {
    title: "Mind map (with a node selected)",
    items: [
      ["Tab", "Add child node"],
      ["Enter", "Add sibling node"],
      ["F2", "Rename"],
      ["Space", "Collapse / expand"],
      ["F", "Toggle focus mode"],
      ["Delete", "Delete node"],
      ["Esc", "Clear selection"],
    ],
  },
];

export function ShortcutsDialog() {
  const open = useStore((s) => s.ui.shortcutsOpen);
  return (
    <Dialog open={open} onOpenChange={(o) => setUI({ shortcutsOpen: o })}>
      <DialogContent title="Keyboard shortcuts" className="max-w-xl">
        <div className="grid max-h-[60vh] grid-cols-1 gap-6 overflow-y-auto p-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title} className={g.items.length > 6 ? "sm:row-span-2" : undefined}>
              <h3 className="mb-2 text-xs font-semibold text-ink-3">{g.title}</h3>
              <ul className="flex flex-col gap-1.5">
                {g.items.map(([k, label]) => (
                  <li key={k + label} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-ink-2">{label}</span>
                    <span className="flex gap-1">
                      {k.split("  or  ").map((part) => (
                        <Kbd key={part}>{part}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
