/**
 * Migration script: reads legacy character_data.json and map_markers.json files,
 * transforms them to the TypeScript CharacterData / MapMarker interfaces,
 * and seeds Vercel KV. Idempotent — overwrites on re-run.
 *
 * Usage: npx tsx src/scripts/migrate.ts
 *
 * Requires KV_REST_API_URL and KV_REST_API_TOKEN env vars.
 * Reads .env.local automatically via Node --env-file or manual export.
 */

import { createClient } from "@vercel/kv";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Load .env.local manually (no dotenv dependency)
// ---------------------------------------------------------------------------
function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.resolve(__dirname, "../../.env.local"));

const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a single snake_case string to camelCase */
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Recursively convert all object keys from snake_case to camelCase */
export function convertKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(convertKeys);
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = convertKeys(value);
    }
    return result;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Class-specific flag keys that should be consolidated into classResources
// ---------------------------------------------------------------------------
const CLASS_RESOURCE_KEYS: string[] = [
  "sorceryPointsMax",
  "currentSorceryPoints",
  "ravenFormActive",
  "ravenFormUsesRemaining",
  "ravenFormMaxUses",
  "sorcerousRestorationUsed",
  "bladesongActive",
  "bladesongUsesRemaining",
  "bladesongMaxUses",
  "preparedSpells",
  "autoPreparedSpells",
  "feyBaneUsed",
  "feyMistyStepUsed",
  "druidCharmPersonUsed",
];

// Keys from legacy data that are UI-only and not part of CharacterData
const IGNORED_KEYS: string[] = [
  "currentCharacter",
  "characterPage",
  "currentPlace",
  "placePage",
];

// ---------------------------------------------------------------------------
// Interfaces (local copies — avoids path alias issues in standalone script)
// ---------------------------------------------------------------------------

export interface CharacterData {
  characterName: string;
  race: string;
  charClass: string;
  level: number;
  currentHp: number;
  maxHp: number;
  ac: number;
  baseAc: number;
  defaultBaseAc: number;
  inspiration: number;
  luckPoints: number;
  shieldActive: boolean;
  mageArmorActive: boolean;
  hitDiceTotal: number;
  hitDiceAvailable: number;
  hitDiceSize: number;
  proficiencyBonus: number;
  stats: Record<string, { value: number; modifier: number }>;
  skills: Array<{ name: string; stat: string; proficient: boolean; modifier: number }>;
  featsTraits: string[];
  spellSlots: Record<string, number>;
  currentSpellSlots: Record<string, number>;
  createdSpellSlots: Record<string, number>;
  cantrips: string[];
  spells: Record<string, string[]>;
  weapons: Array<{
    name: string;
    damageDice: string;
    damageType: string;
    attackStat: string;
    properties: string[];
    magicBonus: number;
    usesDueling: boolean;
    twoHanded: boolean;
  }>;
  fightingStyles: Record<string, boolean>;
  saveProficiencies: string[];
  deathSaves: { successes: number; failures: number };
  actions: Record<string, {
    name: string;
    description: string;
    available: boolean;
    recharge: string;
    uses: number;
    maxUses: number;
    dice?: string;
    bonus?: number;
  }>;
  inventory: { gear: string[]; utility: string[]; treasure: string[] };
  coins: { cp: number; sp: number; ep: number; gp: number; pp: number };
  journal: { sessions: Record<string, string>; currentSession: string };
  characters: Record<string, string>;
  places: Record<string, string>;
  classResources: Record<string, unknown>;
}

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


// ---------------------------------------------------------------------------
// Transform character data
// ---------------------------------------------------------------------------

