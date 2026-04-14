/**
 * Icon Fetcher Script
 *
 * Downloads spell and weapon icons from the BG3 wiki (https://bg3.wiki/wiki/).
 *
 * Run: npx tsx src/scripts/fetch-icons.ts
 *
 * 1. Reads spell names from src/data/spell-registry.ts exports
 * 2. Reads weapon names from legacy character data JSON files
 * 3. For each name, fetches the BG3 wiki page
 * 4. Parses the page HTML to find the icon image URL
 * 5. Downloads the icon to public/images/icons/spells/ or weapons/
 * 6. Skips if file already exists locally
 * 7. Logs warnings for missing icons, continues processing
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { SPELL_REGISTRY } from "../data/spell-registry";
import { deriveIconFilename } from "../lib/icon-utils";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROOT_DIR = path.resolve(__dirname, "../..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public/images/icons");
const SPELLS_DIR = path.join(PUBLIC_DIR, "spells");
const WEAPONS_DIR = path.join(PUBLIC_DIR, "weapons");
const LEGACY_DIR = path.join(ROOT_DIR, "legacy");

const BG3_WIKI_BASE = "https://bg3.wiki/wiki/";

/** Delay between requests to be polite to the wiki server (ms). */
const REQUEST_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  Created directory: ${dir}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a URL and return the response body as a string.
 * Follows up to 5 redirects.
 */
function fetchText(url: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { headers: { "User-Agent": "DnDTrackerIconFetcher/1.0" } }, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
          return resolve(fetchText(res.headers.location, maxRedirects - 1));
        }
        if (res.statusCode && res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

/**
 * Download a binary file from a URL and save it to disk.
 * Follows up to 5 redirects.
 */
function downloadFile(url: string, dest: string, maxRedirects = 5): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { headers: { "User-Agent": "DnDTrackerIconFetcher/1.0" } }, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
          return resolve(downloadFile(res.headers.location, dest, maxRedirects - 1));
        }
        if (res.statusCode && res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
        file.on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}


/**
 * Parse a BG3 wiki page HTML to extract the icon image URL.
 *
 * The wiki typically has an infobox with the icon in an <img> tag inside
 * a element with class "infobox-icon" or the page-header icon area.
 * We look for common patterns:
 *   - <img> inside .infobox-icon or .pi-image
 *   - The first <img> whose src contains "/Icon_" or "/icons/"
 *   - The page image in the infobox
 */
function parseIconUrl(html: string): string | null {
  // Strategy 1: Look for an image inside an infobox icon section
  // Common pattern: <td class="infobox-icon">...<img src="..." />
  const infoboxIconMatch = html.match(
    /class="[^"]*infobox-icon[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i
  );
  if (infoboxIconMatch) return resolveWikiUrl(infoboxIconMatch[1]);

  // Strategy 2: Look for pi-image (portable infobox) pattern
  const piImageMatch = html.match(
    /class="[^"]*pi-image[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i
  );
  if (piImageMatch) return resolveWikiUrl(piImageMatch[1]);

  // Strategy 3: Look for the first image in the infobox area
  const infoboxMatch = html.match(
    /class="[^"]*infobox[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/i
  );
  if (infoboxMatch) return resolveWikiUrl(infoboxMatch[1]);

  // Strategy 4: Look for any image with "Icon" in the filename
  const iconImgMatch = html.match(/<img[^>]+src="([^"]*\/[^"]*Icon[^"]*\.(?:png|webp|jpg)[^"]*)"/i);
  if (iconImgMatch) return resolveWikiUrl(iconImgMatch[1]);

  // Strategy 5: Look for the page header image (often the spell/item icon)
  const pageImageMatch = html.match(
    /class="[^"]*page-header__image[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i
  );
  if (pageImageMatch) return resolveWikiUrl(pageImageMatch[1]);

  return null;
}

