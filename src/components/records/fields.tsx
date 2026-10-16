"use client";

import { ExternalLink, Link2, Plus, X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { ENTITIES, SHEET_COLLECTIONS, type FieldDef } from "@/lib/entities";
import { titleSchema, urlSchema } from "@/lib/schemas";
import {
  createRecord,
  linkRecords,
  linkedIds,
  openRecord,
  setUI,
  titleOf,
  unlinkRecords,
  updateRecord,
  useData,
} from "@/lib/store";
import {
  EVIDENCE_KIND_LABELS,
  EVIDENCE_KINDS,
  STATUSES,
  type CollectionKey,
  type Evidence,
  type EvidenceKind,
  type ID,
  type Task,
} from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Field, Input, Select, Textarea } from "../ui/input";
import { RecordPicker } from "./link-picker";
import { useStatusLabels } from "./status";

/* ---------- Title ---------- */

export function TitleInput({
  value,
  onCommit,
  className,
  placeholder = "Untitled",
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const result = titleSchema.safeParse(draft);
  const error = result.success ? null : result.error.issues[0]?.message;
  return (
    <div>
      <input
        value={draft}
        aria-label="Title"
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft(e.target.value);
          const r = titleSchema.safeParse(e.target.value);
          if (r.success) onCommit(r.data);
        }}
        onBlur={() => {
          if (error) setDraft(value);
        }}
        className={cn(
          "w-full bg-transparent text-lg font-semibold tracking-tight outline-none placeholder:text-ink-4 focus-visible:outline-none",
          className,
        )}
      />
      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}. The last valid title is kept.
        </p>
      ) : null}
    </div>
  );
}

/* ---------- String lists ---------- */

