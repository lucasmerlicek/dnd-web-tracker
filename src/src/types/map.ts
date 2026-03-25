export interface MapMarker {
  id: string;
  category: "artifact" | "treasure" | "enemy" | "person" | "note";
  title: string;
  description: string;
  position: { x: number; y: number };
  map: "valerion" | "aetherion";
  floor?: number;
  createdAt: string;
  updatedAt: string;
}
