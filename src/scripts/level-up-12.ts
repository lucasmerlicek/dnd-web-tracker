/**
 * Level-up migration: Ramil 10 -> 12 (Fighter 1 / Wizard 9 -> Wizard 11).
 *
 * Changes:
 *   - level 12, charClass "Fighter 1 / Wizard 11 (Bladesinger)"
 *   - +12 HP (2 levels x (4 mean d6 + 2 CON))
 *   - +1 5th-level slot, +1 6th-level slot (Wizard 11 caster table)
 *   - Learns Wall of Force (5th) and Contingency (6th), prepared by default
 *   - Song of Defense (Bladesinger 10) added to feats & traits
 *   - Wizard hit dice 9 -> 11, total 10 -> 12
 *   - proficiencyBonus stays 4 (levels 9-12)
 *
 * Idempotent: only applies if Ramil is still level 10. Backup is written to
 * `character:ramil:pre-lvl12` first.
 *
 *   npx tsx --env-file=.env.local src/scripts/level-up-12.ts
 */
import { createClient } from "@vercel/kv";
import type { CharacterData } from "../types/character";

const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function addUnique(list: string[] | undefined, ...names: string[]): string[] {
  const out = [...(list ?? [])];
  for (const n of names) if (!out.includes(n)) out.push(n);
  return out;
}

async function main() {
  const r = await kv.get<CharacterData>("character:ramil");
  if (!r) throw new Error("character:ramil not found in KV");
  if (r.level !== 10) {
    console.log(`Ramil is level ${r.level}; expected 10. Skipping.`);
    return;
  }
  await kv.set("character:ramil:pre-lvl12", r);

  r.level = 12;
  r.charClass = "Fighter 1 / Wizard 11 (Bladesinger)";

  // HP: +12, keeping current damage taken (don't auto-heal).
  r.maxHp += 12;
  r.currentHp += 12;

  // New slots. New ones start available; existing expended slots stay expended.
  r.spellSlots["5th"] = (r.spellSlots["5th"] ?? 0) + 1;
  r.spellSlots["6th"] = (r.spellSlots["6th"] ?? 0) + 1;
  r.currentSpellSlots["5th"] = (r.currentSpellSlots["5th"] ?? 0) + 1;
  r.currentSpellSlots["6th"] = (r.currentSpellSlots["6th"] ?? 0) + 1;

  r.spells["5th"] = addUnique(r.spells["5th"], "Wall of Force");
  r.spells["6th"] = addUnique(r.spells["6th"], "Contingency");
  r.classResources.preparedSpells = addUnique(
    r.classResources.preparedSpells,
    "Wall of Force",
    "Contingency"
  );
  r.classResources.arcaneRecoveryUsed = r.classResources.arcaneRecoveryUsed ?? false;

  r.featsTraits = addUnique(
    r.featsTraits,
    "Song of Defense: while Bladesong is active, Reaction to expend a spell slot and reduce damage by 5 × the slot's level"
  );

  const wiz = r.hitDicePools?.find((p) => p.className === "Wizard");
  if (wiz) {
    wiz.available += 11 - wiz.total;
    wiz.total = 11;
  }
  r.hitDiceTotal = 12;
  r.hitDiceAvailable = (r.hitDicePools ?? []).reduce((s, p) => s + p.available, 0) || r.hitDiceAvailable;

  await kv.set("character:ramil", r);
  console.log(
    `Ramil -> 12. HP ${r.currentHp}/${r.maxHp}. Slots ${JSON.stringify(r.spellSlots)}. ` +
      `Current ${JSON.stringify(r.currentSpellSlots)}. Prepared ${r.classResources.preparedSpells?.length}.`
  );
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
