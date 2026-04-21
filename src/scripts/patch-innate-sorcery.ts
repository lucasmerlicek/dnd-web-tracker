/**
 * One-off patch: adds missing fields to character KV data
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
    console.log("  ✓ innateSorcery fields already present");
  }

  // Patch strengthOfTheGraveUsed and familiars
  let patched = false;
  if (cr.strengthOfTheGraveUsed === undefined) {
    cr.strengthOfTheGraveUsed = false;
    patched = true;
    console.log("  ✓ Added strengthOfTheGraveUsed = false");
  }
  if (cr.familiars === undefined) {
    cr.familiars = [];
    patched = true;
    console.log("  ✓ Added familiars = []");
  }
  if (patched) {
    data.classResources = cr;
    await kv.set("character:madea", data);
  }

  // Also patch Ramil
  console.log("Patching Ramil...");
  const ramilData = await kv.get<Record<string, unknown>>("character:ramil");
  if (ramilData) {
    const ramilCr = (ramilData.classResources ?? {}) as Record<string, unknown>;
    let ramilPatched = false;
    if (ramilCr.familiars === undefined) {
      ramilCr.familiars = [];
      ramilPatched = true;
      console.log("  ✓ Added familiars = [] to Ramil");
    }
    if (ramilPatched) {
      ramilData.classResources = ramilCr;
      await kv.set("character:ramil", ramilData);
    } else {
      console.log("  ✓ Ramil already has familiars field");
    }
  }

  console.log("Done!");
}

main().catch(console.error);
