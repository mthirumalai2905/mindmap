import { parseSnapshot } from "../schemas";
import type { WorkspaceData } from "../types";
import type { PersistenceAdapter } from "./adapter";

const KEY = "mindmap:workspace:v1";

/**
 * Development-only persistence. Data lives in this browser's localStorage:
 * it is not shared with other people or devices and is not access-controlled.
 */
export function createLocalAdapter(): PersistenceAdapter {
  return {
    mode: "local",
    description: "Development mode — data is stored only in this browser.",
    async load() {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        throw new Error("Stored workspace data is corrupted and could not be read.");
      }
      const parsed = parseSnapshot(json);
      if (!parsed.ok) throw new Error(`Stored workspace data is invalid: ${parsed.error}`);
      return parsed.data;
    },
    async save(next: WorkspaceData) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch (err) {
        if (err instanceof DOMException && err.name === "QuotaExceededError") {
          throw new Error("Browser storage is full. Export your workspace from Settings to avoid losing work.");
        }
        throw err;
      }
    },
    async clear() {
      window.localStorage.removeItem(KEY);
    },
    onExternalChange(cb) {
      const handler = (e: StorageEvent) => {
        if (e.key === KEY) cb();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}
