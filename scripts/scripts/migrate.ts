/**
 * One-time migration script: reads existing pygame JSON files and seeds Vercel KV.
 *
 * Usage: npx tsx scripts/migrate.ts
 *
 * Requires KV_REST_API_URL and KV_REST_API_TOKEN env vars (from Vercel dashboard).
 * Idempotent — re-running overwrites with fresh data from source JSON files.
 */

import fs from "fs";
import path from "path";
import type { CharacterData, MapMarker, Weapon, Action } from "../src/types";

// --- Helpers ---

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(convertKeys);
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(k)] = convertKeys(v);
    }
    return result;
  }
  return obj;
}

// --- Load source files ---

const WORKSPACE = path.resolve(__dirname, "..");
const TRACKER_ROOT = path.resolve(WORKSPACE, "..");

function loadJson(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.resolve(TRACKER_ROOT, filePath), "utf-8");
  return JSON.parse(raw);
}

// --- Transform Madea ---

function transformMadea(): CharacterData {
  const raw = loadJson("Tracker_Madea/character_data.json");
  const d = convertKeys(raw) as Record<string, unknown>;

  return {
    characterName: d.characterName as string,
    race: d.race as string,
    charClass: d.charClass as string,
    level: d.level as number,
    currentHp: d.currentHp as number,
    maxHp: d.maxHp as number,
    ac: d.ac as number,
    baseAc: d.baseAc as number,
    defaultBaseAc: d.defaultBaseAc as number,
    inspiration: d.inspiration as number,
    luckPoints: d.luckPoints as number,
    shieldActive: d.shieldActive as boolean,
    mageArmorActive: d.mageArmorActive as boolean,
    hitDiceTotal: d.hitDiceTotal as number,
    hitDiceAvailable: d.hitDiceAvailable as number,
    hitDiceSize: d.hitDiceSize as number,
    proficiencyBonus: d.proficiencyBonus as number,
    stats: d.stats as CharacterData["stats"],
    skills: d.skills as CharacterData["skills"],
    featsTraits: d.featsTraits as string[],
    spellSlots: d.spellSlots as Record<string, number>,
    currentSpellSlots: d.currentSpellSlots as Record<string, number>,
    createdSpellSlots: (d.createdSpellSlots as Record<string, number>) ?? {},
    cantrips: d.cantrips as string[],
    spells: d.spells as Record<string, string[]>,
    weapons: (d.weapons as Weapon[]).map((w) => ({
      ...w,
      magicBonus: w.magicBonus ?? 0,
      usesDueling: w.usesDueling ?? false,
      twoHanded: w.twoHanded ?? false,
    })),
    fightingStyles: (d.fightingStyles as Record<string, boolean>) ?? {},
    saveProficiencies: d.saveProficiencies as CharacterData["saveProficiencies"],
    deathSaves: d.deathSaves as CharacterData["deathSaves"],
    actions: transformActions(d.actions as Record<string, unknown>),
    inventory: d.inventory as CharacterData["inventory"],
    coins: d.coins as CharacterData["coins"],
    journal: d.journal as CharacterData["journal"],
    characters: d.characters as Record<string, string>,
    places: d.places as Record<string, string>,
    classResources: {
      sorceryPointsMax: d.sorceryPointsMax as number,
      currentSorceryPoints: d.currentSorceryPoints as number,
      ravenFormActive: d.ravenFormActive as boolean,
      ravenFormUsesRemaining: d.ravenFormUsesRemaining as number,
      ravenFormMaxUses: d.ravenFormMaxUses as number,
      sorcerousRestorationUsed: d.sorcerousRestorationUsed as boolean,
      innateSorceryActive: (d.innateSorceryActive as boolean) ?? false,
      innateSorceryUsesRemaining: (d.innateSorceryUsesRemaining as number) ?? 2,
      innateSorceryMaxUses: (d.innateSorceryMaxUses as number) ?? 2,
      feyBaneUsed: d.feyBaneUsed as boolean,
      feyMistyStepUsed: d.feyMistyStepUsed as boolean,
      druidCharmPersonUsed: d.druidCharmPersonUsed as boolean,
    },
  };
}

// --- Transform Ramil ---

