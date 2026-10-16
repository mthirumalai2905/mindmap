import type { Metadata } from "next";
import { MindMap } from "@/components/map/mind-map";

export const metadata: Metadata = { title: "Master Mind Map" };
// Rendered client-side once the workspace has loaded.
export const instant = false;

export default function MapPage() {
  return (
    <div className="absolute inset-0">
      <MindMap />
    </div>
  );
}