export function transformCharacter(raw: Record<string, unknown>, characterId: string): CharacterData {
  // Step 1: convert all keys to camelCase
  const data = convertKeys(raw) as Record<string, unknown>;

  // Step 2: extract classResources from flat flags
  const classResources: Record<string, unknown> = {};
  for (const key of CLASS_RESOURCE_KEYS) {
    if (key in data) {
      classResources[key] = data[key];
      delete data[key];
    }
  }

  // Step 3: remove UI-only keys
  for (const key of IGNORED_KEYS) {
    delete data[key];
  }

  // Step 4: ensure defaultBaseAc exists (Ramil's legacy data is missing it)
  if (data.defaultBaseAc === undefined || data.defaultBaseAc === null) {
    data.defaultBaseAc = characterId === "ramil" ? 13 : (data.baseAc ?? 10);
  }

  // Step 5: ensure createdSpellSlots exists
  if (!data.createdSpellSlots) {
    data.createdSpellSlots = {};
  }

  // Step 6: normalise fightingStyles — keep only boolean values, camelCase keys
  if (data.fightingStyles && typeof data.fightingStyles === "object") {
    const raw = data.fightingStyles as Record<string, unknown>;
    const cleaned: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "boolean") {
        cleaned[snakeToCamel(k)] = v;
      }
    }
    data.fightingStyles = cleaned;
  }

  // Step 7: build the final CharacterData object
  return {
    characterName: data.characterName as string,
    race: data.race as string,
    charClass: data.charClass as string,
    level: data.level as number,
    currentHp: data.currentHp as number,
    maxHp: data.maxHp as number,
    ac: data.ac as number,
    baseAc: data.baseAc as number,
    defaultBaseAc: data.defaultBaseAc as number,
    inspiration: data.inspiration as number,
    luckPoints: data.luckPoints as number,
    shieldActive: data.shieldActive as boolean,
    mageArmorActive: data.mageArmorActive as boolean,
    hitDiceTotal: data.hitDiceTotal as number,
    hitDiceAvailable: data.hitDiceAvailable as number,
    hitDiceSize: data.hitDiceSize as number,
    proficiencyBonus: data.proficiencyBonus as number,
    stats: data.stats as CharacterData["stats"],
    skills: data.skills as CharacterData["skills"],
    featsTraits: data.featsTraits as string[],
    spellSlots: data.spellSlots as Record<string, number>,
    currentSpellSlots: data.currentSpellSlots as Record<string, number>,
    createdSpellSlots: data.createdSpellSlots as Record<string, number>,
    cantrips: data.cantrips as string[],
    spells: data.spells as Record<string, string[]>,
    weapons: data.weapons as CharacterData["weapons"],
    fightingStyles: data.fightingStyles as Record<string, boolean>,
    saveProficiencies: data.saveProficiencies as string[],
    deathSaves: data.deathSaves as CharacterData["deathSaves"],
    actions: data.actions as CharacterData["actions"],
    inventory: data.inventory as CharacterData["inventory"],
    coins: data.coins as CharacterData["coins"],
    journal: data.journal as CharacterData["journal"],
    characters: data.characters as Record<string, string>,
    places: data.places as Record<string, string>,
    classResources,
  };
}

// ---------------------------------------------------------------------------
// Transform map markers
// ---------------------------------------------------------------------------

