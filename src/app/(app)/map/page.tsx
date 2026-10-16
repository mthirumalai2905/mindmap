import type { Metadata } from "next";
import { MindMap } from "@/components/map/mind-map";

export const metadata: Metadata = { title: "Master Mind Map" };

export default function MapPage() {
  return (
    <div className="absolute inset-0">
      <MindMap />
    </div>
  );
}
