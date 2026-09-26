/**
 * Level-up migration: Madea 9 -> 12 (Sorcerer 9 -> Sorcerer 12).
 *
 * HP is recomputed from scratch (not incremented) so the CON increase applies
 * retroactively to every level, as the rules require:
 *   level 1:    6 (max d6) + CON + 2 (Tough)
 *   levels 2+:  4 (mean d6) + CON + 2 (Tough)  each
 *   => with CON 18 (+4) at level 12: 12 + 11 x 10 = 122
 * (The previous level-9 migration missed the retroactive +1 from CON 16,
 *  leaving her 7 HP low at 76 instead of 83; this corrects that too.)
 *
 * Also:
 *   - ASI: CON 16 -> 18 (+4)
 *   - Sorcery points 9 -> 12
 *   - Slots per Sorcerer 12 table: +1 5th (-> 2), +1 6th (-> 1)
 *   - Metamagic: Heightened Spell, Extended Spell (added to feats & traits)
 *   - Bracers of Dexterity (the "gloves of dexterity (dex=18)" item): sets DEX
 *     to 18, requires attunement; equipped + attuned
 *   - Dagger equipped so it appears on the Attack page
 *   - Sorcerer hit dice 9 -> 12
 *
 * Idempotent: only applies if Madea is still level 9. Backup is written to
 * `character:madea:pre-lvl12` first.
 *
 *   npx tsx --env-file=.env.local src/scripts/level-up-madea-12.ts
 */
import { createClient } from "@vercel/kv";
import type { CharacterData } from "../types/character";

const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const LEVEL = 12;
const TOUGH_PER_LEVEL = 2;

/** Sorcerer (d6) max HP with Tough, taking max die at level 1 and the mean (4) after. */
export function sorcererMaxHp(level: number, conMod: number): number {
  const first = 6 + conMod + TOUGH_PER_LEVEL;
  const rest = (level - 1) * (4 + conMod + TOUGH_PER_LEVEL);
  return first + rest;
}

function addUnique(list: string[] | undefined, ...names: string[]): string[] {
  const out = [...(list ?? [])];
  for (const n of names) if (!out.includes(n)) out.push(n);
  return out;
}

async function main() {
  const m = await kv.get<CharacterData>("character:madea");
  if (!m) throw new Error("character:madea not found in KV");
  if (m.level !== 9) {
    console.log(`Madea is level ${m.level}; expected 9. Skipping.`);
    return;
  }
  await kv.set("character:madea:pre-lvl12", m);

  m.level = LEVEL;
  m.charClass = `Sorcerer ${LEVEL}`;

  // ASI: CON +2
  m.stats.CON = { value: 18, modifier: 4 };

  // HP from scratch; preserve any damage currently taken.
  const oldMax = m.maxHp;
  const damageTaken = oldMax - m.currentHp;
  m.maxHp = sorcererMaxHp(LEVEL, m.stats.CON.modifier);
  m.currentHp = Math.max(1, m.maxHp - damageTaken);

  // Sorcery points
  m.classResources.sorceryPointsMax = 12;
  m.classResources.currentSorceryPoints = 12;

  // Spell slots (Sorcerer 12: 4/3/3/3/2/1). New slots start available.
  m.spellSlots["5th"] = 2;
  m.spellSlots["6th"] = 1;
  m.currentSpellSlots["5th"] = (m.currentSpellSlots["5th"] ?? 0) + 1;
  m.currentSpellSlots["6th"] = (m.currentSpellSlots["6th"] ?? 0) + 1;

  // Hit dice
  const pool = m.hitDicePools?.find((p) => p.className === "Sorcerer");
  if (pool) {
    pool.available += LEVEL - pool.total;
    pool.total = LEVEL;
  }
  m.hitDiceTotal = LEVEL;
  m.hitDiceAvailable = pool ? pool.available : m.hitDiceAvailable + (LEVEL - 9);

  m.featsTraits = addUnique(
    m.featsTraits,
    "ASI: +2 Constitution (18)",
    "Metamagic: Heightened Spell (2 SP, one target has disadvantage on its first save)",
    "Metamagic: Extended Spell (1 SP, double a spell's duration, max 24 hours)"
  );

  // Gear: bracers of dexterity + dagger
  const gear = m.inventoryItems?.gear ?? [];
  const bracers = gear.find((g) => /(bracers|gloves) of dexterity/i.test(g.name));
  if (!bracers) throw new Error("Could not find the dexterity item in Madea's gear");
  bracers.name = "Bracers of Dexterity";
  bracers.description = bracers.description || "Your Dexterity score is 18 while you wear these (requires attunement).";
  bracers.requiresAttunement = true;
  bracers.equipped = true;
  bracers.attuned = true;
  bracers.statModifiers = [{ stat: "DEX", value: 18, mode: "set" }];

  const dagger = gear.find((g) => g.name.toLowerCase() === "dagger");
  if (!dagger) throw new Error("Could not find a Dagger in Madea's gear");
  dagger.equipped = true;

  await kv.set("character:madea", m);
  console.log(
    `Madea -> ${LEVEL}. HP ${oldMax} -> ${m.currentHp}/${m.maxHp}. CON ${m.stats.CON.value}. ` +
      `SP ${m.classResources.sorceryPointsMax}. Slots ${JSON.stringify(m.spellSlots)}. ` +
      `Bracers equipped+attuned, Dagger equipped.`
  );
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
