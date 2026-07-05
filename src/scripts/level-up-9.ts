/**
 * Level-up migration: Madea 7 -> 9 and Ramil 6 -> 9 (Fighter 1 / Wizard 5 -> 8).
 *
 * This script was executed once against the live KV store on 2026-06-20.
 * It is idempotent: each character is only modified if still at its pre-level-up
 * level, so re-running is a no-op. A backup of each character was written to
 * `character:<id>:pre-lvl9` before applying changes.
 *
 * Run locally (needs KV_REST_API_URL / KV_REST_API_TOKEN in .env.local):
 *   npx tsx src/scripts/level-up-9.ts
 *
 * Excluded from the Next.js build via tsconfig `exclude: ["src/scripts"]`.
 */
import { createClient } from "@vercel/kv";
import type { CharacterData } from "../types/character";

const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

/** Recompute skill modifiers by DELTA (preserves expertise / racial bonuses). */
function applySkillDeltas(
  c: CharacterData,
  opts: { profDelta: number; stat: keyof CharacterData["stats"]; statDelta: number }
) {
  for (const sk of c.skills) {
    if (sk.proficient) sk.modifier += opts.profDelta;
    if (sk.stat === opts.stat) sk.modifier += opts.statDelta;
  }
}

async function levelUpMadea() {
  const m = (await kv.get<CharacterData>("character:madea"))!;
  if (m.level !== 7) {
    console.log(`Madea already at level ${m.level}; skipping.`);
    return;
  }
  await kv.set("character:madea:pre-lvl9", m);

  m.level = 9;
  m.charClass = "Sorcerer 9"; // was stale "Sorcerer 5"
  m.stats.CON.value = 16;
  m.stats.CON.modifier = 3; // ASI CON +2
  m.maxHp = 58 + 18; // +2 levels * (4 mean d6 + 3 CON + 2 Tough)
  m.currentHp = m.maxHp;
  m.proficiencyBonus = 4;
  m.classResources.sorceryPointsMax = 9;
  m.classResources.currentSorceryPoints = 9;
  m.spellSlots["4th"] = (m.spellSlots["4th"] ?? 0) + 2;
  m.spellSlots["5th"] = (m.spellSlots["5th"] ?? 0) + 1;
  m.currentSpellSlots = { ...m.spellSlots };
  m.spells["4th"] = [...(m.spells["4th"] ?? []), "Polymorph", "Dimension Door"];
  m.spells["5th"] = [...(m.spells["5th"] ?? []), "Synaptic Static"];
  m.hitDiceTotal = 9;
  if (m.hitDicePools?.[0]) {
    m.hitDicePools[0].total = 9;
    m.hitDicePools[0].available = 9;
  }
  applySkillDeltas(m, { profDelta: 1, stat: "CON", statDelta: 1 });

  await kv.set("character:madea", m);
  console.log("Madea leveled to 9.");
}

async function levelUpRamil() {
  const r = (await kv.get<CharacterData>("character:ramil"))!;
  if (r.level !== 6) {
    console.log(`Ramil already at level ${r.level}; skipping.`);
    return;
  }
  await kv.set("character:ramil:pre-lvl9", r);

  r.level = 9;
  r.charClass = "Fighter 1 / Wizard 8 (Bladesinger)";
  r.stats.INT.value = 20;
  r.stats.INT.modifier = 5; // ASI INT +2
  r.maxHp = 42 + 18; // +3 levels (skipped Wizard 6) * (4 mean d6 + 2 CON)
  r.currentHp = r.maxHp;
  r.proficiencyBonus = 4;
  r.spellSlots["3rd"] = (r.spellSlots["3rd"] ?? 0) + 1; // caster level 5 -> 8
  r.spellSlots["4th"] = (r.spellSlots["4th"] ?? 0) + 2;
  r.currentSpellSlots = { ...r.spellSlots };
  r.spells["3rd"] = [...(r.spells["3rd"] ?? []), "Hypnotic Pattern"];
  r.spells["4th"] = [
    ...(r.spells["4th"] ?? []),
    "Conjure Minor Elementals",
    "Dimension Door",
  ];
  r.classResources.preparedSpells = [
    ...(r.classResources.preparedSpells ?? []),
    "Hypnotic Pattern",
    "Conjure Minor Elementals",
    "Dimension Door",
  ];
  r.featsTraits = [
    ...r.featsTraits,
    "Bladesinger: Extra Attack (attack twice on the Attack action; may replace one attack with an action-cast Wizard cantrip)",
  ];
  r.classResources.cmeDice = "2d8"; // Conjure Minor Elementals toggle
  r.classResources.cmeActive = false;
  const wiz = r.hitDicePools?.find((p) => p.className === "Wizard");
  if (wiz) {
    wiz.total = 8;
    wiz.available = 8;
  }
  r.hitDiceTotal = 9;
  applySkillDeltas(r, { profDelta: 1, stat: "INT", statDelta: 1 });

  await kv.set("character:ramil", r);
  console.log("Ramil leveled to 9.");
}

async function main() {
  await levelUpMadea();
  await levelUpRamil();
  console.log("Level-up migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
