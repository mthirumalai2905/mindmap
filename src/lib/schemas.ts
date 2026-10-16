import { z } from "zod";
import { emptyWorkspaceData } from "./factories";
import { COLLECTION_KEYS, DEFAULT_STATUS_LABELS, type WorkspaceData } from "./types";
import { isValidUrl } from "./utils";

const recordMap = z.record(z.string(), z.object({ id: z.string() }).passthrough());

/**
 * Structural validation for stored or imported workspaces. Individual records
 * are merged over current defaults so older snapshots gain new fields.
 */
export const workspaceSnapshotSchema = z
  .object({
    version: z.literal(1),
    workspace: z
      .object({
        id: z.string(),
        name: z.string().min(1),
      })
      .passthrough(),
    activity: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  })
  .catchall(z.unknown());

export function parseSnapshot(input: unknown): { ok: true; data: WorkspaceData } | { ok: false; error: string } {
  const parsed = workspaceSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid workspace file" };
  }
  const raw = parsed.data as Record<string, unknown>;
  const base = emptyWorkspaceData(String((raw.workspace as { name: string }).name));
  const out: WorkspaceData = {
    ...base,
    workspace: {
      ...base.workspace,
      ...(raw.workspace as object),
      statusLabels: {
        ...DEFAULT_STATUS_LABELS,
        ...((raw.workspace as { statusLabels?: object }).statusLabels ?? {}),
      },
    },
    activity: (raw.activity as WorkspaceData["activity"]) ?? [],
  };
  for (const key of COLLECTION_KEYS) {
    const map = recordMap.safeParse(raw[key] ?? {});
    if (!map.success) return { ok: false, error: `Collection "${key}" is malformed` };
    (out as unknown as Record<string, unknown>)[key] = map.data;
  }
  return { ok: true, data: out };
}

/* ---------- Form validation ---------- */

export const titleSchema = z.string().trim().min(1, "A title is required").max(200, "Keep titles under 200 characters");

export const urlSchema = z
  .string()
  .trim()
  .refine((v) => isValidUrl(v), "Enter a full URL starting with http:// or https://");

export const quickCaptureSchema = z.object({
  title: titleSchema,
  target: z.enum(["content", "nodes", "initiatives", "research", "tasks", "characters", "lore"]),
  productId: z.string().nullable(),
});

export const workspaceNameSchema = z.string().trim().min(2, "Use at least 2 characters").max(80);

export function dateRangeError(start: string, end: string): string | null {
  if (start && end && end < start) return "End date is before the start date";
  return null;
}
