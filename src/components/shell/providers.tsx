"use client";

import type { ReactNode } from "react";
import { ConfirmHost } from "../ui/confirm";
import { TooltipProvider } from "../ui/tooltip";
import { Toaster } from "./toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={350}>
      {children}
      <ConfirmHost />
      <Toaster />
    </TooltipProvider>
  );
}
