/**
 * One-off patch: adds familiar-related fields to Madea's and Ramil's KV data
 * without overwriting existing state.
 *
 * Madea: adds strengthOfTheGraveUsed, familiars to classResources;
 *        adds "Find Familiar" to 1st level spells, "Hound of Ill Omen" to 3rd level spells
 * Ramil: adds familiars to classResources;
 *        adds "Find Familiar" to 1st level spells
 *
 * Usage: npx tsx src/scripts/patch-familiars.ts
 */
import path from "path";
import fs from "fs";
import { kv } from "@vercel/kv";

// Load .env.local for KV credentials
const envPath = path.resolve(__dirname, "../../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    let val = trimmed.slice(eqIdx + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function patchMadea() {
  console.log("Patching Madea's KV data with familiar fields...");

  const data = await kv.get<Record<string, unknown>>("character:madea");
  if (!data) {
    console.error("No character:madea found in KV!");
    process.exit(1);
  }

  let changed = false;

  // --- classResources ---
  const cr = (data.classResources ?? {}) as Record<string, unknown>;

  if (cr.strengthOfTheGraveUsed === undefined) {
    cr.strengthOfTheGraveUsed = false;
    changed = true;
    console.log("  ✓ Added strengthOfTheGraveUsed = false");
  } else {
    console.log("  ✓ strengthOfTheGraveUsed already present");
  }

  if (cr.familiars === undefined) {
    cr.familiars = [];
    changed = true;
    console.log("  ✓ Added familiars = []");
  } else {
    console.log("  ✓ familiars already present");
  }

  data.classResources = cr;

  // --- spells ---
  const spells = (data.spells ?? {}) as Record<string, string[]>;

  const first = spells["1st"] ?? [];
  if (!first.includes("Find Familiar")) {
    first.push("Find Familiar");
    spells["1st"] = first;
    changed = true;
    console.log('  ✓ Added "Find Familiar" to 1st level spells');
  } else {
    console.log('  ✓ "Find Familiar" already in 1st level spells');
  }

  const third = spells["3rd"] ?? [];
  if (!third.includes("Hound of Ill Omen")) {
    third.push("Hound of Ill Omen");
    spells["3rd"] = third;
    changed = true;
    console.log('  ✓ Added "Hound of Ill Omen" to 3rd level spells');
  } else {
    console.log('  ✓ "Hound of Ill Omen" already in 3rd level spells');
  }

  data.spells = spells;

  if (changed) {
    await kv.set("character:madea", data);
    console.log("  ✓ Madea's data saved to KV");
  } else {
    console.log("  ✓ No changes needed for Madea");
  }
}

async function patchRamil() {
  console.log("\nPatching Ramil's KV data with familiar fields...");

  const data = await kv.get<Record<string, unknown>>("character:ramil");
  if (!data) {
    console.error("No character:ramil found in KV!");
    process.exit(1);
  }

  let changed = false;

  // --- classResources ---
  const cr = (data.classResources ?? {}) as Record<string, unknown>;

  if (cr.familiars === undefined) {
    cr.familiars = [];
    changed = true;
    console.log("  ✓ Added familiars = []");
  } else {
    console.log("  ✓ familiars already present");
  }

  data.classResources = cr;

  // --- spells ---
  const spells = (data.spells ?? {}) as Record<string, string[]>;

  const first = spells["1st"] ?? [];
  if (!first.includes("Find Familiar")) {
    first.push("Find Familiar");
    spells["1st"] = first;
    changed = true;
    console.log('  ✓ Added "Find Familiar" to 1st level spells');
  } else {
    console.log('  ✓ "Find Familiar" already in 1st level spells');
  }

  data.spells = spells;

  if (changed) {
    await kv.set("character:ramil", data);
    console.log("  ✓ Ramil's data saved to KV");
  } else {
    console.log("  ✓ No changes needed for Ramil");
  }
}

async function main() {
  await patchMadea();
  await patchRamil();
  console.log("\nDone!");
}

main().catch(console.error);
