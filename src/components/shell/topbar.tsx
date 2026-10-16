"use client";

import { AlertCircle, Check, ChevronRight, CircleUser, Keyboard, LoaderCircle, Menu as MenuIcon, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { retrySave, setUI, useStore } from "@/lib/store";
import { relativeTime } from "@/lib/utils";
import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "../ui/menu";
import { Kbd } from "../ui/misc";
import { Tooltip } from "../ui/tooltip";
import { navLabel } from "./nav";

function Breadcrumbs() {
  const pathname = usePathname();
  const products = useStore((s) => s.data?.products);
  const workspaceName = useStore((s) => s.data?.workspace.name);
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  segments.forEach((seg, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    let label = i === 0 ? navLabel(seg) : undefined;
    if (!label && segments[0] === "products" && i === 1) {
      label = Object.values(products ?? {}).find((p) => p.slug === seg)?.name ?? "Unknown product";
    }
    crumbs.push({ href, label: label ?? seg });
  });
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px]">
      <span className="hidden truncate text-ink-3 sm:inline">{workspaceName}</span>
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="hidden size-3.5 shrink-0 text-ink-4 sm:block" />
          {i === crumbs.length - 1 ? (
            <span aria-current="page" className="truncate font-medium text-ink">
              {c.label}
            </span>
          ) : (
            <Link href={c.href} className="truncate text-ink-3 hover:text-ink">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SaveIndicator() {
  const state = useStore((s) => s.saveState);
  const error = useStore((s) => s.saveError);
  const at = useStore((s) => s.lastSavedAt);
  const mode = useStore((s) => s.adapter?.mode);
  const where = mode === "local" ? "in this browser" : "to Supabase";
  if (state === "error") {
    return (
      <Tooltip content={error ?? "Save failed"}>
        <Button variant="outline" size="sm" className="border-danger text-danger" onClick={() => void retrySave()}>
          <AlertCircle /> Not saved · Retry
        </Button>
      </Tooltip>
    );
  }
  if (state === "pending" || state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-3" role="status">
        <LoaderCircle className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  return (
    <Tooltip content={at ? `Last saved ${where} ${relativeTime(at)}` : `All changes are saved ${where}`}>
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-3" role="status">
        <Check className="size-3.5" /> <span className="max-md:sr-only">Saved</span>
      </span>
    </Tooltip>
  );
}

export function Topbar() {
  const router = useRouter();
  const adapter = useStore((s) => s.adapter);
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-canvas px-3 sm:px-4">
      <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open navigation" onClick={() => setUI({ mobileNavOpen: true })}>
        <MenuIcon />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <SaveIndicator />
      <button
        type="button"
        onClick={() => setUI({ paletteOpen: true })}
        className="flex h-8 items-center gap-2 rounded-md border border-line bg-subtle px-2 text-[13px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink sm:w-56"
        aria-label="Search"
      >
        <Search className="size-3.5" />
        <span className="hidden flex-1 text-left sm:inline">Search…</span>
        <span className="hidden sm:inline-flex">
          <Kbd>Ctrl K</Kbd>
        </span>
      </button>
      <Tooltip content={<span>Quick capture <Kbd>N</Kbd></span>}>
        <Button variant="primary" size="md" onClick={() => setUI({ captureOpen: true, captureDefaults: null })} aria-label="Quick capture">
          <Plus /> <span className="max-sm:hidden">New</span>
        </Button>
      </Tooltip>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Account menu">
            <CircleUser className="size-4!" />
          </Button>
        </MenuTrigger>
        <MenuContent className="w-64">
          <MenuLabel>{adapter?.mode === "local" ? "Development mode" : "Shared workspace · no sign-in"}</MenuLabel>
          <p className="px-2 pb-1.5 text-xs leading-relaxed text-ink-3">{adapter?.description}</p>
          <MenuSeparator />
          <MenuItem onSelect={() => setUI({ shortcutsOpen: true })} shortcut="?">
            <Keyboard /> Keyboard shortcuts
          </MenuItem>
          <MenuItem onSelect={() => router.push("/settings")}>Workspace settings</MenuItem>
        </MenuContent>
      </Menu>
    </header>
  );
}
