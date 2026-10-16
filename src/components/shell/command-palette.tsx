"use client";

import * as D from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { CornerDownLeft, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ENTITIES } from "@/lib/entities";
import { openRecord, setUI, titleOf, useStore } from "@/lib/store";
import type { CollectionKey, ID } from "@/lib/types";
import { NAV } from "./nav";

const SEARCHABLE: CollectionKey[] = [
  "nodes",
  "content",
  "products",
  "categories",
  "research",
  "initiatives",
  "tasks",
  "characters",
  "arcs",
  "issues",
  "lore",
];

const item =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-ink-2 data-[selected=true]:bg-muted data-[selected=true]:text-ink";
const group = "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-4 [&_[cmdk-group-heading]]:uppercase";

export function CommandPalette() {
  const open = useStore((s) => s.ui.paletteOpen);
  const data = useStore((s) => s.data);
  const router = useRouter();
  const [query, setQuery] = useState("");

  const records = useMemo(() => {
    if (!data || !open) return [];
    return SEARCHABLE.flatMap((c) =>
      Object.values(data[c] as unknown as Record<ID, Record<string, unknown> & { id: ID }>).map((r) => {
        const cfg = ENTITIES[c];
        const extra = cfg.searchKeys.map((k) => String(r[k] ?? "")).join(" ").slice(0, 400);
        const productId = r.productId as ID | undefined;
        return {
          collection: c,
          id: r.id,
          title: titleOf(c, r),
          keywords: extra,
          product: productId ? data.products[productId]?.name : undefined,
        };
      }),
    );
  }, [data, open]);

  const close = () => {
    setUI({ paletteOpen: false });
    setQuery("");
  };

  const go = (collection: CollectionKey, id: ID) => {
    close();
    if (!data) return;
    if (collection === "nodes") {
      setUI({ mapFocusRequest: id });
      router.push("/map");
    } else if (collection === "products") {
      router.push(`/products/${data.products[id].slug}`);
    } else if (collection === "categories") {
      const p = data.products[data.categories[id].productId];
      if (p) router.push(`/products/${p.slug}`);
    } else {
      router.push(ENTITIES[collection].href);
      openRecord(collection, id);
    }
  };

  const capture = (target: string) => {
    close();
    setUI({ captureOpen: true, captureDefaults: { target } });
  };

  const showRecords = query.trim().length > 0;

  return (
    <D.Root open={open} onOpenChange={(o) => (o ? setUI({ paletteOpen: true }) : close())}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/20 animate-fade-in" />
        <D.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-canvas shadow-[0_24px_64px_-16px_rgba(0,0,0,0.25)] animate-pop">
          <D.Title className="sr-only">Search</D.Title>
          <D.Description className="sr-only">Search records, pages and actions</D.Description>
          <Command loop label="Search">
            <div className="flex items-center gap-2.5 border-b border-line px-3.5">
              <Search className="size-4 text-ink-4" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search nodes, content, research, campaigns, characters…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-ink-4"
              />
            </div>
            <Command.List className="max-h-[min(60vh,440px)] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-[13px] text-ink-3">
                No results for “{query}”.
                <button type="button" className="ml-1 font-medium text-ink underline underline-offset-2" onClick={() => capture("content")}>
                  Capture it as an idea
                </button>
              </Command.Empty>
              {showRecords ? (
                <Command.Group heading="Records" className={group}>
                  {records.map((r) => {
                    const Icon = ENTITIES[r.collection].icon;
                    return (
                      <Command.Item
                        key={`${r.collection}:${r.id}`}
                        value={`${r.collection}:${r.id}`}
                        keywords={[r.title, r.keywords, r.product ?? ""]}
                        onSelect={() => go(r.collection, r.id)}
                        className={item}
                      >
                        <Icon className="size-4 shrink-0 text-ink-4" />
                        <span className="min-w-0 flex-1 truncate">{r.title}</span>
                        <span className="shrink-0 text-2xs text-ink-4">
                          {ENTITIES[r.collection].singular}
                          {r.product ? ` · ${r.product}` : ""}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ) : null}
              <Command.Group heading="Create" className={group}>
                {[
                  ["content", "New content idea"],
                  ["initiatives", "New PR or marketing initiative"],
                  ["research", "New research idea"],
                  ["tasks", "New task"],
                  ["nodes", "New mind map node"],
                  ["characters", "New Skalle character"],
                ].map(([target, label]) => (
                  <Command.Item key={target} value={`create ${label}`} onSelect={() => capture(target)} className={item}>
                    <Plus className="size-4 text-ink-4" />
                    {label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Go to" className={group}>
                {NAV.map((n) => (
                  <Command.Item
                    key={n.href}
                    value={`go ${n.label}`}
                    onSelect={() => {
                      close();
                      router.push(n.href);
                    }}
                    className={item}
                  >
                    <n.icon className="size-4 text-ink-4" />
                    {n.label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <div className="flex items-center gap-3 border-t border-line px-3.5 py-2 text-2xs text-ink-4">
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="size-3" /> open
              </span>
              <span>↑↓ navigate</span>
              <span>esc close</span>
            </div>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
