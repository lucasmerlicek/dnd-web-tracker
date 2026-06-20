/**
 * One-off patch for Ramil's KV data:
 *   1. Replace "Wall of Sand" with "Dispel Magic" in his spell list.
 *   2. Ensure the "second_wind" action carries dice/bonus so it rolls a heal
 *      when used from the generic action submenu (it no longer has a dedicated
 *      panel that hard-codes the 1d10 + Fighter level roll).
 *
 * Usage: npx tsx src/scripts/patch-ramil-spells-actions.ts
 */

import { createClient } from "@vercel/kv";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.resolve(__dirname, "../../.env.local"));

const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function main() {
  const data = await kv.get<Record<string, unknown>>("character:ramil");
  if (!data) {
    console.error("No character:ramil found in KV!");
    process.exit(1);
  }

  // 1. Swap Wall of Sand → Dispel Magic in the spell list.
  const spells = (data.spells ?? {}) as Record<string, string[]>;
  let spellsPatched = false;
  for (const level of Object.keys(spells)) {
    const list = spells[level];
    const idx = list.indexOf("Wall of Sand");
    if (idx !== -1) {
      if (!list.includes("Dispel Magic")) {
        list[idx] = "Dispel Magic";
      } else {
        list.splice(idx, 1);
      }
      spellsPatched = true;
      console.log(`  ✓ Replaced "Wall of Sand" with "Dispel Magic" in ${level}`);
    }
  }
  if (spellsPatched) {
    data.spells = spells;
  } else {
    console.log("  ⏭ No 'Wall of Sand' found in Ramil's spell list");
  }

  // Keep prepared/auto-prepared lists consistent if they referenced the old spell.
  const cr = (data.classResources ?? {}) as Record<string, unknown>;
  for (const key of ["preparedSpells", "autoPreparedSpells"] as const) {
    const arr = cr[key] as string[] | undefined;
    if (Array.isArray(arr)) {
      const idx = arr.indexOf("Wall of Sand");
      if (idx !== -1) {
        arr[idx] = "Dispel Magic";
        data.classResources = cr;
        console.log(`  ✓ Updated ${key} reference to Dispel Magic`);
      }
    }
  }

  // 2. Ensure second_wind rolls a heal from the generic action submenu.
  const actions = (data.actions ?? {}) as Record<string, Record<string, unknown>>;
  const sw = actions["second_wind"];
  if (sw) {
    let swPatched = false;
    if (sw.dice !== "1d10") {
      sw.dice = "1d10";
      swPatched = true;
    }
    // Bonus = Fighter level (1 for Ramil: Fighter 1 / Wizard N)
    if (sw.bonus === undefined) {
      sw.bonus = 1;
      swPatched = true;
    }
    if (swPatched) {
      data.actions = actions;
      console.log("  ✓ second_wind action now rolls 1d10 + " + sw.bonus + " HP");
    } else {
      console.log("  ⏭ second_wind already has dice/bonus");
    }
  } else {
    console.log("  ⏭ No second_wind action found on Ramil");
  }

  await kv.set("character:ramil", data);
  console.log("Done!");
}

main().catch((err) => {
  console.error("Patch failed:", err);
  process.exit(1);
});
