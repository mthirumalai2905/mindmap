"use client";

import { createContext, useContext } from "react";
import type { ID } from "@/lib/types";

export interface MapActions {
  toggleCollapse: (id: ID) => void;
  commitTitle: (id: ID, title: string) => void;
  stopEditing: () => void;
  startEditing: (id: ID) => void;
}

export const MapActionsContext = createContext<MapActions | null>(null);

export function useMapActions(): MapActions {
  const ctx = useContext(MapActionsContext);
  if (!ctx) throw new Error("MapActionsContext missing");
  return ctx;
}
