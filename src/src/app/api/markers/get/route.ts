import { NextResponse } from "next/server";
import { getAuthenticatedCharacterId } from "@/lib/session";
import { getMapMarkers } from "@/lib/kv";

export async function GET(req: Request) {
  const characterId = await getAuthenticatedCharacterId();
  if (!characterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const markers = await getMapMarkers(characterId);

  const { searchParams } = new URL(req.url);
  const map = searchParams.get("map");
  const floor = searchParams.get("floor");

  let filtered = markers;
  if (map) {
    filtered = filtered.filter((m) => m.map === map);
  }
  if (floor !== null && floor !== undefined) {
    const floorNum = Number(floor);
    if (!Number.isNaN(floorNum)) {
      filtered = filtered.filter((m) => m.floor === floorNum);
    }
  }

  return NextResponse.json(filtered);
}
