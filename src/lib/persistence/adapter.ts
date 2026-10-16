import type { ActivityEntry, CollectionKey, Workspace, WorkspaceData } from "../types";

export type PersistenceMode = "local" | "supabase";

export class AuthRequiredError extends Error {
  constructor() {
    super("Sign in required");
    this.name = "AuthRequiredError";
  }
}

/** A change made by someone else, delivered by the backend. */
export type RemoteChange =
  | { kind: "upsert"; collection: CollectionKey; record: { id: string; updatedAt: string } }
  | { kind: "delete"; collection: CollectionKey; id: string }
  | { kind: "workspace"; workspace: Workspace }
  | { kind: "activity"; entry: ActivityEntry }
  /** Full re-read after a reconnect or when the tab regains focus. */
  | { kind: "snapshot"; data: WorkspaceData };

export interface PersistenceAdapter {
  mode: PersistenceMode;
  /** Short human description shown in the UI. */
  description: string;
  load(): Promise<WorkspaceData | null>;
  /** `previous` is the last successfully saved snapshot, used to compute diffs. */
  save(next: WorkspaceData, previous: WorkspaceData | null): Promise<void>;
  clear(): Promise<void>;
  /** Another tab changed local data (local mode). */
  onExternalChange?(cb: () => void): () => void;
  /** Live changes from other members (Supabase mode). */
  onRemoteChange?(cb: (change: RemoteChange) => void): () => void;

}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
