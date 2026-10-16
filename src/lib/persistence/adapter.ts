import type { WorkspaceData } from "../types";

export type PersistenceMode = "local" | "supabase";

export class AuthRequiredError extends Error {
  constructor() {
    super("Sign in required");
    this.name = "AuthRequiredError";
  }
}

export interface PersistenceAdapter {
  mode: PersistenceMode;
  /** Short human description shown in the UI. */
  description: string;
  load(): Promise<WorkspaceData | null>;
  /** `previous` is the last successfully saved snapshot, used to compute diffs. */
  save(next: WorkspaceData, previous: WorkspaceData | null): Promise<void>;
  clear(): Promise<void>;
  /** Subscribe to changes made elsewhere (other tabs or users). */
  onExternalChange?(cb: () => void): () => void;
  signOut?(): Promise<void>;
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
