"use client";

import * as D from "@radix-ui/react-dialog";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { clearWorkspace, initStore, setUI, useStore } from "@/lib/store";
import { RecordSheetHost } from "../records/record-sheet";
import { Button } from "../ui/button";
import { confirmDialog } from "../ui/confirm";
import { Skeleton } from "../ui/misc";
import { CommandPalette } from "./command-palette";
import { QuickCapture } from "./quick-capture";
import { ShortcutsDialog, useGlobalShortcuts } from "./shortcuts";
import { Logo, Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function ShellSkeleton() {
  return (
    <div className="flex h-dvh">
      <div className="hidden w-60 flex-col gap-2 border-r border-line bg-subtle p-3 md:flex">
        <Skeleton className="h-7 w-32" />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-12 border-b border-line" />
        <div className="flex flex-col gap-3 p-8">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="mt-6 h-48" />
        </div>
      </div>
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  const reset = async () => {
    const ok = await confirmDialog({
      title: "Discard the stored workspace?",
      description: "The unreadable data will be deleted and you will start onboarding again.",
      confirmLabel: "Discard and start over",
    });
    if (ok) await clearWorkspace();
  };
  return (
    <div className="flex h-dvh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-6 text-danger" />
        <h1 className="mt-3 text-base font-semibold">The workspace could not be loaded</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={() => window.location.reload()}>
            <RefreshCw /> Try again
          </Button>
          <Button variant="outline" onClick={() => void reset()}>
            Start over
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExternalChangeBanner() {
  const changed = useStore((s) => s.externalChange);
  if (!changed) return null;
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-line bg-ink px-4 py-2 text-xs text-white">
      <span className="flex-1">
        This workspace was changed in another tab. Reload to see those changes — edits made here afterwards would overwrite them.
      </span>
      <button type="button" className="font-medium underline underline-offset-2" onClick={() => window.location.reload()}>
        Reload
      </button>
      <button type="button" className="text-white/70 hover:text-white" onClick={() => useStore.setState({ externalChange: false })}>
        Dismiss
      </button>
    </div>
  );
}

function useUnsavedGuard() {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const s = useStore.getState().saveState;
      if (s === "pending" || s === "saving" || s === "error") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}

export function AppShell({ children }: { children: ReactNode }) {
  const load = useStore((s) => s.load);
  const loadError = useStore((s) => s.loadError);
  const mobileOpen = useStore((s) => s.ui.mobileNavOpen);
  const router = useRouter();

  useEffect(() => {
    void initStore();
  }, []);
  useEffect(() => {
    if (load === "empty") router.replace("/onboarding");

  }, [load, router]);
  useGlobalShortcuts();
  useUnsavedGuard();

  if (load === "error") return <LoadError message={loadError ?? "Unknown error"} />;
  if (load !== "ready") return <ShellSkeleton />;

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <D.Root open={mobileOpen} onOpenChange={(o) => setUI({ mobileNavOpen: o })}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-40 bg-black/20 md:hidden" />
          <D.Content className="fixed inset-y-0 left-0 z-40 shadow-xl animate-fade-in md:hidden">
            <D.Title className="sr-only">Navigation</D.Title>
            <D.Description className="sr-only">Main navigation</D.Description>
            <Sidebar mobile />
          </D.Content>
        </D.Portal>
      </D.Root>
      <div className="flex min-w-0 flex-1 flex-col">
        <ExternalChangeBanner />
        <Topbar />
        <main id="main" className="relative min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <RecordSheetHost />
      <CommandPalette />
      <QuickCapture />
      <ShortcutsDialog />
    </div>
  );
}

export function CenteredBrand({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-subtle">
      <div className="flex h-14 items-center gap-2 px-6">
        <span className="flex size-6 items-center justify-center rounded-md bg-ink text-white">
          <Logo className="size-4" />
        </span>
        <span className="text-sm font-semibold">Mindmap</span>
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pt-[8vh] pb-16">{children}</div>
    </div>
  );
}
