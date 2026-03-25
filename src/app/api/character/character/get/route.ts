import { NextResponse } from "next/server";
import { getAuthenticatedCharacterId } from "@/lib/session";
import { getCharacterData } from "@/lib/kv";

export async function GET() {
  const characterId = await getAuthenticatedCharacterId();
  if (!characterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getCharacterData(characterId);
  if (!data) return NextResponse.json({ error: "Character not found" }, { status: 404 });

  return NextResponse.json(data);
}
