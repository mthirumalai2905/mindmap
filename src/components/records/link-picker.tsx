"use client";

import { Command } from "cmdk";
import { Plus, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ENTITIES } from "@/lib/entities";
import { titleOf, useStore } from "@/lib/store";
import type { CollectionKey, ID } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

/** Searchable picker over one or more collections. */
export function RecordPicker({
  targets,
  exclude,
  onPick,
  onCreate,
  trigger,
  placeholder = "Search…",
}: {
  targets: CollectionKey[];
  exclude?: Set<string>;
  onPick: (collection: CollectionKey, id: ID) => void;
  onCreate?: (title: string) => void;
  trigger: ReactNode;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const data = useStore((s) => s.data);
  const items = useMemo(() => {
    if (!data || !open) return [];
    return targets.flatMap((t) =>
      Object.values(data[t] as Record<ID, object & { id: ID }>)
        .filter((r) => !exclude?.has(`${t}:${r.id}`))
        .map((r) => ({ collection: t, id: r.id, title: titleOf(t, r) })),
    );
  }, [data, open, targets, exclude]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command loop>
          <div className="flex items-center gap-2 border-b border-line px-2.5">
            <Search className="size-3.5 text-ink-4" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={placeholder}
              className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-ink-4"
            />
          </div>
          <Command.List className="max-h-64 overflow-y-auto p-1">
            <Command.Empty className="px-2 py-3 text-xs text-ink-3">No matches.</Command.Empty>
            {items.map((it) => {
              const Icon = ENTITIES[it.collection].icon;
              return (
                <Command.Item
                  key={`${it.collection}:${it.id}`}
                  value={`${it.title} ${it.collection}:${it.id}`}
                  onSelect={() => {
                    onPick(it.collection, it.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-2 data-[selected=true]:bg-muted data-[selected=true]:text-ink"
                >
                  <Icon className="size-3.5 shrink-0 text-ink-4" />
                  <span className="truncate">{it.title}</span>
                </Command.Item>
              );
            })}
            {onCreate && query.trim() ? (
              <Command.Item
                value={`__create ${query}`}
                onSelect={() => {
                  onCreate(query.trim());
                  setOpen(false);
                  setQuery("");
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-2 data-[selected=true]:bg-muted"
              >
                <Plus className="size-3.5 text-ink-4" />
                Create “{query.trim()}”
              </Command.Item>
            ) : null}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