function transformRamil(): CharacterData {
  const raw = loadJson("Tracker_Ramil/character_data.json");
  const d = convertKeys(raw) as Record<string, unknown>;

  return {
    characterName: d.characterName as string,
    race: d.race as string,
    charClass: d.charClass as string,
    level: d.level as number,
    currentHp: d.currentHp as number,
    maxHp: d.maxHp as number,
    ac: d.ac as number,
    baseAc: d.baseAc as number,
    defaultBaseAc: 13, // Missing in source, default for studded leather + DEX
    inspiration: d.inspiration as number,
    luckPoints: d.luckPoints as number,
    shieldActive: d.shieldActive as boolean,
    mageArmorActive: d.mageArmorActive as boolean ?? false,
    hitDiceTotal: 5,
    hitDiceAvailable: 5,
    hitDiceSize: 10, // Fighter primary
    proficiencyBonus: d.proficiencyBonus as number,
    stats: d.stats as CharacterData["stats"],
    skills: d.skills as CharacterData["skills"],
    featsTraits: d.featsTraits as string[],
    spellSlots: d.spellSlots as Record<string, number>,
    currentSpellSlots: d.currentSpellSlots as Record<string, number>,
    createdSpellSlots: {},
    cantrips: d.cantrips as string[],
    spells: d.spells as Record<string, string[]>,
    weapons: (d.weapons as Weapon[]).map((w) => ({
      ...w,
      magicBonus: w.magicBonus ?? 0,
      usesDueling: w.usesDueling ?? false,
      twoHanded: w.twoHanded ?? false,
    })),
    fightingStyles: d.fightingStyles as Record<string, boolean>,
    saveProficiencies: d.saveProficiencies as CharacterData["saveProficiencies"],
    deathSaves: d.deathSaves as CharacterData["deathSaves"],
    actions: transformActions(d.actions as Record<string, unknown>),
    inventory: d.inventory as CharacterData["inventory"],
    coins: d.coins as CharacterData["coins"],
    journal: d.journal as CharacterData["journal"],
    characters: d.characters as Record<string, string>,
    places: d.places as Record<string, string>,
    classResources: {
      bladesongActive: d.bladesongActive as boolean,
      bladesongUsesRemaining: d.bladesongUsesRemaining as number,
      bladesongMaxUses: d.bladesongMaxUses as number,
      preparedSpells: d.preparedSpells as string[],
      autoPreparedSpells: d.autoPreparedSpells as string[],
      druidCharmPersonUsed: d.druidCharmPersonUsed as boolean,
    },
  };
}

function transformActions(raw: Record<string, unknown>): Record<string, Action> {
  const result: Record<string, Action> = {};
  for (const [key, val] of Object.entries(raw)) {
    const a = convertKeys(val) as Record<string, unknown>;
    result[key] = {
      name: a.name as string,
      description: a.description as string,
      available: a.available as boolean ?? true,
      recharge: a.recharge as "short_rest" | "long_rest",
      uses: a.uses as number ?? (a.maxUses as number ?? 1),
      maxUses: a.maxUses as number ?? 1,
      dice: a.dice as string | undefined,
      bonus: a.bonus as number | undefined,
    };
  }
  return result;
}

// --- Transform Map Markers ---

function transformMarkers(): MapMarker[] {
  const raw = loadJson("Tracker_Ramil/map_markers.json");
  const markers = (raw.markers as Record<string, unknown>[]) ?? [];
  return markers.map((m) => {
    const d = convertKeys(m) as Record<string, unknown>;
    // Normalize pixel positions to percentages (original map was ~7680x5120)
    const pos = d.position as { x: number; y: number };
    return {
      id: d.id as string,
      category: d.category as MapMarker["category"],
      title: d.title as string,
      description: d.description as string,
      position: { x: (pos.x / 7680) * 100, y: (pos.y / 5120) * 100 },
      map: "valerion" as const,
      createdAt: (d.createdAt as string) ?? new Date().toISOString(),
      updatedAt: (d.updatedAt as string) ?? new Date().toISOString(),
    };
  });
}

// --- Seed KV ---

async function main() {
  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  if (!KV_URL || !KV_TOKEN) {
    console.log("No KV credentials found. Writing transformed data to local JSON files instead.");
    const madea = transformMadea();
    const ramil = transformRamil();
    const markers = transformMarkers();

    const outDir = path.resolve(__dirname, "output");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "character_madea.json"), JSON.stringify(madea, null, 2));
    fs.writeFileSync(path.join(outDir, "character_ramil.json"), JSON.stringify(ramil, null, 2));
    fs.writeFileSync(path.join(outDir, "markers_ramil.json"), JSON.stringify(markers, null, 2));
    console.log("Wrote transformed data to scripts/output/");
    return;
  }

  // Use Vercel KV REST API directly
  async function kvSet(key: string, value: unknown) {
    const res = await fetch(`${KV_URL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(["SET", key, JSON.stringify(value)]),
    });
    if (!res.ok) throw new Error(`KV SET ${key} failed: ${res.statusText}`);
    console.log(`SET ${key} ✓`);
  }

  const madea = transformMadea();
  const ramil = transformRamil();
  const markers = transformMarkers();

  await kvSet("character:madea", madea);
  await kvSet("character:ramil", ramil);
  await kvSet("markers:ramil", markers);
  await kvSet("markers:madea", []);

  console.log("Migration complete.");
}

main().catch(console.error);
