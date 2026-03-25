import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCharacterId } from "@/lib/session";
import { updateCharacterData } from "@/lib/kv";
import type { CharacterData } from "@/types";

export async function POST(req: NextRequest) {
  const characterId = await getAuthenticatedCharacterId();
  if (!characterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partial: Partial<CharacterData> = await req.json();
  try {
    const updated = await updateCharacterData(characterId, partial);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
