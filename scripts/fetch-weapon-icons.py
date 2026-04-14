"""Fetch weapon icons from BG3 wiki Category:Weapon_icons (and subcategories)."""
import urllib.request
import urllib.parse
import json
import os
import re
import time

WIKI_API = "https://bg3.wiki/w/api.php"
WEAPON_DIR = "public/images/icons/weapons"
RAW_DIR = "data/bg3-weapon-icons"

os.makedirs(WEAPON_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)

WEAPONS_NEEDED = ["Scimitar", "Rapier", "Dagger"]

def api_query(params):
    params["format"] = "json"
    url = WIKI_API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "DnDTrackerIconFetcher/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

def get_subcategories(cat_title):
    """Get subcategory titles."""
    subs = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": cat_title,
        "cmtype": "subcat",
        "cmlimit": "500",
    }
    data = api_query(params)
    for m in data.get("query", {}).get("categorymembers", []):
        subs.append(m["title"])
    return subs

def get_category_files(cat_title):
    """Get all file titles from a category."""
    files = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": cat_title,
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
    data = api_query({"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url"})
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = page.get("imageinfo", [{}])
        if info:
            return info[0].get("url")
    return None

def download_file(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "DnDTrackerIconFetcher/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        with open(dest, "wb") as f:
            f.write(resp.read())

def main():
    from PIL import Image

    print("=== BG3 Weapon Icon Fetcher ===\n")

    # Get subcategories of Category:Weapon_icons
    print("Fetching subcategories of Category:Weapon_icons...")
    subcats = get_subcategories("Category:Weapon_icons")
    print(f"Found {len(subcats)} subcategories: {subcats}\n")

    # Collect all files from main category + subcategories
    all_files = get_category_files("Category:Weapon_icons")
    for sub in subcats:
        print(f"  Fetching files from {sub}...")
        files = get_category_files(sub)
        all_files.extend(files)
        print(f"    {len(files)} files")

    print(f"\nTotal weapon icon files: {len(all_files)}\n")

    # For each weapon we need, find a match
    for weapon in WEAPONS_NEEDED:
        dest_fn = weapon.lower().replace(" ", "-") + ".png"
        dest_path = os.path.join(WEAPON_DIR, dest_fn)

        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
            print(f"SKIP {weapon} (already have icon)")
            continue

        weapon_lower = weapon.lower()
        match = None

        # Try exact match first: "File:Scimitar Icon.webp" or similar
        for f in all_files:
            fn = f.replace("File:", "").lower()
            # Look for the weapon name at the start of the filename
            if fn.startswith(weapon_lower + " ") or fn.startswith(weapon_lower + "_"):
                # Prefer "Unfaded" versions, skip "Faded"
                if "faded" in fn and "unfaded" not in fn:
                    continue
                match = f
                break

        # Broader match
        if not match:
            for f in all_files:
                fn = f.replace("File:", "").lower()
                if weapon_lower in fn and "faded" not in fn.replace("unfaded", ""):
                    match = f
                    break

        # Even broader - any match
        if not match:
            for f in all_files:
                fn = f.replace("File:", "").lower()
                if weapon_lower in fn:
                    match = f
                    break

        if not match:
            print(f"MISS {weapon} — no match in {len(all_files)} files")
            continue

        print(f"{weapon} -> {match}")
        try:
            url = get_image_url(match)
            if not url:
                print(f"  WARN: Could not get URL")
                continue
            raw_fn = re.sub(r"[^a-zA-Z0-9._-]", "_", match.replace("File:", ""))
            raw_path = os.path.join(RAW_DIR, raw_fn)
            if not os.path.exists(raw_path):
                download_file(url, raw_path)
                time.sleep(0.3)
            img = Image.open(raw_path).convert("RGBA")
            img.save(dest_path, "PNG")
            print(f"  OK -> {dest_fn}")
        except Exception as e:
            print(f"  ERROR: {e}")

if __name__ == "__main__":
    main()
