/**
 * Apply level-up migrations to live Vercel KV data.
 *
 * Usage: npx tsx src/scripts/apply-level-ups.ts
 *
 * Reads current character data from KV, applies level-up functions,
 * and writes the updated data back.
 */

import { createClient } from "@vercel/kv";
import * as fs from "fs";
import * as path from "path";
import { levelUpMadeaToLevel7, levelUpRamilToLevel6 } from "./migrate";
import type { CharacterData } from "../src/types/character";

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

async function main() {
  const target = process.argv[2]; // "madea", "ramil", or undefined (both)

  if (!target || target === "madea") {
    console.log("Applying Madea level-up (5 → 7)...");
    const madea = await kv.get<CharacterData>("character:madea");
    if (!madea) {
      console.error("  ✗ character:madea not found in KV");
    } else if (madea.level >= 7) {
      console.log("  ⏭ Madea is already level", madea.level);
    } else {
      const updated = levelUpMadeaToLevel7(madea);
      await kv.set("character:madea", updated);
      console.log(`  ✓ Madea: level ${madea.level} → ${updated.level}, HP ${madea.maxHp} → ${updated.maxHp}`);
    }
  }

  if (!target || target === "ramil") {
    console.log("Applying Ramil level-up (5 → 6)...");
    const ramil = await kv.get<CharacterData>("character:ramil");
    if (!ramil) {
      console.error("  ✗ character:ramil not found in KV");
    } else if (ramil.level >= 6) {
      console.log("  ⏭ Ramil is already level", ramil.level);
    } else {
      const updated = levelUpRamilToLevel6(ramil);
      await kv.set("character:ramil", updated);
      console.log(`  ✓ Ramil: level ${ramil.level} → ${updated.level}, HP ${ramil.maxHp} → ${updated.maxHp}`);
    }
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Level-up failed:", err);
  process.exit(1);
});
