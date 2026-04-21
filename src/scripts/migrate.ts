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
  "innateSorceryActive",
  "innateSorceryUsesRemaining",
  "innateSorceryMaxUses",
  "bladesongActive",
  "bladesongUsesRemaining",
  "bladesongMaxUses",
  "preparedSpells",
  "autoPreparedSpells",
  "feyBaneUsed",
  "feyMistyStepUsed",
  "druidCharmPersonUsed",
  "strengthOfTheGraveUsed",
  "familiars",
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

  // --- Default familiars to [] in classResources ---
  // Deep-clone classResources and spells to avoid mutating the input
  result.classResources = { ...result.classResources } as typeof result.classResources;
  const cr = result.classResources as Record<string, unknown>;
  if (cr.familiars === undefined) {
    cr.familiars = [];
  }

  // --- Madea: add strengthOfTheGraveUsed and familiar spells ---
  const charClass = (result.charClass ?? "").toLowerCase();
  const isSorcerer = charClass.includes("sorcerer") && !charClass.includes("fighter") && !charClass.includes("wizard");
  result.spells = { ...result.spells };
  if (isSorcerer) {
    if (cr.strengthOfTheGraveUsed === undefined) {
      cr.strengthOfTheGraveUsed = false;
    }
    const spells1st = [...(result.spells["1st"] ?? [])];
    if (!spells1st.includes("Find Familiar")) {
      spells1st.push("Find Familiar");
    }
    result.spells["1st"] = spells1st;
    const spells3rd = [...(result.spells["3rd"] ?? [])];
    if (!spells3rd.includes("Hound of Ill Omen")) {
      spells3rd.push("Hound of Ill Omen");
    }
    result.spells["3rd"] = spells3rd;
  } else {
    // Non-sorcerer (Ramil): add Find Familiar to 1st level spells
    const spells1st = [...(result.spells["1st"] ?? [])];
    if (!spells1st.includes("Find Familiar")) {
      spells1st.push("Find Familiar");
    }
    result.spells["1st"] = spells1st;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Level-up migration: Madea level 5 → 7
// ---------------------------------------------------------------------------

/**
 * Apply level-up changes for Madea from level 5 to level 7 (Shadow Sorcerer).
 *
 * Pure function — does not mutate the input. Returns a new CharacterData with:
 * - level 7, proficiency bonus 3
 * - +16 HP (2 levels × (4 avg d6 + 2 CON mod) + 4 Tough feat)
 * - +1 3rd-level spell slot, +1 4th-level spell slot
 * - Counterspell added to 3rd-level spells
 * - Banishment added to 4th-level spells
 * - Sorcery points max = 7, current = 7
 * - Innate Sorcery max uses = 2, uses remaining = 2
 * - Verifies Hound of Ill Omen is present in spell data
 *
 * Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.3, 5.4, 6.1, 6.2, 8.4, 8.5, 11.2
 */
export function levelUpMadeaToLevel7(data: CharacterData): CharacterData {
  const result = { ...data };

  // Req 1.1: level → 7
  result.level = 7;

  // Req 1.2: proficiency bonus → 3
  result.proficiencyBonus = 3;

  // Req 2.1: maxHp += 16 (2 × (4 + 2) + 4 for Tough feat, CON mod = +2)
  result.maxHp = data.maxHp + 16;

  // Req 2.2: currentHp += 16
  result.currentHp = data.currentHp + 16;

  // Deep-clone spell slots to avoid mutating input
  result.spellSlots = { ...data.spellSlots };
  result.currentSpellSlots = { ...data.currentSpellSlots };

  // Req 3.1, 3.2: add 1 to 3rd-level spell slots
  result.spellSlots["3rd"] = (data.spellSlots["3rd"] ?? 0) + 1;
  result.currentSpellSlots["3rd"] = (data.currentSpellSlots["3rd"] ?? 0) + 1;

  // Req 3.3, 3.4: add 1 4th-level spell slot
  result.spellSlots["4th"] = (data.spellSlots["4th"] ?? 0) + 1;
  result.currentSpellSlots["4th"] = (data.currentSpellSlots["4th"] ?? 0) + 1;

  // Deep-clone spells to avoid mutating input
  result.spells = { ...data.spells };

  // Req 4.3: append Counterspell to 3rd-level spells
  const spells3rd = [...(data.spells["3rd"] ?? [])];
  if (!spells3rd.includes("Counterspell")) {
    spells3rd.push("Counterspell");
  }
  result.spells["3rd"] = spells3rd;

  // Req 5.4: create 4th-level spells with Banishment
  const spells4th = [...(data.spells["4th"] ?? [])];
  if (!spells4th.includes("Banishment")) {
    spells4th.push("Banishment");
  }
  result.spells["4th"] = spells4th;

  // Deep-clone classResources to avoid mutating input
  result.classResources = { ...data.classResources };
  const cr = result.classResources as Record<string, unknown>;

  // Req 6.1: sorcery points max → 7
  cr.sorceryPointsMax = 7;

  // Req 6.2: current sorcery points → 7
  cr.currentSorceryPoints = 7;

  // Req 8.5: innate sorcery max uses → 2
  cr.innateSorceryMaxUses = 2;

  // Req 8.4: innate sorcery uses remaining → 2
  cr.innateSorceryUsesRemaining = 2;

  // Req 11.2: verify Hound of Ill Omen is present in spell data
  const allSpells = Object.values(result.spells).flat();
  if (!allSpells.includes("Hound of Ill Omen")) {
    throw new Error(
      "Level-up migration failed: 'Hound of Ill Omen' is not present in the character's spell data"
    );
  }

  return result;
}

// Level-up migration: Ramil level 5 → 6 (Fighter 1 / Wizard 4 → Fighter 1 / Wizard 5)
// ---------------------------------------------------------------------------

/**
 * Apply level-up changes for Ramil from level 5 to level 6 (Fighter 1 / Wizard 5).
 *
 * Pure function — does not mutate the input. Returns a new CharacterData with:
 * - level 6, charClass updated to "Fighter 1 / Wizard 5 (Bladesinger)"
 * - +6 HP (4 avg d6 + 2 CON mod)
 * - +2 3rd-level spell slots
 * - Wall of Sand and Fireball added to 3rd-level spells
 * - proficiencyBonus stays at 3 (levels 5-8)
 */
export function levelUpRamilToLevel6(data: CharacterData): CharacterData {
  const result = { ...data };

  // level → 6
  result.level = 6;

  // Update class description
  result.charClass = "Fighter 1 / Wizard 5 (Bladesinger)";

  // proficiency bonus stays at 3 (levels 5-8)
  result.proficiencyBonus = 3;

  // maxHp += 6 (4 avg d6 + 2 CON mod)
  result.maxHp = data.maxHp + 6;
  result.currentHp = data.currentHp + 6;

  // Deep-clone spell slots
  result.spellSlots = { ...data.spellSlots };
  result.currentSpellSlots = { ...data.currentSpellSlots };

  // Add 2 3rd-level spell slots
  result.spellSlots["3rd"] = (data.spellSlots["3rd"] ?? 0) + 2;
  result.currentSpellSlots["3rd"] = (data.currentSpellSlots["3rd"] ?? 0) + 2;

  // Deep-clone spells
  result.spells = { ...data.spells };

  // Add Wall of Sand and Fireball to 3rd-level spells
  const spells3rd = [...(data.spells["3rd"] ?? [])];
  if (!spells3rd.includes("Wall of Sand")) {
    spells3rd.push("Wall of Sand");
  }
  if (!spells3rd.includes("Fireball")) {
    spells3rd.push("Fireball");
  }
  result.spells["3rd"] = spells3rd;

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
