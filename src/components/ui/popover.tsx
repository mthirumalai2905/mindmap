"use client";

import * as P from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({
  children,
  className,
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 w-72 rounded-lg border border-line bg-canvas p-1 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.16)] animate-pop focus:outline-none",
          className,
        )}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}
