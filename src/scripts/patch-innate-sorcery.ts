/**
 * One-off patch: adds innateSorcery fields to Madea's KV data
 * without overwriting existing state.
 *
 * Usage: npx tsx src/scripts/patch-innate-sorcery.ts
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

async function main() {
  console.log("Patching Madea's KV data with Innate Sorcery fields...");

  const data = await kv.get<Record<string, unknown>>("character:madea");
  if (!data) {
    console.error("No character:madea found in KV!");
    process.exit(1);
  }

  const cr = (data.classResources ?? {}) as Record<string, unknown>;

  // Only add if missing
  if (cr.innateSorceryMaxUses === undefined) {
    cr.innateSorceryActive = false;
    cr.innateSorceryUsesRemaining = 2;
    cr.innateSorceryMaxUses = 2;
    data.classResources = cr;

    await kv.set("character:madea", data);
    console.log("  ✓ Added innateSorcery fields (active=false, uses=2/2)");
  } else {
    console.log("  ✓ Fields already present, no changes needed");
  }

  console.log("Done!");
}

main().catch(console.error);
