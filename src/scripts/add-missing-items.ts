/**
 * One-off script to add missing items back to Ramil's inventory in KV.
 * These items were lost when the migration re-ran from legacy JSON.
 *
 * Usage: npx tsx src/scripts/add-missing-items.ts
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
  if (!data) { console.error("No data for ramil"); process.exit(1); }

  const inv = data.inventoryItems as {
    gear: Array<Record<string, unknown>>;
    utility: Array<Record<string, unknown>>;
    treasure: Array<Record<string, unknown>>;
  };

  if (!inv) { console.error("No inventoryItems on ramil"); process.exit(1); }

  // Add Ring of Protection to gear
  inv.gear.push({
    id: crypto.randomUUID(),
    name: "Ring of Protection",
    description: "While wearing this ring, you gain a +1 bonus to AC and saving throws.",
    quantity: 1,
    equipped: true,
    requiresAttunement: true,
    attuned: true,
    statModifiers: [{ stat: "ac", value: 1 }],
  });

  // Add scroll of resistance to utility
  inv.utility.push({
    id: crypto.randomUUID(),
    name: "Scroll of Resistance",
    description: "",
    quantity: 5,
  });

  // Add missing treasure items
  inv.treasure.push(
    { id: crypto.randomUUID(), name: "Amber", description: "", quantity: 1, estimatedValue: 0 },
    { id: crypto.randomUUID(), name: "Jade", description: "", quantity: 1, estimatedValue: 0 },
    { id: crypto.randomUUID(), name: "Schield (mimic kill)", description: "", quantity: 1, estimatedValue: 0 },
  );

  data.inventoryItems = inv;
  await kv.set("character:ramil", data);
  console.log("✓ Added missing items to Ramil's inventory:");
  console.log("  Gear: Ring of Protection (+1 AC, equipped, attuned)");
  console.log("  Utility: 5x Scroll of Resistance");
  console.log("  Treasure: Amber, Jade, Schield (mimic kill)");
}

main().catch((err) => { console.error("Failed:", err); process.exit(1); });