export function TagsInput({
  value,
  onChange,
  placeholder = "Add tag",
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange(Array.from(new Set([...value, ...parts])));
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-line px-1.5 py-1 focus-within:border-ink hover:border-line-strong">
      {value.map((t) => (
        <span key={t} className="inline-flex h-5 items-center gap-1 rounded bg-muted pr-0.5 pl-1.5 text-xs text-ink-2">
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="rounded p-0.5 text-ink-4 hover:bg-line hover:text-ink"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="h-6 min-w-20 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-ink-4 focus-visible:outline-none"
      />
    </div>
  );
}

export function ListInput({
  value,
  onChange,
  placeholder = "Add item",
  validate,
  renderItem,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  validate?: (v: string) => string | null;
  renderItem?: (v: string) => React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    const err = validate?.(v) ?? null;
    if (err) return setError(err);
    onChange([...value, v]);
    setDraft("");
    setError(null);
  };
  return (
    <div className="flex flex-col gap-1">
      {value.length ? (
        <ul className="divide-y divide-line rounded-md border border-line">
          {value.map((v, i) => (
            <li key={`${v}-${i}`} className="group flex items-center gap-2 px-2.5 py-1.5 text-[13px]">
              <span className="min-w-0 flex-1 break-words">{renderItem ? renderItem(v) : v}</span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="rounded p-0.5 text-ink-4 opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-ink focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-1.5">
        <Input
          value={draft}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button size="icon" variant="outline" onClick={add} aria-label="Add" disabled={!draft.trim()}>
          <Plus />
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

const validateUrl = (v: string) => {
  const r = urlSchema.safeParse(v);
  return r.success ? null : r.error.issues[0]?.message ?? "Invalid URL";
};

export function UrlList({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <ListInput
      value={value}
      onChange={onChange}
      placeholder="https://…"
      validate={validateUrl}
      renderItem={(v) => (
        <a href={v} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">
          {v.replace(/^https?:\/\//, "")}
          <ExternalLink className="size-3 text-ink-4" />
        </a>
      )}
    />
  );
}

/* ---------- Selects bound to workspace data ---------- */

export function ProductSelect({ value, onChange, id, allowNone = true }: { value: ID | null; onChange: (v: ID | null) => void; id?: string; allowNone?: boolean }) {
  const data = useData();
  const products = useMemo(() => Object.values(data.products).sort((a, b) => a.order - b.order), [data.products]);
  return (
    <Select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      {allowNone ? <option value="">No product</option> : null}
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

export function StatusSelect({ value, onChange, id, nullable }: { value: string | null; onChange: (v: string | null) => void; id?: string; nullable?: boolean }) {
  const labels = useStatusLabels();
  return (
    <Select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      {nullable ? <option value="">No status</option> : null}
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {labels[s]}
        </option>
      ))}
    </Select>
  );
}

/* ---------- Relationship links ---------- */

export function LinksField({ owner, target, label, hint }: { owner: { collection: CollectionKey; id: ID }; target: CollectionKey; label: string; hint?: string }) {
  const data = useData();
  const router = useRouter();
  const linked = linkedIds(data, owner, target);
  const exclude = new Set(linked.map((l) => `${target}:${l.id}`));
  exclude.add(`${owner.collection}:${owner.id}`);
  const Icon = ENTITIES[target].icon;
  const canCreate = SHEET_COLLECTIONS.includes(target) && target !== "products";

  const open = (id: ID) => {
    if (target === "nodes") {
      setUI({ mapFocusRequest: id, openRecord: null });
      router.push("/map");
    } else if (target === "products") {
      setUI({ openRecord: null });
      router.push(`/products/${data.products[id].slug}`);
    } else openRecord(target, id);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-3">{label}</span>
        <RecordPicker
          targets={[target]}
          exclude={exclude}
          placeholder={`Link ${ENTITIES[target].plural.toLowerCase()}…`}
          onPick={(c, id) => linkRecords(owner, { collection: c, id })}
          onCreate={
            canCreate
              ? (title) => {
                  const rec = createRecord(target, { [ENTITIES[target].titleKey]: title } as never);
                  linkRecords(owner, { collection: target, id: rec.id });
                }
              : undefined
          }
          trigger={
            <button type="button" className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-ink-3 hover:bg-muted hover:text-ink">
              <Link2 className="size-3" /> Link
            </button>
          }
        />
      </div>
      {linked.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
          {linked.map(({ id, link }) => {
            const rec = (data[target] as Record<ID, unknown>)[id];
            return (
              <li key={link.id} className="group flex items-center gap-2 px-2.5 py-1.5">
                <Icon className="size-3.5 shrink-0 text-ink-4" />
                <button type="button" onClick={() => open(id)} className="min-w-0 flex-1 truncate text-left text-[13px] hover:underline">
                  {titleOf(target, rec)}
                </button>
                {link.label ? <span className="text-2xs text-ink-4">{link.label}</span> : null}
                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={() => unlinkRecords(owner, { collection: target, id })}
                  className="rounded p-0.5 text-ink-4 opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-ink focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-ink-4">{hint ?? "None linked."}</p>
      )}
    </div>
  );
}

/* ---------- Task dependencies ---------- */

function wouldCycle(tasks: Record<ID, Task>, from: ID, to: ID): boolean {
  const stack = [to];
  const seen = new Set<ID>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === from) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(tasks[cur]?.dependsOn ?? []));
  }
  return false;
}

export function DependenciesField({ task }: { task: Task }) {
  const data = useData();
  const exclude = new Set<string>([`tasks:${task.id}`, ...task.dependsOn.map((d) => `tasks:${d}`)]);
  for (const t of Object.values(data.tasks)) if (wouldCycle(data.tasks, task.id, t.id)) exclude.add(`tasks:${t.id}`);
  return (
    <div className="flex flex-col gap-1.5">
      {task.dependsOn.length ? (
        <ul className="divide-y divide-line rounded-md border border-line">
          {task.dependsOn.map((id) => {
            const dep = data.tasks[id];
            if (!dep) return null;
            return (
              <li key={id} className="group flex items-center gap-2 px-2.5 py-1.5 text-[13px]">
                <span className={cn("size-2 rounded-full", dep.status === "done" ? "bg-ink" : "border border-ink-3")} />
                <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => openRecord("tasks", id)}>
                  {dep.title}
                </button>
                <span className="text-2xs text-ink-4">{dep.status === "done" ? "Done" : "Open"}</span>
                <button
                  type="button"
                  aria-label="Remove dependency"
                  onClick={() => updateRecord("tasks", task.id, { dependsOn: task.dependsOn.filter((d) => d !== id) })}
                  className="rounded p-0.5 text-ink-4 opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-ink focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <RecordPicker
        targets={["tasks"]}
        exclude={exclude}
        placeholder="Find a task…"
        onPick={(_, id) => updateRecord("tasks", task.id, { dependsOn: [...task.dependsOn, id] })}
        trigger={
          <Button size="sm" variant="outline" className="self-start">
            <Plus /> Add dependency
          </Button>
        }
      />
    </div>
  );
}

/* ---------- Research evidence ---------- */

export function EvidenceEditor({ value, onChange }: { value: Evidence[]; onChange: (v: Evidence[]) => void }) {
  const [kind, setKind] = useState<EvidenceKind>("hypothesis");
  const [statement, setStatement] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    if (!statement.trim()) return setError("Describe the evidence or claim.");
    if (url.trim()) {
      const err = validateUrl(url.trim());
      if (err) return setError(err);
    }
    onChange([...value, { id: uid(), kind, statement: statement.trim(), url: url.trim() }]);
    setStatement("");
    setUrl("");
    setError(null);
  };
  const grouped = EVIDENCE_KINDS.map((k) => ({ kind: k, items: value.filter((e) => e.kind === k) })).filter((g) => g.items.length);
  return (
    <div className="flex flex-col gap-3">
      {grouped.map((g) => (
        <div key={g.kind}>
          <EvidenceKindLabel kind={g.kind} />
          <ul className="mt-1 divide-y divide-line rounded-md border border-line">
            {g.items.map((e) => (
              <li key={e.id} className="group flex items-start gap-2 px-2.5 py-2 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{e.statement}</p>
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noreferrer noopener" className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-3 underline underline-offset-2">
                      {e.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                    </a>
                  ) : g.kind === "fact" || g.kind === "external" ? (
                    <p className="mt-0.5 text-xs text-ink-4">No source linked yet</p>
                  ) : null}
                </div>
                <Select
                  aria-label="Evidence kind"
                  className="w-40"
                  value={e.kind}
                  onChange={(ev) => onChange(value.map((x) => (x.id === e.id ? { ...x, kind: ev.target.value as EvidenceKind } : x)))}
                >
                  {EVIDENCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {EVIDENCE_KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  aria-label="Remove evidence"
                  onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                  className="mt-1 rounded p-0.5 text-ink-4 hover:bg-muted hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-line-strong p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select aria-label="Evidence kind" className="sm:w-44" value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind)}>
            {EVIDENCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {EVIDENCE_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
          <Input value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="Claim, finding or planned work" />
        </div>
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Source URL (optional)" />
          <Button onClick={add} variant="secondary">
            Add
          </Button>
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    </div>
  );
}

export function EvidenceKindLabel({ kind }: { kind: EvidenceKind }) {
  const styles: Record<EvidenceKind, string> = {
    fact: "bg-ink text-white",
    external: "border border-ink text-ink",
    hypothesis: "border border-dashed border-ink-3 text-ink-2",
    planned: "bg-muted text-ink-2",
    validated: "bg-ink text-white ring-2 ring-ink ring-offset-1",
  };
  return <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-2xs font-medium", styles[kind])}>{EVIDENCE_KIND_LABELS[kind]}</span>;
}

/* ---------- Generic renderer ---------- */

export function FieldRenderer({
  def,
  collection,
  record,
}: {
  def: FieldDef;
  collection: CollectionKey;
  record: Record<string, unknown> & { id: ID };
}) {
  const data = useData();
  const set = (key: string, value: unknown) => updateRecord(collection, record.id, { [key]: value } as never);
  const full = ["textarea", "longtext", "tags", "list", "urls", "links", "dependencies", "evidence"].includes(def.kind);
  const wrap = (node: (id: string) => React.ReactNode, hint?: string) =>
    "key" in def ? (
      <Field label={def.label} hint={hint} className={full ? "sm:col-span-2" : undefined}>
        {node}
      </Field>
    ) : null;

  switch (def.kind) {
    case "text":
    case "url":
      return wrap(
        (id) => (
          <Input
            id={id}
            type={def.kind === "url" ? "url" : "text"}
            value={String(record[def.key] ?? "")}
            placeholder={def.placeholder}
            onChange={(e) => set(def.key, e.target.value)}
          />
        ),
        def.hint,
      );
    case "number":
      return wrap((id) => (
        <Input
          id={id}
          type="number"
          value={record[def.key] === null || record[def.key] === undefined ? "" : String(record[def.key])}
          onChange={(e) => set(def.key, e.target.value === "" ? null : Number(e.target.value))}
        />
      ));
    case "textarea":
    case "longtext":
      return wrap(
        (id) => (
          <Textarea
            id={id}
            rows={def.kind === "longtext" ? 8 : 3}
            value={String(record[def.key] ?? "")}
            placeholder={def.placeholder}
            onChange={(e) => set(def.key, e.target.value)}
            className={def.kind === "longtext" ? "min-h-40" : undefined}
          />
        ),
        def.hint,
      );
    case "date":
      return wrap((id) => <Input id={id} type="date" value={String(record[def.key] ?? "")} onChange={(e) => set(def.key, e.target.value)} />);
    case "select":
      return wrap((id) => (
        <Select id={id} value={String(record[def.key] ?? "")} onChange={(e) => set(def.key, e.target.value || null)}>
          {def.nullable ? <option value="">None</option> : null}
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ));
    case "status":
      return wrap((id) => <StatusSelect id={id} nullable={def.nullable} value={(record[def.key] as string) ?? null} onChange={(v) => set(def.key, v)} />);
    case "product":
      return wrap((id) => (
        <ProductSelect
          id={id}
          value={(record[def.key] as ID) ?? null}
          onChange={(v) => {
            updateRecord(collection, record.id, { [def.key]: v, ...("categoryId" in record ? { categoryId: null } : {}) } as never);
          }}
        />
      ));
    case "category": {
      const productId = record.productId as ID | null;
      const cats = Object.values(data.categories)
        .filter((c) => c.productId === productId)
        .sort((a, b) => a.order - b.order);
      return wrap(
        (id) => (
          <Select id={id} value={(record[def.key] as string) ?? ""} disabled={!productId} onChange={(e) => set(def.key, e.target.value || null)}>
            <option value="">{productId ? "No category" : "Choose a product first"}</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        ),
      );
    }
    case "ref": {
      const items = Object.values(data[def.target] as Record<ID, object & { id: ID }>);
      return wrap((id) => (
        <Select id={id} value={(record[def.key] as string) ?? ""} onChange={(e) => set(def.key, e.target.value || null)}>
          <option value="">None</option>
          {items.map((r) => (
            <option key={r.id} value={r.id}>
              {titleOf(def.target, r)}
            </option>
          ))}
        </Select>
      ));
    }
    case "tags":
      return wrap((id) => <TagsInput id={id} value={(record[def.key] as string[]) ?? []} onChange={(v) => set(def.key, v)} />);
    case "list":
      return wrap(() => <ListInput value={(record[def.key] as string[]) ?? []} onChange={(v) => set(def.key, v)} placeholder={def.placeholder} />);
    case "urls":
      return wrap(() => <UrlList value={(record[def.key] as string[]) ?? []} onChange={(v) => set(def.key, v)} />);
    case "dependencies":
      return wrap(() => <DependenciesField task={record as unknown as Task} />);
    case "evidence":
      return (
        <div className="sm:col-span-2">
          <EvidenceEditor value={(record[def.key] as Evidence[]) ?? []} onChange={(v) => set(def.key, v)} />
        </div>
      );
    case "links":
      return (
        <div className="sm:col-span-2">
          <LinksField owner={{ collection, id: record.id }} target={def.target} label={def.label} hint={def.hint} />
        </div>
      );
  }
}
