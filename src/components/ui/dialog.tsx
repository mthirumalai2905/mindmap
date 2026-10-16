"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  hideTitle,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  hideTitle?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/20 animate-fade-in" />
      <D.Content
        className={cn(
          "fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-line bg-canvas shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] animate-pop focus:outline-none",
          className,
        )}
      >
        {hideTitle ? (
          <>
            <D.Title className="sr-only">{title}</D.Title>
            {description ? <D.Description className="sr-only">{description}</D.Description> : null}
          </>
        ) : (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <D.Title className="text-sm font-semibold">{title}</D.Title>
              {description ? <D.Description className="mt-0.5 text-xs text-ink-3">{description}</D.Description> : null}
            </div>
            <D.Close className="rounded p-1 text-ink-3 hover:bg-muted hover:text-ink" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
        )}
        {!description && !hideTitle ? <D.Description className="sr-only">{title}</D.Description> : null}
        {children}
      </D.Content>
    </D.Portal>
  );
}

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  width = "max-w-xl",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/10 animate-fade-in" />
        <D.Content
          className={cn(
            "fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-canvas shadow-[-12px_0_40px_-20px_rgba(0,0,0,0.25)] animate-slide-in-right focus:outline-none",
            width,
          )}
        >
          <D.Title className="sr-only">{title}</D.Title>
          <D.Description className="sr-only">Edit {title}</D.Description>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