/** Resolve a potentially relative wiki URL to an absolute URL. */
function resolveWikiUrl(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://bg3.wiki${url}`;
  return url;
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

/** Extract spell names from the spell registry. */
function getSpellNames(): string[] {
  return Object.keys(SPELL_REGISTRY);
}

/**
 * Extract weapon names from legacy character data JSON files.
 * Strips parenthetical suffixes like "(Nick Mastery)" to get the base weapon name.
 */
function getWeaponNames(): string[] {
  const weaponSet = new Set<string>();
  const trackerDirs = ["Tracker_Madea", "Tracker_Ramil"];

  for (const dir of trackerDirs) {
    const filePath = path.join(LEGACY_DIR, dir, "character_data.json");
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Legacy data not found: ${filePath}`);
      continue;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const weapons: Array<{ name: string }> = raw.weapons ?? [];
      for (const w of weapons) {
        // Strip parenthetical suffixes: "Scimitar (Nick Mastery)" → "Scimitar"
        const baseName = w.name.replace(/\s*\(.*\)\s*$/, "").trim();
        if (baseName) weaponSet.add(baseName);
      }
    } catch (err) {
      console.warn(`  ⚠ Failed to read ${filePath}: ${err}`);
    }
  }

  return Array.from(weaponSet);
}

// ---------------------------------------------------------------------------
// Main fetch logic
// ---------------------------------------------------------------------------

interface FetchResult {
  name: string;
  status: "downloaded" | "skipped" | "failed";
  reason?: string;
}

async function fetchIcon(
  name: string,
  outputDir: string
): Promise<FetchResult> {
  const filename = deriveIconFilename(name);
  if (!filename) {
    return { name, status: "failed", reason: "Could not derive filename" };
  }

  const destPath = path.join(outputDir, filename);

  // Skip if already exists
  if (fs.existsSync(destPath)) {
    return { name, status: "skipped", reason: "File already exists" };
  }

  // Build wiki URL — use the display name for the wiki page
  // "Fire Bolt" → "https://bg3.wiki/wiki/Fire_Bolt"
  const wikiName = name.replace(/ /g, "_");
  const wikiUrl = `${BG3_WIKI_BASE}${encodeURIComponent(wikiName)}`;

  try {
    const html = await fetchText(wikiUrl);
    const iconUrl = parseIconUrl(html);

    if (!iconUrl) {
      return { name, status: "failed", reason: "Could not find icon URL on wiki page" };
    }

    await downloadFile(iconUrl, destPath);
    return { name, status: "downloaded" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name, status: "failed", reason: message };
  }
}

async function main(): Promise<void> {
  console.log("🎮 FF12 Icon Fetcher");
  console.log("====================\n");

  // Ensure output directories exist
  ensureDir(SPELLS_DIR);
  ensureDir(WEAPONS_DIR);

  // Collect names
  const spellNames = getSpellNames();
  const weaponNames = getWeaponNames();

  console.log(`Found ${spellNames.length} spells and ${weaponNames.length} weapons.\n`);

  // Fetch spell icons
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  console.log("📖 Fetching spell icons...");
  for (const name of spellNames) {
    const result = await fetchIcon(name, SPELLS_DIR);
    switch (result.status) {
      case "downloaded":
        console.log(`  ✓ ${name}`);
        downloaded++;
        break;
      case "skipped":
        console.log(`  ⏭ ${name} (already exists)`);
        skipped++;
        break;
      case "failed":
        console.warn(`  ⚠ ${name}: ${result.reason}`);
        failed++;
        break;
    }
    if (result.status === "downloaded") await sleep(REQUEST_DELAY_MS);
  }

  console.log("\n⚔️  Fetching weapon icons...");
  for (const name of weaponNames) {
    const result = await fetchIcon(name, WEAPONS_DIR);
    switch (result.status) {
      case "downloaded":
        console.log(`  ✓ ${name}`);
        downloaded++;
        break;
      case "skipped":
        console.log(`  ⏭ ${name} (already exists)`);
        skipped++;
        break;
      case "failed":
        console.warn(`  ⚠ ${name}: ${result.reason}`);
        failed++;
        break;
    }
    if (result.status === "downloaded") await sleep(REQUEST_DELAY_MS);
  }

  // Summary
  console.log("\n====================");
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`⏭  Skipped:    ${skipped}`);
  console.log(`⚠️  Failed:     ${failed}`);
  console.log("====================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
