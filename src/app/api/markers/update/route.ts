import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCharacterId } from "@/lib/session";
import { getMapMarkers, setMapMarkers } from "@/lib/kv";
import type { MapMarker } from "@/types";

interface MarkerUpdateBody {
  action: "create" | "update" | "delete";
  marker: MapMarker;
}

export async function POST(req: NextRequest) {
  const characterId = await getAuthenticatedCharacterId();
  if (!characterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: MarkerUpdateBody = await req.json();
  const { action, marker } = body;

  if (!action || !marker) {
    return NextResponse.json({ error: "Missing action or marker" }, { status: 400 });
  }

  const markers = await getMapMarkers(characterId);

  let updated: MapMarker[];

  switch (action) {
    case "create":
      updated = [...markers, marker];
      break;
    case "update":
      updated = markers.map((m) => (m.id === marker.id ? marker : m));
      break;
    case "delete":
      updated = markers.filter((m) => m.id !== marker.id);
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await setMapMarkers(characterId, updated);
  return NextResponse.json(updated);
}
