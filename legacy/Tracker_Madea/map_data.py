import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

# Base directory for resolving asset and data paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Persistent store for map markers
MAP_MARKERS_FILE = os.path.join(BASE_DIR, "map_markers.json")

# Supported marker categories (placeholder icon labels for now)
MARKER_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "artifact": {
        "label": "Artifacts",
        "color": (128, 54, 255),
        "icon": "icon_artifact.png",
    },
    "treasure": {
        "label": "Treasure",
        "color": (255, 185, 92),
        "icon": "icon_treasure.png",
    },
    "enemy": {
        "label": "Enemy Encounter",
        "color": (240, 60, 60),
        "icon": "icon_enemy.png",
    },
    "person": {
        "label": "Notable People",
        "color": (84, 157, 230),
        "icon": "icon_friend.png",
    },
    "note": {
        "label": "Notes & Rumors",
        "color": (69, 222, 191),
        "icon": "icon_rumor.png",
    },
}


def _default_store_payload() -> Dict[str, Any]:
    """Return the default JSON payload for a fresh markers file."""
    return {
        "categories": {
            key: {"label": meta["label"]} for key, meta in MARKER_CATEGORIES.items()
        },
        "markers": [],
        "version": 1,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }


def ensure_marker_store() -> None:
    """Ensure the marker data file exists with a default structure."""
    if os.path.exists(MAP_MARKERS_FILE):
        return

    os.makedirs(os.path.dirname(MAP_MARKERS_FILE), exist_ok=True)
    payload = _default_store_payload()
    with open(MAP_MARKERS_FILE, "w", encoding="utf-8") as fp:
        json.dump(payload, fp, indent=2)


def load_markers() -> Dict[str, Any]:
    """Load marker payload from disk, creating defaults if needed."""
    ensure_marker_store()

    with open(MAP_MARKERS_FILE, "r", encoding="utf-8") as fp:
        payload = json.load(fp)

    # Patch missing fields for backward compatibility
    changed = False

    if "categories" not in payload:
        payload["categories"] = {}
        changed = True

    for key, meta in MARKER_CATEGORIES.items():
        if key not in payload["categories"]:
            payload["categories"][key] = {"label": meta["label"]}
            changed = True

    if "markers" not in payload or not isinstance(payload["markers"], list):
        payload["markers"] = []
        changed = True

    if changed:
        save_markers(payload["markers"], payload.get("categories"))

    return payload


def save_markers(
    markers: List[Dict[str, Any]],
    categories: Optional[Dict[str, Dict[str, Any]]] = None,
) -> None:
    """Persist marker payload to disk and stamp update time."""
    ensure_marker_store()

    payload = {
        "categories": categories or {
            key: {"label": meta["label"]} for key, meta in MARKER_CATEGORIES.items()
        },
        "markers": markers,
        "version": 1,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }

    with open(MAP_MARKERS_FILE, "w", encoding="utf-8") as fp:
        json.dump(payload, fp, indent=2)


def add_marker(
    markers: List[Dict[str, Any]],
    *,
    category: str,
    x: float,
    y: float,
    title: str,
    description: str,
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new marker object and append it to the list."""
    if category not in MARKER_CATEGORIES:
        raise ValueError(f"Unknown marker category: {category}")

    now = datetime.utcnow()
    timestamp = now.isoformat() + "Z"
    marker = {
        "id": f"marker-{int(now.timestamp() * 1000)}",
        "category": category,
        "title": title.strip() or MARKER_CATEGORIES[category]["label"],
        "description": description.strip(),
        "position": {"x": float(x), "y": float(y)},
        "created_at": timestamp,
        "updated_at": timestamp,
        "session_id": session_id,
    }

    markers.append(marker)
    return marker


def remove_marker(markers: List[Dict[str, Any]], marker_id: str) -> bool:
    """Remove marker by id. Returns True if removed."""
    for idx, marker in enumerate(markers):
        if marker.get("id") == marker_id:
            markers.pop(idx)
            return True
    return False

