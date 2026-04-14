"""
Fetch spell icons from the BG3 wiki Category:Spell_icons.
Uses the MediaWiki API to list all files, downloads them,
then fuzzy-matches to our spell registry.
"""
import urllib.request
import urllib.parse
import json
import os
import re
import time

WIKI_API = "https://bg3.wiki/w/api.php"
RAW_DIR = "data/bg3-spell-icons"
SPELL_DIR = "public/images/icons/spells"

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(SPELL_DIR, exist_ok=True)


def api_query(params):
    """Query the MediaWiki API and return JSON."""
    params["format"] = "json"
    url = WIKI_API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "DnDTrackerIconFetcher/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def get_category_files():
    """Get all file titles from Category:Spell_icons using the API."""
    files = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": "Category:Spell_icons",
        "cmtype": "file",
        "cmlimit": "500",
    }
    while True:
        data = api_query(params)
        members = data.get("query", {}).get("categorymembers", [])
        files.extend(m["title"] for m in members)
        cont = data.get("continue")
        if not cont:
            break
        params["cmcontinue"] = cont["cmcontinue"]
    return files


def get_image_url(title):
    """Get the direct image URL for a file title."""
    data = api_query({
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url",
    })
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = page.get("imageinfo", [{}])
        if info:
            return info[0].get("url")
    return None


def download_file(url, dest):
    """Download a file from URL to dest path."""
    req = urllib.request.Request(url, headers={"User-Agent": "DnDTrackerIconFetcher/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        with open(dest, "wb") as f:
            f.write(resp.read())


def to_spell_filename(name):
    """Convert spell name to our filename format."""
    s = name.lower().replace(" ", "-")
    s = re.sub(r"[^a-z0-9-]", "", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s + ".png" if s else None


def normalize_wiki_name(title):
    """Extract a clean name from a wiki file title like 'File:Fire Bolt Icon.webp'."""
    name = title.replace("File:", "").strip()
    # Remove common suffixes
    for suffix in [" Icon.webp", " Icon.png", " Unfaded Icon.webp",
                   " Unfaded Icon.png", ".webp", ".png"]:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
    return name.strip()


def fuzzy_match(spell_name, wiki_names):
    """Find the best matching wiki icon for a spell name."""
    spell_lower = spell_name.lower().strip()

    # Exact match first
    for wn in wiki_names:
        if normalize_wiki_name(wn).lower() == spell_lower:
            return wn

    # Try without apostrophes and special chars
    spell_clean = re.sub(r"[^a-z0-9 ]", "", spell_lower)
    for wn in wiki_names:
        wn_clean = re.sub(r"[^a-z0-9 ]", "", normalize_wiki_name(wn).lower())
        if wn_clean == spell_clean:
            return wn

    # Substring match - spell name contained in wiki name
    for wn in wiki_names:
        wn_lower = normalize_wiki_name(wn).lower()
        if spell_lower in wn_lower or wn_lower in spell_lower:
            return wn

    # Word overlap match
    spell_words = set(spell_clean.split())
    best_match = None
    best_score = 0
    for wn in wiki_names:
        wn_clean = re.sub(r"[^a-z0-9 ]", "", normalize_wiki_name(wn).lower())
        wn_words = set(wn_clean.split())
        overlap = len(spell_words & wn_words)
        if overlap > best_score and overlap >= len(spell_words) * 0.5:
            best_score = overlap
            best_match = wn
    return best_match


def get_spell_names():
    """Extract spell names from the spell registry."""
    with open("src/data/spell-registry.ts", "r") as f:
        content = f.read()
    # Match the key names (the display names in quotes before the colon)
    names = re.findall(r'^\s+"([^"]+)":\s*\{', content, re.MULTILINE)
    # Also get the actual name field for entries like "Prot E&G"
    name_fields = re.findall(r'name:\s*"([^"]+)"', content)
    # Combine unique
    all_names = list(dict.fromkeys(names + name_fields))
    return all_names


def main():
    print("=== BG3 Spell Icon Fetcher ===\n")

    # Step 1: Get all file titles from the category
    print("Fetching file list from Category:Spell_icons...")
    wiki_files = get_category_files()
    print(f"Found {len(wiki_files)} files in category.\n")

    # Step 2: Get our spell names
    spell_names = get_spell_names()
    print(f"Found {len(spell_names)} spells in registry.\n")

    # Step 3: Fuzzy match and download
    matched = 0
    failed = []

    for spell in spell_names:
        dest_fn = to_spell_filename(spell)
        if not dest_fn:
            continue
        dest_path = os.path.join(SPELL_DIR, dest_fn)

        # Skip if we already have a non-placeholder icon (> 1KB)
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
            print(f"  SKIP {spell} (already have icon)")
            matched += 1
            continue

        match = fuzzy_match(spell, wiki_files)
        if not match:
            print(f"  MISS {spell} — no match found")
            failed.append(spell)
            continue

        print(f"  {spell} -> {match}")

        # Get the image URL
        try:
            url = get_image_url(match)
            if not url:
                print(f"    WARN: Could not get URL for {match}")
                failed.append(spell)
                continue

            # Download to raw dir first
            raw_fn = re.sub(r"[^a-zA-Z0-9._-]", "_", match.replace("File:", ""))
            raw_path = os.path.join(RAW_DIR, raw_fn)
            if not os.path.exists(raw_path):
                download_file(url, raw_path)
                time.sleep(0.3)  # Be polite

            # Convert to PNG if needed and copy to spell dir
            from PIL import Image
            img = Image.open(raw_path).convert("RGBA")
            img.save(dest_path, "PNG")
            matched += 1
            print(f"    OK -> {dest_fn}")

        except Exception as e:
            print(f"    ERROR: {e}")
            failed.append(spell)

    print(f"\n=== Done ===")
    print(f"Matched: {matched}/{len(spell_names)}")
    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed)}")


if __name__ == "__main__":
    main()