export function transformMarkers(raw: Record<string, unknown>): MapMarker[] {
  const markers = (raw.markers ?? []) as Array<Record<string, unknown>>;
  return markers.map((m) => {
    const converted = convertKeys(m) as Record<string, unknown>;
    return {
      id: (converted.id as string) || `marker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: converted.category as MapMarker["category"],
      title: converted.title as string,
      description: (converted.description as string) || "",
      position: converted.position as { x: number; y: number },
      map: "valerion" as const,
      floor: undefined,
      createdAt: (converted.createdAt as string) || new Date().toISOString(),
      updatedAt: (converted.updatedAt as string) || new Date().toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// New-format migration: convert legacy CharacterData fields to new structures
// ---------------------------------------------------------------------------

interface HitDicePool {
  className: string;
  dieSize: number;
  total: number;
  available: number;
}

interface StatModifier {
  stat: string;
  value: number;
}

interface GearItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  equipped: boolean;
  requiresAttunement: boolean;
  attuned: boolean;
  statModifiers: StatModifier[];
}

interface UtilityItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
}

interface TreasureItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  estimatedValue: number;
}

interface SpellCreatedWeapon {
  id: string;
  name: string;
  sourceSpell: string;
  castLevel: number;
  damageDice: string;
  damageType: string;
  attackStat: string;
  properties: string[];
  magicBonus: number;
  active: boolean;
}

/**
 * Migrate legacy CharacterData to the new format with structured inventory,
 * multiclass hit dice pools, and spell-created weapons.
 *
 * Only migrates fields that don't already exist on the data object.
 * Returns a new object — does not mutate the input.
 */
export function migrateCharacterData(data: CharacterData): CharacterData {
  const result = { ...data };

  // --- Migrate inventory.gear/utility/treasure string[] → inventoryItems ---
  if (!(result as Record<string, unknown>).inventoryItems && result.inventory) {
    const gear: GearItem[] = (result.inventory.gear ?? []).map((name: string) => ({
      id: crypto.randomUUID(),
      name,
      description: "",
      quantity: 1,
      equipped: false,
      requiresAttunement: false,
      attuned: false,
      statModifiers: [],
    }));

    const utility: UtilityItem[] = (result.inventory.utility ?? []).map((name: string) => ({
      id: crypto.randomUUID(),
      name,
      description: "",
      quantity: 1,
    }));

    const treasure: TreasureItem[] = (result.inventory.treasure ?? []).map((name: string) => ({
      id: crypto.randomUUID(),
      name,
      description: "",
      quantity: 1,
      estimatedValue: 0,
    }));

    (result as Record<string, unknown>).inventoryItems = { gear, utility, treasure };
  }

  // --- Migrate hitDiceTotal/hitDiceAvailable/hitDiceSize → hitDicePools ---
  if (!(result as Record<string, unknown>).hitDicePools) {
    let pools: HitDicePool[];

    // Detect Ramil (Fighter 1 / Wizard 4) by class string
    const charClass = (result.charClass ?? "").toLowerCase();
    const isMadeaSorcerer = charClass.includes("sorcerer") && !charClass.includes("fighter") && !charClass.includes("wizard");
    const isRamilMulticlass = charClass.includes("fighter") && charClass.includes("wizard");

    if (isRamilMulticlass) {
      pools = [
        { className: "Fighter", dieSize: 10, total: 1, available: 1 },
        { className: "Wizard", dieSize: 6, total: 4, available: 4 },
      ];
    } else if (isMadeaSorcerer) {
      pools = [
        {
          className: "Sorcerer",
          dieSize: result.hitDiceSize,
          total: result.hitDiceTotal,
          available: result.hitDiceAvailable,
        },
      ];
    } else {
      // Default: single pool using existing fields
      pools = [
        {
          className: result.charClass.split(" ")[0] || "Unknown",
          dieSize: result.hitDiceSize,
          total: result.hitDiceTotal,
          available: result.hitDiceAvailable,
        },
      ];
    }

    (result as Record<string, unknown>).hitDicePools = pools;
  }

  // --- Default spellCreatedWeapons to [] ---
  if (!(result as Record<string, unknown>).spellCreatedWeapons) {
    (result as Record<string, unknown>).spellCreatedWeapons = [] as SpellCreatedWeapon[];
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const legacyDir = path.resolve(__dirname, "../../legacy");

  // --- Madea ---
  console.log("Migrating Madea...");
  const madeaRaw = JSON.parse(
    fs.readFileSync(path.join(legacyDir, "Tracker_Madea/character_data.json"), "utf-8")
  );
  const madeaData = migrateCharacterData(transformCharacter(madeaRaw, "madea"));
  await kv.set("character:madea", madeaData);
  console.log("  ✓ character:madea");

  // Madea markers
  const madeaMarkersPath = path.join(legacyDir, "Tracker_Madea/map_markers.json");
  let madeaMarkers: MapMarker[] = [];
  if (fs.existsSync(madeaMarkersPath)) {
    const madeaMarkersRaw = JSON.parse(fs.readFileSync(madeaMarkersPath, "utf-8"));
    madeaMarkers = transformMarkers(madeaMarkersRaw);
  }
  await kv.set("markers:madea", madeaMarkers);
  console.log(`  ✓ markers:madea (${madeaMarkers.length} markers)`);

  // --- Ramil ---
  console.log("Migrating Ramil...");
  const ramilRaw = JSON.parse(
    fs.readFileSync(path.join(legacyDir, "Tracker_Ramil/character_data.json"), "utf-8")
  );
  const ramilData = migrateCharacterData(transformCharacter(ramilRaw, "ramil"));
  await kv.set("character:ramil", ramilData);
  console.log("  ✓ character:ramil");

  // Ramil markers
  const ramilMarkersPath = path.join(legacyDir, "Tracker_Ramil/map_markers.json");
  let ramilMarkers: MapMarker[] = [];
  if (fs.existsSync(ramilMarkersPath)) {
    const ramilMarkersRaw = JSON.parse(fs.readFileSync(ramilMarkersPath, "utf-8"));
    ramilMarkers = transformMarkers(ramilMarkersRaw);
  }
  await kv.set("markers:ramil", ramilMarkers);
  console.log(`  ✓ markers:ramil (${ramilMarkers.length} markers)`);

  console.log("\nMigration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
