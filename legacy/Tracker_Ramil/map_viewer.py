import math
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple

def center_pygame_window(width: int, height: int) -> None:
    if sys.platform != "win32":
        return
    try:
        import ctypes
        import ctypes.wintypes

        user32 = ctypes.windll.user32
        hwnd = pygame.display.get_wm_info().get("window")
        if not hwnd:
            return

        rect = ctypes.wintypes.RECT()
        SPI_GETWORKAREA = 48
        if not user32.SystemParametersInfoW(SPI_GETWORKAREA, 0, ctypes.byref(rect), 0):
            return

        work_w = rect.right - rect.left
        work_h = rect.bottom - rect.top
        x = rect.left + max(0, (work_w - width) // 2)
        y = rect.top + max(0, (work_h - height) // 2)

        SWP_NOSIZE = 0x0001
        SWP_NOZORDER = 0x0004
        user32.SetWindowPos(hwnd, 0, int(x), int(y), 0, 0, SWP_NOSIZE | SWP_NOZORDER)
    except Exception:
        pass

import pygame

from map_data import (
    MARKER_CATEGORIES,
    add_marker,
    load_markers,
    remove_marker,
    save_markers,
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MAP_IMAGE = os.path.join(BASE_DIR, "images", "Valerion.jpg")
MAP_IMAGE_LOWRES = os.path.join(BASE_DIR, "images", "Valerion_lowres.jpg")

WINDOW_WIDTH = 1280
WINDOW_HEIGHT = 720
FPS = 60

MIN_ZOOM = 0.13
MAX_ZOOM = 3.0
ZOOM_STEP = 1.1
LOW_RES_THRESHOLD = 1.0

TOOLTIP_BG = (20, 20, 25, 220)
TOOLTIP_BORDER = (140, 120, 90)
OVERLAY_BG = (15, 15, 18, 220)
OVERLAY_BORDER = (120, 100, 80)
TEXT_COLOR = (220, 210, 200)
ACCENT = (180, 130, 80)

CATEGORY_TINTS = {
    "artifact": MARKER_CATEGORIES["artifact"]["color"],
    "treasure": MARKER_CATEGORIES["treasure"]["color"],
    "enemy": MARKER_CATEGORIES["enemy"]["color"],
    "person": MARKER_CATEGORIES["person"]["color"],
    "note": MARKER_CATEGORIES["note"]["color"],
}


@dataclass
class EditorState:
    """State while creating or editing a marker."""

    marker_id: Optional[str]
    is_new: bool
    world_pos: Tuple[float, float]
    category_index: int
    title: str
    description: str
    field: str  # "title" or "description"


class MapViewer:
    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("Valerion World Map")

        self.screen = pygame.display.set_mode(
            (WINDOW_WIDTH, WINDOW_HEIGHT), pygame.RESIZABLE
        )
        center_pygame_window(WINDOW_WIDTH, WINDOW_HEIGHT)
        self.clock = pygame.time.Clock()

        self.high_res_surface = self._load_map_surface(MAP_IMAGE)
        low_res_candidate = self._load_map_surface(MAP_IMAGE_LOWRES, allow_missing=True)
        self.low_res_surface = low_res_candidate or self.high_res_surface

        self.map_rect = self.high_res_surface.get_rect()
        self.scaled_map = self.high_res_surface
        self.scaled_zoom = 1.0
        self.current_base_surface: Optional[pygame.Surface] = None

        self.running = True
        self.view_origin = pygame.Vector2(0.0, 0.0)
        self.zoom = MIN_ZOOM
        self.pan_active = False
        self.pan_anchor = pygame.Vector2(0.0, 0.0)
        self.pan_origin = pygame.Vector2(0.0, 0.0)

        payload = load_markers()
        self.marker_categories = payload.get("categories", {})
        self.markers: List[Dict] = payload.get("markers", [])
        self.category_keys = list(MARKER_CATEGORIES.keys())
        self.category_filters: Dict[str, bool] = {
            key: True for key in self.category_keys
        }
        self.hovered_marker: Optional[Dict] = None

        self.active_editor: Optional[EditorState] = None
        self.category_toggle_rects: List[Tuple[pygame.Rect, str]] = []

        self.font_small = pygame.font.Font(None, 20)
        self.font = pygame.font.Font(None, 24)
        self.font_large = pygame.font.Font(None, 28)

        # Precompute marker radius per zoom level
        self.base_marker_radius = 11
        self.marker_icons: Dict[str, pygame.Surface] = {}
        self.icon_cache: Dict[Tuple[str, int], pygame.Surface] = {}
        self.load_marker_icons()

        # Ensure initial map scale and centering
        self.update_scaled_map(force=True)
        self.center_view_on_map()

        # Keyboard panning state
        self.held_pan_keys: set[int] = set()
        self.keyboard_pan_speed = 600.0  # pixels per second when zoomed to 1.0

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #
    def _load_map_surface(self, path: str, allow_missing: bool = False) -> Optional[pygame.Surface]:
        if not os.path.exists(path):
            if allow_missing:
                return None
            return self._create_missing_surface(os.path.basename(path))

        try:
            image = pygame.image.load(path).convert()
        except Exception:
            if allow_missing:
                return None
            return self._create_missing_surface(os.path.basename(path))

        return image

    def _create_missing_surface(self, label: str) -> pygame.Surface:
        fallback = pygame.Surface((2048, 1536))
        fallback.fill((40, 40, 45))
        font = pygame.font.Font(None, 42)
        text = font.render(f"Missing map: {label}", True, (200, 80, 80))
        fallback.blit(
            text,
            text.get_rect(center=(fallback.get_width() // 2, fallback.get_height() // 2)),
        )
        return fallback

    def load_marker_icons(self) -> None:
        for key in self.category_keys:
            icon_name = MARKER_CATEGORIES.get(key, {}).get("icon")
            if not icon_name:
                continue
            icon_path = os.path.join(BASE_DIR, "images", icon_name)
            if not os.path.exists(icon_path):
                continue
            try:
                surface = pygame.image.load(icon_path).convert_alpha()
            except Exception:
                continue
            tint_color = CATEGORY_TINTS.get(key, (200, 200, 200))
            tinted = self.apply_icon_tint(surface, tint_color)
            self.marker_icons[key] = tinted

    def apply_icon_tint(self, surface: pygame.Surface, color: Tuple[int, int, int]) -> pygame.Surface:
        tinted = surface.copy()
        tint_layer = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
        tint_layer.fill((*color, 255))
        tinted.blit(tint_layer, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)
        return tinted

    def marker_icon_target_size(self, category: Optional[str] = None) -> int:
        base_scale = max(0.55, min(1.35, self.zoom))
        target = int(28 * base_scale)
        if category == "note":
            target = int(target * 1.5)
        return max(16, min(target, 48))

    def get_marker_icon_surface(self, category: str, target_size: Optional[int] = None) -> Optional[pygame.Surface]:
        base_surface = self.marker_icons.get(category)
        if not base_surface:
            return None

        if target_size is None:
            target = self.marker_icon_target_size(category)
        else:
            target = max(8, int(target_size))

        cache_key = (category, target)
        cached_surface = self.icon_cache.get(cache_key)
        if cached_surface:
            return cached_surface

        base_w, base_h = base_surface.get_size()
        max_dim = max(base_w, base_h)
        if max_dim == 0:
            return base_surface

        scale = target / max_dim
        new_w = max(1, int(base_w * scale))
        new_h = max(1, int(base_h * scale))
        scaled_surface = pygame.transform.smoothscale(base_surface, (new_w, new_h))
        self.icon_cache[cache_key] = scaled_surface
        return scaled_surface

    def run(self) -> None:
        while self.running:
            dt = self.clock.tick(FPS)
            self.handle_events()
            self.update(dt)
            self.draw()
            pygame.display.flip()

        pygame.quit()

    # ------------------------------------------------------------------ #
    # Event handling
    # ------------------------------------------------------------------ #
    def handle_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.quit()
            elif event.type == pygame.VIDEORESIZE:
                self.screen = pygame.display.set_mode(event.size, pygame.RESIZABLE)
                center_pygame_window(event.w, event.h)
                self.clamp_view()
            elif event.type == pygame.MOUSEWHEEL:
                self.handle_zoom(event.y, pygame.Vector2(pygame.mouse.get_pos()))
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button in (4, 5):  # Wheel fallback
                    direction = 1 if event.button == 4 else -1
                    self.handle_zoom(direction, pygame.Vector2(event.pos))
                elif event.button == 1:
                    self.handle_left_click(event.pos)
                elif event.button in (2, 3):
                    self.pan_active = True
                    self.pan_anchor = pygame.Vector2(event.pos)
                    self.pan_origin = self.view_origin.copy()
            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button in (2, 3):
                    self.pan_active = False
            elif event.type == pygame.MOUSEMOTION:
                if self.pan_active:
                    delta = pygame.Vector2(event.pos) - self.pan_anchor
                    self.view_origin = self.pan_origin - delta / self.zoom
                    self.clamp_view()
                else:
                    self.update_hover(event.pos)
            elif event.type == pygame.KEYDOWN:
                if self.active_editor:
                    self.handle_editor_key(event)
                else:
                    self.handle_global_key(event)
            elif event.type == pygame.KEYUP:
                self.handle_keyup(event)

    def handle_global_key(self, event: pygame.event.Event) -> None:
        if event.key in (pygame.K_ESCAPE, pygame.K_q):
            self.quit()
        elif event.key in (pygame.K_EQUALS, pygame.K_PLUS, pygame.K_KP_PLUS):
            self.handle_zoom(1, pygame.Vector2(pygame.mouse.get_pos()))
        elif event.key in (pygame.K_MINUS, pygame.K_KP_MINUS):
            self.handle_zoom(-1, pygame.Vector2(pygame.mouse.get_pos()))
        elif event.key in (pygame.K_LEFT, pygame.K_a):
            self.view_origin.x -= 40 / self.zoom
            self.clamp_view()
        elif event.key in (pygame.K_RIGHT, pygame.K_d):
            self.view_origin.x += 40 / self.zoom
            self.clamp_view()
        elif event.key in (pygame.K_UP, pygame.K_w):
            self.view_origin.y -= 40 / self.zoom
            self.clamp_view()
        elif event.key in (pygame.K_DOWN, pygame.K_s):
            self.view_origin.y += 40 / self.zoom
            self.clamp_view()

        pan_keys = {
            pygame.K_LEFT,
            pygame.K_RIGHT,
            pygame.K_UP,
            pygame.K_DOWN,
            pygame.K_a,
            pygame.K_d,
            pygame.K_w,
            pygame.K_s,
        }
        if event.key in pan_keys:
            self.held_pan_keys.add(event.key)

    def handle_editor_key(self, event: pygame.event.Event) -> None:
        assert self.active_editor is not None
        editor = self.active_editor
        mods = pygame.key.get_mods()

        if event.key == pygame.K_ESCAPE:
            self.active_editor = None
            return

        if event.key == pygame.K_TAB:
            direction = -1 if mods & pygame.KMOD_SHIFT else 1
            editor.category_index = (editor.category_index + direction) % len(
                self.category_keys
            )
            return

        if event.key == pygame.K_BACKSPACE:
            if editor.field == "title":
                editor.title = editor.title[:-1]
            else:
                editor.description = editor.description[:-1]
            return

        if event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            if editor.field == "title" and not (mods & pygame.KMOD_SHIFT):
                editor.field = "description"
            else:
                if editor.field == "description" and (mods & pygame.KMOD_SHIFT):
                    editor.description += "\n"
                else:
                    self.commit_editor()
            return

        if event.key == pygame.K_DELETE and not editor.is_new:
            self.delete_marker(editor.marker_id)
            self.active_editor = None
            return

        # Fallback: append printable character
        char = event.unicode
        if not char or (mods & pygame.KMOD_CTRL):
            return

        if editor.field == "title":
            editor.title += char
        else:
            editor.description += char

    def handle_zoom(self, direction: int, anchor_screen: pygame.Vector2) -> None:
        if direction == 0:
            return

        old_world = self.screen_to_world(anchor_screen)

        factor = ZOOM_STEP if direction > 0 else 1 / ZOOM_STEP
        self.zoom = max(MIN_ZOOM, min(MAX_ZOOM, self.zoom * factor))

        self.update_scaled_map()

        new_world = self.screen_to_world(anchor_screen)
        self.view_origin += old_world - new_world
        self.clamp_view()

    def handle_left_click(self, pos: Tuple[int, int]) -> None:
        mouse_pos = pygame.Vector2(pos)

        if self.handle_category_toggle_click(mouse_pos):
            return

        if self.active_editor and self.is_click_on_editor(mouse_pos):
            return

        if self.hovered_marker:
            self.start_edit_existing(self.hovered_marker)
        else:
            self.start_new_marker(mouse_pos)

    def handle_category_toggle_click(self, pos: pygame.Vector2) -> bool:
        """Toggle category visibility when clicking the filter controls."""
        for rect, key in self.category_toggle_rects:
            if rect.collidepoint(pos.x, pos.y):
                self.category_filters[key] = not self.category_filters.get(key, True)
                if (
                    self.hovered_marker
                    and self.hovered_marker.get("category") == key
                    and not self.category_filters[key]
                ):
                    self.hovered_marker = None
                return True
        return False

    def is_click_on_editor(self, pos: pygame.Vector2) -> bool:
        editor_rect = self.get_editor_rect()
        if editor_rect:
            return editor_rect.collidepoint(pos.x, pos.y)
        return False

    def update_hover(self, mouse_pos: Tuple[int, int]) -> None:
        world = self.screen_to_world(pygame.Vector2(mouse_pos))
        best_marker = None
        best_dist = float("inf")

        for marker in self.markers:
            pos = marker.get("position", {})
            world_pos = pygame.Vector2(pos.get("x", 0.0), pos.get("y", 0.0))
            category = marker.get("category", self.category_keys[0])
            if not self.category_filters.get(category, True):
                continue
            dist = world.distance_to(world_pos)
            icon_surface = self.get_marker_icon_surface(category)
            if icon_surface:
                radius = max(icon_surface.get_width(), icon_surface.get_height()) / 2.0
            else:
                radius = self.marker_radius()
            if dist * self.zoom <= max(radius * 1.4, 16) and dist < best_dist:
                best_marker = marker
                best_dist = dist

        self.hovered_marker = best_marker

    # ------------------------------------------------------------------ #
    # Marker editor helpers
    # ------------------------------------------------------------------ #
    def start_new_marker(self, mouse_pos: pygame.Vector2) -> None:
        world = self.screen_to_world(mouse_pos)
        self.held_pan_keys.clear()
        self.active_editor = EditorState(
            marker_id=None,
            is_new=True,
            world_pos=(world.x, world.y),
            category_index=0,
            title="",
            description="",
            field="title",
        )

    def start_edit_existing(self, marker: Dict) -> None:
        category_key = marker.get("category", self.category_keys[0])
        index = (
            self.category_keys.index(category_key)
            if category_key in self.category_keys
            else 0
        )
        pos = marker.get("position", {})
        self.held_pan_keys.clear()
        self.active_editor = EditorState(
            marker_id=marker.get("id"),
            is_new=False,
            world_pos=(float(pos.get("x", 0)), float(pos.get("y", 0))),
            category_index=index,
            title=marker.get("title", ""),
            description=marker.get("description", ""),
            field="title",
        )

    def commit_editor(self) -> None:
        if not self.active_editor:
            return

        editor = self.active_editor
        category = self.category_keys[editor.category_index]
        title = editor.title.strip()
        description = editor.description.strip()

        if editor.is_new:
            new_marker = add_marker(
                self.markers,
                category=category,
                x=editor.world_pos[0],
                y=editor.world_pos[1],
                title=title or MARKER_CATEGORIES[category]["label"],
                description=description,
                session_id=None,
            )
            save_markers(self.markers, self.marker_categories)
            self.hovered_marker = new_marker
        else:
            marker = self.find_marker_by_id(editor.marker_id)
            if marker:
                marker["category"] = category
                marker["title"] = title or MARKER_CATEGORIES[category]["label"]
                marker["description"] = description
                marker["position"] = {"x": editor.world_pos[0], "y": editor.world_pos[1]}
                marker["updated_at"] = datetime.utcnow().isoformat() + "Z"
                save_markers(self.markers, self.marker_categories)

        self.active_editor = None

    def delete_marker(self, marker_id: Optional[str]) -> None:
        if not marker_id:
            return
        if remove_marker(self.markers, marker_id):
            save_markers(self.markers, self.marker_categories)
        self.hovered_marker = None

    def find_marker_by_id(self, marker_id: Optional[str]) -> Optional[Dict]:
        if not marker_id:
            return None
        for marker in self.markers:
            if marker.get("id") == marker_id:
                return marker
        return None

    # ------------------------------------------------------------------ #
    # Update & Draw
    # ------------------------------------------------------------------ #
    def update(self, dt: float) -> None:
        if not self.active_editor:
            self.update_keyboard_pan(dt)

    def draw(self) -> None:
        self.screen.fill((10, 10, 14))
        self.draw_map()
        self.draw_markers()
        self.draw_category_toggles()
        self.draw_tooltip()
        self.draw_editor_overlay()
        self.draw_controls_overlay()

    def draw_map(self) -> None:
        origin_screen = self.world_to_screen((0.0, 0.0))
        self.screen.blit(self.scaled_map, origin_screen)

    def marker_radius(self) -> int:
        return max(6, int(self.base_marker_radius * math.sqrt(self.zoom)))

    def draw_markers(self) -> None:
        for marker in self.markers:
            pos = marker.get("position", {})
            world_pos = (float(pos.get("x", 0)), float(pos.get("y", 0)))
            screen_pos = self.world_to_screen(world_pos)

            category = marker.get("category", self.category_keys[0])
            if not self.category_filters.get(category, True):
                continue
            icon_surface = self.get_marker_icon_surface(category)
            if icon_surface:
                radius = max(icon_surface.get_width(), icon_surface.get_height()) // 2
                if not self.is_on_screen(screen_pos, radius):
                    continue
                icon_rect = icon_surface.get_rect(center=screen_pos)
                self.screen.blit(icon_surface, icon_rect.topleft)
                if self.hovered_marker and marker.get("id") == self.hovered_marker.get("id"):
                    pygame.draw.circle(self.screen, (255, 255, 255), screen_pos, radius + 4, 2)
            else:
                radius = self.marker_radius()
                if not self.is_on_screen(screen_pos, radius):
                    continue
                color = MARKER_CATEGORIES.get(category, {}).get("color", (200, 200, 200))
                pygame.draw.circle(self.screen, color, screen_pos, radius)

                if self.hovered_marker and marker.get("id") == self.hovered_marker.get("id"):
                    pygame.draw.circle(self.screen, (255, 255, 255), screen_pos, radius + 2, 2)

    def draw_tooltip(self) -> None:
        if not self.hovered_marker:
            return

        marker = self.hovered_marker
        pos = marker.get("position", {})
        screen_pos = self.world_to_screen(
            (float(pos.get("x", 0)), float(pos.get("y", 0)))
        )

        lines = []
        title = marker.get("title", "Marker")
        lines.append(title)
        description = marker.get("description", "")
        if description:
            lines.extend(description.splitlines())

        padding = 8
        max_width = 0
        heights = 0
        rendered_lines = []
        for line in lines:
            surface = self.font.render(line, True, TEXT_COLOR)
            rendered_lines.append(surface)
            max_width = max(max_width, surface.get_width())
            heights += surface.get_height()

        tooltip_rect = pygame.Rect(0, 0, max_width + padding * 2, heights + padding * 2)
        tooltip_rect.topleft = (screen_pos[0] + 16, screen_pos[1] - tooltip_rect.height - 8)

        if tooltip_rect.right > self.screen.get_width():
            tooltip_rect.right = self.screen.get_width() - 16
        if tooltip_rect.top < 16:
            tooltip_rect.top = 16

        tooltip_surface = pygame.Surface(tooltip_rect.size, pygame.SRCALPHA)
        pygame.draw.rect(tooltip_surface, TOOLTIP_BG, tooltip_surface.get_rect(), border_radius=6)
        pygame.draw.rect(
            tooltip_surface,
            TOOLTIP_BORDER,
            tooltip_surface.get_rect(),
            width=1,
            border_radius=6,
        )

        y = padding
        for surface in rendered_lines:
            tooltip_surface.blit(surface, (padding, y))
            y += surface.get_height()

        self.screen.blit(tooltip_surface, tooltip_rect.topleft)

    def draw_category_toggles(self) -> None:
        panel_padding = 12
        row_height = 42
        panel_width = 220
        header_surface = self.font_small.render("Layers", True, TEXT_COLOR)
        panel_height = (
            panel_padding * 2
            + header_surface.get_height()
            + 8
            + row_height * len(self.category_keys)
        )

        x = self.screen.get_width() - panel_width - 20
        y = 20

        self.category_toggle_rects = []

        panel_surface = pygame.Surface((panel_width, panel_height), pygame.SRCALPHA)
        pygame.draw.rect(panel_surface, (12, 12, 16, 220), panel_surface.get_rect(), border_radius=8)
        pygame.draw.rect(
            panel_surface,
            OVERLAY_BORDER,
            panel_surface.get_rect(),
            width=1,
            border_radius=8,
        )

        panel_surface.blit(header_surface, (panel_padding, panel_padding))

        row_y = panel_padding + header_surface.get_height() + 8
        icon_base = 24
        for key in self.category_keys:
            label = self.marker_categories.get(key, {}).get(
                "label", MARKER_CATEGORIES[key]["label"]
            )
            row_rect = pygame.Rect(
                x + panel_padding,
                y + row_y,
                panel_width - panel_padding * 2,
                row_height,
            )

            active = self.category_filters.get(key, True)
            checkbox_rect = pygame.Rect(
                panel_padding + icon_base + 12,
                row_y + (row_height - icon_base) // 2,
                icon_base,
                icon_base,
            )
            pygame.draw.rect(
                panel_surface,
                ACCENT if active else (80, 80, 90),
                checkbox_rect,
                border_radius=4,
            )
            pygame.draw.rect(panel_surface, OVERLAY_BORDER, checkbox_rect, width=1, border_radius=4)

            if active:
                inner = checkbox_rect.inflate(-6, -6)
                pygame.draw.rect(panel_surface, TEXT_COLOR, inner, border_radius=3)

            icon_surface = self.get_marker_icon_surface(key, target_size=icon_base)
            icon_center_x = panel_padding + icon_base // 2
            icon_center_y = row_y + row_height // 2
            if icon_surface:
                icon_rect = icon_surface.get_rect()
                icon_rect.center = (icon_center_x, icon_center_y)
                panel_surface.blit(icon_surface, icon_rect.topleft)
            else:
                tint_color = CATEGORY_TINTS.get(key, (200, 200, 200))
                pygame.draw.circle(
                    panel_surface,
                    tint_color,
                    (icon_center_x, icon_center_y),
                    icon_base // 2,
                )

            label_surface = self.font_small.render(label, True, TEXT_COLOR)
            panel_surface.blit(
                label_surface,
                (
                    checkbox_rect.right + 12,
                    row_y + (row_height - label_surface.get_height()) // 2,
                ),
            )

            self.category_toggle_rects.append((row_rect, key))
            row_y += row_height

        self.screen.blit(panel_surface, (x, y))

    def draw_editor_overlay(self) -> None:
        if not self.active_editor:
            return

        editor_rect = self.get_editor_rect()
        if not editor_rect:
            return

        overlay = pygame.Surface(editor_rect.size, pygame.SRCALPHA)
        pygame.draw.rect(overlay, OVERLAY_BG, overlay.get_rect(), border_radius=10)
        pygame.draw.rect(
            overlay, OVERLAY_BORDER, overlay.get_rect(), width=2, border_radius=10
        )

        editor = self.active_editor
        category_key = self.category_keys[editor.category_index]
        category_label = self.marker_categories.get(category_key, {}).get(
            "label", MARKER_CATEGORIES[category_key]["label"]
        )

        line_specs = [
            (self.font, "Create new marker" if editor.is_new else "Editing marker", TEXT_COLOR),
            (self.font, f"Category: {category_label}", ACCENT),
            (self.font, f"Title: {editor.title or '—'}", TEXT_COLOR),
            (self.font, f"Description: {editor.description or '—'}", TEXT_COLOR),
        ]

        rendered_lines: List[Tuple[pygame.Surface, pygame.Rect]] = []
        y = 18
        for font, text, color in line_specs:
            text_surface = font.render(text, True, color)
            text_rect = text_surface.get_rect()
            text_rect.topleft = (16, y)
            rendered_lines.append((text_surface, text_rect))
            y += text_rect.height + 12

        highlight_index = 2 if editor.field == "title" else 3
        if 0 <= highlight_index < len(rendered_lines):
            target_rect = rendered_lines[highlight_index][1]
            highlight_rect = pygame.Rect(
                12,
                target_rect.top - 4,
                editor_rect.width - 24,
                target_rect.height + 8,
            )
            pygame.draw.rect(overlay, ACCENT, highlight_rect, width=2, border_radius=6)

        for surface, rect in rendered_lines:
            overlay.blit(surface, rect.topleft)

        self.screen.blit(overlay, editor_rect.topleft)

    def get_editor_rect(self) -> Optional[pygame.Rect]:
        if not self.active_editor:
            return None
        width = min(480, self.screen.get_width() - 40)
        height = 220
        x = (self.screen.get_width() - width) // 2
        y = self.screen.get_height() - height - 30
        return pygame.Rect(x, y, width, height)

    def draw_controls_overlay(self) -> None:
        # Controls tooltip intentionally removed per polish pass
        return

    # ------------------------------------------------------------------ #
    # Geometry helpers
    # ------------------------------------------------------------------ #
    def update_scaled_map(self, force: bool = False) -> None:
        source_surface = (
            self.low_res_surface if self.should_use_low_res() else self.high_res_surface
        )

        needs_rescale = (
            force
            or source_surface is not self.current_base_surface
            or abs(self.zoom - self.scaled_zoom) >= 0.001
        )

        if not needs_rescale:
            return

        width = max(1, int(self.map_rect.width * self.zoom))
        height = max(1, int(self.map_rect.height * self.zoom))
        self.scaled_map = pygame.transform.smoothscale(source_surface, (width, height))
        self.scaled_zoom = self.zoom
        self.current_base_surface = source_surface

    def center_view_on_map(self) -> None:
        view_w = self.screen.get_width() / self.zoom
        view_h = self.screen.get_height() / self.zoom

        self.view_origin.x = (self.map_rect.width - view_w) / 2
        self.view_origin.y = (self.map_rect.height - view_h) / 2
        self.clamp_view()

    def update_keyboard_pan(self, dt: float) -> None:
        if not self.held_pan_keys:
            return

        pan_vector = pygame.Vector2(0.0, 0.0)
        for key in self.held_pan_keys:
            if key in (pygame.K_LEFT, pygame.K_a):
                pan_vector.x -= 1
            if key in (pygame.K_RIGHT, pygame.K_d):
                pan_vector.x += 1
            if key in (pygame.K_UP, pygame.K_w):
                pan_vector.y -= 1
            if key in (pygame.K_DOWN, pygame.K_s):
                pan_vector.y += 1

        if pan_vector.length_squared() == 0:
            return

        pan_vector = pan_vector.normalize()
        seconds = max(dt, 0) / 1000.0
        world_speed = (self.keyboard_pan_speed * seconds) / max(self.zoom, 1e-4)
        self.view_origin += pan_vector * world_speed
        self.clamp_view()

    def handle_keyup(self, event: pygame.event.Event) -> None:
        self.held_pan_keys.discard(event.key)

    def should_use_low_res(self) -> bool:
        if self.low_res_surface is None or self.low_res_surface == self.high_res_surface:
            return False
        return self.zoom < LOW_RES_THRESHOLD

    def clamp_view(self) -> None:
        view_w = self.screen.get_width() / self.zoom
        view_h = self.screen.get_height() / self.zoom

        max_x = self.map_rect.width - view_w
        max_y = self.map_rect.height - view_h

        if view_w >= self.map_rect.width:
            self.view_origin.x = (self.map_rect.width - view_w) / 2
        else:
            self.view_origin.x = max(0.0, min(self.view_origin.x, max_x))

        if view_h >= self.map_rect.height:
            self.view_origin.y = (self.map_rect.height - view_h) / 2
        else:
            self.view_origin.y = max(0.0, min(self.view_origin.y, max_y))

    def world_to_screen(self, world: Tuple[float, float]) -> Tuple[int, int]:
        x = (world[0] - self.view_origin.x) * self.zoom
        y = (world[1] - self.view_origin.y) * self.zoom
        return int(x), int(y)

    def screen_to_world(self, screen: pygame.Vector2) -> pygame.Vector2:
        x = screen.x / self.zoom + self.view_origin.x
        y = screen.y / self.zoom + self.view_origin.y
        return pygame.Vector2(x, y)

    def is_on_screen(self, screen_pos: Tuple[int, int], radius: int) -> bool:
        x, y = screen_pos
        if x + radius < 0 or y + radius < 0:
            return False
        if x - radius > self.screen.get_width() or y - radius > self.screen.get_height():
            return False
        return True

    # ------------------------------------------------------------------ #
    # Shutdown
    # ------------------------------------------------------------------ #
    def quit(self) -> None:
        if self.active_editor:
            if (
                self.active_editor.is_new
                and not self.active_editor.title.strip()
                and not self.active_editor.description.strip()
            ):
                # Ignore empty draft markers
                self.active_editor = None
            else:
                self.commit_editor()
        self.running = False


def main() -> None:
    viewer = MapViewer()
    viewer.run()


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Map viewer crashed: {exc}", file=sys.stderr)
        pygame.quit()
        raise

