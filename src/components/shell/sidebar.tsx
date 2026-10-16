"use client";

import { ChevronsUpDown, Download, HardDrive, PanelLeftClose, PanelLeftOpen, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { setUI, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { confirmDialog } from "../ui/confirm";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "../ui/menu";
import { Tooltip } from "../ui/tooltip";
import { NAV } from "./nav";
import { exportWorkspace } from "./workspace-io";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden>
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <circle cx="4" cy="6" r="1.8" fill="currentColor" />
      <circle cx="20" cy="6" r="1.8" fill="currentColor" />
      <circle cx="4" cy="18" r="1.8" fill="currentColor" />
      <circle cx="20" cy="18" r="1.8" fill="currentColor" />
      <path d="M5.5 7l4 3.2M18.5 7l-4 3.2M5.5 17l4-3.2M18.5 17l-4-3.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function Sidebar({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useStore((s) => s.ui.sidebarCollapsed) && !mobile;
  const workspace = useStore((s) => s.data?.workspace);
  const productsMap = useStore((s) => s.data?.products);
  const mode = useStore((s) => s.adapter?.mode);
  const products = useMemo(() => Object.values(productsMap ?? {}).sort((a, b) => a.order - b.order), [productsMap]);

  const startNew = async () => {
    const choice = await confirmDialog({
      title: "Start a new workspace?",
      description:
        mode === "local"
          ? "Development mode keeps one workspace per browser. Starting a new one replaces the current workspace. Export it first if you want to keep it."
          : "Starting a new workspace replaces the current one for your account.",
      actions: [
        { id: "export", label: "Export, then continue" },
        { id: "continue", label: "Replace workspace", danger: true },
      ],
    });
    if (!choice) return;
    if (choice === "export") exportWorkspace();
    router.push("/onboarding");
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-line bg-subtle transition-[width] duration-200",
        collapsed ? "w-[52px]" : "w-60",
      )}
    >
      <div className={cn("flex h-12 items-center gap-1 px-2", collapsed && "justify-center")}>
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted",
                collapsed ? "justify-center" : "flex-1",
              )}
              aria-label="Workspace menu"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-ink text-white">
                <Logo className="size-4" />
              </span>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-tight font-semibold">Mindmap</span>
                    <span className="block truncate text-2xs leading-tight text-ink-3">{workspace?.name}</span>
                  </span>
                  <ChevronsUpDown className="size-3.5 text-ink-4" />
                </>
              ) : null}
            </button>
          </MenuTrigger>
          <MenuContent align="start" className="w-60">
            <MenuLabel>Workspace</MenuLabel>
            <MenuItem onSelect={() => router.push("/settings")}>
              <Settings /> {workspace?.name}
              <span className="ml-auto text-2xs text-ink-4">Current</span>
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => exportWorkspace()}>
              <Download /> Export workspace (JSON)
            </MenuItem>
            <MenuItem onSelect={() => void startNew()}>
              <Plus /> Start a new workspace…
            </MenuItem>
          </MenuContent>
        </Menu>
        {!collapsed && !mobile ? (
          <Tooltip content="Collapse sidebar">
            <Button variant="ghost" size="icon-sm" aria-label="Collapse sidebar" onClick={() => setUI({ sidebarCollapsed: true })}>
              <PanelLeftClose />
            </Button>
          </Tooltip>
        ) : null}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="flex flex-col gap-px">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const link = (
              <Link
                href={item.href}
                onClick={() => mobile && setUI({ mobileNavOpen: false })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-ink-2 transition-colors hover:bg-muted hover:text-ink",
                  active && "bg-canvas font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-ink" : "text-ink-3")} />
                {!collapsed ? <span className="truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
              </Link>
            );
            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip content={item.label} side="right">
                    {link}
                  </Tooltip>
                ) : (
                  link
                )}
                {item.href === "/products" && !collapsed && products.length ? (
                  <ul className="mt-px mb-1 ml-[17px] flex flex-col gap-px border-l border-line pl-2">
                    {products.map((p) => {
                      const href = `/products/${p.slug}`;
                      const pActive = pathname === href;
                      return (
                        <li key={p.id}>
                          <Link
                            href={href}
                            onClick={() => mobile && setUI({ mobileNavOpen: false })}
                            aria-current={pActive ? "page" : undefined}
                            className={cn(
                              "flex h-7 items-center rounded-md px-2 text-xs text-ink-3 hover:bg-muted hover:text-ink",
                              pActive && "font-medium text-ink",
                            )}
                          >
                            <span className="truncate">{p.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("border-t border-line p-2", collapsed && "flex flex-col items-center gap-1")}>
        {mode === "local" ? (
          <Tooltip
            side="right"
            content="Data is saved in this browser only. It is not shared with teammates, not synced across devices, and not access-controlled. Configure Supabase for shared, secure storage."
          >
            <div className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-2xs text-ink-3", collapsed && "px-1")}>
              <HardDrive className="size-3.5 shrink-0" />
              {!collapsed ? <span>Development mode · this browser only</span> : <span className="sr-only">Development mode</span>}
            </div>
          </Tooltip>
        ) : null}
        {collapsed ? (
          <Tooltip content="Expand sidebar" side="right">
            <Button variant="ghost" size="icon-sm" aria-label="Expand sidebar" onClick={() => setUI({ sidebarCollapsed: false })}>
              <PanelLeftOpen />
            </Button>
          </Tooltip>
        ) : null}
      </div>
    </aside>
  );
}
