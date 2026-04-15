/**
 * Migrate Madea's journal, characters, and places data from legacy JSON to the web app.
 * 
 * Usage:
 *   1. Make sure the dev server is running (npm run dev) OR use your production URL
 *   2. Log in as Madea in the browser first to get a session cookie
 *   3. Run: node scripts/migrate-madea-journal.js <cookie>
 * 
 * To get the cookie:
 *   - Open browser dev tools → Application → Cookies → copy the "next-auth.session-token" value
 *   - Pass it as the first argument
 * 
 * Or alternatively, just paste the journal data directly in the Journal page of the web app.
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.API_URL || "http://localhost:3000";
const COOKIE = process.argv[2];

if (!COOKIE) {
  console.log("Usage: node scripts/migrate-madea-journal.js <session-cookie-value>");
  console.log("");
  console.log("Get the cookie from browser dev tools:");
  console.log("  Application → Cookies → next-auth.session-token");
  process.exit(1);
}

async function main() {
  // Read legacy data
  const legacyPath = path.join(__dirname, "..", "legacy", "Tracker_Madea", "character_data.json");
  const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf-8"));

  // Extract journal, characters, and places
  const payload = {
    journal: legacy.journal,
    characters: legacy.characters,
    places: legacy.places,
  };

  console.log("Migrating journal data for Madea...");
  console.log(`  Sessions: ${Object.keys(legacy.journal.sessions).length}`);
  console.log(`  Characters: ${Object.keys(legacy.characters).length}`);
  console.log(`  Places: ${Object.keys(legacy.places).length}`);

  const res = await fetch(`${BASE_URL}/api/character/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `next-auth.session-token=${COOKIE}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed: ${res.status} ${text}`);
    process.exit(1);
  }

  console.log("Done! Journal data migrated successfully.");
}

main().catch(console.error);
