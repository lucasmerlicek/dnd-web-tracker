# Tech Stack

## Language
- Python 3 (no virtual environment or dependency manager configured in-repo)

## Core Libraries
- **pygame** — rendering, input handling, window management, image loading
- **ctypes** (stdlib) — Windows DPI awareness, window positioning, work area detection
- **json** (stdlib) — character data persistence (`character_data.json`, `map_markers.json`)
- **logging** (stdlib) — timestamped log files in each tracker's `logs/` directory
- **subprocess** — launching the map viewer as a child process from the main tracker
- **dataclasses** — used in `map_viewer.py` for editor state

## No Build System
There is no build tool, package manager, or `requirements.txt`. The only external dependency is `pygame`, installed via pip:

```
pip install pygame
```

## Running

Each tracker is run independently from its own directory:

```
python Tracker_Madea/main.py
python Tracker_Barian/main.py
python Tracker_Ramil/main.py
```

The map viewer is launched from within the main app (via subprocess) or standalone:

```
python Tracker_Madea/map_viewer.py
```

## Testing
- Minimal ad-hoc test scripts exist (e.g. `Tracker_Barian/test_delayed.py`)
- No test framework (pytest, unittest) is configured
- Tests instantiate the app class directly and call methods

## Data Storage
- All persistence is JSON file-based, no database
- `character_data.json` — full character state (stats, spells, inventory, journal, etc.)
- `map_markers.json` — world map marker data
- `save_states/` — backup copies of character data
