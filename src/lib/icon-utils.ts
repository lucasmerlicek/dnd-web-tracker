/**
 * Converts an item name to an icon filename.
 *
 * 1. Lowercase the input
 * 2. Replace spaces with hyphens
 * 3. Strip all characters that are not alphanumeric or hyphens
 * 4. Collapse consecutive hyphens into one
 * 5. Trim leading/trailing hyphens
 * 6. Append `.png`
 *
 * Returns `null` if the input is empty or produces an empty base name.
 *
 * Example: "Fire Bolt" → "fire-bolt.png"
 */
export function deriveIconFilename(name: string): string | null {
  const base = name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length === 0) return null;

  return `${base}.png`;
}
