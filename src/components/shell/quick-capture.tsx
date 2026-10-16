"use client";

import { BookOpen, CheckSquare, FileText, FlaskConical, Megaphone, Network, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ENTITIES } from "@/lib/entities";
import { addChildNode, rootNodeId } from "@/lib/map-ops";
import { quickCaptureSchema } from "@/lib/schemas";
import { createRecord, openRecord, setUI, toast, useStore } from "@/lib/store";
import type { CollectionKey, ID } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductSelect } from "../records/fields";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { Kbd } from "../ui/misc";

type Target = "content" | "nodes" | "initiatives" | "research" | "tasks" | "characters" | "lore";

const TARGETS: { value: Target; label: string; icon: LucideIcon }[] = [
  { value: "content", label: "Content idea", icon: FileText },
  { value: "nodes", label: "Map node", icon: Network },
  { value: "initiatives", label: "PR / campaign", icon: Megaphone },
  { value: "research", label: "Research", icon: FlaskConical },
  { value: "tasks", label: "Task", icon: CheckSquare },
  { value: "characters", label: "Character", icon: BookOpen },
];

export function QuickCapture() {
  const open = useStore((s) => s.ui.captureOpen);
  const defaults = useStore((s) => s.ui.captureDefaults);
  return (
    <Dialog open={open} onOpenChange={(o) => setUI({ captureOpen: o })}>
      {open ? (
        <DialogContent title="Quick capture" description="Save an idea now. Fill in the details later." className="max-w-lg">
          <CaptureForm
            key={JSON.stringify(defaults)}
            initialTarget={(defaults?.target as Target) ?? "content"}
            initialProduct={defaults?.productId ?? null}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function CaptureForm({ initialTarget, initialProduct }: { initialTarget: Target; initialProduct: ID | null }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<Target>(TARGETS.some((t) => t.value === initialTarget) ? initialTarget : "content");
  const [productId, setProductId] = useState<ID | null>(initialProduct);
  const [error, setError] = useState<string | null>(null);
  const usesProduct = target !== "characters" && target !== "lore";

  const save = (andOpen: boolean) => {
    const parsed = quickCaptureSchema.safeParse({ title, target, productId });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const pid = usesProduct ? productId : null;
    let created: { collection: CollectionKey; id: ID };
    if (target === "nodes") {
      const data = useStore.getState().data!;
      const branch = pid ? Object.values(data.nodes).find((n) => (n.kind === "product" || n.kind === "root") && n.productId === pid) : null;
      const node = addChildNode(branch?.id ?? rootNodeId(), { title: parsed.data.title, kind: "idea", productId: pid });
      created = { collection: "nodes", id: node.id };
    } else {
      const key = ENTITIES[target].titleKey;
      const rec = createRecord(target, { [key]: parsed.data.title, ...(usesProduct ? { productId: pid } : {}) } as never);
      created = { collection: target, id: rec.id };
    }
    setUI({ captureOpen: false });
    const where = target === "nodes" ? "/map" : ENTITIES[target].href;
    const openIt = () => {
      if (created.collection === "nodes") {
        setUI({ mapFocusRequest: created.id });
        router.push("/map");
      } else {
        router.push(where);
        openRecord(created.collection, created.id);
      }
    };
    if (andOpen) openIt();
    else toast(`Captured “${parsed.data.title}”`, { action: { label: "Open", run: openIt } });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(false);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
      <input
        autoFocus
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save(true);
          }
        }}
        aria-label="Title"
        aria-invalid={Boolean(error)}
        placeholder="What's the idea?"
        className="w-full bg-transparent text-base font-medium outline-none placeholder:text-ink-4 focus-visible:outline-none"
      />
      {error ? <p className="-mt-2 text-xs text-danger">{error}</p> : null}
      <div role="radiogroup" aria-label="Save as" className="flex flex-wrap gap-1.5">
        {TARGETS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={target === t.value}
            onClick={() => setTarget(t.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
              target === t.value ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-line-strong",
            )}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>
      {usesProduct ? (
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs text-ink-3">Product</span>
          <ProductSelect value={productId} onChange={setProductId} />
        </div>
      ) : (
        <p className="text-xs text-ink-3">Saved to the Skalle Universe (fiction).</p>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
        <span className="hidden items-center gap-1 text-2xs text-ink-4 sm:inline-flex">
          <Kbd>Enter</Kbd> save · <Kbd>Ctrl Enter</Kbd> save and open
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => save(true)}>
            Save and open
          </Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
