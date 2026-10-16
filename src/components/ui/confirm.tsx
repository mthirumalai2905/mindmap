"use client";

import * as A from "@radix-ui/react-alert-dialog";
import { create } from "zustand";
import { Button } from "./button";

interface ConfirmAction {
  id: string;
  label: string;
  danger?: boolean;
}

interface ConfirmRequest {
  title: string;
  description?: string;
  actions: ConfirmAction[];
  resolve: (value: string | null) => void;
}

const useConfirmStore = create<{ request: ConfirmRequest | null }>(() => ({ request: null }));

/** Resolves to the chosen action id, or null when cancelled. */
export function confirmDialog(opts: Omit<ConfirmRequest, "resolve" | "actions"> & { actions?: ConfirmAction[]; confirmLabel?: string }) {
  return new Promise<string | null>((resolve) => {
    useConfirmStore.setState({
      request: {
        title: opts.title,
        description: opts.description,
        actions: opts.actions ?? [{ id: "confirm", label: opts.confirmLabel ?? "Delete", danger: true }],
        resolve,
      },
    });
  });
}

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const close = (value: string | null) => {
    request?.resolve(value);
    useConfirmStore.setState({ request: null });
  };
  return (
    <A.Root open={Boolean(request)} onOpenChange={(open) => !open && close(null)}>
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-[70] bg-black/25 animate-fade-in" />
        <A.Content className="fixed top-1/2 left-1/2 z-[70] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-canvas p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.2)] animate-pop">
          <A.Title className="text-sm font-semibold">{request?.title}</A.Title>
          <A.Description className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
            {request?.description ?? "This cannot be undone."}
          </A.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <A.Cancel asChild>
              <Button variant="ghost">Cancel</Button>
            </A.Cancel>
            {request?.actions.map((a) => (
              <Button key={a.id} variant={a.danger ? "danger" : "primary"} onClick={() => close(a.id)}>
                {a.label}
              </Button>
            ))}
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
