"use client";

import { MoreHorizontal, Trash2, X } from "lucide-react";
import { ENTITIES } from "@/lib/entities";
import { deleteRecords, setUI, titleOf, updateRecord, useStore } from "@/lib/store";
import type { CollectionKey, ID } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { Button } from "../ui/button";
import { confirmDialog } from "../ui/confirm";
import { Sheet } from "../ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "../ui/menu";
import { ExampleBadge } from "../ui/misc";
import { FieldRenderer, TitleInput } from "./fields";

export function RecordSheetHost() {
  const ref = useStore((s) => s.ui.openRecord);
  const record = useStore((s) => (ref && s.data ? (s.data[ref.collection] as Record<ID, unknown>)[ref.id] : null)) as
    | (Record<string, unknown> & { id: ID; createdAt: string; updatedAt: string; isExample?: boolean })
    | null;
  const open = Boolean(ref && record);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && setUI({ openRecord: null })} title={ref && record ? titleOf(ref.collection, record) : "Record"}>
      {ref && record ? <RecordSheetBody key={ref.id} collection={ref.collection} record={record} /> : null}
    </Sheet>
  );
}

export async function confirmDelete(collection: CollectionKey, id: ID, title: string) {
  const choice = await confirmDialog({
    title: `Delete “${title}”?`,
    description: "Links to other records are removed too. This cannot be undone.",
  });
  if (choice) deleteRecords([{ collection, id }]);
}

function RecordSheetBody({
  collection,
  record,
}: {
  collection: CollectionKey;
  record: Record<string, unknown> & { id: ID; createdAt: string; updatedAt: string; isExample?: boolean };
}) {
  const cfg = ENTITIES[collection];
  const Icon = cfg.icon;
  const title = titleOf(collection, record);
  return (
    <>
      <header className="flex items-center gap-2 border-b border-line px-5 py-3">
        <Icon className="size-4 text-ink-3" />
        <span className="text-xs font-medium text-ink-3">{cfg.singular}</span>
        {record.isExample ? <ExampleBadge /> : null}
        <div className="ml-auto flex items-center gap-1">
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </MenuTrigger>
            <MenuContent>
              {record.isExample ? (
                <MenuItem onSelect={() => updateRecord(collection, record.id, { isExample: false } as never)}>Remove “Example” label</MenuItem>
              ) : null}
              {record.isExample ? <MenuSeparator /> : null}
              <MenuItem danger onSelect={() => void confirmDelete(collection, record.id, title)}>
                <Trash2 /> Delete {cfg.singular.toLowerCase()}
              </MenuItem>
            </MenuContent>
          </Menu>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setUI({ openRecord: null })}>
            <X />
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-10">
        {cfg.notice ? (
          <p className="mb-4 rounded-md border border-dashed border-line-strong px-3 py-2 text-xs text-ink-3">{cfg.notice}</p>
        ) : null}
        <TitleInput value={title} onCommit={(v) => updateRecord(collection, record.id, { [cfg.titleKey]: v } as never)} />
        {cfg.sections.map((section, i) => (
          <section key={i} className="mt-6">
            {section.title ? (
              <div className="mb-3 border-b border-line pb-1.5">
                <h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{section.title}</h3>
                {section.description ? <p className="mt-0.5 text-xs text-ink-4">{section.description}</p> : null}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.fields.map((def, j) => (
                <FieldRenderer key={`${def.kind}-${"key" in def ? def.key : def.label}-${j}`} def={def} collection={collection} record={record} />
              ))}
            </div>
          </section>
        ))}
        <p className="mt-8 text-2xs text-ink-4">
          Created {relativeTime(record.createdAt)} · Updated {relativeTime(record.updatedAt)} · Changes save automatically
        </p>
      </div>
    </>
  );
}
