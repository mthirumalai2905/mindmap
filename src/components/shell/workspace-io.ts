"use client";

import { parseSnapshot } from "@/lib/schemas";
import { replaceWorkspace, toast, useStore } from "@/lib/store";
import { slugify } from "@/lib/utils";
import { format } from "date-fns";

export function exportWorkspace() {
  const { data } = useStore.getState();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(data.workspace.name) || "workspace"}-${format(new Date(), "yyyy-MM-dd")}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Workspace exported as JSON");
}

export async function importWorkspaceFile(file: File): Promise<string | null> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return "That file is not valid JSON.";
  }
  const parsed = parseSnapshot(json);
  if (!parsed.ok) return parsed.error;
  await replaceWorkspace(parsed.data);
  const { saveState, saveError } = useStore.getState();
  if (saveState === "error") return `Imported, but saving failed: ${saveError}`;
  return null;
}
