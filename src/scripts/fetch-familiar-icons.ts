/**
 * Familiar Icon Fetcher Script
 *
 * Downloads familiar icons from the BG3 wiki.
 * Saves them to public/images/icons/familiars/
 *
 * Run: npx tsx src/scripts/fetch-familiar-icons.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const ROOT_DIR = path.resolve(__dirname, "../..");
const FAMILIARS_DIR = path.join(ROOT_DIR, "public/images/icons/familiars");

const FAMILIAR_ICONS: Array<{ name: string; url: string; filename: string }> = [
  {
    name: "Find Familiar Scratch (fox)",
    url: "https://bg3.wiki/w/images/9/97/Find_Familiar_Scratch_Unfaded_Icon.webp",
    filename: "fox.png",
  },
  {
    name: "Hound of Ill Omen (hound)",
    url: "https://bg3.wiki/w/images/c/ce/Hound_of_Ill_Omen_Unfaded_Icon.webp",
    filename: "hound.png",
  },
  {
    name: "Find Familiar Raven (falcon)",
    url: "https://bg3.wiki/w/images/f/f3/Find_Familiar_Raven_Unfaded_Icon.webp",
    filename: "falcon.png",
  },
];

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  Created directory: ${dir}`);
  }
}

function downloadFile(url: string, dest: string, maxRedirects = 5): Promise<void> {
  return new Promise((resolve, reject) => {
    https
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

async function main(): Promise<void> {
  console.log("🐾 Familiar Icon Fetcher");
  console.log("========================\n");

  ensureDir(FAMILIARS_DIR);

  for (const icon of FAMILIAR_ICONS) {
    const destPath = path.join(FAMILIARS_DIR, icon.filename);
    try {
      await downloadFile(icon.url, destPath);
      const stat = fs.statSync(destPath);
      console.log(`  ✓ ${icon.name} → ${icon.filename} (${stat.size} bytes)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠ ${icon.name}: ${message}`);
    }
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
