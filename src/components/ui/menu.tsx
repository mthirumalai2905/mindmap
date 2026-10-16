"use client";

import * as M from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

const panel =
  "z-50 min-w-44 rounded-lg border border-line bg-canvas p-1 text-[13px] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.16)] animate-pop";

export function MenuContent({ children, align = "end", className }: { children: ReactNode; align?: "start" | "end" | "center"; className?: string }) {
  return (
    <M.Portal>
      <M.Content align={align} sideOffset={6} className={cn(panel, className)}>
        {children}
      </M.Content>
    </M.Portal>
  );
}

const item =
  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-ink-2 outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:size-3.5 [&_svg]:text-ink-3";

export function MenuItem({
  children,
  onSelect,
  danger,
  shortcut,
  disabled,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  shortcut?: string;
  disabled?: boolean;
}) {
  return (
    <M.Item disabled={disabled} onSelect={onSelect} className={cn(item, danger && "text-danger data-[highlighted]:text-danger [&_svg]:text-danger")}>
      {children}
      {shortcut ? <span className="ml-auto pl-4 text-2xs text-ink-4">{shortcut}</span> : null}
    </M.Item>
  );
}

export function MenuCheckItem({ children, checked, onSelect }: { children: ReactNode; checked: boolean; onSelect: () => void }) {
  return (
    <M.CheckboxItem checked={checked} onSelect={(e) => { e.preventDefault(); onSelect(); }} className={item}>
      <span className="flex size-3.5 items-center justify-center">{checked ? <Check /> : null}</span>
      {children}
    </M.CheckboxItem>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <M.Label className="px-2 pt-1.5 pb-1 text-2xs font-medium tracking-wide text-ink-4 uppercase">{children}</M.Label>;
}

export function MenuSeparator() {
  return <M.Separator className="my-1 h-px bg-line" />;
}

export function SubMenu({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <M.Sub>
      <M.SubTrigger className={item}>
        {icon}
        {label}
        <ChevronRight className="ml-auto" />
      </M.SubTrigger>
      <M.Portal>
        <M.SubContent sideOffset={4} className={cn(panel, "max-h-80 overflow-y-auto")}>
          {children}
        </M.SubContent>
      </M.Portal>
    </M.Sub>
  );
}
