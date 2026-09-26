/**
 * One-off: set up attunement magic items so their bonuses apply only to the wearer.
 *
 * Madea
 *   - Cloak of Protection: +1 AC, +1 all saves. Requires attunement; equipped + attuned.
 * Ramil
 *   - Ring of Protection: add the +1 saves bonus (AC +1 was already set). Already attuned.
 *   - Family Ring: +2 death saves. Requires attunement; equipped + attuned.
 *   - Winter's Clutches (leather gloves): no mechanic, note shown on cold-damage
 *     spells. Requires attunement; equipped + attuned.
 *
 * Idempotent: re-running produces the same state. Backups written first to
 * `character:<id>:pre-magic-items`.
 *
 *   npx tsx --env-file=.env.local src/scripts/patch-magic-items.ts
 */
import { createClient } from "@vercel/kv";
import type { CharacterData, GearItem } from "../types/character";

const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function find(c: CharacterData, pattern: RegExp): GearItem {
  const item = c.inventoryItems?.gear.find((g) => pattern.test(g.name));
  if (!item) throw new Error(`${c.characterName}: no gear matching ${pattern}`);
  return item;
}

function attune(item: GearItem, name: string, description: string, mods: GearItem["statModifiers"]) {
  item.name = name;
  if (!item.description) item.description = description;
  item.requiresAttunement = true;
  item.equipped = true;
  item.attuned = true;
  item.statModifiers = mods;
}

function attunedCount(c: CharacterData): number {
  return (c.inventoryItems?.gear ?? []).filter((g) => g.requiresAttunement && g.attuned).length;
}

async function main() {
  // --- Madea ---
  const m = (await kv.get<CharacterData>("character:madea"))!;
  // Don't overwrite the original backup on re-runs.
  if (!(await kv.exists("character:madea:pre-magic-items"))) {
    await kv.set("character:madea:pre-magic-items", m);
  }
  attune(
    find(m, /cloak of protection/i),
    "Cloak of Protection",
    "You gain a +1 bonus to AC and saving throws while you wear this cloak.",
    [{ stat: "ac", value: 1 }, { stat: "save", value: 1 }]
  );
  await kv.set("character:madea", m);
  console.log(`Madea: Cloak of Protection attuned. Attuned items: ${attunedCount(m)}/3`);

  // --- Ramil ---
  const r = (await kv.get<CharacterData>("character:ramil"))!;
  if (!(await kv.exists("character:ramil:pre-magic-items"))) {
    await kv.set("character:ramil:pre-magic-items", r);
  }

  const ring = find(r, /ring of protection/i);
  ring.statModifiers = [{ stat: "ac", value: 1 }, { stat: "save", value: 1 }];

  attune(
    find(r, /family ring/i),
    "Family Ring",
    "+2 bonus to death saving throws.",
    [{ stat: "deathSave", value: 2 }]
  );
  attune(
    // Stored name is "Leather Gloves (Winters cluches): ..." (spelling varies)
    find(r, /winter'?s? clu?t?ches/i),
    "Winter's Clutches",
    "Leather gloves. When you deal Cold damage, there's a 20% chance to stun the target.",
    []
  );
  await kv.set("character:ramil", r);
  console.log(`Ramil: Ring of Protection +1 saves, Family Ring & Winter's Clutches attuned. Attuned items: ${attunedCount(r)}/3`);
}

main().catch((e) => {
  console.error("Patch failed:", e);
  process.exit(1);
});
