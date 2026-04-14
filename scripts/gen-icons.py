"""Generate placeholder spell/weapon/item icons for the FF12 visual overhaul."""
from PIL import Image, ImageDraw, ImageFont
import os, re

SCHOOL_COLORS = {
    "Evocation": (220, 90, 50),
    "Necromancy": (120, 70, 140),
    "Abjuration": (70, 140, 210),
    "Conjuration": (70, 170, 110),
    "Divination": (190, 190, 230),
    "Enchantment": (210, 150, 210),
    "Illusion": (150, 110, 190),
    "Transmutation": (210, 180, 60),
}
SCHOOL_LETTERS = {
    "Evocation": "Ev", "Necromancy": "Ne", "Abjuration": "Ab",
    "Conjuration": "Co", "Divination": "Di", "Enchantment": "En",
    "Illusion": "Il", "Transmutation": "Tr",
}

def make_icon(text, color, path, size=24):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=4,
                        fill=(25, 28, 34, 220),
                        outline=color + (160,), width=1)
    try:
        font = ImageFont.truetype("arial.ttf", 9)
    except Exception:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((size // 2 - tw // 2, size // 2 - th // 2), text,
           fill=color + (255,), font=font)
    img.save(path)

def to_filename(name):
    s = name.lower().replace(" ", "-")
    s = re.sub(r"[^a-z0-9-]", "", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s + ".png" if s else None

os.makedirs("public/images/icons/spells", exist_ok=True)
os.makedirs("public/images/icons/weapons", exist_ok=True)
os.makedirs("public/images/icons/items", exist_ok=True)

# Placeholders
make_icon("S", (200, 170, 60), "public/images/icons/placeholder-spell.png")
make_icon("W", (180, 180, 180), "public/images/icons/placeholder-weapon.png")
make_icon("I", (140, 130, 100), "public/images/icons/placeholder-item.png")

# Parse spell registry
with open("src/data/spell-registry.ts", "r") as f:
    content = f.read()

spells = re.findall(r'"([^"]+)":\s*\{[^}]*?school:\s*"([^"]+)"', content)
count = 0
for name, school in spells:
    fn = to_filename(name)
    if not fn:
        continue
    path = f"public/images/icons/spells/{fn}"
    if os.path.exists(path):
        continue
    color = SCHOOL_COLORS.get(school, (180, 180, 180))
    letter = SCHOOL_LETTERS.get(school, school[:2])
    make_icon(letter, color, path)
    count += 1
print(f"Created {count} spell icons")

# Weapon icons from character data
weapon_names = set()
for tracker in ["legacy/Tracker_Madea/character_data.json", "legacy/Tracker_Ramil/character_data.json"]:
    if not os.path.exists(tracker):
        continue
    import json
    with open(tracker) as f:
        data = json.load(f)
    for w in data.get("weapons", []):
        base = re.sub(r"\s*\(.*\)\s*$", "", w.get("name", "")).strip()
        if base:
            weapon_names.add(base)

# Also add common weapons
weapon_names.update(["Scimitar", "Shortsword", "Shadow Blade", "Dagger"])

wcount = 0
for name in sorted(weapon_names):
    fn = to_filename(name)
    if not fn:
        continue
    path = f"public/images/icons/weapons/{fn}"
    if os.path.exists(path):
        continue
    make_icon("W", (180, 170, 140), path)
    wcount += 1
print(f"Created {wcount} weapon icons")
