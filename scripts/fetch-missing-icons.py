"""Fetch the 6 missing spell icons using manual substitutions from BG3 wiki."""
import urllib.request
import urllib.parse
import json
import os
import re
import time

WIKI_API = "https://bg3.wiki/w/api.php"
SPELL_DIR = "public/images/icons/spells"
RAW_DIR = "data/bg3-spell-icons"

SUBSTITUTIONS = {
    "silvery-barbs.png": "File:Remove Curse Unfaded Icon.webp",
    "infestation.png": "File:Ray of Sickness Unfaded Icon.webp",
    "message.png": "File:Tasha's Hideous Laughter Unfaded Icon.webp",
    "absorb-elements.png": "File:Glyph of Warding Fire Unfaded Icon.webp",
    "prot-eg.png": "File:Protection from Evil and Good Unfaded Icon.webp",
    "aganazzars-scorcher.png": "File:Flame Strike Unfaded Icon.webp",
}

def api_query(params):
    params["format"] = "json"
    url = WIKI_API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "DnDTrackerIconFetcher/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

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
    for dest_fn, wiki_title in SUBSTITUTIONS.items():
        dest_path = os.path.join(SPELL_DIR, dest_fn)
        print(f"{dest_fn} <- {wiki_title}")
        try:
            url = get_image_url(wiki_title)
            if not url:
                print(f"  WARN: Could not get URL")
                continue
            raw_fn = re.sub(r"[^a-zA-Z0-9._-]", "_", wiki_title.replace("File:", ""))
            raw_path = os.path.join(RAW_DIR, raw_fn)
            if not os.path.exists(raw_path):
                download_file(url, raw_path)
                time.sleep(0.3)
            img = Image.open(raw_path).convert("RGBA")
            img.save(dest_path, "PNG")
            print(f"  OK")
        except Exception as e:
            print(f"  ERROR: {e}")

if __name__ == "__main__":
    main()
