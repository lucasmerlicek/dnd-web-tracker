# Project Structure

## Layout

Each D&D character has a self-contained tracker folder. Trackers are independent copies of the app, customized per character. There is no shared library or common module between them.

```
Tracker_{CharacterName}/
├── main.py                 # Main application (single-file monolith)
├── character_data.json     # Persisted character state
├── map_viewer.py           # World map viewer (optional, newer trackers)
├── map_data.py             # Map marker CRUD and categories (optional)
├── map_markers.json        # Map marker persistence (optional)
├── images/                 # Background images, UI textures, map images, icons
├── logs/                   # Timestamped log files (auto-generated)
├── save_states/            # Backup character data snapshots
└── *.txt                   # Character backstory / notes
```

## Active Trackers
- `Tracker_Barian/` — Barian the Broken (older, simpler variant ~4300 lines)
- `Tracker_Madea/` — Madea Blackthorn, Shadow Sorcerer (~5000+ lines, has map viewer)
- `Tracker_Ramil/` — Ramil al-Sayif, Fighter/Wizard multiclass (~6500 lines, most features)
- `Tracker_Ramil_WIP/` — Work-in-progress copy of Ramil's tracker

## Code Architecture
- Each `main.py` is a single-file monolith containing two classes:
  - `ModernButton` — reusable UI button with hover, selection, optional advantage checkbox
  - `DnDCharacterTool` — the entire application (init, game loop, all screens, all logic)
- Screen-based navigation: `main`, `attack`, `spells`, `saves`, `actions`, `bag`, `journal`
- Each screen has `create_*_buttons()`, `draw_*_menu()`, `handle_*_menu_clicks()` methods
- Scaling is relative to a base resolution of 1536×1024 (3:2 aspect ratio)

## Other Workspace Contents
- Root-level PDFs — D&D 5E rulebooks and character sheets
- `inspo/`, `inspo_app/` — visual inspiration/reference images
- `Maps/` — world map images and PDFs
- Root-level `.txt` / `.docx` — character backstories and in-game letters

## Conventions
- File paths use `os.path` with `BASE_DIR = os.path.dirname(os.path.abspath(__file__))`
- Images are always in `images/` subdirectory relative to the tracker
- Logs auto-create in `logs/` with format `dnd_tracker_YYYYMMDD_HHMMSS.log`
- Character data JSON is loaded on startup and saved after every state change
- No code sharing between trackers — features are copy-pasted and adapted per character
