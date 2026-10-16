"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-6 text-danger" />
        <h1 className="mt-3 text-base font-semibold">Something went wrong on this page</h1>
        <p className="mt-1.5 text-[13px] text-ink-3">
          {error.message || "An unexpected error occurred."} Your saved workspace data is not affected.
        </p>
        <Button className="mt-5" variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
