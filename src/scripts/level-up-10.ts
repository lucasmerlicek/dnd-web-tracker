/**
 * Level-up migration: Ramil 9 -> 10 (Fighter 1 / Wizard 8 -> Wizard 9).
 *
 * Changes:
 *   - level 10, charClass "Fighter 1 / Wizard 9 (Bladesinger)"
 *   - +6 HP (4 mean d6 + 2 CON mod)
 *   - +1 5th-level spell slot (Wizard 9 gains its first 5th-level slot;
 *     Wizard 8 had none, so this creates the "5th" entry)
 *   - Learns Steel Wind Strike (5th-level conjuration)
 *   - proficiencyBonus stays 4 (levels 9-12)
 *
 * Idempotent: only applies if Ramil is still at level 9, so re-running is a
 * no-op. A backup is written to `character:ramil:pre-lvl10` before changes.
 *
 * Run locally (needs KV_REST_API_URL / KV_REST_API_TOKEN in .env.local):
 *   npx tsx src/scripts/level-up-10.ts
 *
 * Excluded from the Next.js build via tsconfig `exclude: ["src/scripts"]`.
 */
import { createClient } from "@vercel/kv";
import type { CharacterData } from "../types/character";

const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function levelUpRamil() {
  const r = await kv.get<CharacterData>("character:ramil");
  if (!r) {
    throw new Error("character:ramil not found in KV");
  }
  if (r.level !== 9) {
    console.log(`Ramil already at level ${r.level}; skipping.`);
    return;
  }
  await kv.set("character:ramil:pre-lvl10", r);

  r.level = 10;
  r.charClass = "Fighter 1 / Wizard 9 (Bladesinger)";

  // +6 HP: 4 (mean d6) + 2 (CON mod)
  r.maxHp = r.maxHp + 6;
  r.currentHp = r.maxHp;

  // Wizard 9 gains its first 5th-level slot.
  r.spellSlots["5th"] = (r.spellSlots["5th"] ?? 0) + 1;
  r.currentSpellSlots = { ...r.spellSlots };

  // Learn Steel Wind Strike.
  const fifth = [...(r.spells["5th"] ?? [])];
  if (!fifth.includes("Steel Wind Strike")) {
    fifth.push("Steel Wind Strike");
  }
  r.spells["5th"] = fifth;

  // Prepare it by default.
  const prepared = [...(r.classResources.preparedSpells ?? [])];
  if (!prepared.includes("Steel Wind Strike")) {
    prepared.push("Steel Wind Strike");
  }
  r.classResources.preparedSpells = prepared;

  // Hit dice: Wizard pool 8 -> 9, total 9 -> 10.
  const wiz = r.hitDicePools?.find((p) => p.className === "Wizard");
  if (wiz) {
    wiz.total = 9;
    wiz.available = 9;
  }
  r.hitDiceTotal = 10;

  await kv.set("character:ramil", r);
  console.log(
    `Ramil leveled to 10. HP ${r.maxHp}, 5th slots ${r.spellSlots["5th"]}, ` +
      `spells["5th"]=${JSON.stringify(r.spells["5th"])}`
  );
}

async function main() {
  await levelUpRamil();
  console.log("Level-up migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
