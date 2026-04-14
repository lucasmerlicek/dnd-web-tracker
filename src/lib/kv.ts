import { kv } from "@vercel/kv";
import type { CharacterData, MapMarker } from "@/types";

export async function getCharacterData(characterId: string): Promise<CharacterData | null> {
  return kv.get<CharacterData>(`character:${characterId}`);
}

export async function setCharacterData(characterId: string, data: CharacterData): Promise<void> {
  await kv.set(`character:${characterId}`, data);
}

export async function updateCharacterData(
  characterId: string,
  partial: Partial<CharacterData>
): Promise<CharacterData> {
  const existing = await getCharacterData(characterId);
  if (!existing) throw new Error(`No character data for ${characterId}`);
  const updated = deepMerge(existing as unknown as Record<string, unknown>, partial as unknown as Record<string, unknown>) as unknown as CharacterData;
  await setCharacterData(characterId, updated);
  return updated;
}

export async function getMapMarkers(characterId: string): Promise<MapMarker[]> {
  return (await kv.get<MapMarker[]>(`markers:${characterId}`)) ?? [];
}

export async function setMapMarkers(characterId: string, markers: MapMarker[]): Promise<void> {
  await kv.set(`markers:${characterId}`, markers);
}

export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (sv && tv && typeof sv === "object" && typeof tv === "object" && !Array.isArray(sv) && !Array.isArray(tv)) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[key] = sv;
    }
  }
  return result;
}
