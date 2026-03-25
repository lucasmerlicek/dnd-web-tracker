import pygame
import sys
import math
import json
import os
import time
import logging
import subprocess
from datetime import datetime
from typing import Optional

def center_pygame_window(window_width, window_height):
    """Center the current Pygame window within the visible work area on Windows."""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        import ctypes.wintypes

        user32 = ctypes.windll.user32
        hwnd = pygame.display.get_wm_info().get("window")
        if not hwnd:
            return

        work_area = ctypes.wintypes.RECT()
        SPI_GETWORKAREA = 48
        if not user32.SystemParametersInfoW(SPI_GETWORKAREA, 0, ctypes.byref(work_area), 0):
            return

        work_width = work_area.right - work_area.left
        work_height = work_area.bottom - work_area.top

        x = work_area.left + max(0, (work_width - window_width) // 2)
        y = work_area.top + max(0, (work_height - window_height) // 2)

        SWP_NOSIZE = 0x0001
        SWP_NOZORDER = 0x0004
        user32.SetWindowPos(hwnd, 0, int(x), int(y), 0, 0, SWP_NOSIZE | SWP_NOZORDER)
    except Exception as exc:
        logging.debug(f"center_pygame_window failed: {exc}")

# Paths and helper utilities
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def asset_path(*parts):
    return os.path.join(BASE_DIR, "images", *parts)

TARGET_BASE_WIDTH = 1536
TARGET_BASE_HEIGHT = 1024
TARGET_ASPECT_RATIO = TARGET_BASE_WIDTH / TARGET_BASE_HEIGHT

# Set up logging
def setup_logging():
    # Create logs directory if it doesn't exist
    logs_dir = "logs"
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    # Create timestamp for log filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = os.path.join(logs_dir, f"dnd_tracker_{timestamp}.log")
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_filename),
            logging.StreamHandler(sys.stdout)  # Also output to console
        ]
    )
    
    logging.info(f"D&D Character Tracker started - Log file: {log_filename}")
    return log_filename

# Set up logging
log_file = setup_logging()

# Initialize Pygame
pygame.init()
logging.info("Pygame initialized successfully")

# Constants
def get_adaptive_resolution():
    """Get adaptive resolution based on display scaling"""
    import ctypes
    import ctypes.wintypes
    
    try:
        # Get system DPI
        user32 = ctypes.windll.user32
        user32.SetProcessDPIAware()
        
        # Get screen dimensions in pixels
        screen_width = user32.GetSystemMetrics(0)  # SM_CXSCREEN
        screen_height = user32.GetSystemMetrics(1)  # SM_CYSCREEN
        
        # Get work area (excludes taskbar and other system UI)
        work_area = ctypes.wintypes.RECT()
        user32.SystemParametersInfoW(48, 0, ctypes.byref(work_area), 0)  # SPI_GETWORKAREA
        work_width = work_area.right - work_area.left
        work_height = work_area.bottom - work_area.top
        
        # Calculate scaling factor
        # Standard DPI is 96, common scales are 100% (96), 125% (120), 150% (144), 200% (192)
        dpi = ctypes.windll.gdi32.GetDeviceCaps(ctypes.windll.user32.GetDC(0), 88)  # LOGPIXELSX
        scale_factor = dpi / 96.0
        
        # Log scaling info
        logging.info(f"Detected DPI: {dpi}, Scale factor: {scale_factor:.2f}")
        logging.info(f"Screen resolution: {screen_width}x{screen_height}")
        logging.info(f"Work area: {work_width}x{work_height}")
        
        # Use work area for calculations and be more conservative with sizing
        # Account for window decorations (title bar, borders) - approximately 40px for title bar and borders
        usable_width = work_width - 40
        usable_height = work_height - 40
        
        # Define target window sizes based on scale factor (target 3:2 aspect ratio)
        aspect_ratio = TARGET_ASPECT_RATIO
        base_width = TARGET_BASE_WIDTH
        
        if scale_factor >= 2.0:  # 200% scaling or higher
            target_width = min(int(base_width * 0.70), int(usable_width * 0.75))
        elif scale_factor >= 1.5:  # 150% scaling
            target_width = min(int(base_width * 0.85), int(usable_width * 0.85))
        elif scale_factor >= 1.25:  # 125% scaling
            target_width = min(int(base_width * 0.95), int(usable_width * 0.90))
        else:  # 100% scaling
            target_width = min(base_width, int(usable_width * 0.95))
        
        # Calculate height based on target aspect ratio (3:2)
        target_height = int(target_width / aspect_ratio)
        
        # Ensure the calculated height fits in the usable height
        if target_height > usable_height:
            target_height = usable_height
            target_width = int(target_height * aspect_ratio)
        
        # Ensure minimum size requirements
        min_width = 960  # Minimum width while preserving aspect ratio
        min_height = int(min_width / aspect_ratio)
        
        width = max(target_width, min_width)
        height = max(target_height, min_height)
        
        # Final verification of aspect ratio
        if abs((width / height) - aspect_ratio) > 0.01:  # Allow small tolerance
            # Recalculate based on whichever dimension is more constrained
            if width / usable_width > height / usable_height:
                # Width is more constrained
                width = min(width, usable_width)
                height = int(width / aspect_ratio)
        else:
            # Height is more constrained
            height = min(height, usable_height)
            width = int(height * aspect_ratio)
        
        logging.info(f"Adaptive window size: {width}x{height} (aspect ratio: {width/height:.3f})")
        return width, height
        
    except Exception as e:
        logging.warning(f"Could not detect display scaling, using fallback: {e}")
        # Fallback to target 3:2 aspect ratio
        return TARGET_BASE_WIDTH, TARGET_BASE_HEIGHT

# Get adaptive screen dimensions
SCREEN_WIDTH, SCREEN_HEIGHT = get_adaptive_resolution()
FPS = 60
SAVE_FILE = os.path.join(BASE_DIR, "character_data.json")
BACKGROUND_IMAGE = asset_path("background.png")
UI_BOX_IMAGE = asset_path("UI_box.png")
UI_BOX_BUTTON_IMAGE = asset_path("UI_box_1.png")

# Dark Fantasy Color Palette
DARK_BG = (15, 15, 20)           # Even darker background
CARD_BG = (25, 25, 30, 200)     # Semi-transparent dark cards
ACCENT = (120, 100, 80)          # Muted bronze/brown
ACCENT_HOVER = (140, 120, 100)   # Lighter bronze on hover
SUCCESS = (60, 80, 60)           # Muted dark green
WARNING = (120, 100, 60)         # Muted gold/amber
DANGER = (100, 60, 60)           # Muted dark red
TEXT_PRIMARY = (220, 210, 200)   # Warm off-white
TEXT_SECONDARY = (140, 130, 120) # Muted tan/brown
BORDER = (60, 55, 50)            # Dark brown border
SHADOW = (5, 5, 10, 100)         # Semi-transparent shadow

class ModernButton:
    def __init__(self, x, y, width, height, text, color, ui_box_image=None, has_advantage_checkbox=False):
        self.rect = pygame.Rect(x, y, width, height)
        self.text = text
        self.color = color
        self.hover_color = ACCENT_HOVER
        self.selected = False
        self.hovered = False
        self.font = pygame.font.Font(None, 28)
        self.ui_box_button_image = ui_box_image
        self.has_advantage_checkbox = has_advantage_checkbox
        self.advantage_checked = False
        
        # Split text for multi-line display
        self.text_lines = self.split_text_for_button(text)
    
    def split_text_for_button(self, text):
        """Split button text into multiple lines for better display"""
        # Check if text contains parentheses that should go on second line
        if '(' in text and ')' in text:
            # Find the opening parenthesis
            paren_start = text.find('(')
            main_text = text[:paren_start].strip()
            paren_text = text[paren_start:].strip()
            return [main_text, paren_text]
        else:
            return [text]
    
    def draw(self, screen):
        """Draw the modern button with UI box background"""
        # Calculate dynamic offsets for visual effects
        shadow_offset = 4 if self.selected or self.hovered else 2
        hover_offset = -2 if self.selected or self.hovered else 0
        
        # Draw shadow for selected/hovered states
        if self.selected or self.hovered:
            shadow_rect = self.rect.copy()
            shadow_rect.x += shadow_offset
            shadow_rect.y += shadow_offset
            shadow_surface = pygame.Surface((shadow_rect.width, shadow_rect.height), pygame.SRCALPHA)
            pygame.draw.rect(shadow_surface, (0, 0, 0, 80), (0, 0, shadow_rect.width, shadow_rect.height), border_radius=8)
            screen.blit(shadow_surface, shadow_rect)
        
        # Calculate button position with hover offset
        button_rect = self.rect.copy()
        button_rect.x += hover_offset
        button_rect.y += hover_offset
        
        # Draw button background using UI box image
        if self.ui_box_button_image:
            # Scale the UI box image to fit the button
            scaled_image = pygame.transform.scale(self.ui_box_button_image, (button_rect.width, button_rect.height))
            
            # Apply transparency based on state
            if self.selected:
                alpha = 255  # Fully opaque when selected
            elif self.hovered:
                alpha = 220  # Slightly transparent when hovered
            else:
                alpha = 180  # More transparent when idle
            
            scaled_image.set_alpha(alpha)
            screen.blit(scaled_image, button_rect)
            
            # Add a subtle color tint overlay
            tint_surface = pygame.Surface((button_rect.width, button_rect.height), pygame.SRCALPHA)
            tint_alpha = 40 if self.selected else 20
            pygame.draw.rect(tint_surface, (*self.color, tint_alpha), (0, 0, button_rect.width, button_rect.height), border_radius=8)
            screen.blit(tint_surface, button_rect)
            
        else:
            # Fallback to solid color rectangle
            button_color = self.color if not (self.selected or self.hovered) else tuple(min(255, c + 30) for c in self.color)
            pygame.draw.rect(screen, button_color, button_rect, border_radius=8)
            
            if self.selected:
                pygame.draw.rect(screen, (255, 255, 255, 50), button_rect, width=2, border_radius=8)
        
        # Pre-compute text and advantage regions
        adv_width = button_rect.width // 4 if self.has_advantage_checkbox else 0
        text_area_rect = pygame.Rect(button_rect.x, button_rect.y, button_rect.width - adv_width, button_rect.height)

        # Draw multi-line text
        text_offset_y = 2 if self.selected else 0
        
        if len(self.text_lines) == 1:
            # Single line text - properly center it vertically
            text_surface = self.font.render(self.text_lines[0], True, (255, 255, 255))
            text_rect = text_surface.get_rect(center=(text_area_rect.centerx, text_area_rect.centery + text_offset_y))
            screen.blit(text_surface, text_rect)
        else:
            # Multi-line text - properly center the entire text block
            line_height = self.font.get_height()
            total_height = len(self.text_lines) * line_height
            
            # Calculate the starting Y position for the first line to center the whole block
            first_line_y = text_area_rect.centery - (total_height // 2) + (line_height // 2) + text_offset_y
            
            for i, line in enumerate(self.text_lines):
                text_surface = self.font.render(line, True, (255, 255, 255))
                line_y = first_line_y + i * line_height
                text_rect = text_surface.get_rect(center=(text_area_rect.centerx, line_y))
                screen.blit(text_surface, text_rect)
        
        # Draw advantage section if enabled (1/4 width on right side)
        if self.has_advantage_checkbox:
            adv_x = button_rect.right - adv_width
            adv_rect = pygame.Rect(adv_x, button_rect.y, adv_width, button_rect.height)
            
            # Calculate different shade for advantage section
            if self.advantage_checked:
                # Orange highlight when checked
                if self.ui_box_button_image:
                    # Draw UI box image for advantage section with darker tint
                    adv_ui_box = pygame.transform.scale(self.ui_box_button_image, (adv_width, button_rect.height))
                    adv_ui_box.set_alpha(alpha if 'alpha' in locals() else 180)
                    screen.blit(adv_ui_box, (adv_x, button_rect.y))
                    # Orange tint overlay
                    adv_tint = pygame.Surface((adv_width, button_rect.height), pygame.SRCALPHA)
                    pygame.draw.rect(adv_tint, (255, 165, 80, 90), (0, 0, adv_width, button_rect.height), border_radius=8)
                    screen.blit(adv_tint, (adv_x, button_rect.y))
                else:
                    adv_color = (min(255, int(self.color[0] + 60)), min(255, int(self.color[1] + 40)), min(255, int(self.color[2] + 20)))
                    pygame.draw.rect(screen, adv_color, adv_rect, border_radius=8)
            else:
                # Lighter shade when not checked
                if self.ui_box_button_image:
                    # Draw UI box image for advantage section with lighter tint
                    adv_ui_box = pygame.transform.scale(self.ui_box_button_image, (adv_width, button_rect.height))
                    adv_ui_box.set_alpha(alpha if 'alpha' in locals() else 180)
                    screen.blit(adv_ui_box, (adv_x, button_rect.y))
                    # Lighter tint overlay
                    adv_tint = pygame.Surface((adv_width, button_rect.height), pygame.SRCALPHA)
                    pygame.draw.rect(adv_tint, (255, 255, 255, 20), (0, 0, adv_width, button_rect.height), border_radius=8)
                    screen.blit(adv_tint, (adv_x, button_rect.y))
                else:
                    adv_color = tuple(min(255, c + 20) for c in self.color)
                    pygame.draw.rect(screen, adv_color, adv_rect, border_radius=8)
            
            # Draw "ADV" text vertically centered
            adv_font = pygame.font.Font(None, 20)
            adv_text = adv_font.render("ADV", True, (255, 255, 255))
            adv_text_rect = adv_text.get_rect(center=(adv_x + adv_width // 2, button_rect.centery))
            screen.blit(adv_text, adv_text_rect)
    
    def handle_hover(self, pos):
        self.hovered = self.rect.collidepoint(pos)
    
    def handle_click(self, pos):
        """Handle button click, returns ('button', True/False) or ('checkbox', True/False)"""
        if not self.rect.collidepoint(pos):
            return ('none', False)
        
        # Check if click is on advantage section (right 1/4 of button)
        if self.has_advantage_checkbox:
            adv_width = self.rect.width // 4
            adv_x = self.rect.right - adv_width
            
            if pos[0] >= adv_x:
                # Click in advantage section - toggle it
                self.advantage_checked = not self.advantage_checked
                return ('checkbox', True)
        
        # Regular button click
        return ('button', True)

class DnDCharacterTool:
    ABILITY_NAME_MAP = {
        "STR": "Strength",
        "DEX": "Dexterity",
        "CON": "Constitution",
        "INT": "Intelligence",
        "WIS": "Wisdom",
        "CHA": "Charisma",
    }
    SORCERY_CREATE_COSTS = {
        1: 2,
        2: 3,
        3: 5,
        4: 6,
        5: 7,
    }

    def __init__(self):
        # Improve DPI awareness for Windows
        import os
        import ctypes
        
        # Set DPI awareness for better scaling support
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)  # PROCESS_PER_MONITOR_DPI_AWARE
        except:
            try:
                ctypes.windll.user32.SetProcessDPIAware()  # Fallback for older Windows
            except:
                pass
        
        # Center the window on screen
        desktop_sizes = pygame.display.get_desktop_sizes()
        if desktop_sizes:
            desktop_width, desktop_height = desktop_sizes[0]
            center_x = (desktop_width - SCREEN_WIDTH) // 2
            center_y = (desktop_height - SCREEN_HEIGHT) // 2
            os.environ['SDL_VIDEO_WINDOW_POS'] = f'{center_x},{center_y}'
        
        # Create resizable window
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.RESIZABLE)
        center_pygame_window(SCREEN_WIDTH, SCREEN_HEIGHT)
        pygame.display.set_caption("D&D Character Tool")
        self.clock = pygame.time.Clock()
        self.running = True
        self.map_viewer_process = None
        
        # Store the original window size for scaling calculations
        self.base_width = SCREEN_WIDTH
        self.base_height = SCREEN_HEIGHT
        self.current_width = SCREEN_WIDTH
        self.current_height = SCREEN_HEIGHT
        self.is_fullscreen = False
        
        # Load background image
        self.load_background()
        
        # Screen management
        self.current_screen = "main"  # "main", "attack", "spells", etc.
        self.selected_weapon = None
        self.last_attack_roll = None
        self.last_damage_roll = None
        
        # Spell system
        self.selected_spell = None
        self.selected_spell_level = None
        self.last_spell_damage_roll = None
        self.spell_data = self.create_spell_data()
        self.spell_scroll_offset = 0
        self.spell_button_lookup = []
        self.spell_button_spacing = 65
        self.spell_button_height = 55
        self.max_visible_spells = 0
        self.prepared_spells = []
        self.auto_prepared_spells = []
        self.max_prepared_spells = 0
        
        # Saves system
        self.selected_save = None
        self.last_save_roll = None
        self.last_death_save_roll = None  # Track last death save roll for display
        
        # Action system
        self.selected_action = None
        self.last_action_roll = None
        self.raven_form_active = False
        self.raven_form_max_uses = 1
        self.raven_form_uses_remaining = self.raven_form_max_uses
        self.raven_indicator_rect = None
        self.hit_dice_total = 4
        self.hit_dice_available = self.hit_dice_total
        self.hit_dice_size = 6
        self.short_rest_modal_open = False
        self.short_rest_input_text = ""
        self.short_rest_input_active = False
        self.short_rest_error_text = ""
        self.short_rest_recover_button = None
        self.short_rest_cancel_button = None
        self.short_rest_input_rect = None
        
        # Bag system
        self.selected_item_index = None
        self.item_input_text = ""
        self.item_input_active = False
        self.current_inventory_type = "gear"  # gear, utility, treasure
        self.coin_input_text = ""
        self.coin_input_active = False
        
        # Journal system
        self.current_journal_session = "Session 1"
        self.journal_text_active = False
        self.session_input_text = ""
        self.session_input_active = False
        self.journal_scroll_offset = 0
        self.journal_cursor_pos = 0
        self.journal_display_lines = []
        self.journal_visible_lines = 0
        self.session_name_editing = False
        self.session_name_edit_text = ""
        self.active_entry_type = "journal"
        
        # Sorcerous Restoration (once per long rest, regain SP on short rest)
        self.sorcerous_restoration_used = False
        
        # Journal text selection
        self.journal_selection_start = None
        self.journal_selection_end = None
        self.journal_mouse_selecting = False
        
        # Key repeat handling for backspace
        self.backspace_held = False
        self.backspace_repeat_timer = 0
        self.backspace_repeat_initial_delay = 500  # Initial delay in ms
        self.backspace_repeat_delay = self.backspace_repeat_initial_delay
        self.backspace_repeat_rate = 80   # Repeat rate in ms
        
        # Shield spell AC tracking
        self.shield_active = False
        self.base_ac = None  # Will be set from character data
        
        # HP input field
        self.hp_input_text = ""
        self.hp_input_active = False
        
        # Skills hover and click system
        self.skill_hover_index = None
        self.skill_rects = []  # Store skill rectangles for hover/click detection
        self.stat_rects = []  # Store stat rectangles for click detection
        
        # Sorcery and metamagic systems
        self.metamagic_spells = [
            "Metamagic: Quickened Spell",
            "Metamagic: Empowered Spell",
        ]
        self.sorcery_points_max = 4
        self.current_sorcery_points = self.sorcery_points_max
        self.sorcery_slot_input_text = ""
        self.sorcery_slot_input_active = False
        self.sorcery_slot_input_rect = None
        self.created_spell_slots = {}
        self.sorcery_use_button = None
        self.sorcery_create_button = None
        
        # Temporary overlay system for skill rolls
        self.temp_overlay_text = ""
        self.temp_overlay_timer = 0
        self.temp_overlay_duration = 2000  # 2 seconds in milliseconds
        
        # Character tracking system - initialize before loading
        self.characters = {}
        self.places = {}
        self.current_character = None
        self.current_place = None
        self.character_page = 0
        self.place_page = 0
        self.character_input_text = ""
        self.character_input_active = False
        self.character_scroll_offset = 0
        self.character_cursor_position = 0  # For click-to-position in character notes
        self.place_scroll_offset = 0
        self.place_cursor_position = 0
        self.character_name_editing = False
        self.character_name_edit_text = ""
        self.journal_cursor_position = 0  # For click-to-position in journal
        self.place_name_editing = False
        self.place_name_edit_text = ""
        self.journal_entity_mode = "character"  # character or place
        self.journal_mode_toggle_rects = {}
        self.character_name_buttons = []
        self.place_name_buttons = []
        self.character_create_button = None
        self.place_create_button = None
        self.character_back_button = None
        self.place_back_button = None
        self.character_forward_button = None
        self.place_forward_button = None
        
        # Load character data from JSON or create default
        self.load_character_data()
        
        # Update window title with character name
        pygame.display.set_caption(f"D&D Character Tool - {self.character_name}")
        
        # Log adaptive resolution info for user
        aspect_ratio = self.current_width / self.current_height
        logging.info(f"Window initialized at {self.current_width}x{self.current_height} (aspect ratio: {aspect_ratio:.2f}:1)")
        logging.info("💡 Adaptive Resolution Features:")
        logging.info("   • Window automatically adjusts to display scaling (100%, 125%, 150%)")
        logging.info("   • Locked to 3:2 aspect ratio (1536x1024) for optimal viewing")
        logging.info("   • Press F11 to toggle fullscreen mode")
        logging.info("   • Press ESC to exit fullscreen")
        logging.info("   • Window is resizable - aspect ratio maintained automatically")
        
        # Create main menu buttons
        self.create_main_buttons()
        
        # Create attack menu buttons (will be created when needed)
        self.attack_buttons = []
        self.attack_action_buttons = []
        
        # Create spell menu buttons (will be created when needed)
        self.spell_buttons = []
        self.spell_action_buttons = []
        
        # Create saves menu buttons (will be created when needed)
        self.saves_buttons = []
        self.saves_action_buttons = []
        
        # Create action menu buttons (will be created when needed)
        self.action_buttons = []
        self.action_action_buttons = []
        
        # Create bag menu buttons (will be created when needed)
        self.bag_buttons = []
        
        # Create journal menu buttons (will be created when needed)
        self.journal_buttons = []
        
        # Navigation (mouse only)
        
        # Modern fonts
        self.title_font = pygame.font.Font(None, 48)
        self.header_font = pygame.font.Font(None, 36)
        self.subheader_font = pygame.font.Font(None, 28)
        self.text_font = pygame.font.Font(None, 24)
        self.small_font = pygame.font.Font(None, 20)
    
    def handle_window_resize(self, event):
        """Handle window resize events and update layout accordingly"""
        # Maintain target aspect ratio (3:2)
        aspect_ratio = TARGET_ASPECT_RATIO
        new_width = event.w
        new_height = event.h
        
        # Calculate what the height should be for the given width
        target_height = int(new_width / aspect_ratio)
        
        # Calculate what the width should be for the given height  
        target_width = int(new_height * aspect_ratio)
        
        # Choose the constraint that fits within the requested size
        if target_height <= new_height:
            # Width-constrained: use the full width, adjust height
            self.current_width = new_width
            self.current_height = target_height
        else:
            # Height-constrained: use the full height, adjust width
            self.current_width = target_width
            self.current_height = new_height
        
        # Ensure minimum size while keeping aspect ratio
        min_width = 960
        min_height = int(min_width / aspect_ratio)  # 540
        
        # Also enforce maximum reasonable size to prevent issues
        max_width = 3840  # 4K width
        max_height = int(max_width / aspect_ratio)
        
        if self.current_width < min_width:
            self.current_width = min_width
            self.current_height = min_height
        elif self.current_height < min_height:
            self.current_height = min_height
            self.current_width = int(min_height * aspect_ratio)
        elif self.current_width > max_width:
            self.current_width = max_width
            self.current_height = max_height
        elif self.current_height > max_height:
            self.current_height = max_height
            self.current_width = int(max_height * aspect_ratio)
        
        # Update screen surface with corrected dimensions
        self.screen = pygame.display.set_mode((self.current_width, self.current_height), pygame.RESIZABLE)
        center_pygame_window(self.current_width, self.current_height)
        
        # Update background image if it exists
        if self.background_image:
            if os.path.exists(BACKGROUND_IMAGE):
                self.background_image = pygame.transform.scale(
                    pygame.image.load(BACKGROUND_IMAGE),
                    (self.current_width, self.current_height)
                )
            else:
                self.background_image = pygame.transform.scale(
                    self.background_image,
                    (self.current_width, self.current_height)
                )
        
        # Update submenu backgrounds
        bg_paths = {
            'attack': asset_path("attack_background.png"),
            'actions': asset_path("action_backround.png"),
            'spells': asset_path("spells_background.png"),
            'saves': asset_path("save_background.png"),
            'bag': asset_path("bag_background.png"),
            'journal': asset_path("journal_background.png")
        }

        for menu_name, bg_image in self.submenu_backgrounds.items():
            if bg_image:
                bg_path = bg_paths.get(menu_name)
                if bg_path and os.path.exists(bg_path):
                    self.submenu_backgrounds[menu_name] = pygame.transform.scale(
                        pygame.image.load(bg_path),
                        (self.current_width, self.current_height)
                    )
                else:
                    self.submenu_backgrounds[menu_name] = pygame.transform.scale(
                        bg_image,
                        (self.current_width, self.current_height)
                    )
        
        # Recreate buttons for current screen to adjust positions
        if self.current_screen == "main":
            self.create_main_buttons()
        elif self.current_screen == "attack":
            self.create_attack_buttons()
        elif self.current_screen == "spells":
            self.create_spell_buttons()
        elif self.current_screen == "saves":
            self.create_saves_buttons()
        elif self.current_screen == "actions":
            self.create_action_buttons()
        elif self.current_screen == "bag":
            self.create_bag_buttons()
        elif self.current_screen == "journal":
            self.create_journal_buttons()
        
        aspect_ratio = self.current_width / self.current_height
        actual_ratio = self.current_width / self.current_height
        logging.info(f"Window resized to {self.current_width}x{self.current_height} (aspect ratio maintained: {actual_ratio:.3f}:1)")
    
    def toggle_fullscreen(self):
        """Toggle between fullscreen and windowed mode"""
        if self.is_fullscreen:
            # Exit fullscreen - return to target aspect ratio window (3:2)
            aspect_ratio = TARGET_ASPECT_RATIO
            # Ensure the base dimensions maintain target aspect ratio
            if self.base_width / self.base_height > aspect_ratio:
                # Adjust width to fit height
                window_width = int(self.base_height * aspect_ratio)
                window_height = self.base_height
            else:
                # Adjust height to fit width
                window_width = self.base_width
                window_height = int(self.base_width / aspect_ratio)
            
            self.screen = pygame.display.set_mode((window_width, window_height), pygame.RESIZABLE)
            self.current_width = window_width
            self.current_height = window_height
            self.is_fullscreen = False
            actual_ratio = self.current_width / self.current_height
            logging.info(f"Switched to windowed mode ({self.current_width}x{self.current_height}, aspect ratio: {actual_ratio:.3f}:1)")
            center_pygame_window(self.current_width, self.current_height)
        else:
            # Enter fullscreen with better scaling support
            display_info = pygame.display.Info()
            screen_width = display_info.current_w
            screen_height = display_info.current_h
            
            # For high DPI displays, we might need to use a different approach
            try:
                import ctypes
                user32 = ctypes.windll.user32
                
                # Get the actual monitor resolution (accounting for DPI scaling)
                real_width = user32.GetSystemMetrics(0)  # SM_CXSCREEN
                real_height = user32.GetSystemMetrics(1)  # SM_CYSCREEN
                
                # Calculate DPI scaling factor
                dpi = ctypes.windll.gdi32.GetDeviceCaps(ctypes.windll.user32.GetDC(0), 88)
                scale_factor = dpi / 96.0
                
                # Use appropriate fullscreen resolution
                # For scaled displays, sometimes using desktop coordinates works better
                if scale_factor > 1.0:
                    # Try using the desktop size first
                    desktop_sizes = pygame.display.get_desktop_sizes()
                    if desktop_sizes:
                        fullscreen_width = desktop_sizes[0][0]
                        fullscreen_height = desktop_sizes[0][1]
                    else:
                        fullscreen_width = real_width
                        fullscreen_height = real_height
                else:
                    fullscreen_width = screen_width
                    fullscreen_height = screen_height
                
                logging.info(f"Fullscreen resolution: {fullscreen_width}x{fullscreen_height} (scale: {scale_factor:.2f})")
                
            except Exception as e:
                logging.warning(f"Could not detect advanced display info, using fallback: {e}")
                fullscreen_width = screen_width
                fullscreen_height = screen_height
            
            # Try different fullscreen modes for better compatibility
            try:
                # First try standard fullscreen
                self.screen = pygame.display.set_mode((fullscreen_width, fullscreen_height), pygame.FULLSCREEN)
            except pygame.error as e:
                logging.warning(f"Standard fullscreen failed: {e}, trying desktop fullscreen")
                try:
                    # Fallback to desktop fullscreen (borderless windowed)
                    self.screen = pygame.display.set_mode((fullscreen_width, fullscreen_height), pygame.NOFRAME)
                except pygame.error as e2:
                    logging.warning(f"Desktop fullscreen failed: {e2}, using display info size")
                    # Final fallback
                    self.screen = pygame.display.set_mode((screen_width, screen_height), pygame.FULLSCREEN)
                    fullscreen_width = screen_width
                    fullscreen_height = screen_height
            
            self.current_width = fullscreen_width
            self.current_height = fullscreen_height
            self.is_fullscreen = True
            logging.info(f"Switched to fullscreen mode ({self.current_width}x{self.current_height})")
        
        # Update backgrounds and recreate buttons
        self.load_background()
        if self.current_screen == "main":
            self.create_main_buttons()
        elif self.current_screen == "attack":
            self.create_attack_buttons()
        elif self.current_screen == "spells":
            self.create_spell_buttons()
        elif self.current_screen == "saves":
            self.create_saves_buttons()
        elif self.current_screen == "actions":
            self.create_action_buttons()
        elif self.current_screen == "bag":
            self.create_bag_buttons()
        elif self.current_screen == "journal":
            self.create_journal_buttons()
    
    def create_main_buttons(self):
        """Create the main menu buttons"""
        self.buttons = []
        
        # Left side action buttons with muted colors
        button_data = [
            ("ATTACK", DANGER),
            ("ACTION", WARNING),
            ("SPELLS", (80, 60, 100)),    # Muted purple
            ("SAVE", SUCCESS),
            ("BAG", (70, 70, 70))         # Dark gray
        ]
        
        for i, (text, color) in enumerate(button_data):
            button = ModernButton(50, 150 + i * 90, 180, 60, text, color, self.ui_box_button_image)
            self.buttons.append(button)
        
        # Journal button (top right)
        journal_button = ModernButton(self.current_width - 230, 150, 180, 60, 'JOURNAL', (50, 45, 40), self.ui_box_button_image)
        self.buttons.append(journal_button)

        # World map button (below journal)
        world_map_button = ModernButton(self.current_width - 230, 220, 180, 60, 'WORLD MAP', (70, 75, 95), self.ui_box_button_image)
        self.buttons.append(world_map_button)
        
        # Rest buttons (bottom right, stacked vertically) - aligned with journal button right edge
        short_rest_button = ModernButton(self.current_width - 200, self.current_height - 140, 150, 45, 'SHORT REST', (80, 120, 80), self.ui_box_button_image)
        long_rest_button = ModernButton(self.current_width - 200, self.current_height - 85, 150, 45, 'LONG REST', (60, 100, 140), self.ui_box_button_image)
        self.buttons.append(short_rest_button)
        self.buttons.append(long_rest_button)
    
    def load_background(self):
        """Load and scale the background image and UI elements"""
        import os
        
        # Load main background image
        try:
            if os.path.exists(BACKGROUND_IMAGE):
                self.background_image = pygame.image.load(BACKGROUND_IMAGE)
                self.background_image = pygame.transform.scale(self.background_image, (self.current_width, self.current_height))
                logging.info(f"✓ Background image loaded successfully: {BACKGROUND_IMAGE}")
            else:
                logging.warning(f"✗ Background image not found: {BACKGROUND_IMAGE}")
                self.background_image = None
        except Exception as e:
            logging.error(f"✗ Could not load background image: {e}")
            logging.info("  Using solid color background instead")
            self.background_image = None
        
        # Load submenu background images
        submenu_backgrounds = {
            'attack': asset_path("attack_background.png"),
            'actions': asset_path("action_backround.png"),
            'spells': asset_path("spells_background.png"),
            'saves': asset_path("save_background.png"),
            'bag': asset_path("bag_background.png"),
            'journal': asset_path("journal_background.png")
        }
        
        self.submenu_backgrounds = {}
        for menu_name, bg_path in submenu_backgrounds.items():
            try:
                if os.path.exists(bg_path):
                    bg_image = pygame.image.load(bg_path)
                    bg_image = pygame.transform.scale(bg_image, (self.current_width, self.current_height))
                    self.submenu_backgrounds[menu_name] = bg_image
                    logging.info(f"✓ {menu_name.title()} background loaded successfully: {bg_path}")
                else:
                    logging.warning(f"✗ {menu_name.title()} background not found: {bg_path}")
                    self.submenu_backgrounds[menu_name] = None
            except Exception as e:
                logging.error(f"✗ Could not load {menu_name} background: {e}")
                logging.info(f"  Using main background instead for {menu_name}")
                self.submenu_backgrounds[menu_name] = None
        
        # Load UI box image
        try:
            if os.path.exists(UI_BOX_IMAGE):
                self.ui_box_image = pygame.image.load(UI_BOX_IMAGE)
                logging.info(f"✓ UI box image loaded successfully: {UI_BOX_IMAGE}")
            else:
                logging.warning(f"✗ UI box image not found: {UI_BOX_IMAGE}")
                self.ui_box_image = None
        except Exception as e:
            logging.error(f"✗ Could not load UI box image: {e}")
            logging.info("  Using drawn rectangles instead")
            self.ui_box_image = None
        
        # Load button UI box image
        try:
            if os.path.exists(UI_BOX_BUTTON_IMAGE):
                self.ui_box_button_image = pygame.image.load(UI_BOX_BUTTON_IMAGE)
                logging.info(f"✓ Button UI box image loaded successfully: {UI_BOX_BUTTON_IMAGE}")
            else:
                logging.warning(f"✗ Button UI box image not found: {UI_BOX_BUTTON_IMAGE}")
                self.ui_box_button_image = None
        except Exception as e:
            logging.error(f"✗ Could not load button UI box image: {e}")
            logging.info("  Using solid color buttons instead")
            self.ui_box_button_image = None
    
    def create_default_character(self):
        """Create default character data (Madea Blackthorn)"""
        return {
            "character_name": "Madea Blackthorn",
            "race": "Human",
            "char_class": "Sorcerer 1",
            "level": 1,
            "current_hp": 10,
            "max_hp": 10,
            "ac": 10,
            "base_ac": 10,
            "default_base_ac": 10,
            "inspiration": 1,
            "luck_points": 0,
            "shield_active": False,
            "mage_armor_active": False,
            "raven_form_active": False,
            "raven_form_uses_remaining": 1,
            "raven_form_max_uses": 1,
            "hit_dice_total": 4,
            "hit_dice_available": 4,
            "hit_dice_size": 6,
            "sorcery_points_max": 4,
            "current_sorcery_points": 4,
            "proficiency_bonus": 2,
            "stats": {
                "STR": {"value": 8, "modifier": -1},
                "DEX": {"value": 10, "modifier": 0},
                "CON": {"value": 14, "modifier": 2},
                "INT": {"value": 14, "modifier": 2},
                "WIS": {"value": 10, "modifier": 0},
                "CHA": {"value": 18, "modifier": 4}
            },
            "weapons": [
                {
                    "name": "Dagger",
                    "damage_dice": "1d4",
                    "damage_type": "piercing",
                    "attack_stat": "DEX",
                    "properties": ["finesse", "light", "thrown"],
                    "magic_bonus": 0,
                    "uses_dueling": False,
                    "two_handed": False
                }
            ],
            "fighting_styles": {},
            "save_proficiencies": ["CON", "CHA"],
            "death_saves": {
                "successes": 0,
                "failures": 0
            },
            "actions": {
                "raven_form": {
                    "name": "Raven Form",
                    "description": "Bonus Action: Transform into raven (1/short rest)",
                    "available": True,
                    "recharge": "short_rest",
                    "uses": 1,
                    "max_uses": 1
                }
            },
            "inventory": {
                "gear": [
                    "Dagger",
                    "Arcane Focus (Crystal)"
                ],
                "utility": [
                    "Herbalism Kit"
                ],
                "treasure": []
            },
            "coins": {
                "cp": 0,
                "sp": 0,
                "ep": 0,
                "gp": 10,
                "pp": 0
            },
            "journal": {
                "sessions": {
                    "Session 1": "Madea Blackthorn begins her studies in the shadowed halls of Madea University."
                },
                "current_session": "Session 1"
            },
            "characters": {},
            "current_character": None,
            "character_page": 0,
            "places": {},
            "current_place": None,
            "place_page": 0,
            "skills": [
                {"name": "Acrobatics", "stat": "DEX", "proficient": False, "modifier": 0},
                {"name": "Animal Handling", "stat": "WIS", "proficient": False, "modifier": 0},
                {"name": "Arcana", "stat": "INT", "proficient": True, "modifier": 4},
                {"name": "Athletics", "stat": "STR", "proficient": False, "modifier": -1},
                {"name": "Deception", "stat": "CHA", "proficient": True, "modifier": 6},
                {"name": "History", "stat": "INT", "proficient": False, "modifier": 2},
                {"name": "Insight", "stat": "WIS", "proficient": True, "modifier": 2},
                {"name": "Intimidation", "stat": "CHA", "proficient": False, "modifier": 4},
                {"name": "Investigation", "stat": "INT", "proficient": False, "modifier": 2},
                {"name": "Medicine", "stat": "WIS", "proficient": False, "modifier": 0},
                {"name": "Nature", "stat": "INT", "proficient": False, "modifier": 2},
                {"name": "Perception", "stat": "WIS", "proficient": False, "modifier": 0},
                {"name": "Performance", "stat": "CHA", "proficient": False, "modifier": 4},
                {"name": "Persuasion", "stat": "CHA", "proficient": False, "modifier": 4},
                {"name": "Religion", "stat": "INT", "proficient": False, "modifier": 2},
                {"name": "Sleight of Hand", "stat": "DEX", "proficient": False, "modifier": 0},
                {"name": "Stealth", "stat": "DEX", "proficient": True, "modifier": 2},
                {"name": "Survival", "stat": "WIS", "proficient": True, "modifier": 2}
            ],
            "feats_traits": [
                "Variant Human Traits: Resourceful, Skillful, Versatile",
                "Feat: Tough (+2 HP per level)",
                "Feat: Fey Touched (Bane & Misty Step 1/long rest)",
                "Sorcerer Origin: Eyes of the Dark",
                "Sorcerer Origin: Strength of the Grave"
            ],
            "spell_slots": {"1st": 2},
            "current_spell_slots": {"1st": 2},
            "druid_charm_person_used": False,
            "fey_bane_used": False,
            "fey_misty_step_used": False,
            "cantrips": ["Poison Spray", "Fire Bolt", "Mage Hand", "Infestation"],
            "spells": {
                "1st": ["Mage Armor", "Chromatic Orb", "Bane"],
                "2nd": ["Misty Step"]
            },
            "created_spell_slots": {}
        }
    
    def create_spell_data(self):
        """Create detailed spell data for damage calculations"""
        return {
            # Cantrips (no spell slots consumed)
            "Guidance": {
                "level": 0,
                "damage_dice": "1d4",
                "damage_type": "none",
                "has_damage": False,
                "description": (
                    "Divination cantrip\n"
                    "Casting Time: 1 action\n"
                    "Range: Touch\n"
                    "Components: V, S\n"
                    "Duration: Concentration, up to 1 minute\n\n"
                    "You touch one willing creature. Once before the spell ends, the target can roll a d4 and add "
                    "the number rolled to one ability check of its choice. The spell then ends."
                ),
                "spell_attack": False
            },
            "Mending": {
                "level": 0,
                "damage_dice": "",
                "damage_type": "none",
                "has_damage": False,
                "description": (
                    "Transmutation cantrip\n"
                    "Casting Time: 1 minute\n"
                    "Range: Touch\n"
                    "Components: V, S, M (two lodestones)\n"
                    "Duration: Instantaneous\n\n"
                    "This spell repairs a single break or tear in an object you touch, such as a broken chain link, "
                    "two halves of a broken key, a torn cloak, or a leaking wineskin. As long as the break or tear "
                    "is no larger than 1 foot in any dimension, you mend it, leaving no trace of the former damage. "
                    "This spell can physically repair a magic item or construct, but the spell cannot restore magic "
                    "to such an object."
                ),
                "spell_attack": False
            },
            "Poison Spray": {
                "level": 0,
                "damage_dice": "1d12",
                "damage_type": "poison",
                "has_damage": True,
                "description": (
                    "Conjuration cantrip\n"
                    "Casting Time: 1 action\n"
                    "Range: 10 feet\n"
                    "Components: V, S\n"
                    "Duration: Instantaneous\n\n"
                    "You extend your hand toward a creature you can see within range and project a puff of noxious "
                    "gas from your palm. The creature must succeed on a Constitution saving throw or take 1d12 "
                    "poison damage.\n\n"
                    "At Higher Levels. This spell's damage increases by 1d12 when you reach 5th level (2d12), 11th "
                    "level (3d12), and 17th level (4d12)."
                ),
                "spell_attack": False,
                "save_type": "CON"
            },
            "Fire Bolt": {
                "level": 0,
                "damage_dice": "1d10",
                "damage_type": "fire",
                "has_damage": True,
                "description": (
                    "Evocation cantrip\n"
                    "Casting Time: 1 action\n"
                    "Range: 120 feet\n"
                    "Components: V, S\n"
                    "Duration: Instantaneous\n\n"
                    "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against "
                    "the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell "
                    "ignites if it is not being worn or carried.\n\n"
                    "At Higher Levels. This spell's damage increases by 1d10 when you reach 5th level (2d10), 11th "
                    "level (3d10), and 17th level (4d10)."
                ),
                "spell_attack": True
            },
            "Mage Hand": {
                "level": 0,
                "damage_dice": "",
                "damage_type": "none",
                "has_damage": False,
                "description": (
                    "Conjuration cantrip\n"
                    "Casting Time: 1 action\n"
                    "Range: 30 feet\n"
                    "Components: V, S\n"
                    "Duration: 1 minute\n\n"
                    "A spectral, floating hand appears at a point you choose within range. The hand lasts for the "
                    "duration or until you dismiss it as an action. The hand vanishes if it is ever more than 30 feet "
                    "away from you or if you cast this spell again.\n\n"
                    "You can use your action to control the hand. You can use the hand to manipulate an object, open "
                    "an unlocked door or container, stow or retrieve an item from an open container, or pour the "
                    "contents out of a vial. You can move the hand up to 30 feet each time you use it.\n\n"
                    "The hand cannot attack, activate magical items, or carry more than 10 pounds."
                ),
                "spell_attack": False
            },
            "Message": {
                "level": 0,
                "damage_dice": "",
                "damage_type": "none",
                "has_damage": False,
                "description": (
                    "Transmutation cantrip\n"
                    "Casting Time: 1 action\n"
                    "Range: 120 feet\n"
                    "Components: V, S, M (a short piece of copper wire)\n"
                    "Duration: 1 round\n\n"
                    "You point your finger toward a creature within range and whisper a message. The target (and only "
                    "the target) hears the message and can reply in a whisper that only you can hear.\n\n"
                    "You can cast this spell through solid objects if you are familiar with the target and know it is "
                    "beyond the barrier. Magical silence, 1 foot of stone, 1 inch of common metal, a thin sheet of "
                    "lead, or 3 feet of wood blocks the spell. The spell does not have to follow a straight line and "
                    "can travel freely around corners or through openings."
                ),
                "spell_attack": False
            },
            "Infestation": {
                "level": 0,
                "damage_dice": "1d6",
                "damage_type": "poison",
                "has_damage": True,
                "description": (
                    "Conjuration cantrip\n"
                    "Casting Time: 1 action\n"
                    "Range: 30 feet\n"
                    "Components: V, S, M (a living flea)\n"
                    "Duration: Instantaneous\n\n"
                    "You cause a cloud of mites, fleas, and other parasites to appear momentarily on one creature you "
                    "can see within range. The target must succeed on a Constitution saving throw, or it takes 1d6 "
                    "poison damage and moves 5 feet in a random direction if it can move and its speed is at least "
                    "5 feet. Roll a d4 for the direction: 1, north; 2, south; 3, east; or 4, west. This movement does "
                    "not provoke opportunity attacks, and if the direction rolled is blocked, the target does not "
                    "move.\n\n"
                    "At Higher Levels. The spell's damage increases by 1d6 when you reach 5th level (2d6), 11th "
                    "level (3d6), and 17th level (4d6)."
                ),
                "spell_attack": False,
                "save_type": "CON"
            },
            "Booming Blade": {
                "level": 0,
                "damage_dice": "1d8",
                "damage_type": "thunder",
                "has_damage": True,
                "description": "Weapon attack + thunder damage on movement",
                "spell_attack": False,
                "enhances_attack": True,
                "has_delayed_damage": True,
                "delayed_description": "Target takes thunder damage if it moves"
            },
            "Sword Burst": {
                "level": 0, 
                "damage_dice": "1d6",
                "damage_type": "force",
                "has_damage": True,
                "description": "5-foot radius, DEX save or take damage",
                "spell_attack": False
            },
            # 1st Level Spells
            "Charm Person": {
                "level": 1,
                "damage_dice": "",
                "damage_type": "none",
                "has_damage": False,
                "description": (
                    "1st-level enchantment\n"
                    "Casting Time: 1 action\n"
                    "Range: 30 feet\n"
                    "Components: V, S\n"
                    "Duration: 1 hour\n\n"
                    "You attempt to charm a humanoid you can see within range. It must make a Wisdom saving throw, "
                    "and it does so with advantage if you or your companions are fighting it. If it fails the saving "
                    "throw, it is charmed by you until the spell ends or until you or your companions do anything "
                    "harmful to it. The charmed creature regards you as a friendly acquaintance. When the spell ends, "
                    "the creature knows it was charmed by you."
                ),
                "spell_attack": False,
                "druid_free_cast": True,
                "free_cast_tracker": "druid_charm_person_used",
                "free_cast_label": "Druid Initiate (Charm Person)"
            },
            "Mage Armor": {
                "level": 1,
                "has_damage": False,
                "description": (
                    "1st-level abjuration\n"
                    "Casting Time: 1 action\n"
                    "Range: Touch\n"
                    "Components: V, S, M (a piece of cured leather)\n"
                    "Duration: 8 hours\n\n"
                    "You touch a willing creature who is not wearing armor, and a protective magical force surrounds "
                    "it until the spell ends. The target's base AC becomes 13 + its Dexterity modifier. The spell ends "
                    "if the target dons armor or if you dismiss the spell as an action."
                ),
                "spell_attack": False,
                "grants_mage_armor": True
            },
            "Chromatic Orb": {
                "level": 1,
                "damage_dice": "3d8",
                "damage_type": "variable",
                "has_damage": True,
                "description": (
                    "1st-level evocation\n"
                    "Casting Time: 1 action\n"
                    "Range: 90 feet\n"
                    "Components: V, S, M (a diamond worth at least 50 gp)\n"
                    "Duration: Instantaneous\n\n"
                    "You hurl a 4-inch-diameter sphere of energy at a creature that you can see within range. You "
                    "choose acid, cold, fire, lightning, poison, or thunder for the type of orb you create, and then "
                    "make a ranged spell attack against the target. If the attack hits, the creature takes 3d8 damage "
                    "of the type you chose.\n\n"
                    "At Higher Levels. When you cast this spell using a spell slot of 2nd level or higher, the damage "
                    "increases by 1d8 for each slot level above 1st."
                ),
                "spell_attack": True
            },
            "Bane": {
                "level": 1,
                "has_damage": False,
                "description": (
                    "1st-level enchantment\n"
                    "Casting Time: 1 action\n"
                    "Range: 30 feet\n"
                    "Components: V, S, M (a drop of blood)\n"
                    "Duration: Concentration, up to 1 minute\n\n"
                    "Up to three creatures of your choice that you can see within range must make Charisma saving "
                    "throws. Whenever a target that fails this saving throw makes an attack roll or a saving throw "
                    "before the spell ends, the target must roll a d4 and subtract the number rolled from the attack "
                    "roll or saving throw.\n\n"
                    "At Higher Levels. When you cast this spell using a spell slot of 2nd level or higher, you can "
                    "target one additional creature for each slot level above 1st."
                ),
                "spell_attack": False,
                "free_cast_tracker": "fey_bane_used",
                "free_cast_label": "Fey Touched (Bane)"
            },
            "Silvery Barbs": {
                "level": 1,
                "has_damage": False,
                "description": (
                    "1st-level enchantment\n"
                    "Casting Time: 1 reaction, which you take when a creature you can see within 60 feet of yourself "
                    "succeeds on an attack roll, an ability check, or a saving throw\n"
                    "Range: 60 feet\n"
                    "Components: V\n"
                    "Duration: Instantaneous\n\n"
                    "You magically distract the triggering creature and turn its momentary uncertainty into "
                    "encouragement for another creature. The triggering creature must reroll the d20 and use the "
                    "lower roll.\n\n"
                    "You can then choose a different creature you can see within range (you can choose yourself). "
                    "The chosen creature has advantage on the next attack roll, ability check, or saving throw it makes "
                    "within 1 minute. A creature can be empowered by only one use of this spell at a time."
                ),
                "spell_attack": False
            },
            "Thunderwave": {
                "level": 1,
                "damage_dice": "2d8",
                "damage_type": "thunder", 
                "has_damage": True,
                "description": (
                    "1st-level evocation\n"
                    "Casting Time: 1 action\n"
                    "Range: Self (15-foot cube)\n"
                    "Components: V, S\n"
                    "Duration: Instantaneous\n\n"
                    "A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube originating from "
                    "you must make a Constitution saving throw. On a failed save, a creature takes 2d8 thunder damage "
                    "and is pushed 10 feet away from you. On a successful save, the creature takes half as much "
                    "damage and is not pushed.\n\n"
                    "In addition, unsecured objects that are completely within the area of effect are automatically "
                    "pushed 10 feet away from you by the spell's effect, and the spell emits a thunderous boom audible "
                    "out to 300 feet.\n\n"
                    "At Higher Levels. When you cast this spell using a spell slot of 2nd level or higher, the damage "
                    "increases by 1d8 for each slot level above 1st."
                ),
                "spell_attack": False,
                "save_type": "CON"
            },
            "Magic Missile": {
                "level": 1,
                "damage_dice": "1d4+1",
                "damage_type": "force",
                "has_damage": True, 
                "description": (
                    "1st-level evocation\n"
                    "Casting Time: 1 action\n"
                    "Range: 120 feet\n"
                    "Components: V, S\n"
                    "Duration: Instantaneous\n\n"
                    "You create three glowing darts of magical force. Each dart hits a creature of your choice that "
                    "you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike "
                    "simultaneously, and you can direct them to hit one creature or several.\n\n"
                    "At Higher Levels. When you cast this spell using a spell slot of 2nd level or higher, the spell "
                    "creates one more dart for each slot level above 1st."
                ),
                "spell_attack": False
            },
            "Absorb Elements": {
                "level": 1,
                "damage_dice": "1d6",
                "damage_type": "variable",
                "has_damage": True,
                "description": (
                    "1st-level abjuration\n"
                    "Casting Time: 1 reaction, which you take when you take acid, cold, fire, lightning, or thunder "
                    "damage\n"
                    "Range: Self\n"
                    "Components: S\n"
                    "Duration: 1 round\n\n"
                    "The spell captures some of the incoming energy, lessening its effect on you and storing it for "
                    "your next melee attack. You have resistance to the triggering damage type until the start of your "
                    "next turn. Also, the first time you hit with a melee attack on your next turn, the target takes "
                    "an extra 1d6 damage of the triggering type, and the spell ends.\n\n"
                    "At Higher Levels. When you cast this spell using a spell slot of 2nd level or higher, the extra "
                    "damage increases by 1d6 for each slot level above 1st."
                ),
                "spell_attack": False,
                "has_delayed_damage": True,
                "delayed_description": "Next melee attack deals extra damage"
            },
            "Shield": {
                "level": 1,
                "has_damage": False,
                "description": (
                    "1st-level abjuration\n"
                    "Casting Time: 1 reaction, which you take when you are hit by an attack or targeted by the magic "
                    "missile spell\n"
                    "Range: Self\n"
                    "Components: V, S\n"
                    "Duration: 1 round\n\n"
                    "An invisible barrier of magical force appears and protects you. Until the start of your next "
                    "turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage "
                    "from magic missile."
                ),
                "activates_shield": True
            },
            # 2nd Level Spells  
            "Shatter": {
                "level": 2,
                "damage_dice": "3d8", 
                "damage_type": "thunder",
                "has_damage": True,
                "description": (
                    "2nd-level evocation\n"
                    "Casting Time: 1 action\n"
                    "Range: 60 feet\n"
                    "Components: V, S, M (a chip of mica)\n"
                    "Duration: Instantaneous\n\n"
                    "A sudden loud ringing noise, painfully intense, erupts from a point of your choice within range. "
                    "Each creature in a 10-foot-radius sphere centered on that point must make a Constitution saving "
                    "throw. A creature takes 3d8 thunder damage on a failed save, or half as much damage on a "
                    "successful one. A creature made of inorganic material such as stone, crystal, or metal has "
                    "disadvantage on this saving throw.\n\n"
                    "A nonmagical object that is not being worn or carried also takes the damage if it is in the "
                    "spell's area.\n\n"
                    "At Higher Levels. When you cast this spell using a spell slot of 3rd level or higher, the damage "
                    "increases by 1d8 for each slot level above 2nd."
                ),
                "spell_attack": False,
                "save_type": "CON"
            },
            "Aganazzar's Scorcher": {
                "level": 2,
                "damage_dice": "3d8",
                "damage_type": "fire",
                "has_damage": True,
                "description": (
                    "2nd-level evocation\n"
                    "Casting Time: 1 action\n"
                    "Range: 30 feet\n"
                    "Components: V, S, M (a red dragon's scale)\n"
                    "Duration: Instantaneous\n\n"
                    "A line of roaring flame 30 feet long and 5 feet wide emanates from you in a direction you choose. "
                    "Each creature in the line must make a Dexterity saving throw. A creature takes 3d8 fire damage on "
                    "a failed save, or half as much damage on a successful one.\n\n"
                    "At Higher Levels. When you cast this spell using a spell slot of 3rd level or higher, the damage "
                    "increases by 1d8 for each slot level above 2nd."
                ),
                "spell_attack": False,
                "save_type": "DEX"
            },
            "Darkness": {
                "level": 2,
                "has_damage": False,
                "description": (
                    "2nd-level evocation\n"
                    "Casting Time: 1 action\n"
                    "Range: 60 feet\n"
                    "Components: V, M (bat fur and a drop of pitch or piece of coal)\n"
                    "Duration: Concentration, up to 10 minutes\n\n"
                    "Magical darkness spreads from a point you choose within range to fill a 15-foot radius sphere "
                    "for the duration. The darkness spreads around corners. A creature with darkvision cannot see "
                    "through this darkness, and nonmagical light cannot illuminate it.\n\n"
                    "If the point you choose is on an object you are holding or one that is not being worn or carried, "
                    "the darkness emanates from the object and moves with it. Completely covering the source of the "
                    "darkness with an opaque object blocks the darkness. If any of this spell's area overlaps with an "
                    "area of light created by a spell of 2nd level or lower, the spell that created the light is "
                    "dispelled."
                ),
                "spell_attack": False,
                "sorcery_point_cost": 2
            },
            "Misty Step": {
                "level": 2, 
                "has_damage": False,
                "description": (
                    "2nd-level conjuration\n"
                    "Casting Time: 1 bonus action\n"
                    "Range: Self\n"
                    "Components: V\n"
                    "Duration: Instantaneous\n\n"
                    "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you "
                    "can see."
                ),
                "free_cast_tracker": "fey_misty_step_used",
                "free_cast_label": "Fey Touched (Misty Step)"
            },
            "Web": {
                "level": 2,
                "has_damage": False,
                "description": (
                    "2nd-level conjuration\n"
                    "Casting Time: 1 action\n"
                    "Range: 60 feet\n"
                    "Components: V, S, M (a bit of spiderweb)\n"
                    "Duration: Concentration, up to 1 hour\n\n"
                    "You conjure a mass of thick, sticky webbing at a point of your choice within range. The webs fill "
                    "a 20-foot cube from that point for the duration. The webs are difficult terrain and lightly "
                    "obscure their area.\n\n"
                    "If the webs are not anchored between two solid masses (such as walls or trees) or layered across "
                    "a floor, wall, or ceiling, the conjured web collapses on itself, and the spell ends at the start "
                    "of your next turn. Webs layered over a flat surface have a depth of 5 feet.\n\n"
                    "Each creature that starts its turn in the webs or that enters them during its turn must make a "
                    "Dexterity saving throw. On a failed save, the creature is restrained as long as it remains in the "
                    "webs or until it breaks free. A creature restrained by the webs can use its action to make a "
                    "Strength check against your spell save DC. If it succeeds, it is no longer restrained.\n\n"
                    "The webs are flammable. Any 5-foot cube of webs exposed to fire burns away in 1 round, dealing "
                    "2d4 fire damage to any creature that starts its turn in the fire."
                ),
                "spell_attack": False
            },
            "Rime's Binding Ice": {
                "level": 2,
                "damage_dice": "3d8",
                "damage_type": "cold",
                "has_damage": True,
                "description": "30-foot cone, CON save or take cold damage and be hindered by ice (speed reduced to 0) for 1 minute",
                "spell_attack": False,
                "save_type": "CON"
            },
            "Warding Wind": {
                "level": 2,
                "has_damage": False,
                "description": (
                    "2nd-level evocation\n"
                    "Casting Time: 1 action\n"
                    "Range: Self\n"
                    "Components: V\n"
                    "Duration: Concentration, up to 10 minutes\n\n"
                    "A strong wind (20 miles per hour) blows around you in a 10-foot radius and moves with you, "
                    "remaining centered on you. The wind lasts for the spell's duration. It deafens you and other "
                    "creatures in its area, extinguishes unprotected flames, hedges out vapor, gas, and fog, and turns "
                    "the area into difficult terrain for creatures other than you. Attack rolls of ranged weapon "
                    "attacks made against creatures in the area have disadvantage."
                )
            },
            # 3rd-level spells
            "Fear": {
                "level": 3,
                "has_damage": False,
                "description": (
                    "3rd-level illusion\n"
                    "Casting Time: 1 action\n"
                    "Range: Self (30-foot cone)\n"
                    "Components: V, S, M (a white feather or the heart of a hen)\n"
                    "Duration: Concentration, up to 1 minute\n\n"
                    "You project a phantasmal image of a creature's worst fears. Each creature in a 30-foot cone must "
                    "succeed on a Wisdom saving throw or drop whatever it is holding and become frightened for the "
                    "duration.\n\n"
                    "While frightened by this spell, a creature must take the Dash action and move away from you by the "
                    "safest available route on each of its turns, unless there is nowhere to move. If the creature ends "
                    "its turn in a location where it doesn't have line of sight to you, the creature can make a Wisdom "
                    "saving throw. On a successful save, the spell ends for that creature."
                ),
                "spell_attack": False,
                "save_type": "WIS"
            },
            "Lightning Bolt": {
                "level": 3,
                "damage_dice": "8d6",
                "damage_type": "lightning",
                "has_damage": True,
                "description": (
                    "3rd-level evocation\n"
                    "Casting Time: 1 action\n"
                    "Range: Self (100-foot line)\n"
                    "Components: V, S, M (a bit of fur and a rod of amber, crystal, or glass)\n"
                    "Duration: Instantaneous\n\n"
                    "A stroke of lightning forming a line of 100 feet long and 5 feet wide blasts out from you in a "
                    "direction you choose. Each creature in the line must make a Dexterity saving throw. A creature "
                    "takes 8d6 lightning damage on a failed save, or half as much damage on a successful one.\n\n"
                    "The lightning ignites flammable objects in the area that aren't being worn or carried.\n\n"
                    "At Higher Levels: When you cast this spell using a spell slot of 4th level or higher, the damage "
                    "increases by 1d6 for each slot level above 3rd."
                ),
                "spell_attack": False,
                "save_type": "DEX"
            },
            # Metamagic options
            "Metamagic: Empowered Spell": {
                "level": -1,
                "has_damage": False,
                "description": (
                    "Cost 1 Sorcery Point\n\n"
                    "When you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage "
                    "dice up to your Charisma modifier (minimum of one), and you must use the new rolls.\n\n"
                    "You can use Empowered Spell even if you've already used a different Metamagic option during the "
                    "casting of the spell."
                ),
                "metamagic_cost": 1
            },
            "Metamagic: Quickened Spell": {
                "level": -1,
                "has_damage": False,
                "description": (
                    "Cost: 2 Sorcery Points\n\n"
                    "When you cast a spell that has a casting time of an action, you can spend 2 Sorcery Points to "
                    "change the casting time to a Bonus Action for this casting.\n\n"
                    "You can't modify a spell in this way if you've already cast a level 1+ spell on the current turn, "
                    "nor can you cast a level 1+ spell on this turn after modifying a spell in this way."
                ),
                "metamagic_cost": 2
            }
        }
    
    def load_character_data(self):
        """Load character data from JSON file"""
        try:
            if os.path.exists(SAVE_FILE):
                logging.info(f"Loading character data from {SAVE_FILE}")
                with open(SAVE_FILE, 'r') as f:
                    data = json.load(f)
                
                # Load all character data
                self.character_name = data.get("character_name", "Unknown Character")
                self.race = data.get("race", "Unknown")
                self.char_class = data.get("char_class", "Unknown")
                self.level = data.get("level", 1)
                self.current_hp = data.get("current_hp", 1)
                self.max_hp = data.get("max_hp", 1)
                self.ac = data.get("ac", 10)
                self.base_ac = data.get("base_ac", 10)
                self.default_base_ac = data.get("default_base_ac", self.base_ac)
                self.inspiration = data.get("inspiration", 0)  # Changed to integer
                self.luck_points = data.get("luck_points", 3)
                self.shield_active = data.get("shield_active", False)
                self.mage_armor_active = data.get("mage_armor_active", False)
                self.raven_form_active = data.get("raven_form_active", False)
                self.raven_form_max_uses = max(1, data.get("raven_form_max_uses", 1))
                self.raven_form_uses_remaining = data.get(
                    "raven_form_uses_remaining",
                    self.raven_form_max_uses
                )
                self.raven_form_uses_remaining = max(
                    0, min(self.raven_form_uses_remaining, self.raven_form_max_uses)
                )
                self.hit_dice_total = max(1, data.get("hit_dice_total", self.level))
                self.hit_dice_size = data.get("hit_dice_size", 6)
                self.hit_dice_available = data.get("hit_dice_available", self.hit_dice_total)
                self.hit_dice_available = max(0, min(self.hit_dice_available, self.hit_dice_total))
                self.sorcery_points_max = max(1, data.get("sorcery_points_max", 4))
                self.current_sorcery_points = data.get("current_sorcery_points", self.sorcery_points_max)
                self.current_sorcery_points = max(0, min(self.current_sorcery_points, self.sorcery_points_max))
                self.proficiency_bonus = data.get("proficiency_bonus", 2)
                self.sorcerous_restoration_used = data.get("sorcerous_restoration_used", False)
                
                # Load stats
                self.stats = data.get("stats", {})
                
                # Load skills - convert from new format to old tuple format for compatibility
                skills_data = data.get("skills", [])
                self.skills = [(skill["name"], skill["stat"], skill["proficient"], skill["modifier"]) 
                              for skill in skills_data]
                
                # Load feats and traits
                self.feats_traits = data.get("feats_traits", [])
                
                # Load spell data
                self.spell_slots = data.get("spell_slots", {})
                self.current_spell_slots = data.get("current_spell_slots", self.spell_slots.copy())
                self.cantrips = data.get("cantrips", [])
                self.spells = data.get("spells", {})
                self.druid_charm_person_used = data.get("druid_charm_person_used", False)
                self.fey_bane_used = data.get("fey_bane_used", False)
                self.fey_misty_step_used = data.get("fey_misty_step_used", False)
                
                # Ensure spell slots are properly loaded
                logging.info(f"Loaded spell slots: {self.spell_slots}")
                logging.info(f"Loaded current spell slots: {self.current_spell_slots}")
                
                # Load weapons and fighting styles
                self.weapons = data.get("weapons", [])
                self.fighting_styles = data.get("fighting_styles", {})
                
                # Load save proficiencies and death saves
                self.save_proficiencies = data.get("save_proficiencies", [])
                self.death_saves = data.get("death_saves", {"successes": 0, "failures": 0})
                
                # Load action data
                self.actions = data.get("actions", {})
                raven_action = self.actions.get("raven_form")
                if not raven_action:
                    raven_action = {
                        "name": "Raven Form",
                        "description": "Bonus Action: Transform into raven (1/short rest)",
                        "available": True,
                        "recharge": "short_rest",
                    }
                    self.actions["raven_form"] = raven_action
                raven_action["uses"] = self.raven_form_uses_remaining
                raven_action["max_uses"] = self.raven_form_max_uses
                raven_action["available"] = self.raven_form_active or self.raven_form_uses_remaining > 0
                
                # Load inventory and coins
                inventory_data = data.get("inventory", {})
                if isinstance(inventory_data, list):
                    # Convert old list format to new dict format
                    self.inventory = {
                        "gear": inventory_data[:4] if len(inventory_data) > 4 else inventory_data,
                        "utility": inventory_data[4:6] if len(inventory_data) > 6 else [],
                        "treasure": inventory_data[6:] if len(inventory_data) > 6 else []
                    }
                else:
                    # Use new dict format
                    self.inventory = {
                        "gear": inventory_data.get("gear", []),
                        "utility": inventory_data.get("utility", []),
                        "treasure": inventory_data.get("treasure", [])
                    }
                self.coins = data.get("coins", {"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0})
                self.created_spell_slots = data.get("created_spell_slots", {})
                
                # Load journal data
                self.journal = data.get("journal", {"sessions": {}, "current_session": "Session 1"})
                self.current_journal_session = self.journal.get("current_session", "Session 1")
                
                # Load character tracking data
                self.characters = data.get("characters", {})
                self.places = data.get("places", {})
                self.current_character = data.get("current_character", None)
                self.current_place = data.get("current_place", None)
                self.character_page = data.get("character_page", 0)
                self.place_page = data.get("place_page", 0)
                
                # If weapons or fighting styles are missing, add defaults
                if not self.weapons or not self.fighting_styles:
                    logging.info("Adding missing weapon/fighting style data...")
                    default_data = self.create_default_character()
                    if not self.weapons:
                        self.weapons = default_data["weapons"]
                    if not self.fighting_styles:
                        self.fighting_styles = default_data["fighting_styles"]
                    
                    # Save the updated data
                    self.save_character_data()
                
                logging.info(f"Loaded character: {self.character_name}")
                logging.info(f"Weapons loaded: {len(self.weapons)}")
                logging.info(f"Fighting styles: {self.fighting_styles}")

                if not hasattr(self, "default_base_ac"):
                    self.default_base_ac = self.base_ac
                if not hasattr(self, "mage_armor_active"):
                    self.mage_armor_active = False
                if not hasattr(self, "fey_bane_used"):
                    self.fey_bane_used = False
                if not hasattr(self, "fey_misty_step_used"):
                    self.fey_misty_step_used = False

                self.recalculate_ac()
                
            else:
                # No save file exists, create default character
                logging.info("No save file found, creating default character...")
                default_data = self.create_default_character()
                
                # Load default data
                self.character_name = default_data["character_name"]
                self.race = default_data["race"]
                self.char_class = default_data["char_class"]
                self.level = default_data["level"]
                self.current_hp = default_data["current_hp"]
                self.max_hp = default_data["max_hp"]
                self.ac = default_data["ac"]
                self.base_ac = default_data["base_ac"]
                self.default_base_ac = default_data.get("default_base_ac", self.base_ac)
                self.inspiration = default_data["inspiration"]
                self.luck_points = default_data.get("luck_points", 3)
                self.shield_active = default_data["shield_active"]
                self.mage_armor_active = default_data.get("mage_armor_active", False)
                self.raven_form_active = default_data.get("raven_form_active", False)
                self.raven_form_max_uses = max(1, default_data.get("raven_form_max_uses", 1))
                self.raven_form_uses_remaining = default_data.get(
                    "raven_form_uses_remaining",
                    self.raven_form_max_uses
                )
                self.raven_form_uses_remaining = max(
                    0, min(self.raven_form_uses_remaining, self.raven_form_max_uses)
                )
                self.hit_dice_total = default_data.get("hit_dice_total", max(1, self.level))
                self.hit_dice_size = default_data.get("hit_dice_size", 6)
                self.hit_dice_available = default_data.get("hit_dice_available", self.hit_dice_total)
                self.hit_dice_available = max(0, min(self.hit_dice_available, self.hit_dice_total))
                self.sorcery_points_max = default_data.get("sorcery_points_max", 4)
                self.current_sorcery_points = default_data.get("current_sorcery_points", self.sorcery_points_max)
                self.current_sorcery_points = max(0, min(self.current_sorcery_points, self.sorcery_points_max))
                self.proficiency_bonus = default_data["proficiency_bonus"]
                self.stats = default_data["stats"]
                
                # Convert skills to tuple format
                self.skills = [(skill["name"], skill["stat"], skill["proficient"], skill["modifier"]) 
                              for skill in default_data["skills"]]
                
                self.feats_traits = default_data["feats_traits"]
                self.spell_slots = default_data["spell_slots"]
                self.current_spell_slots = default_data["current_spell_slots"]
                self.druid_charm_person_used = default_data.get("druid_charm_person_used", False)
                self.fey_bane_used = default_data.get("fey_bane_used", False)
                self.fey_misty_step_used = default_data.get("fey_misty_step_used", False)
                self.cantrips = default_data["cantrips"]
                self.spells = default_data["spells"]
                self.weapons = default_data["weapons"]
                self.fighting_styles = default_data["fighting_styles"]
                
                # Load save proficiencies and death saves
                self.save_proficiencies = default_data["save_proficiencies"]
                self.death_saves = default_data["death_saves"]
                
                # Load action data
                self.actions = default_data["actions"]
                raven_action = self.actions.get("raven_form", {})
                raven_action["uses"] = self.raven_form_uses_remaining
                raven_action["max_uses"] = self.raven_form_max_uses
                raven_action["available"] = self.raven_form_active or self.raven_form_uses_remaining > 0
                raven_action.setdefault("name", "Raven Form")
                raven_action.setdefault("description", "Bonus Action: Transform into raven (1/short rest)")
                raven_action.setdefault("recharge", "short_rest")
                self.actions["raven_form"] = raven_action
                
                # Load inventory and coins
                self.inventory = default_data["inventory"]
                self.coins = default_data["coins"]
                self.created_spell_slots = default_data.get("created_spell_slots", {})
                
                # Load journal data
                self.journal = default_data["journal"]
                self.current_journal_session = self.journal.get("current_session", "Session 1")
                
                # Load character tracking data
                self.characters = default_data.get("characters", {})
                self.places = default_data.get("places", {})
                self.current_character = default_data.get("current_character", None)
                self.current_place = default_data.get("current_place", None)
                self.character_page = default_data.get("character_page", 0)
                self.place_page = default_data.get("place_page", 0)
                
                logging.info("Character data loaded successfully from file")
                self.recalculate_ac()
                
        except Exception as e:
            logging.error(f"Error loading character data: {e}")
            logging.info("Creating default character...")
            # Fall back to default if there's an error
            default_data = self.create_default_character()
            # Load all the default data (same as above)
            self.character_name = default_data["character_name"]
            self.race = default_data["race"]
            self.char_class = default_data["char_class"]
            self.level = default_data["level"]
            self.current_hp = default_data["current_hp"]
            self.max_hp = default_data["max_hp"]
            self.ac = default_data["ac"]
            self.base_ac = default_data["base_ac"]
            self.default_base_ac = default_data.get("default_base_ac", self.base_ac)
            self.inspiration = default_data["inspiration"]
            self.luck_points = default_data.get("luck_points", 3)
            self.shield_active = default_data["shield_active"]
            self.mage_armor_active = default_data.get("mage_armor_active", False)
            self.raven_form_active = default_data.get("raven_form_active", False)
            self.raven_form_max_uses = max(1, default_data.get("raven_form_max_uses", 1))
            self.raven_form_uses_remaining = default_data.get(
                "raven_form_uses_remaining",
                self.raven_form_max_uses
            )
            self.raven_form_uses_remaining = max(
                0, min(self.raven_form_uses_remaining, self.raven_form_max_uses)
            )
            self.hit_dice_total = default_data.get("hit_dice_total", max(1, self.level))
            self.hit_dice_size = default_data.get("hit_dice_size", 6)
            self.hit_dice_available = default_data.get("hit_dice_available", self.hit_dice_total)
            self.hit_dice_available = max(0, min(self.hit_dice_available, self.hit_dice_total))
            self.sorcery_points_max = default_data.get("sorcery_points_max", 4)
            self.current_sorcery_points = default_data.get("current_sorcery_points", self.sorcery_points_max)
            self.current_sorcery_points = max(0, min(self.current_sorcery_points, self.sorcery_points_max))
            self.proficiency_bonus = default_data["proficiency_bonus"]
            self.stats = default_data["stats"]
            self.skills = [(skill["name"], skill["stat"], skill["proficient"], skill["modifier"]) 
                          for skill in default_data["skills"]]
            self.feats_traits = default_data["feats_traits"]
            self.spell_slots = default_data["spell_slots"]
            self.current_spell_slots = default_data["current_spell_slots"]
            self.druid_charm_person_used = default_data.get("druid_charm_person_used", False)
            self.fey_bane_used = default_data.get("fey_bane_used", False)
            self.fey_misty_step_used = default_data.get("fey_misty_step_used", False)
            self.cantrips = default_data["cantrips"]
            self.spells = default_data["spells"]
            self.weapons = default_data["weapons"]
            self.fighting_styles = default_data["fighting_styles"]
            
            # Load save proficiencies and death saves
            self.save_proficiencies = default_data["save_proficiencies"]
            self.death_saves = default_data["death_saves"]
            
            # Load action data
            self.actions = default_data["actions"]
            raven_action = self.actions.get("raven_form", {})
            raven_action["uses"] = self.raven_form_uses_remaining
            raven_action["max_uses"] = self.raven_form_max_uses
            raven_action["available"] = self.raven_form_active or self.raven_form_uses_remaining > 0
            raven_action.setdefault("name", "Raven Form")
            raven_action.setdefault("description", "Bonus Action: Transform into raven (1/short rest)")
            raven_action.setdefault("recharge", "short_rest")
            self.actions["raven_form"] = raven_action
            
            # Load inventory and coins
            self.inventory = default_data["inventory"]
            self.coins = default_data["coins"]
            self.created_spell_slots = default_data.get("created_spell_slots", {})
            
            # Load journal data
            self.journal = default_data["journal"]
            self.current_journal_session = self.journal.get("current_session", "Session 1")
            
            # Load character tracking data
            self.characters = default_data.get("characters", {})
            self.places = default_data.get("places", {})
            self.current_character = default_data.get("current_character", None)
            self.current_place = default_data.get("current_place", None)
            self.character_page = default_data.get("character_page", 0)
            self.place_page = default_data.get("place_page", 0)
            self.recalculate_ac()
    
    def save_character_data(self):
        """Save character data to JSON file"""
        try:
            if "raven_form" in self.actions:
                raven_action = self.actions["raven_form"]
                raven_action["uses"] = self.raven_form_uses_remaining
                raven_action["max_uses"] = self.raven_form_max_uses
                raven_action["available"] = self.raven_form_active or self.raven_form_uses_remaining > 0
            else:
                self.actions["raven_form"] = {
                    "name": "Raven Form",
                    "description": "Bonus Action: Transform into raven (1/short rest)",
                    "available": self.raven_form_active or self.raven_form_uses_remaining > 0,
                    "recharge": "short_rest",
                    "uses": self.raven_form_uses_remaining,
                    "max_uses": self.raven_form_max_uses
                }

            # Convert skills back to dictionary format for JSON
            skills_data = [
                {
                    "name": skill[0],
                    "stat": skill[1],
                    "proficient": skill[2],
                    "modifier": skill[3]
                }
                for skill in self.skills
            ]
            
            data = {
                "character_name": self.character_name,
                "race": self.race,
                "char_class": self.char_class,
                "level": self.level,
                "current_hp": self.current_hp,
                "max_hp": self.max_hp,
                "ac": self.ac,
                "base_ac": self.base_ac,
                "default_base_ac": self.default_base_ac,
                "inspiration": self.inspiration,
                "luck_points": self.luck_points,
                "shield_active": self.shield_active,
                "mage_armor_active": self.mage_armor_active,
                "raven_form_active": self.raven_form_active,
                "raven_form_uses_remaining": self.raven_form_uses_remaining,
                "raven_form_max_uses": self.raven_form_max_uses,
                "hit_dice_total": self.hit_dice_total,
                "hit_dice_available": self.hit_dice_available,
                "hit_dice_size": self.hit_dice_size,
                "sorcery_points_max": self.sorcery_points_max,
                "current_sorcery_points": self.current_sorcery_points,
                "proficiency_bonus": self.proficiency_bonus,
                "stats": self.stats,
                "skills": skills_data,
                "feats_traits": self.feats_traits,
                "spell_slots": self.spell_slots,
                "current_spell_slots": self.current_spell_slots,
                "created_spell_slots": self.created_spell_slots,
                "druid_charm_person_used": self.druid_charm_person_used,
                "fey_bane_used": self.fey_bane_used,
                "fey_misty_step_used": self.fey_misty_step_used,
                "sorcerous_restoration_used": self.sorcerous_restoration_used,
                "cantrips": self.cantrips,
                "spells": self.spells,
                "weapons": self.weapons,
                "fighting_styles": self.fighting_styles,
                "save_proficiencies": self.save_proficiencies,
                "death_saves": self.death_saves,
                "actions": self.actions,
                "inventory": self.inventory,
                "coins": self.coins,
                "journal": self.journal,
                "characters": self.characters,
                "current_character": self.current_character,
                "character_page": self.character_page,
                "places": self.places,
                "current_place": self.current_place,
                "place_page": self.place_page
            }
            
            # Write to file and explicitly flush
            with open(SAVE_FILE, 'w') as f:
                json.dump(data, f, indent=2)
                f.flush()  # Ensure data is written to disk
                os.fsync(f.fileno())  # Force write to disk
            
            logging.info(f"Character data saved successfully ({len(self.characters)} characters)")
            
        except Exception as e:
            logging.error(f"Error saving character data: {e}")
            import traceback
            logging.error(traceback.format_exc())
    
    def reload_spell_slots(self):
        """Force reload spell slots from JSON file"""
        try:
            if os.path.exists(SAVE_FILE):
                with open(SAVE_FILE, 'r') as f:
                    data = json.load(f)
                
                # Reload spell slot data
                self.spell_slots = data.get("spell_slots", {})
                self.current_spell_slots = data.get("current_spell_slots", self.spell_slots.copy())
                
                logging.info(f"Reloaded spell slots: {self.spell_slots}")
                logging.info(f"Reloaded current spell slots: {self.current_spell_slots}")
                return True
        except Exception as e:
            logging.error(f"Failed to reload spell slots: {e}")
            return False
    
    def toggle_inspiration(self, increment=True):
        """Increment or decrement inspiration count"""
        if increment:
            self.inspiration = min(10, self.inspiration + 1)
            logging.info(f"{self.character_name} gained inspiration! Now at {self.inspiration}")
        else:
            self.inspiration = max(0, self.inspiration - 1)
            logging.info(f"{self.character_name} used inspiration! Now at {self.inspiration}")
        
        # Auto-save after inspiration change
        self.save_character_data()
    
    def toggle_luck(self, increment=True):
        """Increment or decrement luck points"""
        if increment:
            self.luck_points = min(3, self.luck_points + 1)
            logging.info(f"{self.character_name} gained luck point! Now at {self.luck_points}")
        else:
            self.luck_points = max(0, self.luck_points - 1)
            logging.info(f"{self.character_name} used luck point! Now at {self.luck_points}")
        
        # Auto-save after luck change
        self.save_character_data()
    
    def toggle_shield(self):
        """Toggle Shield spell AC bonus."""
        self.shield_active = not self.shield_active
        self.recalculate_ac()
        if self.shield_active:
            logging.info(f"Shield spell activated - AC increased to {self.ac}")
        else:
            logging.info(f"Shield spell ended - AC returned to {self.ac}")
        self.save_character_data()
    
    def activate_raven_form(self, save=True):
        """Enter raven form if uses remain."""
        if self.raven_form_active:
            self.show_temp_overlay("Already in raven form.")
            return False
        if self.raven_form_uses_remaining <= 0:
            self.show_temp_overlay("No Raven Form uses remaining.")
            return False
        self.raven_form_active = True
        self.raven_form_uses_remaining -= 1
        if "raven_form" in self.actions:
            raven_action = self.actions["raven_form"]
            raven_action["uses"] = self.raven_form_uses_remaining
            raven_action["available"] = self.raven_form_active or self.raven_form_uses_remaining > 0
        logging.info("Raven Form activated.")
        self.show_temp_overlay("Transformed into a raven.")
        if save:
            self.save_character_data()
        return True
    
    def deactivate_raven_form(self, save=True):
        """Return to normal form."""
        if not self.raven_form_active:
            self.show_temp_overlay("Already in normal form.")
            return False
        self.raven_form_active = False
        if "raven_form" in self.actions:
            raven_action = self.actions["raven_form"]
            raven_action["available"] = self.raven_form_uses_remaining > 0
            raven_action["uses"] = self.raven_form_uses_remaining
        logging.info("Raven Form ended.")
        self.show_temp_overlay("Returned to normal form.")
        if save:
            self.save_character_data()
        return True
    
    def short_rest(self):
        """Begin a short rest by prompting for hit dice usage."""
        if self.short_rest_modal_open:
            return
        if self.hit_dice_available <= 0:
            self.show_temp_overlay("No hit dice remaining.")
            return
        self.short_rest_modal_open = True
        self.short_rest_input_text = ""
        self.short_rest_input_active = False
        self.short_rest_error_text = ""
        self.create_short_rest_modal_buttons()

    def finalize_short_rest(self):
        """Apply short rest resource recovery (excluding HP)."""
        actions_recharged = []
        for action_key, action_data in self.actions.items():
            if action_data.get("recharge") == "short_rest" and not action_data.get("available", True):
                action_data["available"] = True
                actions_recharged.append(action_data["name"])
        
        if self.raven_form_active:
            self.raven_form_active = False
            logging.info("- Raven Form ended (rest).")
        if self.raven_form_uses_remaining < self.raven_form_max_uses:
            old_uses = self.raven_form_uses_remaining
            self.raven_form_uses_remaining = self.raven_form_max_uses
            logging.info(f"- Raven Form uses refreshed ({old_uses} → {self.raven_form_uses_remaining})")
        if "raven_form" in self.actions:
            raven_action = self.actions["raven_form"]
            raven_action["uses"] = self.raven_form_uses_remaining
            raven_action["available"] = True
        
        if actions_recharged:
            logging.info(f"- Recharged actions: {', '.join(actions_recharged)}")
        
        if not self.sorcerous_restoration_used:
            recover_amount = self.level // 2
            if recover_amount > 0 and self.current_sorcery_points < self.sorcery_points_max:
                old_sp = self.current_sorcery_points
                self.current_sorcery_points = min(
                    self.sorcery_points_max,
                    self.current_sorcery_points + recover_amount
                )
                gained = self.current_sorcery_points - old_sp
                self.sorcerous_restoration_used = True
                logging.info(
                    f"- Sorcerous Restoration: recovered {gained} SP "
                    f"({old_sp} → {self.current_sorcery_points})"
                )
                self.show_temp_overlay(f"Sorcerous Restoration: +{gained} SP")
            elif self.current_sorcery_points >= self.sorcery_points_max:
                self.sorcerous_restoration_used = True
                logging.info("- Sorcerous Restoration: SP already full, marked as used.")
        
        logging.info("Short rest completed!")
        self.save_character_data()
        if self.current_screen == "actions":
            self.create_action_buttons()

    def create_short_rest_modal_buttons(self):
        """Create buttons for the short rest modal."""
        self.short_rest_recover_button = ModernButton(
            0, 0, 140, 46, "RECOVER", (80, 120, 80), self.ui_box_button_image
        )
        self.short_rest_cancel_button = ModernButton(
            0, 0, 120, 46, "CANCEL", (100, 100, 100), self.ui_box_button_image
        )

    def cancel_short_rest_modal(self):
        """Dismiss the short rest modal without taking a rest."""
        self.short_rest_modal_open = False
        self.short_rest_input_active = False
        self.short_rest_error_text = ""
        self.short_rest_recover_button = None
        self.short_rest_cancel_button = None
        self.short_rest_input_rect = None

    def confirm_short_rest_heal(self):
        """Roll hit dice entered in the modal and apply healing."""
        if not self.short_rest_modal_open:
            return
        dice_text = self.short_rest_input_text.strip()
        if not dice_text:
            self.short_rest_error_text = "Enter number of hit dice to roll."
            return
        if not dice_text.isdigit():
            self.short_rest_error_text = "Hit dice must be a positive number."
            return
        dice_count = int(dice_text)
        if dice_count <= 0:
            self.short_rest_error_text = "Hit dice must be greater than zero."
            return
        if dice_count > self.hit_dice_available:
            self.short_rest_error_text = f"Only {self.hit_dice_available} hit dice remaining."
            return

        dice_notation = f"{dice_count}d{self.hit_dice_size}"
        total, breakdown = self.roll_dice(dice_notation)
        healing = total
        old_hp = self.current_hp
        self.current_hp = min(self.max_hp, self.current_hp + healing)
        healed_amount = self.current_hp - old_hp
        self.hit_dice_available -= dice_count

        breakdown_text = ", ".join(str(part) for part in breakdown)
        logging.info(
            f"Short rest hit dice: {dice_notation} → {total} ({breakdown_text}). "
            f"HP {old_hp} → {self.current_hp}. Hit Dice remaining: {self.hit_dice_available}/{self.hit_dice_total}"
        )
        overlay_msg = f"Healed {healed_amount} HP (spent {dice_count}d{self.hit_dice_size})"
        self.show_temp_overlay(overlay_msg)

        self.cancel_short_rest_modal()
        self.finalize_short_rest()

    def handle_short_rest_modal_event(self, event):
        """Handle events while the short rest modal is open."""
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                self.cancel_short_rest_modal()
                return
            if event.key == pygame.K_RETURN:
                self.confirm_short_rest_heal()
                return
            if self.short_rest_input_active:
                if event.key == pygame.K_BACKSPACE:
                    self.short_rest_input_text = self.short_rest_input_text[:-1]
                    self.short_rest_error_text = ""
                else:
                    if event.unicode.isdigit() and len(self.short_rest_input_text) < 2:
                        self.short_rest_input_text += event.unicode
                        self.short_rest_error_text = ""
            else:
                if event.unicode.isdigit() and len(self.short_rest_input_text) < 2:
                    self.short_rest_input_text += event.unicode
                    self.short_rest_input_active = True
                    self.short_rest_error_text = ""
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1:
                if self.short_rest_input_rect and self.short_rest_input_rect.collidepoint(event.pos):
                    self.short_rest_input_active = True
                else:
                    self.short_rest_input_active = False

                if self.short_rest_recover_button:
                    click_type, clicked = self.short_rest_recover_button.handle_click(event.pos)
                    if click_type == "button" and clicked:
                        self.confirm_short_rest_heal()
                        return
                if self.short_rest_cancel_button:
                    click_type, clicked = self.short_rest_cancel_button.handle_click(event.pos)
                    if click_type == "button" and clicked:
                        self.cancel_short_rest_modal()
                        return

    def draw_short_rest_modal(self, screen):
        """Render the short rest modal overlay."""
        if not self.short_rest_modal_open:
            return
        overlay = pygame.Surface((self.current_width, self.current_height), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 180))
        screen.blit(overlay, (0, 0))

        modal_width = 420
        modal_height = 260
        x = (self.current_width - modal_width) // 2
        y = (self.current_height - modal_height) // 2
        content_top = self.draw_card(screen, x, y, modal_width, modal_height, "Short Rest", "center", 220)

        info_text = (
            f"Hit Dice: {self.hit_dice_total}d{self.hit_dice_size} "
            f"(Available {self.hit_dice_available}/{self.hit_dice_total})"
        )
        info_surface = self.text_font.render(info_text, True, TEXT_PRIMARY)
        screen.blit(info_surface, (x + 20, content_top + 10))

        prompt_surface = self.small_font.render("Enter hit dice to roll (d6):", True, TEXT_SECONDARY)
        screen.blit(prompt_surface, (x + 20, content_top + 46))

        input_rect = pygame.Rect(x + 20, content_top + 70, modal_width - 40, 38)
        self.short_rest_input_rect = input_rect
        if self.ui_box_image:
            input_box = pygame.transform.scale(self.ui_box_image, (input_rect.width, input_rect.height))
            alpha = 220 if self.short_rest_input_active else 160
            input_box.set_alpha(alpha)
            screen.blit(input_box, input_rect)
        else:
            input_surface = pygame.Surface((input_rect.width, input_rect.height), pygame.SRCALPHA)
            base_color = (30, 30, 35, 200)
            pygame.draw.rect(input_surface, base_color, (0, 0, input_rect.width, input_rect.height), border_radius=6)
            border_color = ACCENT if self.short_rest_input_active else BORDER
            pygame.draw.rect(input_surface, border_color, (0, 0, input_rect.width, input_rect.height), 2, border_radius=6)
            screen.blit(input_surface, input_rect)

        display_text = self.short_rest_input_text if self.short_rest_input_text else "0"
        text_color = TEXT_PRIMARY if self.short_rest_input_text else TEXT_SECONDARY
        text_surface = self.text_font.render(display_text, True, text_color)
        text_pos = (
            input_rect.x + 12,
            input_rect.y + (input_rect.height - text_surface.get_height()) // 2,
        )
        screen.blit(text_surface, text_pos)

        if self.short_rest_input_active:
            cursor_x = text_pos[0] + text_surface.get_width() + 2
            pygame.draw.line(
                screen,
                TEXT_PRIMARY,
                (cursor_x, input_rect.y + 6),
                (cursor_x, input_rect.y + input_rect.height - 6),
                2,
            )

        if self.short_rest_error_text:
            error_surface = self.small_font.render(self.short_rest_error_text, True, (200, 80, 80))
            screen.blit(error_surface, (x + 20, input_rect.bottom + 10))

        instructions = self.small_font.render("Recover adds the roll to your HP and completes the short rest.", True, TEXT_SECONDARY)
        screen.blit(instructions, (x + 20, y + modal_height - 96))

        button_y = y + modal_height - 70
        if self.short_rest_cancel_button:
            self.short_rest_cancel_button.rect.topleft = (x + 20, button_y)
            self.short_rest_cancel_button.handle_hover(pygame.mouse.get_pos())
            self.short_rest_cancel_button.draw(screen)
        if self.short_rest_recover_button:
            self.short_rest_recover_button.rect.topleft = (x + modal_width - self.short_rest_recover_button.rect.width - 20, button_y)
            self.short_rest_recover_button.handle_hover(pygame.mouse.get_pos())
            self.short_rest_recover_button.draw(screen)
    
    def long_rest(self):
        """Perform a long rest - restore all resources"""
        # Restore all HP
        hp_restored = self.max_hp - self.current_hp
        self.current_hp = self.max_hp
        
        # Restore all spell slots
        self.current_spell_slots = self.spell_slots.copy()
        self.created_spell_slots = {}
        self.current_sorcery_points = self.sorcery_points_max
        self.sorcery_slot_input_text = ""
        self.sorcery_slot_input_active = False
        self.hit_dice_available = self.hit_dice_total
        
        # Reset Druid Initiate free cast
        self.druid_charm_person_used = False
        self.fey_bane_used = False
        self.fey_misty_step_used = False
        self.sorcerous_restoration_used = False
        
        # Gain +1 inspiration (Insightful trait)
        old_inspiration = self.inspiration
        self.inspiration = min(10, self.inspiration + 1)
        
        # Reset Luck points
        self.luck_points = 3
        
        # Restore all actions (long rest recharges everything)
        actions_recharged = []
        for action_key, action_data in self.actions.items():
            if not action_data.get("available", True):
                action_data["available"] = True
                actions_recharged.append(action_data["name"])
        
        if self.raven_form_active:
            self.raven_form_active = False
            logging.info("- Raven Form ended (rest).")
        old_raven_uses = self.raven_form_uses_remaining
        self.raven_form_uses_remaining = self.raven_form_max_uses
        logging.info(f"- Raven Form uses refreshed ({old_raven_uses} → {self.raven_form_uses_remaining})")
        if "raven_form" in self.actions:
            raven_action = self.actions["raven_form"]
            raven_action["uses"] = self.raven_form_uses_remaining
            raven_action["available"] = True
        
        # Deactivate Shield if active
        if self.shield_active:
            self.ac = self.base_ac
            self.shield_active = False
        
        # Dismiss Mage Armor at the end of a long rest
        if self.mage_armor_active or self.base_ac != self.default_base_ac:
            self.deactivate_mage_armor(save=False)

        logging.info(f"Long rest completed!")
        logging.info(f"- Restored {hp_restored} HP to full ({self.max_hp})")
        logging.info(f"- Restored all spell slots")
        logging.info(f"- Reset limited-use spells (Charm Person, Bane, Misty Step)")
        logging.info(f"- Gained +1 inspiration (Insightful): {old_inspiration} → {self.inspiration}")
        logging.info(f"- Reset Luck points to 3")
        if actions_recharged:
            logging.info(f"- Recharged actions: {', '.join(actions_recharged)}")
        if hp_restored > 0 or any(self.current_spell_slots[level] < self.spell_slots[level] for level in self.spell_slots):
            logging.info("- All resources refreshed!")
        
        self.save_character_data()
    
    def handle_main_button_press(self, button_index):
        """Handle main menu button press actions"""
        if button_index >= len(self.buttons):
            return
            
        button_names = ['ATTACK', 'ACTION', 'SPELLS', 'SAVE', 'BAG', 'JOURNAL', 'WORLD MAP', 'SHORT REST', 'LONG REST']
        button_name = button_names[button_index] if button_index < len(button_names) else "UNKNOWN"
        
        if button_name == "ATTACK":
            self.switch_to_attack_menu()
        elif button_name == "ACTION":
            self.switch_to_action_menu()
        elif button_name == "SPELLS":
            self.switch_to_spell_menu()
        elif button_name == "SAVE":
            self.switch_to_saves_menu()
        elif button_name == "BAG":
            self.switch_to_bag_menu()
        elif button_name == "JOURNAL":
            self.switch_to_journal_menu()
        elif button_name == "WORLD MAP":
            self.open_world_map()
        elif button_name == "SHORT REST":
            self.short_rest()
        elif button_name == "LONG REST":
            self.long_rest()
        else:
            logging.info(f"{button_name} button pressed for {self.character_name}!")
    
    def open_world_map(self):
        """Launch the standalone world map viewer in a separate process."""
        viewer_path = os.path.join(BASE_DIR, "map_viewer.py")

        if not os.path.exists(viewer_path):
            logging.error(f"World map viewer not found at {viewer_path}")
            return

        # Reuse existing process if still running
        if self.map_viewer_process and self.map_viewer_process.poll() is None:
            logging.info("World map viewer is already running.")
            return

        try:
            self.map_viewer_process = subprocess.Popen(
                [sys.executable, viewer_path],
                cwd=BASE_DIR,
            )
            logging.info("Launched world map viewer.")
        except Exception as exc:
            logging.error(f"Failed to launch world map viewer: {exc}")

    def roll_dice(self, dice_notation):
        """Roll dice from notation like '1d20', '2d6+3', etc."""
        import random
        
        try:
            # Parse dice notation (e.g., "1d20+5" or "2d6")
            parts = dice_notation.lower().replace('-', '+-').split('+')
            total = 0
            rolls = []
            
            for part in parts:
                part = part.strip()
                if not part:
                    continue
                    
                if 'd' in part:
                    # It's a dice roll (e.g., "1d20", "2d6")
                    num_dice, die_size = part.split('d')
                    num_dice = int(num_dice) if num_dice else 1
                    die_size = int(die_size)
                    
                    dice_rolls = []
                    for _ in range(num_dice):
                        roll = random.randint(1, die_size)
                        dice_rolls.append(roll)
                        total += roll
                    
                    rolls.append(f"{num_dice}d{die_size}: {dice_rolls}")
                else:
                    # It's a modifier (e.g., "+5", "-2")
                    modifier = int(part)
                    total += modifier
                    if modifier >= 0:
                        rolls.append(f"+{modifier}")
                    else:
                        rolls.append(str(modifier))
            
            return total, rolls
            
        except Exception as e:
            logging.error(f"Error rolling dice '{dice_notation}': {e}")
            return 0, [f"Error: {dice_notation}"]
    
    def calculate_attack_bonus(self, weapon):
        """Calculate attack bonus for a weapon"""
        stat_modifier = self.stats[weapon["attack_stat"]]["modifier"]
        return stat_modifier + self.proficiency_bonus + weapon.get("magic_bonus", 0)
    
    def calculate_damage_bonus(self, weapon):
        """Calculate damage bonus for a weapon"""
        stat_modifier = self.stats[weapon["attack_stat"]]["modifier"]
        magic_bonus = weapon.get("magic_bonus", 0)
        dueling_bonus = 0
        
        # Add Dueling fighting style bonus if applicable
        if (weapon.get("uses_dueling", False) and 
            self.fighting_styles.get("dueling", False)):
            dueling_bonus = self.fighting_styles.get("dueling_bonus", 2)
        
        return stat_modifier + magic_bonus + dueling_bonus

    def recalculate_ac(self):
        """Recalculate current AC from base AC and active effects"""
        if self.shield_active:
            self.ac = self.base_ac + 5
        else:
            self.ac = self.base_ac

    def activate_mage_armor(self, save=True):
        """Activate Mage Armor, increasing base AC to at least 13"""
        target_base_ac = max(13, self.default_base_ac)
        self.base_ac = target_base_ac
        self.mage_armor_active = True
        self.recalculate_ac()
        logging.info(f"Mage Armor active - AC set to {self.ac} (base {self.base_ac})")
        if save:
            self.save_character_data()

    def deactivate_mage_armor(self, save=True):
        """Deactivate Mage Armor and return to default base AC"""
        if not self.mage_armor_active and self.base_ac == self.default_base_ac:
            logging.info("Mage Armor is already inactive.")
            return

        self.mage_armor_active = False
        self.base_ac = self.default_base_ac
        self.recalculate_ac()
        logging.info(f"Mage Armor dismissed - AC returned to {self.ac}")
        if save:
            self.save_character_data()

    def toggle_mage_armor(self, save=True):
        """Toggle Mage Armor state."""
        if self.mage_armor_active:
            self.deactivate_mage_armor(save=save)
        else:
            self.activate_mage_armor(save=save)
    
    def create_attack_buttons(self):
        """Create weapon selection buttons for attack menu"""
        self.attack_buttons = []
        
        for i, weapon in enumerate(self.weapons):
            color = DANGER if "Broadsword" in weapon["name"] else (100, 80, 60)
            # Make buttons larger and taller for multi-line text
            button = ModernButton(50, 150 + i * 80, 240, 65, weapon["name"], color, self.ui_box_button_image)
            self.attack_buttons.append(button)
        
        # Back button
        back_button = ModernButton(50, self.current_height - 100, 120, 50, "BACK", (70, 70, 70), self.ui_box_button_image)
        self.attack_buttons.append(back_button)
        
        # Attack and Damage roll buttons (only ATTACK ROLL has advantage)
        attack_roll_width = int(150 * 1.2)
        self.attack_action_buttons = [
            ModernButton(400, 500, attack_roll_width, 50, "ATTACK ROLL", DANGER, self.ui_box_button_image, has_advantage_checkbox=True),
            ModernButton(600, 500, 150, 50, "DAMAGE ROLL", WARNING, self.ui_box_button_image, has_advantage_checkbox=False)
        ]
    
    def build_spell_render_list(self):
        """Return ordered list of (spell_name, level) pairs for rendering."""
        spells = [(meta, -1) for meta in self.metamagic_spells]
        spells.extend((cantrip, 0) for cantrip in self.cantrips)

        def level_key(level_label):
            mapping = {
                "1st": 1,
                "2nd": 2,
                "3rd": 3,
                "4th": 4,
                "5th": 5,
                "6th": 6,
                "7th": 7,
                "8th": 8,
                "9th": 9,
            }
            return mapping.get(level_label, 99)

        for level_label in sorted(self.spells.keys(), key=level_key):
            level_value = level_key(level_label)
            for spell in self.spells.get(level_label, []):
                spells.append((spell, level_value))

        return spells
    
    def create_spell_buttons(self):
        """Create spell selection buttons for spell menu"""
        self.spell_buttons = []
        self.spell_button_lookup = []
        self.spell_scroll_offset = getattr(self, "spell_scroll_offset", 0)
        self.spell_button_spacing = 65
        self.spell_button_height = 55
        self.max_visible_spells = max(1, (self.current_height - 250) // self.spell_button_spacing)

        # Build ordered spell list (cantrips first, then leveled spells by level)
        all_spells = self.build_spell_render_list()

        total_spells = len(all_spells)
        self.total_spell_count = total_spells
        max_offset = max(0, total_spells - self.max_visible_spells)
        self.spell_scroll_offset = max(0, min(self.spell_scroll_offset, max_offset))
        visible_spells = all_spells[self.spell_scroll_offset:self.spell_scroll_offset + self.max_visible_spells]

        suffix_map = {1: "st", 2: "nd", 3: "rd"}

        for idx, (spell_name, level) in enumerate(visible_spells):
            if level == -1:
                color = (90, 140, 180)
                display_name = spell_name.replace("Metamagic: ", "") + " (Metamagic)"
            elif level == 0:
                color = (80, 60, 100)  # Purple for cantrips
                display_name = f"{spell_name} (Cantrip)"
            else:
                color = (60, 80, 100) if level == 1 else (100, 60, 80)
                suffix = suffix_map.get(level, "th")
                display_name = f"{spell_name} ({level}{suffix} Level)"

            button = ModernButton(
                50,
                150 + idx * self.spell_button_spacing,
                260,
                self.spell_button_height,
                display_name,
                color,
                self.ui_box_button_image,
            )
            button.spell_name = spell_name
            button.spell_level = level
            button.is_metamagic = level == -1
            if self.selected_spell == spell_name:
                button.selected = True
            self.spell_buttons.append(button)
            self.spell_button_lookup.append(spell_name)
        
        # Back button
        back_button = ModernButton(50, self.current_height - 100, 120, 50, "BACK", (70, 70, 70), self.ui_box_button_image)
        self.spell_buttons.append(back_button)
        
        # Cast spell button and delayed damage button (no advantage on spells)
        self.spell_action_buttons = [
            ModernButton(500, 500, 169, 50, "CAST SPELL", (100, 60, 140), self.ui_box_button_image, has_advantage_checkbox=False),
            ModernButton(650, 500, 169, 50, "DELAYED DMG", (140, 100, 60), self.ui_box_button_image, has_advantage_checkbox=False)
        ]
    
    def create_saves_buttons(self):
        """Create saving throw selection buttons for saves menu"""
        self.saves_buttons = []
        
        # Define all saving throws with colors
        save_data = [
            ("Strength", "STR", (150, 80, 80)),      # Red-ish
            ("Dexterity", "DEX", (80, 150, 80)),     # Green-ish
            ("Constitution", "CON", (120, 120, 150)), # Blue-ish
            ("Intelligence", "INT", (150, 120, 80)),  # Orange-ish
            ("Wisdom", "WIS", (120, 150, 120)),      # Light green
            ("Charisma", "CHA", (150, 80, 150))      # Purple-ish
        ]
        
        # Create buttons for each save
        for i, (full_name, short_name, color) in enumerate(save_data):
            proficient = short_name in self.save_proficiencies
            display_name = f"{full_name} Save"
            if proficient:
                display_name += " (Prof)"
            
            button = ModernButton(50, 150 + i * 70, 240, 55, display_name, color, self.ui_box_button_image)
            self.saves_buttons.append(button)
        
        # Back button
        back_button = ModernButton(50, self.current_height - 100, 120, 50, "BACK", (70, 70, 70), self.ui_box_button_image)
        self.saves_buttons.append(back_button)
        
        # Make save button (15% longer again) with advantage checkbox
        make_save_width = int(311 * 1.35)
        self.saves_action_buttons = [
            ModernButton(600, 500, make_save_width, 50, "MAKE SAVE", (120, 80, 150), self.ui_box_button_image, has_advantage_checkbox=True)
        ]
    
    def create_action_buttons(self):
        """Create action menu buttons"""
        self.action_buttons = []
        self.action_action_buttons = []
        
        # Back button
        back_button = ModernButton(50, self.current_height - 100, 120, 50, "BACK", (70, 70, 70), self.ui_box_button_image)
        self.action_buttons.append(back_button)
        
        # Action buttons on the left side - aligned with other submenus
        y_start = 150
        button_height = 70
        button_spacing = 90
        
        actions = list(self.actions.keys())
        for i, action_key in enumerate(actions):
            action_data = self.actions[action_key]
            y_pos = y_start + i * button_spacing
            
            button_text = action_data.get("name", action_key.replace('_', ' ').title())
            color = (80, 120, 80) if action_data.get("available", True) else (100, 100, 100)

            if action_key == "bladesong":
                if self.bladesong_active:
                    color = (120, 140, 200)
                    button_text = "Bladesong (Active)"
                else:
                    color = (80, 120, 80) if self.bladesong_uses_remaining > 0 else (100, 100, 100)
                    button_text = f"Bladesong ({self.bladesong_uses_remaining}/{self.bladesong_max_uses})"
            elif action_key == "raven_form":
                if self.raven_form_active:
                    color = (90, 130, 160)
                    button_text = "Raven Form (Active)"
                else:
                    ready = self.raven_form_uses_remaining > 0
                    color = (80, 120, 80) if ready else (100, 100, 100)
                    button_text = f"Raven Form ({self.raven_form_uses_remaining}/{self.raven_form_max_uses})"

            button = ModernButton(50, y_pos, 180, button_height, button_text, color, self.ui_box_button_image)
            if self.selected_action == action_key:
                button.selected = True
            self.action_buttons.append(button)
        
        # Action buttons (Use Action) - positioned below the info box
        if self.selected_action:
            action_data = self.actions.get(self.selected_action, {})
            button_label = "USE ACTION"
            button_color = (120, 80, 150)
            action_available = action_data.get("available", True)
            if self.selected_action == "bladesong":
                if self.bladesong_active:
                    button_label = "DEACTIVATE"
                    button_color = (120, 140, 200)
                    action_available = True
                else:
                    button_label = "ACTIVATE"
                    action_available = self.bladesong_uses_remaining > 0
                    button_color = (150, 100, 170) if action_available else (100, 100, 100)
            elif self.selected_action == "raven_form":
                if self.raven_form_active:
                    button_label = "RAVEN FORM ACTIVE"
                    button_color = (90, 130, 160)
                    action_available = False
                else:
                    button_label = "TRANSFORM"
                    action_available = self.raven_form_uses_remaining > 0
                    button_color = (150, 100, 170) if action_available else (100, 100, 100)
            else:
                button_color = (120, 80, 150) if action_available else (100, 100, 100)

            button_x = (self.current_width - 200) // 2
            button_y = 470
            use_button = ModernButton(button_x, button_y, 200, 50, button_label, button_color, self.ui_box_button_image)
            self.action_action_buttons.append(use_button)
    
    def create_bag_buttons(self):
        """Create bag menu buttons"""
        self.bag_buttons = []
        
        # Inventory type buttons on the left
        y_start = 150
        button_height = 60
        button_spacing = 80
        
        inventory_types = [
            ("GEAR", "gear"),
            ("UTILITY", "utility"), 
            ("TREASURE", "treasure")
        ]
        
        for i, (label, inv_type) in enumerate(inventory_types):
            y_pos = y_start + i * button_spacing
            color = (120, 80, 150) if inv_type == self.current_inventory_type else (70, 70, 70)
            button = ModernButton(50, y_pos, 140, button_height, label, color, self.ui_box_button_image)
            if inv_type == self.current_inventory_type:
                button.selected = True
            self.bag_buttons.append(button)
        
        # Back button
        back_button = ModernButton(50, self.current_height - 100, 120, 50, "BACK", (70, 70, 70), self.ui_box_button_image)
        self.bag_buttons.append(back_button)
    
    def create_journal_buttons(self):
        """Create journal menu buttons"""
        self.journal_buttons = []
        
        # Session buttons on the left
        y_start = 150
        button_height = 50
        button_spacing = 60
        
        sessions = list(self.journal.get("sessions", {}).keys())
        
        for i, session_name in enumerate(sessions):
            y_pos = y_start + i * button_spacing
            color = (120, 80, 150) if session_name == self.current_journal_session else (70, 70, 70)
            button = ModernButton(50, y_pos, 200, button_height, session_name, color, self.ui_box_button_image)
            if session_name == self.current_journal_session:
                button.selected = True
            self.journal_buttons.append(button)
        
        # Back button
        back_button = ModernButton(50, self.current_height - 100, 120, 50, "BACK", (70, 70, 70), self.ui_box_button_image)
        self.journal_buttons.append(back_button)
    
    def draw_attack_menu(self, screen):
        """Draw the attack submenu"""
        # Draw background
        if self.submenu_backgrounds.get('attack'):
            screen.blit(self.submenu_backgrounds['attack'], (0, 0))
        elif self.background_image:
            screen.blit(self.background_image, (0, 0))
        else:
            screen.fill(DARK_BG)
        
        # Title
        title = self.title_font.render("ATTACK MENU", True, TEXT_PRIMARY)
        title_rect = title.get_rect(center=(self.current_width // 2, 50))
        screen.blit(title, title_rect)
        
        # Draw weapon buttons
        for button in self.attack_buttons:
            button.draw(screen)
        
        # Draw weapon info box if a weapon is selected
        if self.selected_weapon:
            self.draw_weapon_info_box(screen)
        
        # Draw action buttons if weapon is selected
        if self.selected_weapon:
            for button in self.attack_action_buttons:
                button.draw(screen)
        
        # Draw roll results
        self.draw_roll_results(screen)
    
    def draw_spells_menu(self, screen):
        """Draw the spells submenu"""
        # Draw background
        if self.submenu_backgrounds.get('spells'):
            screen.blit(self.submenu_backgrounds['spells'], (0, 0))
        elif self.background_image:
            screen.blit(self.background_image, (0, 0))
        else:
            screen.fill(DARK_BG)
        
        # Title
        title = self.title_font.render("SPELL MENU", True, TEXT_PRIMARY)
        title_rect = title.get_rect(center=(self.current_width // 2, 50))
        screen.blit(title, title_rect)
        
        # Draw spell buttons
        for button in self.spell_buttons:
            button.draw(screen)
        
        total_spells = getattr(self, "total_spell_count", len(self.build_spell_render_list()))
        
        # Draw spell info box if a spell is selected
        if self.selected_spell:
            self.draw_spell_info_box(screen)
            spell_info = self.spell_data.get(self.selected_spell, {})
            metamagic_cost = spell_info.get("metamagic_cost")
            desired_label = "USE METAMAGIC" if metamagic_cost is not None else "CAST SPELL"
            if self.spell_action_buttons and self.spell_action_buttons[0].text != desired_label:
                self.spell_action_buttons[0].text = desired_label
                self.spell_action_buttons[0].text_lines = self.spell_action_buttons[0].split_text_for_button(desired_label)
        else:
            if self.spell_action_buttons and self.spell_action_buttons[0].text != "CAST SPELL":
                self.spell_action_buttons[0].text = "CAST SPELL"
                self.spell_action_buttons[0].text_lines = self.spell_action_buttons[0].split_text_for_button("CAST SPELL")
        
        if total_spells > self.max_visible_spells:
            scroll_text = "Mouse wheel to scroll spells"
            scroll_surface = self.small_font.render(scroll_text, True, TEXT_SECONDARY)
            screen.blit(scroll_surface, (60, self.current_height - 130))
        
        # Draw spell slots on the right
        self.draw_spell_slots(screen)
        
        # Draw action buttons if spell is selected
        if self.selected_spell:
            spell_info = self.spell_data[self.selected_spell]
            
            # Check if this spell has delayed damage
            has_delayed_damage = spell_info.get("has_delayed_damage", False)
            
            if has_delayed_damage:
                # Show both buttons - position them side by side
                self.spell_action_buttons[0].draw(screen)  # Cast Spell
                self.spell_action_buttons[1].draw(screen)  # Delayed DMG
            else:
                # Show only Cast Spell button - center it
                # Temporarily center the Cast Spell button
                info_box_center = self.current_width // 2
                button_width = 169
                centered_x = info_box_center - button_width // 2
                
                # Save original position
                original_x = self.spell_action_buttons[0].rect.x
                
                # Center the button
                self.spell_action_buttons[0].rect.x = centered_x
                self.spell_action_buttons[0].draw(screen)
                
                # Restore original position for next frame
                self.spell_action_buttons[0].rect.x = original_x
        
        # Draw spell damage results
        self.draw_spell_results(screen)
    
    def draw_saves_menu(self, screen):
        """Draw the saves submenu"""
        # Draw background
        if self.submenu_backgrounds.get('saves'):
            screen.blit(self.submenu_backgrounds['saves'], (0, 0))
        elif self.background_image:
            screen.blit(self.background_image, (0, 0))
        else:
            screen.fill(DARK_BG)
        
        # Title
        title = self.title_font.render("SAVING THROWS", True, TEXT_PRIMARY)
        title_rect = title.get_rect(center=(self.current_width // 2, 50))
        screen.blit(title, title_rect)
        
        # Draw save buttons
        for button in self.saves_buttons:
            button.draw(screen)
        
        # Draw save info box if a save is selected
        if self.selected_save:
            self.draw_save_info_box(screen)
        
        # Draw death saves on the right
        self.draw_death_saves(screen)
        
        # Draw action button if save is selected
        if self.selected_save:
            # Update button text to match selected save
            save_names = {
                "STR": "STRENGTH", "DEX": "DEXTERITY", "CON": "CONSTITUTION",
                "INT": "INTELLIGENCE", "WIS": "WISDOM", "CHA": "CHARISMA"
            }
            save_name = save_names.get(self.selected_save, self.selected_save)
            
            # Update button text
            old_text = self.saves_action_buttons[0].text
            self.saves_action_buttons[0].text = f"MAKE {save_name} SAVE"
            self.saves_action_buttons[0].text_lines = self.saves_action_buttons[0].split_text_for_button(self.saves_action_buttons[0].text)
            
            # Center the button
            info_box_center = self.current_width // 2
            button_width = self.saves_action_buttons[0].rect.width
            centered_x = info_box_center - button_width // 2
            
            # Save original position
            original_x = self.saves_action_buttons[0].rect.x
            
            # Center and draw the button
            self.saves_action_buttons[0].rect.x = centered_x
            self.saves_action_buttons[0].draw(screen)
            
            # Restore original position and text
            self.saves_action_buttons[0].rect.x = original_x
            self.saves_action_buttons[0].text = old_text
            self.saves_action_buttons[0].text_lines = self.saves_action_buttons[0].split_text_for_button(old_text)
        
        # Draw save results
        self.draw_save_results(screen)
    
    def draw_save_info_box(self, screen):
        """Draw the save information box in the center"""
        # Center the info box horizontally on screen
        width, height = 500, 300
        x = (self.current_width - width) // 2  # Center horizontally
        y = 150
        
        # Get save information
        save_names = {
            "STR": "Strength", "DEX": "Dexterity", "CON": "Constitution",
            "INT": "Intelligence", "WIS": "Wisdom", "CHA": "Charisma"
        }
        save_name = save_names.get(self.selected_save, self.selected_save)
        
        # Draw info card
        card_y = self.draw_card(screen, x, y, width, height, f"{save_name} Saving Throw", "center", 200)
        
        # Calculate save bonus
        stat_modifier = self.stats[self.selected_save]["modifier"]
        is_proficient = self.selected_save in self.save_proficiencies
        proficiency_bonus = self.proficiency_bonus if is_proficient else 0
        total_bonus = stat_modifier + proficiency_bonus
        
        # Save roll info
        save_text = f"Save Roll: 1d20 + {total_bonus}"
        save_surface = self.text_font.render(save_text, True, TEXT_PRIMARY)
        screen.blit(save_surface, (x + 20, card_y + 20))
        
        # Break down save bonus
        breakdown = f"({self.selected_save} {stat_modifier:+d}"
        if is_proficient:
            breakdown += f" + Prof {proficiency_bonus:+d}"
        breakdown += ")"
        breakdown_surface = self.small_font.render(breakdown, True, TEXT_SECONDARY)
        screen.blit(breakdown_surface, (x + 20, card_y + 45))
        
        # Proficiency status
        prof_text = "Proficient" if is_proficient else "Not Proficient"
        prof_color = SUCCESS if is_proficient else TEXT_SECONDARY
        prof_surface = self.text_font.render(prof_text, True, prof_color)
        screen.blit(prof_surface, (x + 20, card_y + 80))
        
        # Save description
        descriptions = {
            "STR": "Physical strength, athletic ability",
            "DEX": "Agility, reflexes, balance, poise",
            "CON": "Health, stamina, vital force",
            "INT": "Reasoning ability, memory, analytical thinking",
            "WIS": "Awareness, intuition, insight",
            "CHA": "Force of personality, leadership, confidence"
        }
        desc = descriptions.get(self.selected_save, "Saving throw")
        desc_surface = self.small_font.render(desc, True, TEXT_SECONDARY)
        screen.blit(desc_surface, (x + 20, card_y + 110))
        
        # Update save action button position to center it
        if self.saves_action_buttons:
            info_box_center = x + width // 2
            button_width = self.saves_action_buttons[0].rect.width
            save_button_x = info_box_center - button_width // 2
            self.saves_action_buttons[0].rect.x = save_button_x
    
    def wrap_text(self, text, font, max_width):
        """Wrap text to fit within max_width. Returns list of lines."""
        if not text:
            return [""]
        words = text.split(' ')
        lines = []
        current_line = ""
        for word in words:
            test_line = f"{current_line} {word}".strip()
            if font.size(test_line)[0] <= max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)
        return lines

    def wrap_text_paragraph(self, text, font, max_width):
        """Wrap multi-paragraph text preserving empty lines."""
        paragraphs = text.split('\n')
        wrapped = []
        for paragraph in paragraphs:
            if not paragraph.strip():
                wrapped.append("")
                continue
            wrapped.extend(self.wrap_text(paragraph, font, max_width))
        return wrapped
    
    def draw_spell_info_box(self, screen):
        """Draw the spell information box in the center"""
        if not self.selected_spell:
            return
        
        spell_info = self.spell_data.get(self.selected_spell)
        if not spell_info:
            return
        
        # Center the info box horizontally on screen (30% wider, 60% taller)
        width, height = 650, 480
        x = (self.current_width - width) // 2
        y = 150
        
        # Draw info card
        card_y = self.draw_card(screen, x, y, width, height, self.selected_spell, "center", 200)
        
        metamagic_cost = spell_info.get("metamagic_cost")
        spell_level = spell_info.get("level", 0)
        if metamagic_cost is not None:
            level_text = "Metamagic Option"
        elif spell_level == 0:
            level_text = "Cantrip"
        elif spell_level < 0:
            level_text = "Special"
        else:
            level_text = f"Level {spell_level} Spell"
        
        level_surface = self.text_font.render(level_text, True, TEXT_PRIMARY)
        screen.blit(level_surface, (x + 20, card_y + 20))
        current_y = card_y + 20 + level_surface.get_height() + 6
        
        if metamagic_cost is not None:
            point_label = "Sorcery Point" if metamagic_cost == 1 else "Sorcery Points"
            cost_text = f"Cost: {metamagic_cost} {point_label}"
            cost_surface = self.small_font.render(cost_text, True, ACCENT)
            screen.blit(cost_surface, (x + 20, current_y))
            current_y += self.small_font.get_height() + 6
        
        description = spell_info.get("description", "")
        description_lines = self.wrap_text_paragraph(description, self.small_font, width - 40)
        line_height = self.small_font.get_height()
        
        for line in description_lines:
            if not line:
                current_y += line_height // 2
                continue
            desc_surface = self.small_font.render(line, True, TEXT_SECONDARY)
            screen.blit(desc_surface, (x + 20, current_y))
            current_y += line_height + 2
        
        current_y += 10
        
        charisma_mod = self.stats.get("CHA", {}).get("modifier", 0)
        spell_attack_bonus = charisma_mod + self.proficiency_bonus
        spell_dc = 8 + spell_attack_bonus
        
        if spell_info.get("has_damage") and spell_info.get("damage_dice"):
            damage_type = spell_info.get("damage_type", "")
            type_suffix = f" {damage_type}" if damage_type else ""
            damage_text = f"Damage: {spell_info['damage_dice']}{type_suffix}"
            damage_surface = self.text_font.render(damage_text, True, TEXT_PRIMARY)
            screen.blit(damage_surface, (x + 20, current_y))
            current_y += self.text_font.get_height() + 4
        
        if spell_info.get("spell_attack"):
            attack_text = (
                f"Spell Attack: 1d20 + {spell_attack_bonus} "
                f"(CHA {charisma_mod:+d} + Prof {self.proficiency_bonus:+d})"
            )
            attack_surface = self.small_font.render(attack_text, True, TEXT_SECONDARY)
            screen.blit(attack_surface, (x + 20, current_y))
            current_y += line_height + 2
        
        save_type = spell_info.get("save_type")
        if save_type:
            save_text = (
                f"Save: {save_type.upper()} vs DC {spell_dc} "
                f"(8 + Prof {self.proficiency_bonus:+d} + CHA {charisma_mod:+d})"
            )
            save_surface = self.small_font.render(save_text, True, TEXT_SECONDARY)
            screen.blit(save_surface, (x + 20, current_y))
            current_y += line_height + 2
        
        if spell_info.get("has_delayed_damage"):
            delayed_desc = spell_info.get("delayed_description", "This spell has delayed damage.")
            delayed_surface = self.small_font.render(delayed_desc, True, TEXT_SECONDARY)
            screen.blit(delayed_surface, (x + 20, current_y))
            current_y += line_height + 2
        
        tracker = spell_info.get("free_cast_tracker")
        if not tracker and spell_info.get("druid_free_cast", False):
            tracker = "druid_charm_person_used"
        if tracker:
            used = getattr(self, tracker, False)
            label = spell_info.get("free_cast_label", "Free Cast")
            status_text = f"{label}: {'Used' if used else 'Available'}"
            status_color = TEXT_SECONDARY if used else SUCCESS
            status_surface = self.small_font.render(status_text, True, status_color)
            screen.blit(status_surface, (x + 20, current_y))
            current_y += line_height + 2

        if spell_info.get("grants_mage_armor"):
            armor_status = "Active" if self.mage_armor_active else "Inactive"
            armor_color = ACCENT if self.mage_armor_active else TEXT_SECONDARY
            armor_text = self.small_font.render(f"Mage Armor status: {armor_status}", True, armor_color)
            screen.blit(armor_text, (x + 20, current_y))
            current_y += line_height + 2
        
        # Update spell action button positions to sit just below the info box
        if self.spell_action_buttons:
            button_y = card_y + height + 20
            info_box_center = x + width // 2
            cast_button_width = self.spell_action_buttons[0].rect.width if len(self.spell_action_buttons) > 0 else 0
            delayed_button_width = self.spell_action_buttons[1].rect.width if len(self.spell_action_buttons) > 1 else 0
            button_spacing = 20
            
            for button in self.spell_action_buttons:
                button.rect.y = button_y
            
            if len(self.spell_action_buttons) > 0:
                cast_button_x = info_box_center - cast_button_width - button_spacing // 2
                self.spell_action_buttons[0].rect.x = cast_button_x
            if len(self.spell_action_buttons) > 1:
                delayed_button_x = info_box_center + button_spacing // 2
                self.spell_action_buttons[1].rect.x = delayed_button_x
    
    def draw_weapon_info_box(self, screen):
        """Draw the weapon information box in the center"""
        # Center the info box horizontally on screen
        width, height = 500, 300
        x = (self.current_width - width) // 2  # Center horizontally
        y = 150
        
        # Draw info card
        card_y = self.draw_card(screen, x, y, width, height, self.selected_weapon["name"], "center", 200)
        
        # Attack roll info
        attack_bonus = self.calculate_attack_bonus(self.selected_weapon)
        attack_text = f"Attack Roll: 1d20 + {attack_bonus}"
        attack_surface = self.text_font.render(attack_text, True, TEXT_PRIMARY)
        screen.blit(attack_surface, (x + 20, card_y + 20))
        
        # Break down attack bonus
        stat_mod = self.stats[self.selected_weapon["attack_stat"]]["modifier"]
        breakdown = f"({self.selected_weapon['attack_stat']} {stat_mod:+d} + Prof {self.proficiency_bonus:+d}"
        if self.selected_weapon.get("magic_bonus", 0):
            breakdown += f" + Magic {self.selected_weapon['magic_bonus']:+d}"
        breakdown += ")"
        breakdown_surface = self.small_font.render(breakdown, True, TEXT_SECONDARY)
        screen.blit(breakdown_surface, (x + 20, card_y + 45))
        
        # Damage roll info
        damage_bonus = self.calculate_damage_bonus(self.selected_weapon)
        damage_text = f"Damage Roll: {self.selected_weapon['damage_dice']}"
        if damage_bonus > 0:
            damage_text += f" + {damage_bonus}"
        elif damage_bonus < 0:
            damage_text += f" {damage_bonus}"
        damage_text += f" {self.selected_weapon['damage_type']}"
        
        damage_surface = self.text_font.render(damage_text, True, TEXT_PRIMARY)
        screen.blit(damage_surface, (x + 20, card_y + 80))
        
        # Break down damage bonus
        damage_breakdown = f"({self.selected_weapon['attack_stat']} {stat_mod:+d}"
        if self.selected_weapon.get("magic_bonus", 0):
            damage_breakdown += f" + Magic {self.selected_weapon['magic_bonus']:+d}"
        if self.selected_weapon.get("uses_dueling", False) and self.fighting_styles.get("dueling", False):
            dueling_bonus = self.fighting_styles.get("dueling_bonus", 2)
            damage_breakdown += f" + Dueling {dueling_bonus:+d}"
        damage_breakdown += ")"
        
        damage_breakdown_surface = self.small_font.render(damage_breakdown, True, TEXT_SECONDARY)
        screen.blit(damage_breakdown_surface, (x + 20, card_y + 105))
        
        # Weapon properties
        if self.selected_weapon.get("properties"):
            props_text = f"Properties: {', '.join(self.selected_weapon['properties'])}"
            props_surface = self.small_font.render(props_text, True, TEXT_SECONDARY)
            screen.blit(props_surface, (x + 20, card_y + 140))
        
        # Update attack/damage button positions to align with the info box
        info_box_center = x + width // 2
        button_spacing = 20
        attack_button_width = self.attack_action_buttons[0].rect.width if self.attack_action_buttons else 0
        damage_button_width = self.attack_action_buttons[1].rect.width if len(self.attack_action_buttons) > 1 else 0
        group_width = attack_button_width + button_spacing + damage_button_width
        start_x = info_box_center - group_width // 2
        
        # Position buttons centered under the info box
        attack_button_x = start_x
        damage_button_x = start_x + attack_button_width + button_spacing
        
        # Update button positions
        self.attack_action_buttons[0].rect.x = attack_button_x
        self.attack_action_buttons[1].rect.x = damage_button_x
    
    def draw_roll_results(self, screen):
        """Draw the results of attack and damage rolls"""
        y_pos = 580
        
        if self.last_attack_roll:
            total, breakdown = self.last_attack_roll
            attack_text = f"Attack Roll: {total}"
            attack_surface = self.text_font.render(attack_text, True, TEXT_PRIMARY)
            screen.blit(attack_surface, (self.attack_action_buttons[0].rect.x, y_pos))
            
            # Format breakdown properly without extra "+" signs
            breakdown_parts = []
            for part in breakdown:
                if isinstance(part, str) and (part.startswith('+') or part.startswith('-')):
                    breakdown_parts.append(part[1:] if part.startswith('+') else part)  # Remove leading "+"
                else:
                    breakdown_parts.append(str(part))
            
            breakdown_text = f"({' + '.join(breakdown_parts)})"
            breakdown_surface = self.small_font.render(breakdown_text, True, TEXT_SECONDARY)
            screen.blit(breakdown_surface, (self.attack_action_buttons[0].rect.x, y_pos + 25))
        
        if self.last_damage_roll:
            total, breakdown = self.last_damage_roll
            damage_text = f"Damage Roll: {total}"
            damage_surface = self.text_font.render(damage_text, True, TEXT_PRIMARY)
            screen.blit(damage_surface, (self.attack_action_buttons[1].rect.x, y_pos))
            
            # Format breakdown properly without extra "+" signs
            breakdown_parts = []
            for part in breakdown:
                if isinstance(part, str) and (part.startswith('+') or part.startswith('-')):
                    breakdown_parts.append(part[1:] if part.startswith('+') else part)  # Remove leading "+"
                else:
                    breakdown_parts.append(str(part))
            
            breakdown_text = f"({' + '.join(breakdown_parts)})"
            breakdown_surface = self.small_font.render(breakdown_text, True, TEXT_SECONDARY)
            screen.blit(breakdown_surface, (self.attack_action_buttons[1].rect.x, y_pos + 25))
    
    def handle_stat_clicks(self, pos):
        """Handle clicks on ability score cards for d20 rolls"""
        if not getattr(self, "stat_rects", None):
            return
        for stat_rect, stat_name, stat_data in self.stat_rects:
            if stat_rect.collidepoint(pos):
                modifier = stat_data.get("modifier", 0)
                roll_total, _ = self.roll_dice("1d20")
                total = roll_total + modifier
                ability_name = self.ABILITY_NAME_MAP.get(stat_name, stat_name)
                logging.info(f"{ability_name} check: {roll_total} + {modifier} = {total}")
                self.temp_overlay_text = f"{ability_name}: {roll_total} + {modifier} = {total}"
                self.temp_overlay_timer = pygame.time.get_ticks()
                break

    def get_spell_level_label(self, level: int) -> str:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(level, "th")
        return f"{level}{suffix}"

    def spell_slots_level_value(self, level_key: str) -> int:
        mapping = {
            "1st": 1,
            "2nd": 2,
            "3rd": 3,
            "4th": 4,
            "5th": 5,
            "6th": 6,
            "7th": 7,
            "8th": 8,
            "9th": 9,
        }
        return mapping.get(level_key, 99)

    def get_max_spell_slot_level(self) -> int:
        if not self.spell_slots:
            return 0
        return max(self.spell_slots_level_value(level) for level in self.spell_slots.keys())

    def parse_slot_level_input(self) -> Optional[int]:
        text = self.sorcery_slot_input_text.strip()
        if not text:
            return None
        if not text.isdigit():
            return None
        value = int(text)
        if 1 <= value <= 5:
            return value
        return None

    def convert_sorcery_points_to_slot(self, slot_level: int) -> bool:
        cost = self.SORCERY_CREATE_COSTS.get(slot_level)
        if cost is None:
            self.show_temp_overlay("Invalid slot level.")
            return False
        if self.current_sorcery_points < cost:
            self.show_temp_overlay("Not enough sorcery points.")
            return False

        level_label = self.get_spell_level_label(slot_level)
        base_slots = self.spell_slots.get(level_label, 0)
        current_slots = self.current_spell_slots.get(level_label, base_slots)

        self.current_sorcery_points -= cost
        self.current_spell_slots[level_label] = current_slots + 1
        self.created_spell_slots[level_label] = self.created_spell_slots.get(level_label, 0) + 1

        message = f"Created {level_label} slot (-{cost} SP)"
        logging.info(message)
        self.show_temp_overlay(message)
        self.save_character_data()
        self.create_spell_buttons()
        return True

    def convert_slot_to_sorcery_points(self, slot_level: int) -> bool:
        level_label = self.get_spell_level_label(slot_level)
        available = self.current_spell_slots.get(level_label, 0)
        if available <= 0:
            self.show_temp_overlay("No slots of that level.")
            return False
        if self.current_sorcery_points >= self.sorcery_points_max:
            self.show_temp_overlay("Sorcery points are full.")
            return False

        created_available = self.created_spell_slots.get(level_label, 0)
        if created_available > 0:
            if created_available == 1:
                self.created_spell_slots.pop(level_label, None)
            else:
                self.created_spell_slots[level_label] = created_available - 1

        self.current_spell_slots[level_label] = available - 1
        gain = slot_level
        previous_points = self.current_sorcery_points
        self.current_sorcery_points = max(0, min(self.current_sorcery_points + gain, self.sorcery_points_max))

        actual_gain = self.current_sorcery_points - previous_points
        message = f"Gained {actual_gain} SP (+{actual_gain})"
        logging.info(f"Converted {level_label} slot to sorcery points: {actual_gain} gained")
        self.show_temp_overlay(message)
        self.save_character_data()
        self.create_spell_buttons()
        return True

    def convert_sorcery_points_to_slot_from_input(self):
        slot_level = self.parse_slot_level_input()
        if slot_level is None:
            self.show_temp_overlay("Enter level 1-5.")
            return
        if self.convert_sorcery_points_to_slot(slot_level):
            self.sorcery_slot_input_text = ""

    def convert_slot_to_sorcery_from_input(self):
        slot_level = self.parse_slot_level_input()
        if slot_level is None:
            self.show_temp_overlay("Enter level 1-5.")
            return
        if self.convert_slot_to_sorcery_points(slot_level):
            self.sorcery_slot_input_text = ""

    def get_max_prepared_spells(self) -> int:
        """Sorcerers do not prepare spells; always return 0."""
        return 0
    
    def draw_spell_slots(self, screen):
        """Draw spell slot tracking and sorcery points on the right side"""
        x = self.current_width - 220
        y = 150
        
        card_height = 300
        card_y = self.draw_card(screen, x, y, 200, card_height, "Spell Slots", "center", 200)

        # Sorcery point indicator
        sp_title_surface = self.text_font.render("Sorcery Points", True, TEXT_PRIMARY)
        screen.blit(sp_title_surface, (x + 10, card_y + 8))

        sp_value_text = f"{self.current_sorcery_points}/{self.sorcery_points_max}"
        sp_value_surface = self.header_font.render(sp_value_text, True, TEXT_PRIMARY)
        screen.blit(sp_value_surface, (x + 10, card_y + 32))

        # Conversion controls
        input_width = 40
        input_height = 28
        input_y = card_y + 68
        input_x = x + (200 - input_width) // 2
        self.sorcery_slot_input_rect = pygame.Rect(input_x, input_y, input_width, input_height)

        if self.ui_box_image:
            input_image = pygame.transform.scale(self.ui_box_image, (input_width, input_height))
            input_image.set_alpha(220 if self.sorcery_slot_input_active else 150)
            screen.blit(input_image, (input_x, input_y))
            if self.sorcery_slot_input_active:
                pygame.draw.rect(screen, ACCENT_HOVER, self.sorcery_slot_input_rect, 2, border_radius=4)
        else:
            input_surface = pygame.Surface((input_width, input_height), pygame.SRCALPHA)
            border_color = ACCENT_HOVER if self.sorcery_slot_input_active else BORDER
            pygame.draw.rect(input_surface, (20, 20, 25, 180), (0, 0, input_width, input_height))
            pygame.draw.rect(input_surface, border_color, (0, 0, input_width, input_height), 2)
            screen.blit(input_surface, (input_x, input_y))

        if self.sorcery_slot_input_text:
            text_surface = self.text_font.render(self.sorcery_slot_input_text, True, TEXT_PRIMARY)
            text_rect = text_surface.get_rect(center=(input_x + input_width // 2, input_y + input_height // 2))
            screen.blit(text_surface, text_rect)

        # Conversion buttons
        use_width, create_width = 60, 70
        button_height = input_height
        use_x = input_x - use_width - 10
        create_x = input_x + input_width + 10

        if self.sorcery_use_button is None:
            self.sorcery_use_button = ModernButton(use_x, input_y, use_width, button_height, "USE", (90, 140, 180), self.ui_box_button_image)
        self.sorcery_use_button.rect.update(use_x, input_y, use_width, button_height)
        self.sorcery_use_button.draw(screen)

        if self.sorcery_create_button is None:
            self.sorcery_create_button = ModernButton(create_x, input_y, create_width, button_height, "CREATE", (120, 160, 120), self.ui_box_button_image)
        self.sorcery_create_button.rect.update(create_x, input_y, create_width, button_height)
        self.sorcery_create_button.draw(screen)

        slot_levels = set(self.spell_slots.keys())
        if self.created_spell_slots:
            slot_levels.update(self.created_spell_slots.keys())
        sorted_levels = sorted(slot_levels, key=self.spell_slots_level_value)

        current_y = input_y + button_height + 28
        slot_size = 15
        slots_per_row = 8
                
        for level in sorted_levels:
            max_slots = self.spell_slots.get(level, 0)
            remaining_slots = self.current_spell_slots.get(level, max_slots)
            created_slots = self.created_spell_slots.get(level, 0)

            level_text = f"{level} Level ({remaining_slots}/{max_slots}"
            if created_slots:
                level_text += f" +{created_slots}"
            level_text += ")"
            level_surface = self.text_font.render(level_text, True, TEXT_PRIMARY)
            screen.blit(level_surface, (x + 10, current_y))
            current_y += 28

            if max_slots > 0:
                for i in range(max_slots):
                    slot_x = x + 10 + (i % slots_per_row) * (slot_size + 3)
                    slot_y = current_y + (i // slots_per_row) * (slot_size + 3)
                    slot_color = (255, 165, 80) if i < min(remaining_slots, max_slots) else (60, 60, 60)
                    pygame.draw.circle(screen, slot_color, (slot_x + slot_size // 2, slot_y + slot_size // 2), slot_size // 2)
                    pygame.draw.circle(screen, TEXT_SECONDARY, (slot_x + slot_size // 2, slot_y + slot_size // 2), slot_size // 2, 1)
                rows = ((max_slots - 1) // slots_per_row) + 1
                current_y += rows * (slot_size + 3)
            current_y += 12

        prepared_count = len(self.prepared_spells)
        max_prepared = self.get_max_prepared_spells()
        if max_prepared:
            prepared_text = f"{prepared_count}/{max_prepared} Prepared"
        else:
            prepared_text = f"{prepared_count} Prepared"
        prepared_surface = self.text_font.render(prepared_text, True, TEXT_PRIMARY)
        screen.blit(prepared_surface, (x + 10, current_y))
        current_y += 28

        if self.auto_prepared_spells:
            auto_text = "Auto: " + ", ".join(self.auto_prepared_spells)
            auto_surface = self.small_font.render(auto_text, True, TEXT_SECONDARY)
            screen.blit(auto_surface, (x + 10, current_y))
    
    def draw_spell_results(self, screen):
        """Draw the results of spell damage rolls"""
        y_pos = 580
        
        if self.last_spell_damage_roll:
            total, breakdown = self.last_spell_damage_roll
            damage_text = f"Spell Damage: {total}"
            damage_surface = self.text_font.render(damage_text, True, TEXT_PRIMARY)
            
            if self.spell_action_buttons and self.selected_spell:
                # Determine button position based on whether delayed damage is shown
                spell_info = self.spell_data[self.selected_spell]
                has_delayed_damage = spell_info.get("has_delayed_damage", False)
                
                if has_delayed_damage:
                    # Use regular Cast Spell button position
                    result_x = self.spell_action_buttons[0].rect.x
                else:
                    # Use centered position like in the drawing
                    info_box_center = self.current_width // 2
                    button_width = 169
                    result_x = info_box_center - button_width // 2
                
                screen.blit(damage_surface, (result_x, y_pos))
                
                # Format breakdown properly without extra "+" signs
                breakdown_parts = []
                for part in breakdown:
                    if isinstance(part, str) and (part.startswith('+') or part.startswith('-')):
                        breakdown_parts.append(part[1:] if part.startswith('+') else part)
                    else:
                        breakdown_parts.append(str(part))
                
                breakdown_text = f"({' + '.join(breakdown_parts)})"
                breakdown_surface = self.small_font.render(breakdown_text, True, TEXT_SECONDARY)
                screen.blit(breakdown_surface, (result_x, y_pos + 25))
    
    def draw_card(self, screen, x, y, width, height, title="", title_align="left", transparency=180):
        """Draw a card using the UI box image with transparency"""
        if self.ui_box_image:
            # Scale the UI box to fit the card dimensions
            scaled_ui_box = pygame.transform.scale(self.ui_box_image, (width, height))
            
            # Create a surface with alpha for transparency
            card_surface = pygame.Surface((width, height), pygame.SRCALPHA)
            
            # Apply transparency to the UI box
            scaled_ui_box.set_alpha(transparency)
            card_surface.blit(scaled_ui_box, (0, 0))
            
            # Add a subtle shadow
            shadow_surface = pygame.Surface((width, height), pygame.SRCALPHA)
            pygame.draw.rect(shadow_surface, (0, 0, 0, 50), (0, 0, width, height), border_radius=12)
            screen.blit(shadow_surface, (x + 3, y + 3))
            
            # Blit the card to the main screen
            screen.blit(card_surface, (x, y))
        else:
            # Fallback to the old semi-transparent method
            card_surface = pygame.Surface((width, height), pygame.SRCALPHA)
            
            # Shadow (darker and more subtle)
            shadow_rect = pygame.Rect(2, 2, width, height)
            pygame.draw.rect(card_surface, SHADOW, shadow_rect, border_radius=12)
            
            # Card background with transparency
            card_rect = pygame.Rect(0, 0, width, height)
            pygame.draw.rect(card_surface, CARD_BG, card_rect, border_radius=12)
            pygame.draw.rect(card_surface, BORDER, card_rect, 2, border_radius=12)
            
            # Blit the card to the main screen
            screen.blit(card_surface, (x, y))
        
        # Title if provided
        if title:
            title_surface = self.header_font.render(title, True, TEXT_PRIMARY)
            if title_align == "center":
                title_x = x + (width - title_surface.get_width()) // 2
            else:  # left align
                title_x = x + 20
            screen.blit(title_surface, (title_x, y + 15))
            return y + 50  # Return Y position after title
        
        return y + 20
    
    def get_submenu_margins(self):
        """Calculate consistent margins for submenu layouts"""
        left_button_margin = 50
        button_width = 240
        content_start = left_button_margin + button_width + 40  # After buttons + gap
        right_margin = 50
        right_box_width = 220
        content_end = self.current_width - right_margin - right_box_width - 40
        content_width = content_end - content_start
        return {
            'left_margin': left_button_margin,
            'content_start': content_start,
            'content_width': content_width,
            'content_center': content_start + content_width // 2,
            'right_box_x': self.current_width - right_margin - right_box_width
        }
    
    def draw_character_header(self, screen):
        """Draw character name and basic info (center aligned)"""
        # Character name (center aligned)
        name_surface = self.title_font.render(self.character_name, True, TEXT_PRIMARY)
        name_x = (self.current_width - name_surface.get_width()) // 2
        screen.blit(name_surface, (name_x, 30))
        
        # Race and class (center aligned)
        info_text = f"{self.race} • {self.char_class}"
        info_surface = self.subheader_font.render(info_text, True, TEXT_SECONDARY)
        info_x = (self.current_width - info_surface.get_width()) // 2
        screen.blit(info_surface, (info_x, 75))
    
    def draw_health_display(self, screen):
        """Draw modern health display with UI box styling"""
        # Match skills box positioning exactly
        left_boundary = 320
        right_boundary = self.current_width - 320
        available_width = right_boundary - left_boundary
        card_width = available_width - 40  # Same padding as skills box
        
        # Calculate even spacing from borders (same as skills)
        side_padding = (available_width - card_width) // 2
        card_x = left_boundary + side_padding
        center_x = card_x + card_width // 2
        y = 130
        
        # Health card with UI box background - same width as skills box
        card_y = self.draw_card(screen, card_x, y, card_width, 120, "", "center", 200)
        
        # HP Input field using UI box - bigger size with larger font
        input_width = 100
        input_height = 30
        input_x = center_x - input_width // 2
        input_y = card_y + 5
        self.hp_input_rect = pygame.Rect(input_x, input_y, input_width, input_height)
        
        # Draw input field with UI box if available
        if self.ui_box_image:
            scaled_input_box = pygame.transform.scale(self.ui_box_image, (input_width, input_height))
            input_alpha = 220 if self.hp_input_active else 150
            scaled_input_box.set_alpha(input_alpha)
            screen.blit(scaled_input_box, (input_x, input_y))
            
            # Add border highlight if active
            if self.hp_input_active:
                pygame.draw.rect(screen, ACCENT_HOVER, self.hp_input_rect, 2, border_radius=4)
        else:
            # Fallback to old method
            input_surface = pygame.Surface((input_width, input_height), pygame.SRCALPHA)
            input_color = ACCENT_HOVER if self.hp_input_active else BORDER
            pygame.draw.rect(input_surface, (20, 20, 25, 180), (0, 0, input_width, input_height))
            pygame.draw.rect(input_surface, input_color, (0, 0, input_width, input_height), 2)
            screen.blit(input_surface, (input_x, input_y))
        
        # Input text with larger font
        display_text = self.hp_input_text if self.hp_input_text else "±0"
        text_color = TEXT_PRIMARY if self.hp_input_text else TEXT_SECONDARY
        input_text_surface = self.text_font.render(display_text, True, text_color)
        text_x = input_x + (input_width - input_text_surface.get_width()) // 2  # Center the text
        screen.blit(input_text_surface, (text_x, input_y + 4))
        
        # Cursor if active
        if self.hp_input_active:
            cursor_x = text_x + input_text_surface.get_width()
            pygame.draw.line(screen, TEXT_PRIMARY, (cursor_x, input_y + 2), (cursor_x, input_y + input_height - 2), 1)
        
        # Calculate spacing for elements: [RAVEN][gap][INSP] gap [HP BAR] gap [AC] gap [Status Indicators]
        tile_w = 50
        tile_gap = 15
        raven_w = tile_w
        insp_w, bar_w, ac_w = tile_w, 240, 60
        indicator_w = 60
        small_gap = 25  # Gap between main elements
        indicator_gap = 10  # Gap between AC and indicators
        
        total_width = (
            raven_w
            + tile_gap
            + insp_w
            + small_gap
            + bar_w
            + small_gap
            + ac_w
            + indicator_gap
            + indicator_w * 2
            + indicator_gap
        )
        
        start_x = card_x + (card_width - total_width) // 2
        
        raven_x = start_x
        insp_x = raven_x + raven_w + tile_gap
        bar_x = insp_x + insp_w + small_gap
        ac_x = bar_x + bar_w + small_gap
        shield_x = ac_x + ac_w + indicator_gap
        mage_x = shield_x + indicator_w + indicator_gap
        
        # Luck is not used for Madea
        self.luck_rect = None
        
        # Raven indicator
        raven_y = card_y + 31
        raven_rect = pygame.Rect(raven_x, raven_y, raven_w, raven_w)
        self.raven_indicator_rect = raven_rect
        if self.ui_box_image:
            raven_box = pygame.transform.scale(self.ui_box_image, (raven_w, raven_w))
            raven_box.set_alpha(200)
            screen.blit(raven_box, (raven_x, raven_y))
        else:
            raven_surface = pygame.Surface((raven_w, raven_w), pygame.SRCALPHA)
            pygame.draw.rect(raven_surface, (60, 60, 70, 180), (0, 0, raven_w, raven_w), border_radius=8)
            screen.blit(raven_surface, (raven_x, raven_y))
        raven_base_overlay = pygame.Surface((raven_w, raven_w), pygame.SRCALPHA)
        pygame.draw.rect(raven_base_overlay, (0, 0, 0, 40), (0, 0, raven_w, raven_w), border_radius=8)
        screen.blit(raven_base_overlay, (raven_x, raven_y))
        if self.raven_form_active:
            active_overlay = pygame.Surface((raven_w, raven_w), pygame.SRCALPHA)
            pygame.draw.rect(active_overlay, (120, 140, 200, 90), (0, 0, raven_w, raven_w), border_radius=8)
            screen.blit(active_overlay, (raven_x, raven_y))
        elif self.raven_form_uses_remaining > 0:
            ready_overlay = pygame.Surface((raven_w, raven_w), pygame.SRCALPHA)
            pygame.draw.rect(ready_overlay, (255, 165, 80, 50), (0, 0, raven_w, raven_w), border_radius=8)
            screen.blit(ready_overlay, (raven_x, raven_y))
        border_color = (
            (120, 140, 200)
            if self.raven_form_active
            else (255, 165, 80)
            if self.raven_form_uses_remaining > 0
            else (60, 60, 60)
        )
        pygame.draw.rect(screen, border_color, raven_rect, 2, border_radius=8)
        raven_label = self.small_font.render("RVN", True, TEXT_PRIMARY)
        raven_label_rect = raven_label.get_rect(center=(raven_x + raven_w // 2, raven_y + 16))
        screen.blit(raven_label, raven_label_rect)
        if self.raven_form_active:
            raven_status_text = "ACTIVE"
            raven_status_color = TEXT_PRIMARY
        else:
            raven_status_text = f"{self.raven_form_uses_remaining}/{self.raven_form_max_uses}"
            raven_status_color = TEXT_PRIMARY if self.raven_form_uses_remaining > 0 else TEXT_SECONDARY
        raven_status = self.small_font.render(raven_status_text, True, raven_status_color)
        raven_status_rect = raven_status.get_rect(center=(raven_x + raven_w // 2, raven_y + raven_w - 12))
        screen.blit(raven_status, raven_status_rect)
        
        # HP Bar - bigger size, positioned with the group
        hp_percentage = self.current_hp / self.max_hp
        bar_width = 240
        bar_height = 16
        bar_y = card_y + 45  # Moved up, closer to input field
        
        # Background bar with rounded corners
        pygame.draw.rect(screen, BORDER, (bar_x, bar_y, bar_width, bar_height), border_radius=6)
        
        # Filled portion with gradient effect
        filled_width = int(bar_width * hp_percentage)
        if filled_width > 0:
            color = SUCCESS if hp_percentage > 0.5 else WARNING if hp_percentage > 0.25 else DANGER
            pygame.draw.rect(screen, color, (bar_x, bar_y, filled_width, bar_height), border_radius=6)
        
        # HP text (moved up)
        hp_text = self.text_font.render(f"{self.current_hp} / {self.max_hp} HP", True, TEXT_PRIMARY)
        hp_rect = hp_text.get_rect(center=(center_x, bar_y + bar_height + 12))
        screen.blit(hp_text, hp_rect)
        
        # Inspiration indicator (aligned with HP bar) - square with number
        insp_y = card_y + 31  # Aligned with HP bar
        insp_width, insp_height = 50, 50
        self.inspiration_rect = pygame.Rect(insp_x, insp_y, insp_width, insp_height)  # Clickable area
        
        # Background color based on inspiration count
        if self.inspiration > 0:
            bg_color = (255, 165, 80, 100)  # Faded orange
            border_color = (255, 165, 80)  # Solid orange border
            text_color = TEXT_PRIMARY
        else:
            bg_color = (60, 60, 60, 100)  # Grayed out
            border_color = (60, 60, 60)  # Gray border
            text_color = TEXT_SECONDARY
        
        # Draw background
        insp_surface = pygame.Surface((insp_width, insp_height), pygame.SRCALPHA)
        pygame.draw.rect(insp_surface, bg_color, (0, 0, insp_width, insp_height), border_radius=8)
        screen.blit(insp_surface, (insp_x, insp_y))
        
        # Draw border
        pygame.draw.rect(screen, border_color, self.inspiration_rect, 2, border_radius=8)
        
        # Draw inspiration count
        insp_count_text = self.header_font.render(str(self.inspiration), True, text_color)
        count_rect = insp_count_text.get_rect(center=(insp_x + insp_width // 2, insp_y + insp_height // 2 - 5))
        screen.blit(insp_count_text, count_rect)
        
        # Draw label
        insp_label = self.small_font.render("INSP", True, text_color)
        label_rect = insp_label.get_rect(center=(insp_x + insp_width // 2, insp_y + insp_height - 10))
        screen.blit(insp_label, label_rect)
        
        # AC (aligned with HP bar) using UI box - clickable for Shield spell
        ac_y = card_y + 26  # Aligned with HP bar
        ac_width, ac_height = 60, 50
        self.ac_rect = pygame.Rect(ac_x, ac_y, ac_width, ac_height)  # Clickable area for Shield
        
        if self.ui_box_image:
            # Use UI box for AC display
            scaled_ac_box = pygame.transform.scale(self.ui_box_image, (ac_width, ac_height))
            scaled_ac_box.set_alpha(200)
            screen.blit(scaled_ac_box, (ac_x, ac_y))
            
            # Add dark tint for readability
            base_tint = pygame.Surface((ac_width, ac_height), pygame.SRCALPHA)
            pygame.draw.rect(base_tint, (0, 0, 0, 40), (0, 0, ac_width, ac_height), border_radius=8)
            screen.blit(base_tint, (ac_x, ac_y))
            if self.shield_active:
                shield_tint = pygame.Surface((ac_width, ac_height), pygame.SRCALPHA)
                pygame.draw.rect(shield_tint, (255, 165, 80, 90), (0, 0, ac_width, ac_height), border_radius=8)
                screen.blit(shield_tint, (ac_x, ac_y))
        else:
            # Fallback method with dark background
            ac_surface = pygame.Surface((ac_width, ac_height), pygame.SRCALPHA)
            base_color = (60, 60, 70, 180)
            if self.shield_active:
                base_color = (255, 165, 80, 180)
            pygame.draw.rect(ac_surface, base_color, (0, 0, ac_width, ac_height), border_radius=8)
            screen.blit(ac_surface, (ac_x, ac_y))
        
        # Display current AC value (base + Shield if active)
        display_ac = self.ac
        ac_text = self.small_font.render("AC", True, TEXT_PRIMARY)
        ac_value = self.subheader_font.render(str(display_ac), True, TEXT_PRIMARY)
        
        # Add Shield indicator if active
        if self.shield_active:
            shield_text = self.small_font.render("(+5)", True, (255, 165, 80))
            shield_rect = shield_text.get_rect(center=(ac_x + 30, ac_y + 48))
            screen.blit(shield_text, shield_rect)
        
        # Center the AC text in the box
        ac_text_rect = ac_text.get_rect(center=(ac_x + 30, ac_y + 15))
        ac_value_rect = ac_value.get_rect(center=(ac_x + 30, ac_y + 35))
        screen.blit(ac_text, ac_text_rect)
        screen.blit(ac_value, ac_value_rect)

        # Status indicators for Shield and Mage Armor
        indicator_width = indicator_w
        indicator_height = ac_height

        def draw_indicator(rect, label, subtitle, active, active_color):
            if self.ui_box_image:
                indicator_image = pygame.transform.scale(self.ui_box_image, (rect.width, rect.height))
                indicator_image.set_alpha(200)
                screen.blit(indicator_image, rect)
            else:
                indicator_surface = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
                pygame.draw.rect(indicator_surface, (60, 60, 70, 180), (0, 0, rect.width, rect.height), border_radius=8)
                screen.blit(indicator_surface, rect)

            base_overlay = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
            pygame.draw.rect(base_overlay, (0, 0, 0, 40), (0, 0, rect.width, rect.height), border_radius=8)
            screen.blit(base_overlay, rect)

            if active:
                overlay = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
                pygame.draw.rect(overlay, active_color, (0, 0, rect.width, rect.height), border_radius=8)
                screen.blit(overlay, rect)

            label_surface = self.text_font.render(label, True, TEXT_PRIMARY)
            label_rect = label_surface.get_rect(center=(rect.centerx, rect.centery - 10))
            screen.blit(label_surface, label_rect)

            if subtitle:
                subtitle_surface = self.small_font.render(subtitle, True, TEXT_PRIMARY if active else TEXT_SECONDARY)
                subtitle_rect = subtitle_surface.get_rect(center=(rect.centerx, rect.centery + 12))
                screen.blit(subtitle_surface, subtitle_rect)

        self.shield_indicator_rect = pygame.Rect(shield_x, ac_y, indicator_width, indicator_height)
        shield_subtitle = "+5 AC" if self.shield_active else "Reaction"
        draw_indicator(
            self.shield_indicator_rect,
            "SH",
            shield_subtitle,
            self.shield_active,
            (255, 165, 80, 90),
        )

        self.mage_armor_indicator_rect = pygame.Rect(mage_x, ac_y, indicator_width, indicator_height)
        dex_mod = self.stats.get("DEX", {}).get("modifier", 0)
        mage_base = 13 + dex_mod
        mage_subtitle = f"Base {self.base_ac}" if self.mage_armor_active else f"13+DEX ({mage_base})"
        draw_indicator(
            self.mage_armor_indicator_rect,
            "MA",
            mage_subtitle,
            self.mage_armor_active,
            (120, 140, 200, 90),
        )
    
    def apply_hp_change(self):
        """Apply the HP change from the input field"""
        if not self.hp_input_text:
            return
        
        try:
            # Parse the input
            change = int(self.hp_input_text)
            old_hp = self.current_hp
            
            # Apply the change
            if self.hp_input_text.startswith('+') or self.hp_input_text.startswith('-'):
                # Relative change
                self.current_hp += change
            else:
                # Absolute change (treat as healing/damage based on sign)
                if change > 0:
                    self.current_hp += change
                else:
                    self.current_hp += change  # change is already negative
            
            # Clamp to valid range
            self.current_hp = max(0, min(self.current_hp, self.max_hp))
            
            # Feedback
            actual_change = self.current_hp - old_hp
            if actual_change > 0:
                logging.info(f"{self.character_name} healed {actual_change} HP ({old_hp} → {self.current_hp})")
            elif actual_change < 0:
                logging.info(f"{self.character_name} took {abs(actual_change)} damage ({old_hp} → {self.current_hp})")
            
            # Clear the input
            self.hp_input_text = ""
            
            # Auto-save after HP change
            self.save_character_data()
            
        except ValueError:
            logging.warning(f"Invalid HP input: '{self.hp_input_text}'. Use numbers like +5, -3, or 10")
            self.hp_input_text = ""
    
    def draw_skills_section(self, screen):
        """Draw skills using UI box elements"""
        # Center the skills box between left buttons and right stats with even spacing
        left_boundary = 320  # After the buttons
        right_boundary = self.current_width - 320  # Before the stats
        available_width = right_boundary - left_boundary
        width = available_width - 40  # Skills box width, fully responsive
        
        # Calculate even spacing from borders
        side_padding = (available_width - width) // 2
        x = left_boundary + side_padding  # Even spacing from left
        y = 280
        height = 400
        
        card_y = self.draw_card(screen, x, y, width, height, "SKILLS", "left", 190)
        
        # Clear skill rects for fresh tracking
        self.skill_rects = []
        
        # Skills in 3 columns with equal left/right spacing
        left_padding = 20  # Padding from left edge of card
        right_padding = 20  # Padding from right edge of card
        content_width = width - left_padding - right_padding  # Available space for columns
        col_width = content_width // 3  # Equal column width
        button_margin = 5  # Small margin between buttons
        skill_button_width = col_width - (button_margin * 2)  # Button width with margins
        
        start_y = card_y
        
        mouse_pos = pygame.mouse.get_pos()
        
        for i, (skill, stat, proficient, modifier) in enumerate(self.skills):
            row = i % 6
            col = i // 6
            
            # Calculate x position with equal spacing
            skill_x = x + left_padding + (col * col_width) + button_margin
            skill_y = start_y + row * 45  # Tighter vertical spacing
            skill_w, skill_h = skill_button_width, 35
            
            # Store rectangle for hover/click detection
            skill_rect = pygame.Rect(skill_x, skill_y, skill_w, skill_h)
            self.skill_rects.append((skill_rect, i, skill, stat, proficient, modifier))
            
            # Check if this skill is being hovered
            is_hovered = skill_rect.collidepoint(mouse_pos)
            
            # Individual skill background using UI box
            if self.ui_box_image:
                scaled_skill_box = pygame.transform.scale(self.ui_box_image, (skill_w, skill_h))
                base_alpha = 160 if proficient else 80
                hover_alpha = min(255, base_alpha + 60) if is_hovered else base_alpha
                scaled_skill_box.set_alpha(hover_alpha)
                screen.blit(scaled_skill_box, (skill_x, skill_y))
                
                # Add a subtle highlight for proficient skills
                if proficient:
                    highlight_surface = pygame.Surface((skill_w, skill_h), pygame.SRCALPHA)
                    accent_alpha = 80 if is_hovered else 60
                    pygame.draw.rect(highlight_surface, (*ACCENT, accent_alpha), (0, 0, skill_w, skill_h), border_radius=6)
                    screen.blit(highlight_surface, (skill_x, skill_y))
                
                # Add hover effect
                if is_hovered:
                    hover_surface = pygame.Surface((skill_w, skill_h), pygame.SRCALPHA)
                    pygame.draw.rect(hover_surface, (*ACCENT_HOVER, 40), (0, 0, skill_w, skill_h), border_radius=6)
                    screen.blit(hover_surface, (skill_x, skill_y))
            else:
                # Fallback to old method with hover
                skill_surface = pygame.Surface((skill_w, skill_h), pygame.SRCALPHA)
                if proficient:
                    bg_color = (*ACCENT, 140 if is_hovered else 120)  # Semi-transparent accent
                else:
                    bg_color = (30, 30, 35, 120 if is_hovered else 100)  # Very subtle background
                pygame.draw.rect(skill_surface, bg_color, (0, 0, skill_w, skill_h), border_radius=6)
                screen.blit(skill_surface, (skill_x, skill_y))
            
            # Proficiency indicator
            prof_color = TEXT_PRIMARY if proficient else TEXT_SECONDARY
            prof_circle = pygame.Rect(skill_x + 8, skill_y + 12, 8, 8)  # Smaller circle
            pygame.draw.ellipse(screen, prof_color, prof_circle)
            
            # Skill name (check for proper length to avoid truncation)
            skill_display = skill if len(skill) <= 14 else skill[:11] + "..."
            skill_text = self.small_font.render(skill_display, True, TEXT_PRIMARY)
            screen.blit(skill_text, (skill_x + 22, skill_y + 3))
            
            # Modifier
            mod_text = f"+{modifier}" if modifier >= 0 else str(modifier)
            mod_surface = self.small_font.render(mod_text, True, TEXT_PRIMARY)
            screen.blit(mod_surface, (skill_x + 22, skill_y + 18))
            
            # Governing stat
            stat_surface = self.small_font.render(stat, True, TEXT_SECONDARY)
            screen.blit(stat_surface, (skill_x + col_width - 45, skill_y + 10))
    
    def draw_stats_section(self, screen):
        """Draw ability scores with left alignment"""
        start_x = self.current_width - 270
        start_y = 340
        
        # Title (left aligned)
        title_surface = self.header_font.render("ABILITY SCORES", True, TEXT_PRIMARY)
        screen.blit(title_surface, (start_x, start_y - 40))
        
        stats_list = list(self.stats.items())
        self.stat_rects = []
        mouse_pos = pygame.mouse.get_pos()
        
        for i, (stat_name, stat_data) in enumerate(stats_list):
            row = i // 3
            col = i % 3
            
            x = start_x + col * 80
            y = start_y + row * 120
            
            # Stat card
            self.draw_card(screen, x, y, 70, 90)
            stat_rect = pygame.Rect(x, y, 70, 90)
            self.stat_rects.append((stat_rect, stat_name, stat_data))

            if stat_rect.collidepoint(mouse_pos):
                hover_surface = pygame.Surface((stat_rect.width, stat_rect.height), pygame.SRCALPHA)
                pygame.draw.rect(
                    hover_surface,
                    (*ACCENT_HOVER, 50),
                    (0, 0, stat_rect.width, stat_rect.height),
                    border_radius=12,
                )
                screen.blit(hover_surface, stat_rect)
            
            # Stat name
            name_surface = self.small_font.render(stat_name, True, TEXT_SECONDARY)
            name_rect = name_surface.get_rect(center=(x + 35, y + 15))
            screen.blit(name_surface, name_rect)
            
            # Modifier (large, center)
            mod_text = f"{stat_data['modifier']:+d}"
            mod_surface = self.subheader_font.render(mod_text, True, TEXT_PRIMARY)
            mod_rect = mod_surface.get_rect(center=(x + 35, y + 40))
            screen.blit(mod_surface, mod_rect)
            
            # Base value (small, bottom)
            value_surface = self.small_font.render(str(stat_data['value']), True, TEXT_SECONDARY)
            value_rect = value_surface.get_rect(center=(x + 35, y + 70))
            screen.blit(value_surface, value_rect)
    
    def draw_feats_traits_section(self, screen):
        """Draw feats and traits section at the bottom"""
        # Align with skills section positioning
        left_boundary = 320  # After the buttons
        right_boundary = self.current_width - 320  # Before the stats
        available_width = right_boundary - left_boundary
        width = available_width - 40  # Match skills box width, fully responsive
        
        # Calculate even spacing from borders (same as skills)
        side_padding = (available_width - width) // 2
        x = left_boundary + side_padding  # Even spacing from left
        y = 720
        height = 130
        
        card_y = self.draw_card(screen, x, y, width, height, "FEATS & TRAITS", "left")
        
        # Display feats and traits in two columns (adjusted for smaller width)
        col_width = (width - 60) // 2
        
        for i, feat in enumerate(self.feats_traits):
            col = i % 2
            row = i // 2
            
            feat_x = x + 20 + col * col_width
            feat_y = card_y + row * 20
            
            # Bullet point
            bullet = self.small_font.render("•", True, ACCENT)
            screen.blit(bullet, (feat_x, feat_y))
            
            # Feat text (wrap long text) - shorter due to reduced width
            feat_text = feat[:45] + "..." if len(feat) > 45 else feat
            feat_surface = self.small_font.render(feat_text, True, TEXT_PRIMARY)
            screen.blit(feat_surface, (feat_x + 15, feat_y))
    
    def handle_input(self, event):
        """Handle input with modern interactions"""
        mouse_pos = pygame.mouse.get_pos()
        
        if self.short_rest_modal_open:
            self.handle_short_rest_modal_event(event)
            return
        
        # Update hover states for current screen buttons
        if self.current_screen == "main":
            current_buttons = self.buttons
        elif self.current_screen == "attack":
            current_buttons = self.attack_buttons + self.attack_action_buttons
        elif self.current_screen == "actions":
            current_buttons = self.action_buttons + self.action_action_buttons
        elif self.current_screen == "spells":
            current_buttons = self.spell_buttons.copy()
            spell_button_restore_needed = False
            spell_button_original_x = 0
            
            # Add spell action buttons with proper positioning
            if self.selected_spell:
                spell_info = self.spell_data[self.selected_spell]
                has_delayed_damage = spell_info.get("has_delayed_damage", False)
                
                if has_delayed_damage:
                    # Both buttons are visible - use original positions
                    current_buttons.extend(self.spell_action_buttons)
                else:
                    # Only Cast Spell button is visible - temporarily center it for hover detection
                    cast_button = self.spell_action_buttons[0]
                    
                    # Calculate centered position (same logic as in draw_spells_menu)
                    info_box_center = self.current_width // 2
                    button_width = 169
                    centered_x = info_box_center - button_width // 2
                    
                    # Save original position and temporarily center for hover detection
                    spell_button_original_x = cast_button.rect.x
                    cast_button.rect.x = centered_x
                    current_buttons.append(cast_button)
                    spell_button_restore_needed = True
        elif self.current_screen == "saves":
            current_buttons = self.saves_buttons + self.saves_action_buttons
        elif self.current_screen == "bag":
            current_buttons = self.bag_buttons
        elif self.current_screen == "journal":
            current_buttons = self.journal_buttons
        else:
            current_buttons = self.buttons
        
        for button in current_buttons:
            button.handle_hover(mouse_pos)
        
        # Restore spell button position if it was temporarily moved
        if self.current_screen == "spells" and spell_button_restore_needed:
            self.spell_action_buttons[0].rect.x = spell_button_original_x
        
        if event.type == pygame.KEYDOWN:
            # Global keyboard shortcuts
            if event.key == pygame.K_F11:
                self.toggle_fullscreen()
                return
            elif event.key == pygame.K_ESCAPE and self.is_fullscreen:
                self.toggle_fullscreen()
                return
            elif event.key == pygame.K_F5:
                # Reload spell slots from JSON
                if self.reload_spell_slots():
                    logging.info("Spell slots reloaded successfully!")
                else:
                    logging.error("Failed to reload spell slots!")
                return
            
            if self.hp_input_active and self.current_screen == "main":
                # Handle HP input field (only on main screen)
                if event.key == pygame.K_RETURN:
                    self.apply_hp_change()
                    self.hp_input_active = False
                elif event.key == pygame.K_ESCAPE:
                    self.hp_input_text = ""
                    self.hp_input_active = False
                elif event.key == pygame.K_BACKSPACE:
                    self.hp_input_text = self.hp_input_text[:-1]
                else:
                    # Allow numbers, +, - signs
                    if event.unicode.isdigit() or event.unicode in ['+', '-']:
                        # Don't allow multiple signs
                        if event.unicode in ['+', '-'] and any(c in self.hp_input_text for c in ['+', '-']):
                            pass
                        elif len(self.hp_input_text) < 4:  # Limit input length
                            self.hp_input_text += event.unicode
            elif self.sorcery_slot_input_active and self.current_screen == "spells":
                if event.key == pygame.K_RETURN:
                    self.sorcery_slot_input_active = False
                elif event.key == pygame.K_ESCAPE:
                    self.sorcery_slot_input_text = ""
                    self.sorcery_slot_input_active = False
                elif event.key == pygame.K_BACKSPACE:
                    self.sorcery_slot_input_text = self.sorcery_slot_input_text[:-1]
                else:
                    if event.unicode.isdigit() and len(self.sorcery_slot_input_text) < 1:
                        self.sorcery_slot_input_text = event.unicode
            elif self.item_input_active and self.current_screen == "bag":
                # Handle item input field (only on bag screen)
                if event.key == pygame.K_RETURN:
                    self.add_item()
                    self.item_input_active = False
                elif event.key == pygame.K_ESCAPE:
                    self.item_input_text = ""
                    self.item_input_active = False
                elif event.key == pygame.K_BACKSPACE:
                    self.item_input_text = self.item_input_text[:-1]
                else:
                    # Allow text input for item names
                    if event.unicode.isprintable() and len(self.item_input_text) < 50:
                        self.item_input_text += event.unicode
            elif self.coin_input_active and self.current_screen == "bag":
                # Handle coin input field (only on bag screen)
                if event.key == pygame.K_RETURN:
                    self.coin_input_active = False
                elif event.key == pygame.K_ESCAPE:
                    self.coin_input_text = ""
                    self.coin_input_active = False
                elif event.key == pygame.K_BACKSPACE:
                    self.coin_input_text = self.coin_input_text[:-1]
                else:
                    # Allow numbers only
                    if event.unicode.isdigit() and len(self.coin_input_text) < 6:
                        self.coin_input_text += event.unicode
            elif self.session_input_active and self.current_screen == "journal":
                # Handle session input field (only on journal screen)
                if event.key == pygame.K_RETURN:
                    self.add_session()
                    self.session_input_active = False
                elif event.key == pygame.K_ESCAPE:
                    self.session_input_text = ""
                    self.session_input_active = False
                elif event.key == pygame.K_BACKSPACE:
                    self.session_input_text = self.session_input_text[:-1]
                else:
                    # Allow text input for session names
                    if event.unicode.isprintable() and len(self.session_input_text) < 30:
                        self.session_input_text += event.unicode
            elif self.session_name_editing and self.current_screen == "journal":
                # Handle session name editing
                if event.key == pygame.K_RETURN:
                    self.save_session_name_edit()
                    self.session_name_editing = False
                elif event.key == pygame.K_ESCAPE:
                    self.session_name_editing = False
                    self.session_name_edit_text = ""
                elif event.key == pygame.K_BACKSPACE:
                    if not self.backspace_held:
                        self.session_name_edit_text = self.session_name_edit_text[:-1]
                        self.backspace_held = True
                        self.backspace_repeat_timer = pygame.time.get_ticks()
                else:
                    # Allow text input for session name editing
                    if event.unicode.isprintable() and len(self.session_name_edit_text) < 30:
                        self.session_name_edit_text += event.unicode
            elif self.journal_text_active and self.current_screen == "journal":
                # Handle journal text editing
                if event.key == pygame.K_ESCAPE:
                    self.journal_text_active = False
                    self.clear_journal_selection()
                elif event.key == pygame.K_BACKSPACE:
                    if self.has_journal_selection():
                        self.delete_journal_selection()
                    elif not self.backspace_held:
                        self.remove_journal_character()
                        self.backspace_held = True
                        self.backspace_repeat_timer = pygame.time.get_ticks()
                elif event.key == pygame.K_DELETE:
                    if self.has_journal_selection():
                        self.delete_journal_selection()
                elif event.key == pygame.K_UP:
                    self.clear_journal_selection()
                    self.scroll_journal(-1)
                elif event.key == pygame.K_DOWN:
                    self.clear_journal_selection()
                    self.scroll_journal(1)
                elif event.key == pygame.K_LEFT:
                    self.clear_journal_selection()
                    self.move_journal_cursor(-1)
                elif event.key == pygame.K_RIGHT:
                    self.clear_journal_selection()
                    self.move_journal_cursor(1)
                elif event.key == pygame.K_PAGEUP:
                    self.clear_journal_selection()
                    self.scroll_journal(-5)
                elif event.key == pygame.K_PAGEDOWN:
                    self.clear_journal_selection()
                    self.scroll_journal(5)
                else:
                    if event.unicode.isprintable() or event.key == pygame.K_RETURN:
                        if event.key == pygame.K_RETURN:
                            self.add_journal_character('\n')
                        else:
                            self.add_journal_character(event.unicode)
            elif self.character_name_editing and self.current_screen == "journal":
                # Handle character name editing
                if event.key == pygame.K_RETURN:
                    self.save_character_name_edit()
                    self.character_name_editing = False
                elif event.key == pygame.K_ESCAPE:
                    self.character_name_editing = False
                    self.character_name_edit_text = ""
                elif event.key == pygame.K_BACKSPACE:
                    if not self.backspace_held:
                        self.character_name_edit_text = self.character_name_edit_text[:-1]
                        self.backspace_held = True
                        self.backspace_repeat_timer = pygame.time.get_ticks()
                else:
                    # Allow text input for character name editing
                    if event.unicode.isprintable() and len(self.character_name_edit_text) < 30:
                        self.character_name_edit_text += event.unicode
            elif self.place_name_editing and self.current_screen == "journal":
                # Handle place name editing
                if event.key == pygame.K_RETURN:
                    self.save_character_name_edit()
                    self.place_name_editing = False
                elif event.key == pygame.K_ESCAPE:
                    self.place_name_editing = False
                    self.place_name_edit_text = ""
                elif event.key == pygame.K_BACKSPACE:
                    if not self.backspace_held:
                        self.place_name_edit_text = self.place_name_edit_text[:-1]
                        self.backspace_held = True
                        self.backspace_repeat_timer = pygame.time.get_ticks()
                else:
                    if event.unicode.isprintable() and len(self.place_name_edit_text) < 30:
                        self.place_name_edit_text += event.unicode
            else:
                # Only handle Escape key to go back to main menu
                if event.key == pygame.K_ESCAPE:
                    # Go back to main menu from any submenu
                    if self.current_screen != "main":
                        self.switch_to_main_menu()
        
        elif event.type == pygame.KEYUP:
            # Handle key release for continuous backspace
            if event.key == pygame.K_BACKSPACE:
                self.backspace_held = False
                self.backspace_repeat_delay = self.backspace_repeat_initial_delay
        
        elif event.type == pygame.MOUSEWHEEL:
            if self.current_screen == "spells":
                total_spells = len(self.build_spell_render_list())
                visible_limit = getattr(self, "max_visible_spells", max(1, (self.current_height - 250) // max(1, self.spell_button_spacing)))
                max_offset = max(0, total_spells - visible_limit)
                if event.y > 0:
                    self.spell_scroll_offset = max(0, self.spell_scroll_offset - 1)
                    self.create_spell_buttons()
                elif event.y < 0:
                    self.spell_scroll_offset = min(max_offset, self.spell_scroll_offset + 1)
                    self.create_spell_buttons()
                return
            elif self.current_screen == "journal":
                if event.y > 0:
                    self.scroll_journal(-1)
                elif event.y < 0:
                    self.scroll_journal(1)
                return

        elif event.type == pygame.MOUSEBUTTONDOWN:
            if self.current_screen == "spells" and hasattr(event, "button"):
                total_spells = len(self.build_spell_render_list())
                visible_limit = getattr(self, "max_visible_spells", max(1, (self.current_height - 250) // max(1, self.spell_button_spacing)))
                max_offset = max(0, total_spells - visible_limit)
                if event.button == 4:  # Scroll up (trackpad)
                    if self.spell_scroll_offset > 0:
                        self.spell_scroll_offset = max(0, self.spell_scroll_offset - 1)
                        self.create_spell_buttons()
                        return
                elif event.button == 5:  # Scroll down (trackpad)
                    if self.spell_scroll_offset < max_offset:
                        self.spell_scroll_offset = min(max_offset, self.spell_scroll_offset + 1)
                        self.create_spell_buttons()
                        return
            if self.current_screen == "journal" and hasattr(event, "button"):
                if event.button == 4:  # Scroll up (trackpad)
                    self.scroll_journal(-1)
                    return
                elif event.button == 5:  # Scroll down (trackpad)
                    self.scroll_journal(1)
                    return

            # Check if HP input field was clicked (only on main screen)
            if (self.current_screen == "main" and 
                hasattr(self, 'hp_input_rect') and 
                self.hp_input_rect.collidepoint(event.pos)):
                self.hp_input_active = True
                return
            else:
                self.hp_input_active = False

            if self.current_screen == "spells":
                if getattr(self, 'sorcery_slot_input_rect', None) and self.sorcery_slot_input_rect.collidepoint(event.pos):
                    self.sorcery_slot_input_active = True
                    return
                else:
                    self.sorcery_slot_input_active = False
            
            # Check if item input field was clicked (only on bag screen)
            if (self.current_screen == "bag" and 
                hasattr(self, 'item_input_rect') and 
                self.item_input_rect.collidepoint(event.pos)):
                self.item_input_active = True
                self.coin_input_active = False
                return
            else:
                self.item_input_active = False
            
            # Check if coin input field was clicked (only on bag screen)
            if (self.current_screen == "bag" and 
                hasattr(self, 'coin_input_rect') and 
                self.coin_input_rect.collidepoint(event.pos)):
                self.coin_input_active = True
                self.item_input_active = False
                return
            else:
                self.coin_input_active = False
            
            # Check if session input field was clicked (only on journal screen)
            if (self.current_screen == "journal" and 
                hasattr(self, 'session_input_rect') and 
                self.session_input_rect.collidepoint(event.pos)):
                self.session_input_active = True
                self.journal_text_active = False
                return
            else:
                self.session_input_active = False
            
            # Check if journal content area was clicked (only on journal screen)
            if (self.current_screen == "journal" and 
                hasattr(self, 'journal_content_rect') and 
                self.journal_content_rect.collidepoint(event.pos)):
                self.journal_text_active = True
                self.session_input_active = False
                self.session_name_editing = False
                self.character_name_editing = False
                self.handle_journal_cursor_click(event.pos)
                click_pos = self.cursor_position_from_mouse(event.pos)
                if click_pos is not None:
                    self.journal_selection_start = click_pos
                    self.journal_selection_end = click_pos
                    self.journal_mouse_selecting = True
                return
            else:
                self.journal_text_active = False
            
            # Check if title area was clicked for renaming
            if (self.current_screen == "journal" and 
                hasattr(self, 'session_title_rect') and 
                self.session_title_rect and 
                self.session_title_rect.collidepoint(event.pos)):
                entry_kind = self.current_journal_entry_kind()

                self.journal_text_active = False
                self.session_input_active = False
                self.session_name_editing = False
                self.character_name_editing = False
                self.place_name_editing = False

                if entry_kind == "character":
                    self.character_name_editing = True
                    self.character_name_edit_text = self.current_character or ""
                    self.active_entry_type = "character"
                elif entry_kind == "place":
                    self.place_name_editing = True
                    self.place_name_edit_text = self.current_place or ""
                    self.active_entry_type = "place"
                else:
                    self.session_name_editing = True
                    self.session_name_edit_text = self.current_journal_session
                    self.active_entry_type = "journal"
                return
            else:
                if not self.session_name_editing:
                    self.session_name_editing = False
            
            # Check Raven indicator (only on main screen)
            if (
                self.current_screen == "main"
                and getattr(self, "raven_indicator_rect", None)
                and self.raven_indicator_rect.collidepoint(event.pos)
            ):
                if event.button == 1:
                    if self.raven_form_active:
                        if self.deactivate_raven_form():
                            if self.current_screen == "actions":
                                self.create_action_buttons()
                    else:
                        if self.raven_form_uses_remaining > 0:
                            self.show_temp_overlay("Use Raven Form action to transform.")
                        else:
                            self.show_temp_overlay("No Raven Form uses remaining.")
                return
            
            # Check if inspiration was clicked (only on main screen)
            if (self.current_screen == "main" and 
                hasattr(self, 'inspiration_rect') and 
                self.inspiration_rect.collidepoint(event.pos)):
                # Left-click to increment, right-click to decrement
                if event.button == 1:  # Left-click
                    self.toggle_inspiration(increment=True)
                elif event.button == 3:  # Right-click
                    self.toggle_inspiration(increment=False)
                return

            # Check Shield indicator (main screen)
            if (self.current_screen == "main" and
                getattr(self, 'shield_indicator_rect', None) and
                self.shield_indicator_rect.collidepoint(event.pos)):
                if event.button == 1:
                    self.toggle_shield()
                return

            # Check Mage Armor indicator (main screen)
            if (self.current_screen == "main" and
                getattr(self, 'mage_armor_indicator_rect', None) and
                self.mage_armor_indicator_rect.collidepoint(event.pos)):
                if event.button == 1:
                    self.toggle_mage_armor()
                return
            
            # Check if AC was clicked for Shield toggle (only on main screen)
            if (self.current_screen == "main" and 
                hasattr(self, 'ac_rect') and 
                self.ac_rect.collidepoint(event.pos)):
                if self.shield_active:
                    self.toggle_shield()
                elif self.mage_armor_active:
                    self.deactivate_mage_armor()
                else:
                    logging.info("No active AC effects. Cast Mage Armor or Shield to enhance AC.")
                return
            
            # Check button clicks for current screen
            if self.current_screen == "main":
                self.handle_main_menu_clicks(event.pos)
                # Also check for skill clicks on main screen
                self.handle_skill_clicks(event.pos)
                self.handle_stat_clicks(event.pos)
            elif self.current_screen == "attack":
                self.handle_attack_menu_clicks(event.pos)
            elif self.current_screen == "actions":
                self.handle_action_menu_clicks(event.pos)
            elif self.current_screen == "spells":
                self.handle_spell_menu_clicks(event.pos)
            elif self.current_screen == "saves":
                self.handle_saves_menu_clicks(event.pos)
            elif self.current_screen == "bag":
                self.handle_bag_menu_clicks(event.pos)
            elif self.current_screen == "journal":
                self.handle_journal_menu_clicks(event.pos, event)

        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1 and self.journal_mouse_selecting:
                self.journal_mouse_selecting = False

        elif event.type == pygame.MOUSEMOTION:
            if self.journal_mouse_selecting and self.current_screen == "journal":
                if hasattr(self, 'journal_content_rect'):
                    new_pos = self.cursor_position_from_mouse(event.pos)
                    if new_pos is not None:
                        self.journal_selection_end = new_pos
                        self.set_journal_cursor_position(new_pos)

    def handle_main_menu_clicks(self, pos):
        """Handle mouse clicks on main menu"""
        for i, button in enumerate(self.buttons):
            click_type, clicked = button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.handle_main_button_press(i)
    
    def handle_attack_menu_clicks(self, pos):
        """Handle mouse clicks on attack menu"""
        # Check weapon buttons
        for i, button in enumerate(self.attack_buttons):
            click_type, clicked = button.handle_click(pos)
            if click_type == 'button' and clicked:
                if i == len(self.attack_buttons) - 1:  # Back button
                    self.switch_to_main_menu()
                else:
                    # Clear previous roll results when switching weapons
                    self.last_attack_roll = None
                    self.last_damage_roll = None
                    self.selected_weapon = self.weapons[i]
                    logging.info(f"Selected weapon: {self.selected_weapon['name']}")
                return
        
        # Check action buttons (if weapon is selected)
        if self.selected_weapon:
            for i, button in enumerate(self.attack_action_buttons):
                click_type, clicked = button.handle_click(pos)
                if click_type == 'button' and clicked:
                    if i == 0:  # Attack roll
                        self.perform_attack_roll()
                    elif i == 1:  # Damage roll
                        self.perform_damage_roll()
                elif click_type == 'checkbox':
                    # Checkbox was toggled, no further action needed
                    pass
    
    def handle_spell_menu_clicks(self, pos):
        """Handle mouse clicks on spell menu"""
        # Check spell buttons
        for i, button in enumerate(self.spell_buttons):
            click_type, clicked = button.handle_click(pos)
            if click_type == 'button' and clicked:
                if i == len(self.spell_buttons) - 1:  # Back button
                    self.switch_to_main_menu()
                else:
                    # Clear previous spell results when switching spells
                    self.last_spell_damage_roll = None
                    spell_name = getattr(button, "spell_name", None)
                    if spell_name:
                        self.selected_spell = spell_name
                        logging.info(f"Selected spell: {self.selected_spell}")
                        self.create_spell_buttons()
                return

        # Sorcery point conversion buttons
        if self.sorcery_use_button:
            click_type, clicked = self.sorcery_use_button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.convert_slot_to_sorcery_from_input()
                return
        if self.sorcery_create_button:
            click_type, clicked = self.sorcery_create_button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.convert_sorcery_points_to_slot_from_input()
                return
        
        # Check action buttons (if spell is selected)
        if self.selected_spell:
            spell_info = self.spell_data[self.selected_spell]
            has_delayed_damage = spell_info.get("has_delayed_damage", False)
            
            if has_delayed_damage:
                # Both buttons are visible - use original positions
                for i, button in enumerate(self.spell_action_buttons):
                    click_type, clicked = button.handle_click(pos)
                    if click_type == 'button' and clicked:
                        if i == 0:  # Cast spell
                            self.perform_spell_damage_roll()
                        elif i == 1:  # Delayed damage
                            self.perform_delayed_damage_roll()
            else:
                # Only Cast Spell button is visible - check centered position
                cast_button = self.spell_action_buttons[0]
                
                # Calculate centered position (same logic as in draw_spells_menu)
                info_box_center = self.current_width // 2
                button_width = 169
                centered_x = info_box_center - button_width // 2
                
                # Create a temporary rect for click detection
                centered_rect = pygame.Rect(centered_x, cast_button.rect.y, cast_button.rect.width, cast_button.rect.height)
                
                if centered_rect.collidepoint(pos):
                    self.perform_spell_damage_roll()
    
    def handle_saves_menu_clicks(self, pos):
        """Handle mouse clicks on saves menu"""
        # Check save buttons
        for i, button in enumerate(self.saves_buttons):
            click_type, clicked = button.handle_click(pos)
            if click_type == 'button' and clicked:
                if i == len(self.saves_buttons) - 1:  # Back button
                    self.switch_to_main_menu()
                else:
                    # Clear previous save results when switching saves
                    self.last_save_roll = None
                    
                    # Map button index to save type
                    save_types = ["STR", "DEX", "CON", "INT", "WIS", "CHA"]
                    if i < len(save_types):
                        self.selected_save = save_types[i]
                        logging.info(f"Selected save: {self.selected_save}")
                return
        
        # Check action button (if save is selected)
        if self.selected_save:
            for i, button in enumerate(self.saves_action_buttons):
                click_type, clicked = button.handle_click(pos)
                if click_type == 'button' and clicked:
                    if i == 0:  # Make save
                        self.perform_save_roll()
                elif click_type == 'checkbox':
                    # Checkbox was toggled
                    pass
        
        # Check death save reset button
        if hasattr(self, 'death_save_reset_button'):
            click_type, clicked = self.death_save_reset_button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.reset_death_saves()
        
        # Check death save button
        if hasattr(self, 'death_save_button'):
            click_type, clicked = self.death_save_button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.perform_death_save()
        
        # Check death damage button
        if hasattr(self, 'death_damage_button'):
            click_type, clicked = self.death_damage_button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.take_damage_at_zero_hp()
    
    def handle_bag_menu_clicks(self, pos):
        """Handle mouse clicks on bag menu"""
        # Check inventory type buttons (first 3 buttons)
        inventory_types = ["gear", "utility", "treasure"]
        for i, button in enumerate(self.bag_buttons[:3]):
            click_type, clicked = button.handle_click(pos)
            if click_type == 'button' and clicked:
                old_type = self.current_inventory_type
                self.current_inventory_type = inventory_types[i]
                if old_type != self.current_inventory_type:
                    self.create_bag_buttons()  # Recreate buttons to update selection
                    # Clear item rects to prevent index issues
                    if hasattr(self, 'item_rects'):
                        self.item_rects = []
                return
        
        # Check back button (last button)
        click_type, clicked = self.bag_buttons[-1].handle_click(pos)
        if click_type == 'button' and clicked:
            self.switch_to_main_menu()
            return
        
        # Check inventory item clicks for removal
        if hasattr(self, 'item_rects'):
            current_items = self.inventory.get(self.current_inventory_type, [])
            for i, item_rect in enumerate(self.item_rects):
                if i < len(current_items) and item_rect.collidepoint(pos):
                    self.remove_item(i)
                    return
        
        # Check coin button clicks
        if hasattr(self, 'coin_buttons'):
            for button_key, button in self.coin_buttons.items():
                click_type, clicked = button.handle_click(pos)
                if click_type == 'button' and clicked:
                    coin_type, action = button_key.split('_')
                    amount = int(self.coin_input_text) if self.coin_input_text.isdigit() and self.coin_input_text else 1
                    if action == "add":
                        self.modify_coins(coin_type, amount)
                    elif action == "remove":
                        self.modify_coins(coin_type, -amount)
                    return
    

    
    def handle_spell_button_press(self, button_index):
        """Handle spell menu button press actions"""
        total_buttons = len(self.spell_buttons) + len(self.spell_action_buttons)
        
        if button_index < len(self.spell_buttons):
            # Spell button or back button
            if button_index == len(self.spell_buttons) - 1:  # Back button
                self.switch_to_main_menu()
            else:
                # Clear previous spell results when switching spells
                self.last_spell_damage_roll = None
                all_spells = [name for name, _ in self.build_spell_render_list()]
                visible_index = button_index + self.spell_scroll_offset
                if visible_index < len(all_spells):
                    self.selected_spell = all_spells[visible_index]
                    logging.info(f"Selected spell: {self.selected_spell}")
                    self.create_spell_buttons()
        elif button_index < total_buttons and self.selected_spell:
            # Action button
            action_index = button_index - len(self.spell_buttons)
            if action_index == 0:  # Cast spell
                self.perform_spell_damage_roll()
            elif action_index == 1:  # Delayed damage
                self.perform_delayed_damage_roll()
    
    def handle_saves_button_press(self, button_index):
        """Handle saves menu button press actions"""
        total_buttons = len(self.saves_buttons) + len(self.saves_action_buttons)
        
        if button_index < len(self.saves_buttons):
            # Save button or back button
            if button_index == len(self.saves_buttons) - 1:  # Back button
                self.switch_to_main_menu()
            else:
                # Clear previous save results when switching saves
                self.last_save_roll = None
                
                # Map button index to save type
                save_types = ["STR", "DEX", "CON", "INT", "WIS", "CHA"]
                if button_index < len(save_types):
                    self.selected_save = save_types[button_index]
                    logging.info(f"Selected save: {self.selected_save}")
        elif button_index < total_buttons and self.selected_save:
            # Action button
            action_index = button_index - len(self.saves_buttons)
            if action_index == 0:  # Make save
                self.perform_save_roll()
    
    def handle_bag_button_press(self, button_index):
        """Handle bag menu button press actions"""
        if button_index < len(self.bag_buttons):
            # Check inventory type buttons (first 3)
            inventory_types = ["gear", "utility", "treasure"]
            if button_index < 3:
                old_type = self.current_inventory_type
                self.current_inventory_type = inventory_types[button_index]
                if old_type != self.current_inventory_type:
                    self.create_bag_buttons()  # Recreate buttons to update selection
                    # Clear item rects to prevent index issues
                    if hasattr(self, 'item_rects'):
                        self.item_rects = []
            # Back button (last button)
            elif button_index == len(self.bag_buttons) - 1:
                self.switch_to_main_menu()
    
    def handle_main_button_press(self, button_index):
        """Handle main menu button press actions"""
        if button_index >= len(self.buttons):
            return
            
        button_names = ['ATTACK', 'ACTION', 'SPELLS', 'SAVE', 'BAG', 'JOURNAL', 'WORLD MAP', 'SHORT REST', 'LONG REST']
        button_name = button_names[button_index] if button_index < len(button_names) else "UNKNOWN"
        
        if button_name == "ATTACK":
            self.switch_to_attack_menu()
        elif button_name == "ACTION":
            self.switch_to_action_menu()
        elif button_name == "SPELLS":
            self.switch_to_spell_menu()
        elif button_name == "SAVE":
            self.switch_to_saves_menu()
        elif button_name == "BAG":
            self.switch_to_bag_menu()
        elif button_name == "JOURNAL":
            self.switch_to_journal_menu()
        elif button_name == "WORLD MAP":
            self.open_world_map()
        elif button_name == "SHORT REST":
            self.short_rest()
        elif button_name == "LONG REST":
            self.long_rest()
        else:
            logging.info(f"{button_name} button pressed for {self.character_name}!")
    
    def handle_attack_button_press(self, button_index):
        """Handle attack menu button press actions"""
        total_buttons = len(self.attack_buttons) + len(self.attack_action_buttons)
        
        if button_index < len(self.attack_buttons):
            # Weapon button or back button
            if button_index == len(self.attack_buttons) - 1:  # Back button
                self.switch_to_main_menu()
            else:
                # Clear previous roll results when switching weapons
                self.last_attack_roll = None
                self.last_damage_roll = None
                self.selected_weapon = self.weapons[button_index]
                logging.info(f"Selected weapon: {self.selected_weapon['name']}")
        elif button_index < total_buttons and self.selected_weapon:
            # Action button
            action_index = button_index - len(self.attack_buttons)
            if action_index == 0:  # Attack roll
                self.perform_attack_roll()
            elif action_index == 1:  # Damage roll
                self.perform_damage_roll()
    
    def switch_to_attack_menu(self):
        """Switch to attack submenu"""
        self.current_screen = "attack"
        self.create_attack_buttons()
        self.selected_weapon = None
        self.last_attack_roll = None
        self.last_damage_roll = None
    
    def switch_to_main_menu(self):
        """Switch back to main menu"""
        self.current_screen = "main"
        self.selected_weapon = None
        self.selected_spell = None
        self.selected_save = None
    
    def switch_to_spell_menu(self):
        """Switch to spell submenu"""
        self.current_screen = "spells"
        self.spell_scroll_offset = 0
        self.create_spell_buttons()
        self.selected_spell = None
        self.last_spell_damage_roll = None
        self.sorcery_slot_input_text = ""
        self.sorcery_slot_input_active = False
    
    def switch_to_saves_menu(self):
        """Switch to saves submenu"""
        self.current_screen = "saves"
        self.create_saves_buttons()
        self.selected_save = None
        self.last_save_roll = None
    
    def switch_to_bag_menu(self):
        """Switch to bag submenu"""
        self.current_screen = "bag"
        self.create_bag_buttons()
        self.item_input_text = ""
        self.item_input_active = False
        self.coin_input_text = ""
        self.coin_input_active = False
    
    def perform_attack_roll(self):
        """Perform an attack roll with the selected weapon"""
        if not self.selected_weapon:
            return
        
        attack_bonus = self.calculate_attack_bonus(self.selected_weapon)
        
        # Check if advantage is enabled
        has_advantage = self.attack_action_buttons[0].advantage_checked if len(self.attack_action_buttons) > 0 else False
        
        if has_advantage:
            # Roll 2d20 and take the higher
            roll1_total, roll1_breakdown = self.roll_dice("1d20")
            roll2_total, roll2_breakdown = self.roll_dice("1d20")
            d20_roll = max(roll1_total, roll2_total)
            total = d20_roll + attack_bonus
            breakdown = [f"1d20 (Advantage): [{roll1_total}, {roll2_total}] → {d20_roll}", f"+{attack_bonus}"]
            logging.info(f"Attack roll (ADVANTAGE): {total} (rolled {roll1_total} and {roll2_total}, used {d20_roll} + {attack_bonus})")
        else:
            dice_notation = f"1d20+{attack_bonus}"
            total, breakdown = self.roll_dice(dice_notation)
            logging.info(f"Attack roll: {total} ({' + '.join(map(str, breakdown))})")
        
        self.last_attack_roll = (total, breakdown)
    
    def perform_damage_roll(self):
        """Perform a damage roll with the selected weapon"""
        if not self.selected_weapon:
            return
        
        damage_bonus = self.calculate_damage_bonus(self.selected_weapon)
        dice_notation = self.selected_weapon["damage_dice"]
        if damage_bonus > 0:
            dice_notation += f"+{damage_bonus}"
        elif damage_bonus < 0:
            dice_notation += str(damage_bonus)
        
        total, breakdown = self.roll_dice(dice_notation)
        self.last_damage_roll = (total, breakdown)
        
        logging.info(f"Damage roll: {total} ({' + '.join(map(str, breakdown))}) {self.selected_weapon['damage_type']}")
    
    def perform_spell_damage_roll(self):
        """Perform spell casting - damage roll for damage spells, slot consumption for all spells"""
        if not self.selected_spell or self.selected_spell not in self.spell_data:
            return
        
        spell_info = self.spell_data[self.selected_spell]
        metamagic_cost = spell_info.get("metamagic_cost")
        if metamagic_cost is not None:
            if self.current_sorcery_points < metamagic_cost:
                self.show_temp_overlay("Not enough sorcery points.")
                return
            self.current_sorcery_points -= metamagic_cost
            message = f"Used {self.selected_spell} (-{metamagic_cost} SP)"
            logging.info(message)
            self.show_temp_overlay(message)
            self.last_spell_damage_roll = None
            self.save_character_data()
            self.create_spell_buttons()
            return

        spell_level = spell_info.get("level", 0)

        def level_key(level: int) -> str:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(level, "th")
            return f"{level}{suffix}"

        free_cast_tracker = spell_info.get("free_cast_tracker")
        free_cast_label = spell_info.get("free_cast_label", "Free cast")
        if not free_cast_tracker and spell_info.get("druid_free_cast", False):
            free_cast_tracker = "druid_charm_person_used"
            free_cast_label = spell_info.get("free_cast_label", "Druid Initiate (Charm Person)")

        save_needed = False
        used_free_cast = False
        skip_slot_cost = False

        if spell_level > 0:
            sorcery_cost = spell_info.get("sorcery_point_cost")
            used_sorcery_points = False
            if sorcery_cost is not None:
                if self.current_sorcery_points >= sorcery_cost:
                    self.current_sorcery_points -= sorcery_cost
                    used_sorcery_points = True
                    save_needed = True
                    skip_slot_cost = True
                    if self.selected_spell == "Darkness":
                        message = "Darkness (-2 SP, Eyes of the Dark)"
                    else:
                        message = f"{self.selected_spell} (-{sorcery_cost} SP)"
                    logging.info(f"{message}. Sorcery Points remaining: {self.current_sorcery_points}")
                    self.show_temp_overlay(message)
                else:
                    logging.info(
                        f"Not enough sorcery points ({self.current_sorcery_points}) for {self.selected_spell}; using spell slot."
                    )
            
            if free_cast_tracker:
                if not getattr(self, free_cast_tracker, False):
                    setattr(self, free_cast_tracker, True)
                    used_free_cast = True
                    save_needed = True
                    logging.info(f"Cast {self.selected_spell} ({free_cast_label} - no spell slot consumed)")
            if not (used_free_cast or skip_slot_cost):
                lk = level_key(spell_level)
                available = self.current_spell_slots.get(lk, 0)
                if available <= 0:
                    logging.warning(f"No {lk} level spell slots remaining!")
                    return
                self.current_spell_slots[lk] = available - 1
                save_needed = True
                logging.info(f"Used {lk} level spell slot. Remaining: {self.current_spell_slots[lk]}")

        if spell_info.get("enhances_attack", False):
            logging.info(f"Casting {self.selected_spell} - switching to attack menu for weapon attack!")
            if save_needed:
                self.save_character_data()
            self.switch_to_attack_menu()
            return
        
        if spell_info.get("has_damage", False):
            damage_dice = spell_info["damage_dice"]
            total, breakdown = self.roll_dice(damage_dice)
            self.last_spell_damage_roll = (total, breakdown)
            logging.info(f"Spell damage: {total} ({' + '.join(map(str, breakdown))}) {spell_info['damage_type']}")
        else:
            logging.info(f"Cast {self.selected_spell} - {spell_info['description']}")
            self.last_spell_damage_roll = None
        
        if spell_info.get("activates_shield", False):
            self.shield_active = True
            self.recalculate_ac()
            save_needed = True
            logging.info(f"Shield spell activated - AC increased to {self.ac}")

        if spell_info.get("grants_mage_armor", False):
            self.activate_mage_armor(save=False)
            save_needed = True

        if save_needed:
            self.save_character_data()
    
    def perform_delayed_damage_roll(self):
        """Perform delayed damage roll for spells like Booming Blade and Absorb Elements"""
        if not self.selected_spell or self.selected_spell not in self.spell_data:
            return
        
        spell_info = self.spell_data[self.selected_spell]
        if not spell_info.get("has_delayed_damage", False):
            logging.warning(f"{self.selected_spell} doesn't have delayed damage!")
            return
        
        # Roll delayed damage (doesn't consume spell slot)
        damage_dice = spell_info["damage_dice"]
        total, breakdown = self.roll_dice(damage_dice)
        self.last_spell_damage_roll = (total, breakdown)
        
        delayed_desc = spell_info.get("delayed_description", "delayed effect")
        logging.info(f"{self.selected_spell} delayed damage: {total} ({' + '.join(map(str, breakdown))}) {spell_info['damage_type']}")
        logging.info(f"Trigger: {delayed_desc}")
    
    def perform_save_roll(self):
        """Perform a saving throw roll with the selected save"""
        if not self.selected_save:
            return
        
        # Calculate save bonus
        stat_modifier = self.stats[self.selected_save]["modifier"]
        is_proficient = self.selected_save in self.save_proficiencies
        proficiency_bonus = self.proficiency_bonus if is_proficient else 0
        total_bonus = stat_modifier + proficiency_bonus
        
        # Check if advantage is enabled
        has_advantage = self.saves_action_buttons[0].advantage_checked if len(self.saves_action_buttons) > 0 else False
        
        # Determine save names for output
        save_names = {
            "STR": "Strength", "DEX": "Dexterity", "CON": "Constitution",
            "INT": "Intelligence", "WIS": "Wisdom", "CHA": "Charisma"
        }
        save_name = save_names.get(self.selected_save, self.selected_save)
        
        if has_advantage:
            # Roll 2d20 and take the higher
            roll1_total, roll1_breakdown = self.roll_dice("1d20")
            roll2_total, roll2_breakdown = self.roll_dice("1d20")
            d20_roll = max(roll1_total, roll2_total)
            total = d20_roll + total_bonus
            breakdown = [f"1d20 (Advantage): [{roll1_total}, {roll2_total}] → {d20_roll}", f"+{total_bonus}"]
            logging.info(f"{save_name} save (ADVANTAGE): {total} (rolled {roll1_total} and {roll2_total}, used {d20_roll} + {total_bonus})")
        else:
            # Create dice notation
            dice_notation = f"1d20+{total_bonus}"
            total, breakdown = self.roll_dice(dice_notation)
            logging.info(f"{save_name} save: {total} ({' + '.join(map(str, breakdown))})")
        
        self.last_save_roll = (total, breakdown)
    
    def reset_death_saves(self):
        """Reset death saving throws"""
        self.death_saves["successes"] = 0
        self.death_saves["failures"] = 0
        self.last_death_save_roll = None  # Clear the display
        logging.info("Death saves reset!")
        
        # Auto-save after death save reset
        self.save_character_data()
    
    def take_damage_at_zero_hp(self):
        """Handle damage taken at 0 HP - adds one failed death save"""
        self.death_saves["failures"] += 1
        self.last_death_save_roll = "Dmg at 0: +1 Failure"
        
        logging.warning(f"Took damage at 0 HP! Death save failure added. ({self.death_saves['failures']}/3 failures)")
        
        if self.death_saves["failures"] >= 3:
            logging.error("You have died...")
        
        # Clamp death saves to valid ranges
        self.death_saves["failures"] = min(3, max(0, self.death_saves["failures"]))
        
        # Auto-save after damage
        self.save_character_data()
    
    def perform_death_save(self):
        """Perform a death saving throw (d20, 10+ is success)"""
        total, breakdown = self.roll_dice("1d20")
        self.last_death_save_roll = total  # Track for display
        
        if total >= 10:
            self.death_saves["successes"] += 1
            if total == 20:
                # Natural 20 on death save restores 1 HP
                self.current_hp = 1
                self.death_saves["successes"] = 0
                self.death_saves["failures"] = 0
                logging.info(f"Death save: {total} - NATURAL 20! Restored to 1 HP and stabilized!")
            else:
                logging.info(f"Death save: {total} - SUCCESS! ({self.death_saves['successes']}/3 successes)")
                if self.death_saves["successes"] >= 3:
                    logging.info("Stabilized! You are no longer dying.")
        else:
            self.death_saves["failures"] += 1
            logging.warning(f"Death save: {total} - FAILURE! ({self.death_saves['failures']}/3 failures)")
            if total == 1:
                # Natural 1 counts as 2 failures
                self.death_saves["failures"] += 1
                logging.warning(f"Natural 1! That's 2 failures! ({self.death_saves['failures']}/3 failures)")
            
            if self.death_saves["failures"] >= 3:
                logging.error("You have died...")
        
        # Clamp death saves to valid ranges
        self.death_saves["successes"] = min(3, max(0, self.death_saves["successes"]))
        self.death_saves["failures"] = min(3, max(0, self.death_saves["failures"]))
        
        # Auto-save after death save
        self.save_character_data()
    
    def handle_button_press(self, button_index):
        """Legacy method - redirect to new system"""
        self.handle_button_press_by_index(button_index)
    
    def draw(self):
        """Draw the appropriate interface based on current screen"""
        if self.current_screen == "main":
            self.draw_main_interface()
        elif self.current_screen == "attack":
            self.draw_attack_menu(self.screen)
        elif self.current_screen == "actions":
            self.draw_actions_menu(self.screen)
        elif self.current_screen == "spells":
            self.draw_spells_menu(self.screen)
        elif self.current_screen == "saves":
            self.draw_saves_menu(self.screen)
        elif self.current_screen == "bag":
            self.draw_bag_menu(self.screen)
        elif self.current_screen == "journal":
            self.draw_journal_menu(self.screen)
        
        if self.short_rest_modal_open:
            self.draw_short_rest_modal(self.screen)
        
        # Draw temporary overlay last (on top of everything)
        self.draw_temporary_overlay(self.screen)
        
        pygame.display.flip()
    
    def draw_main_interface(self):
        """Draw the main character sheet interface"""
        # Draw background image or solid color
        if self.background_image:
            self.screen.blit(self.background_image, (0, 0))
        else:
            self.screen.fill(DARK_BG)
        
        # Draw all components
        self.draw_character_header(self.screen)
        self.draw_health_display(self.screen)
        self.draw_skills_section(self.screen)
        self.draw_stats_section(self.screen)
        self.draw_feats_traits_section(self.screen)
        
        # Draw buttons
        for button in self.buttons:
            button.draw(self.screen)
        

    
    def draw_death_saves(self, screen):
        """Draw death saving throw tracking on the right side"""
        x = self.current_width - 220
        y = 150
        
        # Death saves card - 32% taller for better button fit (20% + 10%)
        card_y = self.draw_card(screen, x, y, 200, 396, "Death Saves", "center", 200)
        
        current_y = card_y + 20
        
        # Successes
        success_text = f"Successes: {self.death_saves['successes']}/3"
        success_surface = self.text_font.render(success_text, True, TEXT_PRIMARY)
        screen.blit(success_surface, (x + 10, current_y))
        current_y += 30
        
        # Draw success circles
        for i in range(3):
            circle_x = x + 20 + i * 25
            circle_y = current_y + 10
            if i < self.death_saves['successes']:
                pygame.draw.circle(screen, SUCCESS, (circle_x, circle_y), 10)
            else:
                pygame.draw.circle(screen, BORDER, (circle_x, circle_y), 10, 2)
        
        current_y += 40
        
        # Failures
        failure_text = f"Failures: {self.death_saves['failures']}/3"
        failure_surface = self.text_font.render(failure_text, True, TEXT_PRIMARY)
        screen.blit(failure_surface, (x + 10, current_y))
        current_y += 30
        
        # Draw failure circles
        for i in range(3):
            circle_x = x + 20 + i * 25
            circle_y = current_y + 10
            if i < self.death_saves['failures']:
                pygame.draw.circle(screen, DANGER, (circle_x, circle_y), 10)
            else:
                pygame.draw.circle(screen, BORDER, (circle_x, circle_y), 10, 2)
        
        current_y += 50
        
        # Display last death save roll
        if self.last_death_save_roll:
            result_text = f"Last Roll: {self.last_death_save_roll}"
            result_surface = self.small_font.render(result_text, True, TEXT_PRIMARY)
            screen.blit(result_surface, (x + 10, current_y))
        current_y += 25
        
        # Death saving throw button (20% longer and centered)
        button_width = 144  # 20% longer than 120
        button_x = x + (200 - button_width) // 2  # Center in the 200px wide card
        
        death_save_button = ModernButton(button_x, current_y, button_width, 35, "DEATH SAVE", (120, 80, 80), self.ui_box_button_image)
        death_save_button.draw(screen)
        
        # Store button for click detection
        self.death_save_button = death_save_button
        
        current_y += 45
        
        # Damage at 0 HP button (20% longer and centered)
        damage_button = ModernButton(button_x, current_y, button_width, 35, "DAMAGE AT 0", (150, 80, 80), self.ui_box_button_image)
        damage_button.draw(screen)
        
        # Store button for click detection
        self.death_damage_button = damage_button
        
        current_y += 45
        
        # Reset button (20% longer and centered)
        reset_button = ModernButton(button_x, current_y, button_width, 35, "RESET", (100, 100, 100), self.ui_box_button_image)
        reset_button.draw(screen)
        
        # Store button for click detection
        self.death_save_reset_button = reset_button
    
    def draw_save_results(self, screen):
        """Draw the results of saving throw rolls"""
        y_pos = 580
        
        if self.last_save_roll:
            total, breakdown = self.last_save_roll
            save_text = f"Save Roll: {total}"
            save_surface = self.text_font.render(save_text, True, TEXT_PRIMARY)
            
            # Center the result under the Make Save button
            info_box_center = self.current_width // 2
            button_width = self.saves_action_buttons[0].rect.width if self.saves_action_buttons else 0
            result_x = info_box_center - button_width // 2
            
            screen.blit(save_surface, (result_x, y_pos))
            
            # Format breakdown properly without extra "+" signs
            breakdown_parts = []
            for part in breakdown:
                if isinstance(part, str) and (part.startswith('+') or part.startswith('-')):
                    breakdown_parts.append(part[1:] if part.startswith('+') else part)
                else:
                    breakdown_parts.append(str(part))
            
            breakdown_text = f"({' + '.join(breakdown_parts)})"
            breakdown_surface = self.small_font.render(breakdown_text, True, TEXT_SECONDARY)
            screen.blit(breakdown_surface, (result_x, y_pos + 25))
    
    def draw_bag_menu(self, screen):
        """Draw the bag submenu"""
        # Draw background
        if self.submenu_backgrounds.get('bag'):
            screen.blit(self.submenu_backgrounds['bag'], (0, 0))
        elif self.background_image:
            screen.blit(self.background_image, (0, 0))
        else:
            screen.fill(DARK_BG)
        
        # Title
        title = self.title_font.render("INVENTORY", True, TEXT_PRIMARY)
        title_rect = title.get_rect(center=(self.current_width // 2, 50))
        screen.blit(title, title_rect)
        
        # Draw back button
        for button in self.bag_buttons:
            button.draw(screen)
        
        # Draw inventory items in the center
        self.draw_inventory_items(screen)
        
        # Draw coin system on the right
        self.draw_coin_system(screen)
        
        # Draw add item input at the bottom
        self.draw_add_item_input(screen)
    
    def draw_journal_menu(self, screen):
        """Draw the journal submenu"""
        # Draw background
        if self.submenu_backgrounds.get('journal'):
            screen.blit(self.submenu_backgrounds['journal'], (0, 0))
        elif self.background_image:
            screen.blit(self.background_image, (0, 0))
        else:
            screen.fill(DARK_BG)
        
        # Title
        title = self.title_font.render("JOURNAL", True, TEXT_PRIMARY)
        title_rect = title.get_rect(center=(self.current_width // 2, 50))
        screen.blit(title, title_rect)
        
        # Draw session buttons
        for button in self.journal_buttons:
            button.draw(screen)
        
        # Draw current journal content
        self.draw_journal_content(screen)
        
        # Draw character tracking UI on the right
        self.draw_character_tracking(screen)
        
        # Draw session input for adding new sessions
        self.draw_session_input(screen)
        
    
    def _build_char_map(self, words_with_pos, first_word, last_word, para_start):
        """Build a mapping from display-text cursor positions to original-text positions.
        Returns a list of length len(display_text) + 1."""
        char_map = []
        for w in range(first_word, last_word + 1):
            word, w_start, w_end = words_with_pos[w]
            if w > first_word:
                char_map.append(para_start + w_start - 1)
            for ci in range(len(word)):
                char_map.append(para_start + w_start + ci)
        end_pos = para_start + words_with_pos[last_word][2]
        char_map.append(end_pos)
        return char_map

    def wrap_text_paragraph_indexed(self, text, font, max_width):
        """Wrap text and return list of {"text", "start", "end", "char_map"} dicts
        with correct character positions in the original text.
        char_map[display_idx] gives the original-text position for each cursor slot."""
        if not text:
            return [{"text": "", "start": 0, "end": 0, "char_map": [0]}]

        result = []
        paragraphs = text.split('\n')
        pos = 0

        for p_idx, para in enumerate(paragraphs):
            para_start = pos

            if not para.strip():
                result.append({"text": "", "start": para_start,
                               "end": para_start + len(para),
                               "char_map": [para_start]})
                pos += len(para) + (1 if p_idx < len(paragraphs) - 1 else 0)
                continue

            words_with_pos = []
            i = 0
            while i < len(para):
                while i < len(para) and para[i] == ' ':
                    i += 1
                if i >= len(para):
                    break
                ws = i
                while i < len(para) and para[i] != ' ':
                    i += 1
                words_with_pos.append((para[ws:i], ws, i))

            if not words_with_pos:
                result.append({"text": "", "start": para_start,
                               "end": para_start + len(para),
                               "char_map": [para_start]})
                pos += len(para) + (1 if p_idx < len(paragraphs) - 1 else 0)
                continue

            current_display = ""
            line_first_word = 0

            for w_idx, (word, w_start, w_end) in enumerate(words_with_pos):
                test = f"{current_display} {word}".strip() if current_display else word
                if font.size(test)[0] <= max_width:
                    current_display = test
                else:
                    if current_display:
                        first_s = words_with_pos[line_first_word][1]
                        last_e = words_with_pos[w_idx - 1][2]
                        cmap = self._build_char_map(
                            words_with_pos, line_first_word, w_idx - 1, para_start
                        )
                        result.append({
                            "text": current_display,
                            "start": para_start + first_s,
                            "end": para_start + last_e,
                            "char_map": cmap
                        })
                    current_display = word
                    line_first_word = w_idx

            if current_display:
                first_s = words_with_pos[line_first_word][1]
                last_e = words_with_pos[-1][2]
                cmap = self._build_char_map(
                    words_with_pos, line_first_word, len(words_with_pos) - 1, para_start
                )
                result.append({
                    "text": current_display,
                    "start": para_start + first_s,
                    "end": para_start + last_e,
                    "char_map": cmap
                })

            pos += len(para) + (1 if p_idx < len(paragraphs) - 1 else 0)

        return result
    
    def draw_journal_content(self, screen):
        """Draw the main journal content area"""
        # Journal content area - centered between session buttons and character box
        left_boundary = 260  # After session buttons
        right_boundary = self.current_width - 340  # Before character box
        available_width = right_boundary - left_boundary
        width = max(200, min(900, available_width - 40))
        height = 600
        x = left_boundary + (available_width - width) // 2  # Center it
        y = 120
        
        is_character_entry = self.active_entry_type == "character" and self.current_character
        is_place_entry = self.active_entry_type == "place" and self.current_place
        
        # Determine header text
        if is_character_entry:
            entry_label = self.current_character
        elif is_place_entry:
            entry_label = self.current_place
        else:
            entry_label = self.current_journal_session
        header_text = f"Journal: {entry_label}" if entry_label else "Journal"
        
        # Draw journal card
        card_y = self.draw_card(screen, x, y, width, height, header_text, "center", 200)
        
        # Store journal area for text input
        self.journal_content_rect = pygame.Rect(x + 20, card_y + 10, width - 40, height - 80)
        
        # Check if session title area is clicked for editing
        self.session_title_rect = pygame.Rect(x + 20, y + 5, width - 40, 30)
        self.character_header_rect = self.session_title_rect if (is_character_entry or is_place_entry) else None
        
        # Draw session name editing if active
        if self.session_name_editing and not is_character_entry:
            edit_surface = pygame.Surface((width - 40, 30), pygame.SRCALPHA)
            pygame.draw.rect(edit_surface, (255, 165, 80, 60), (0, 0, width - 40, 30))
            screen.blit(edit_surface, (x + 20, y + 5))
            pygame.draw.rect(screen, (255, 165, 80), self.session_title_rect, 2, border_radius=3)
            edit_text = f"Journal: {self.session_name_edit_text}"
            edit_surface = self.title_font.render(edit_text, True, TEXT_PRIMARY)
            edit_rect = edit_surface.get_rect(center=(self.current_width // 2, y + 20))
            screen.blit(edit_surface, edit_rect)
            cursor_x = edit_rect.centerx + edit_surface.get_width() // 2
            if int(time.time() * 2) % 2:
                pygame.draw.line(screen, (255, 165, 80), (cursor_x, y + 8), (cursor_x, y + 32), 2)
        elif self.character_name_editing and is_character_entry:
            edit_surface = pygame.Surface((width - 40, 30), pygame.SRCALPHA)
            pygame.draw.rect(edit_surface, (255, 165, 80, 60), (0, 0, width - 40, 30))
            screen.blit(edit_surface, (x + 20, y + 5))
            pygame.draw.rect(screen, (255, 165, 80), self.session_title_rect, 2, border_radius=3)
            edit_text = f"Journal: {self.character_name_edit_text}"
            edit_surface = self.title_font.render(edit_text, True, TEXT_PRIMARY)
            edit_rect = edit_surface.get_rect(center=(self.current_width // 2, y + 20))
            screen.blit(edit_surface, edit_rect)
            cursor_x = edit_rect.centerx + edit_surface.get_width() // 2
            if int(time.time() * 2) % 2:
                pygame.draw.line(screen, (255, 165, 80), (cursor_x, y + 8), (cursor_x, y + 32), 2)
        elif self.place_name_editing and is_place_entry:
            edit_surface = pygame.Surface((width - 40, 30), pygame.SRCALPHA)
            pygame.draw.rect(edit_surface, (255, 165, 80, 60), (0, 0, width - 40, 30))
            screen.blit(edit_surface, (x + 20, y + 5))
            pygame.draw.rect(screen, (255, 165, 80), self.session_title_rect, 2, border_radius=3)
            edit_text = f"Journal: {self.place_name_edit_text}"
            edit_surface = self.title_font.render(edit_text, True, TEXT_PRIMARY)
            edit_rect = edit_surface.get_rect(center=(self.current_width // 2, y + 20))
            screen.blit(edit_surface, edit_rect)
            cursor_x = edit_rect.centerx + edit_surface.get_width() // 2
            if int(time.time() * 2) % 2:
                pygame.draw.line(screen, (255, 165, 80), (cursor_x, y + 8), (cursor_x, y + 32), 2)
        
        # Draw active border if text area is active
        if self.journal_text_active:
            pygame.draw.rect(screen, (255, 165, 80), self.journal_content_rect, 3, border_radius=5)
            highlight_surface = pygame.Surface((width - 40, height - 80), pygame.SRCALPHA)
            pygame.draw.rect(highlight_surface, (255, 165, 80, 20), (0, 0, width - 40, height - 80))
            screen.blit(highlight_surface, (x + 20, card_y + 10))
        
        # Get text for current entry
        if is_character_entry:
            current_text = self.characters.get(self.current_character, "")
        elif is_place_entry:
            current_text = self.places.get(self.current_place, "")
        else:
            current_text = self.journal.get("sessions", {}).get(self.current_journal_session, "")
        
        # Wrap text for display with position tracking
        max_text_width = self.journal_content_rect.width - 10
        self.journal_display_lines = self.wrap_text_paragraph_indexed(
            current_text, self.text_font, max_text_width
        )
        wrapped_lines = [meta["text"] for meta in self.journal_display_lines]
        
        line_height = 22
        visible_lines = max(1, (height - 100) // line_height)
        self.journal_visible_lines = visible_lines
        total_display_lines = len(wrapped_lines)
        max_scroll = max(0, total_display_lines - visible_lines)
        self.journal_scroll_offset = max(0, min(self.journal_scroll_offset, max_scroll))
        start_line = self.journal_scroll_offset
        end_line = min(start_line + visible_lines, total_display_lines)
        
        current_y = card_y + 20
        text_y = current_y

        sel_range = self.get_journal_selection_range() if self.journal_text_active else None
        display_lines_meta = self.journal_display_lines or []

        for i in range(start_line, end_line):
            line_x = self.journal_content_rect.x
            line_text = wrapped_lines[i]

            if sel_range and i < len(display_lines_meta):
                sel_start, sel_end = sel_range
                meta = display_lines_meta[i]
                l_start = meta.get("start", 0)
                l_end = meta.get("end", l_start + len(line_text))
                if sel_start < l_end and sel_end > l_start:
                    char_map = meta.get("char_map")
                    if char_map:
                        hl_begin = 0
                        hl_finish = len(line_text)
                        for d, orig in enumerate(char_map):
                            if orig >= sel_start:
                                hl_begin = d
                                break
                        for d in range(len(char_map) - 1, -1, -1):
                            if char_map[d] <= sel_end:
                                hl_finish = min(d, len(line_text))
                                break
                    else:
                        hl_begin = max(0, sel_start - l_start)
                        hl_finish = min(len(line_text), sel_end - l_start)
                    hl_begin = max(0, min(hl_begin, len(line_text)))
                    hl_finish = max(hl_begin, min(hl_finish, len(line_text)))
                    if hl_finish > hl_begin:
                        before_w = self.text_font.size(line_text[:hl_begin])[0]
                        sel_w = self.text_font.size(line_text[hl_begin:hl_finish])[0]
                        hl_surf = pygame.Surface((sel_w, line_height), pygame.SRCALPHA)
                        hl_surf.fill((100, 140, 220, 100))
                        screen.blit(hl_surf, (line_x + before_w, current_y))

            line_surface = self.text_font.render(line_text, True, TEXT_PRIMARY)
            screen.blit(line_surface, (line_x, current_y))
            current_y += line_height
        
        if self.journal_text_active:
            display_lines = self.journal_display_lines or []
            cursor_pos = self.journal_cursor_position
            cursor_line = 0
            display_offset = 0

            for i, meta in enumerate(display_lines):
                start_idx = meta.get("start", 0)
                end_idx = meta.get("end", start_idx)
                char_map = meta.get("char_map")
                if start_idx <= cursor_pos <= end_idx:
                    cursor_line = i
                    if char_map:
                        display_offset = len(meta.get("text", ""))
                        for d, orig in enumerate(char_map):
                            if orig >= cursor_pos:
                                display_offset = d
                                break
                    else:
                        display_offset = cursor_pos - start_idx
                    break
                if cursor_pos > end_idx:
                    cursor_line = i
                    display_offset = len(meta.get("text", ""))

            if start_line <= cursor_line < end_line:
                visible_line_idx = cursor_line - start_line
                cursor_y = text_y + visible_line_idx * line_height

                line_meta = display_lines[cursor_line] if display_lines else {"text": ""}
                line_text = line_meta.get("text", "")
                display_offset = max(0, min(display_offset, len(line_text)))
                line_before_cursor = line_text[:display_offset]
                cursor_x = self.journal_content_rect.x + self.text_font.size(line_before_cursor)[0]

                if int(time.time() * 2) % 2:
                    pygame.draw.line(screen, (255, 165, 80), (cursor_x, cursor_y), (cursor_x, cursor_y + line_height - 2), 2)
        
        if self.journal_text_active:
            instruction_text = "Click here and type to edit • ESC to finish • Arrow keys to scroll"
            instruction_surface = self.small_font.render(instruction_text, True, (255, 165, 80))
            screen.blit(instruction_surface, (x + 25, card_y + height - 105))
        else:
            if is_character_entry:
                instruction_text = "Click here to start writing character notes..."
            elif is_place_entry:
                instruction_text = "Click here to start writing place notes..."
            else:
                instruction_text = "Click here to start writing..."
            instruction_surface = self.small_font.render(instruction_text, True, TEXT_SECONDARY)
            screen.blit(instruction_surface, (x + 25, card_y + height - 105))
        
        if len(wrapped_lines) > visible_lines:
            scroll_info = f"Lines {start_line + 1}-{end_line} of {len(wrapped_lines)}"
            scroll_surface = self.small_font.render(scroll_info, True, TEXT_SECONDARY)
            screen.blit(scroll_surface, (x + width - 150, y + height - 45))
    
    def draw_session_input(self, screen):
        """Draw the session input field for adding new sessions"""
        # Position below the last session button
        sessions = list(self.journal.get("sessions", {}).keys())
        y_start = 150
        button_spacing = 60
        input_y = y_start + len(sessions) * button_spacing + 20
        
        # Session input field
        input_width = 200
        input_height = 30
        x = 50
        
        # Label
        label_surface = self.small_font.render("Add Session:", True, TEXT_SECONDARY)
        screen.blit(label_surface, (x, input_y))
        
        # Input field background
        input_rect = pygame.Rect(x, input_y + 20, input_width, input_height)
        self.session_input_rect = input_rect
        
        # Draw input field with UI box if available
        if self.ui_box_image:
            scaled_input_box = pygame.transform.scale(self.ui_box_image, (input_width, input_height))
            input_alpha = 220 if self.session_input_active else 150
            scaled_input_box.set_alpha(input_alpha)
            screen.blit(scaled_input_box, (x, input_y + 20))
            
            # Add border highlight if active
            if self.session_input_active:
                pygame.draw.rect(screen, (255, 165, 80), input_rect, 2, border_radius=4)
        else:
            # Fallback to old method
            input_surface = pygame.Surface((input_width, input_height), pygame.SRCALPHA)
            input_color = (255, 165, 80) if self.session_input_active else BORDER
            pygame.draw.rect(input_surface, (20, 20, 25, 180), (0, 0, input_width, input_height))
            pygame.draw.rect(input_surface, input_color, (0, 0, input_width, input_height), 2)
            screen.blit(input_surface, (x, input_y + 20))
        
        # Input text
        display_text = self.session_input_text if self.session_input_text else "Session name..."
        text_color = TEXT_PRIMARY if self.session_input_text else TEXT_SECONDARY
        input_text_surface = self.text_font.render(display_text, True, text_color)
        screen.blit(input_text_surface, (x + 10, input_y + 25))
        
        # Cursor if active
        if self.session_input_active:
            cursor_x = x + 10 + input_text_surface.get_width()
            pygame.draw.line(screen, TEXT_PRIMARY, (cursor_x, input_y + 23), (cursor_x, input_y + 47), 2)
    
    
    def set_journal_entity_mode(self, mode: str) -> None:
        if mode not in ("character", "place"):
            return
        if self.journal_entity_mode == mode:
            return

        self.journal_entity_mode = mode
        self.journal_text_active = False
        self.session_name_editing = False
        self.character_name_editing = False
        self.place_name_editing = False
        self.journal_cursor_position = 0
        self.journal_scroll_offset = 0

        if mode == "character":
            if self.current_character not in self.characters:
                self.current_character = None
            self.active_entry_type = "character" if self.current_character else "journal"
        else:
            if self.current_place not in self.places:
                self.current_place = None
            self.active_entry_type = "place" if self.current_place else "journal"

    def _entity_prefix(self, mode: Optional[str] = None) -> str:
        if mode is None:
            mode = self.journal_entity_mode
        return "character" if mode == "character" else "place"

    def get_active_entity_store(self):
        return self.characters if self.journal_entity_mode == "character" else self.places

    def get_current_entity_name(self):
        return self.current_character if self.journal_entity_mode == "character" else self.current_place

    def set_current_entity_name(self, name: Optional[str]) -> None:
        if self.journal_entity_mode == "character":
            self.current_character = name
        else:
            self.current_place = name

    def get_active_entity_page(self) -> int:
        return self.character_page if self.journal_entity_mode == "character" else self.place_page

    def set_active_entity_page(self, value: int) -> None:
        if self.journal_entity_mode == "character":
            self.character_page = value
        else:
            self.place_page = value

    def current_journal_entry_kind(self) -> str:
        if self.active_entry_type == "character" and self.current_character:
            return "character"
        if self.active_entry_type == "place" and self.current_place:
            return "place"
        return "journal"

    def get_current_journal_text(self) -> str:
        if self.active_entry_type == "character" and self.current_character:
            return self.characters.get(self.current_character, "")
        if self.active_entry_type == "place" and self.current_place:
            return self.places.get(self.current_place, "")
        return self.journal.get("sessions", {}).get(self.current_journal_session, "")

    def set_journal_cursor_position(self, new_pos: int) -> None:
        text = self.get_current_journal_text()
        clamped = max(0, min(len(text), new_pos))
        self.journal_cursor_position = clamped
        if self.active_entry_type == "character":
            self.character_cursor_position = clamped
        elif self.active_entry_type == "place":
            self.place_cursor_position = clamped

    def move_journal_cursor(self, offset: int) -> None:
        self.set_journal_cursor_position(self.journal_cursor_position + offset)


    def draw_character_tracking(self, screen):
        """Draw the character tracking UI on the right side"""
        x = self.current_width - 320
        y = 120
        width, height = 300, 600
        
        # Draw character card container (custom header below)
        card_y = self.draw_card(screen, x, y, width, height, "", "center", 200)

        # Mode toggle header
        mode_options = [("CHARACTERS", "character"), ("PLACES", "place")]
        toggle_x = x + 20
        toggle_y = y + 12
        self.journal_mode_toggle_rects = {}

        for label, mode in mode_options:
            is_active = (self.journal_entity_mode == mode)
            font = self.header_font if is_active else self.subheader_font
            color = ACCENT if is_active else TEXT_SECONDARY
            label_surface = font.render(label, True, color)
            label_rect = label_surface.get_rect()
            label_rect.topleft = (toggle_x, toggle_y)
            screen.blit(label_surface, label_rect)

            hit_rect = label_rect.inflate(12, 8)
            self.journal_mode_toggle_rects[mode] = hit_rect

            if is_active:
                underline_rect = pygame.Rect(label_rect.left, label_rect.bottom + 2, label_rect.width, 3)
                pygame.draw.rect(screen, ACCENT, underline_rect)

            toggle_x = label_rect.right + 16

        prefix = self._entity_prefix()
        entity_store = self.characters if prefix == "character" else self.places
        current_entity = getattr(self, f"current_{prefix}")
        page_attr = f"{prefix}_page"
        page_value = max(0, getattr(self, page_attr, 0))

        entity_names = list(entity_store.keys())
        entities_per_page = 13
        filled_pages = (len(entity_names) + entities_per_page - 1) // entities_per_page
        total_pages = max(1, filled_pages + (1 if len(entity_names) % entities_per_page == 0 and len(entity_names) > 0 else 0))

        page_value = max(0, min(page_value, total_pages - 1))
        setattr(self, page_attr, page_value)

        start_idx = page_value * entities_per_page
        end_idx = min(start_idx + entities_per_page, len(entity_names))
        page_entities = entity_names[start_idx:end_idx]
        
        # Draw character name buttons (single column, wider buttons)
        list_start_y = card_y + 40
        current_y = list_start_y
        side_margin = 20
        button_width = width - side_margin * 2
        button_height = 36
        button_gap = 4
        
        buttons_attr = f"{prefix}_name_buttons"
        if not hasattr(self, buttons_attr):
            setattr(self, buttons_attr, [])
        setattr(self, buttons_attr, [])
        button_list = getattr(self, buttons_attr)

        for i, entity_name in enumerate(page_entities):
            char_x = x + side_margin
            char_y = current_y + i * (button_height + button_gap)
            
            # Highlight selected entry
            color = (120, 80, 150) if entity_name == current_entity else (70, 70, 70)
            
            # Truncate long names
            display_name = entity_name if len(entity_name) <= 18 else entity_name[:15] + "..."
            button = ModernButton(char_x, char_y, button_width, button_height, display_name, color, self.ui_box_button_image)
            button.entity_name = entity_name
            button_list.append(button)
            button.draw(screen)
        
        # Add "Create" button at next available position
        create_attr = f"{prefix}_create_button"
        if len(page_entities) < entities_per_page:
            char_x = x + side_margin
            char_y = list_start_y + len(page_entities) * (button_height + button_gap)
            
            create_button = ModernButton(char_x, char_y, button_width, button_height, "+ Create", (80, 120, 80), self.ui_box_button_image)
            setattr(self, create_attr, create_button)
            create_button.draw(screen)
        else:
            setattr(self, create_attr, None)
        
        # Navigation buttons (show if there are multiple pages OR current page is full)
        # This allows navigation to a blank next page to create more entries
        show_nav = len(entity_names) >= entities_per_page or page_value > 0
        
        if show_nav:
            nav_y = card_y + height - 35
            
            # Only show back button if not on first page
            back_attr = f"{prefix}_back_button"
            if page_value > 0:
                back_button = ModernButton(x + 10, nav_y, 60, 35, "<", (70, 70, 70), self.ui_box_button_image)
                back_button.draw(screen)
                setattr(self, back_attr, back_button)
            else:
                setattr(self, back_attr, None)
            
            # Always show forward button if we're showing nav (unless we're past all pages)
            forward_attr = f"{prefix}_forward_button"
            if page_value < total_pages:
                forward_button = ModernButton(x + width - 70, nav_y, 60, 35, ">", (70, 70, 70), self.ui_box_button_image)
                forward_button.draw(screen)
                setattr(self, forward_attr, forward_button)
            else:
                setattr(self, forward_attr, None)
            
            # Page indicator (show current page even if on empty page)
            current_page_display = min(page_value + 1, total_pages)
            page_text = f"Page {current_page_display}/{total_pages}"
            page_surface = self.small_font.render(page_text, True, TEXT_SECONDARY)
            page_rect = page_surface.get_rect(center=(x + width // 2, nav_y + 17))
            screen.blit(page_surface, page_rect)
        else:
            setattr(self, f"{prefix}_back_button", None)
            setattr(self, f"{prefix}_forward_button", None)
    
    def draw_inventory_items(self, screen):
        """Draw the inventory items in the center"""
        # Center inventory box (40% larger)
        width, height = 700, 560  # Increased from 500x400
        # Calculate proper centering accounting for left buttons (~200px) and right coin UI (~220px)
        left_buttons_width = 200
        coin_ui_width = 220
        available_center_width = self.current_width - left_buttons_width - coin_ui_width
        x = left_buttons_width + (available_center_width - width) // 2
        y = 120
        
        # Draw inventory card with current category name
        category_names = {"gear": "Gear", "utility": "Utility Items", "treasure": "Treasure"}
        card_title = category_names.get(self.current_inventory_type, "Items")
        card_y = self.draw_card(screen, x, y, width, height, card_title, "center", 200)
        
        # Store window dimensions for add item box
        self.inventory_window_x = x
        self.inventory_window_y = y
        self.inventory_window_width = width
        self.inventory_window_height = height
        
        current_y = card_y + 10
        max_visible_items = 20  # More items fit in larger box
        
        # Get current inventory items
        current_items = self.inventory.get(self.current_inventory_type, [])
        
        # Draw inventory items
        for i, item in enumerate(current_items[:max_visible_items]):
            item_y = current_y + i * 26
            
            # Highlight item if it's being hovered/selected
            item_rect = pygame.Rect(x + 10, item_y, width - 20, 24)
            
            # Check if mouse is over this item (store for click detection)
            mouse_pos = pygame.mouse.get_pos()
            if item_rect.collidepoint(mouse_pos):
                # Draw hover background
                hover_surface = pygame.Surface((width - 20, 24), pygame.SRCALPHA)
                pygame.draw.rect(hover_surface, (255, 165, 80, 60), (0, 0, width - 20, 24))
                screen.blit(hover_surface, (x + 10, item_y))
            
            # Draw item text
            item_surface = self.text_font.render(f"• {item}", True, TEXT_PRIMARY)
            screen.blit(item_surface, (x + 15, item_y + 3))
            
            # Store item rect for click detection
            if not hasattr(self, 'item_rects'):
                self.item_rects = []
            if len(self.item_rects) <= i:
                self.item_rects.append(item_rect)
            else:
                self.item_rects[i] = item_rect
        
        # Show item count if more items than can be displayed
        if len(current_items) > max_visible_items:
            more_text = f"... and {len(current_items) - max_visible_items} more items"
            more_surface = self.small_font.render(more_text, True, TEXT_SECONDARY)
            screen.blit(more_surface, (x + 15, current_y + max_visible_items * 26))
    
    def draw_coin_system(self, screen):
        """Draw the coin tracking system on the right side"""
        x = self.current_width - 220
        y = 120
        
        # Coin system card (taller)
        card_y = self.draw_card(screen, x, y, 200, 560, "Coins", "center", 200)
        
        current_y = card_y + 20
        
        # Define coin types with colors
        coin_types = [
            ("cp", "Copper", (184, 115, 51)),      # Bronze/copper color
            ("sp", "Silver", (192, 192, 192)),     # Silver color
            ("ep", "Electrum", (218, 165, 32)),    # Golden color
            ("gp", "Gold", (255, 215, 0)),         # Gold color
            ("pp", "Platinum", (229, 228, 226))    # Platinum color
        ]
        
        for coin_type, coin_name, coin_color in coin_types:
            # Coin type header
            coin_text = f"{coin_name}: {self.coins[coin_type]}"
            coin_surface = self.text_font.render(coin_text, True, coin_color)
            screen.blit(coin_surface, (x + 10, current_y))
            current_y += 30
            
            # Add/Remove buttons - made square and centered
            button_size = 40
            button_y = current_y + 5  # Center vertically in the space
            spacing = 50  # Space between buttons
            total_button_width = button_size * 2 + spacing
            start_x = x + (200 - total_button_width) // 2  # Center horizontally in the 200px card
            
            add_button = ModernButton(start_x, button_y, button_size, button_size, "+", (80, 120, 80), self.ui_box_button_image)
            remove_button = ModernButton(start_x + button_size + spacing, button_y, button_size, button_size, "-", (120, 80, 80), self.ui_box_button_image)
            
            add_button.draw(screen)
            remove_button.draw(screen)
            
            # Store buttons for click detection
            if not hasattr(self, 'coin_buttons'):
                self.coin_buttons = {}
            
            self.coin_buttons[f"{coin_type}_add"] = add_button
            self.coin_buttons[f"{coin_type}_remove"] = remove_button
            
            current_y += 50
        
        # Coin input field (below coins, above total)
        current_y += 20
        self.draw_coin_input_field(screen, x, current_y)
        
        # Total wealth calculation (in GP equivalent)
        total_value = (self.coins["cp"] * 0.01 + 
                      self.coins["sp"] * 0.1 + 
                      self.coins["ep"] * 0.5 + 
                      self.coins["gp"] * 1.0 + 
                      self.coins["pp"] * 10.0)
        
        current_y += 100
        total_text = f"Total: {total_value:.2f} GP"
        total_surface = self.text_font.render(total_text, True, TEXT_PRIMARY)
        screen.blit(total_surface, (x + 10, current_y))
    
    def draw_coin_input_field(self, screen, x, y):
        """Draw the coin input field"""
        input_width = 180
        input_height = 30
        
        # Input field label
        label_surface = self.small_font.render("Amount:", True, TEXT_SECONDARY)
        screen.blit(label_surface, (x + 10, y))
        
        # Input field background
        input_rect = pygame.Rect(x + 10, y + 20, input_width, input_height)
        self.coin_input_rect = input_rect
        
        # Draw input field with UI box if available
        if self.ui_box_image:
            scaled_input_box = pygame.transform.scale(self.ui_box_image, (input_width, input_height))
            input_alpha = 220 if self.coin_input_active else 150
            scaled_input_box.set_alpha(input_alpha)
            screen.blit(scaled_input_box, (x + 10, y + 20))
            
            # Add border highlight if active
            if self.coin_input_active:
                pygame.draw.rect(screen, (255, 165, 80), input_rect, 2, border_radius=4)
        else:
            # Fallback to old method
            input_surface = pygame.Surface((input_width, input_height), pygame.SRCALPHA)
            input_color = (255, 165, 80) if self.coin_input_active else BORDER
            pygame.draw.rect(input_surface, (20, 20, 25, 180), (0, 0, input_width, input_height))
            pygame.draw.rect(input_surface, input_color, (0, 0, input_width, input_height), 2)
            screen.blit(input_surface, (x + 10, y + 20))
        
        # Input text
        display_text = self.coin_input_text if self.coin_input_text else "0"
        text_color = TEXT_PRIMARY if self.coin_input_text else TEXT_SECONDARY
        input_text_surface = self.text_font.render(display_text, True, text_color)
        screen.blit(input_text_surface, (x + 15, y + 25))
        
        # Cursor if active
        if self.coin_input_active:
            cursor_x = x + 15 + input_text_surface.get_width()
            pygame.draw.line(screen, TEXT_PRIMARY, (cursor_x, y + 23), (cursor_x, y + 47), 2)
    
    def draw_add_item_input(self, screen):
        """Draw the add item input field below the inventory window"""
        # Use inventory window width and position it right below
        if hasattr(self, 'inventory_window_x'):
            input_width = self.inventory_window_width
            input_height = 30
            x = self.inventory_window_x
            y = self.inventory_window_y + self.inventory_window_height + 20
        else:
            # Fallback positioning
            input_width = 700
            input_height = 30
            x = (self.current_width - input_width) // 2 - 60
            y = self.current_height - 120
        
        # Draw input field card
        category_names = {"gear": "Add Gear", "utility": "Add Utility Item", "treasure": "Add Treasure"}
        add_title = category_names.get(self.current_inventory_type, "Add Item")
        card_y = self.draw_card(screen, x, y, input_width, 80, add_title, "center", 200)
        
        # Input field background
        input_rect = pygame.Rect(x + 20, y + 45, input_width - 40, input_height)
        self.item_input_rect = input_rect
        
        # Draw input field with UI box if available
        if self.ui_box_image:
            scaled_input_box = pygame.transform.scale(self.ui_box_image, (input_width - 40, input_height))
            input_alpha = 220 if self.item_input_active else 150
            scaled_input_box.set_alpha(input_alpha)
            screen.blit(scaled_input_box, (x + 20, y + 45))
            
            # Add border highlight if active
            if self.item_input_active:
                pygame.draw.rect(screen, (255, 165, 80), input_rect, 2, border_radius=4)
        else:
            # Fallback to old method
            input_surface = pygame.Surface((input_width - 40, input_height), pygame.SRCALPHA)
            input_color = (255, 165, 80) if self.item_input_active else BORDER
            pygame.draw.rect(input_surface, (20, 20, 25, 180), (0, 0, input_width - 40, input_height))
            pygame.draw.rect(input_surface, input_color, (0, 0, input_width - 40, input_height), 2)
            screen.blit(input_surface, (x + 20, y + 45))
        
        # Input text
        display_text = self.item_input_text if self.item_input_text else "Enter item name..."
        text_color = TEXT_PRIMARY if self.item_input_text else TEXT_SECONDARY
        input_text_surface = self.text_font.render(display_text, True, text_color)
        screen.blit(input_text_surface, (x + 30, y + 50))
        
        # Cursor if active
        if self.item_input_active:
            cursor_x = x + 30 + input_text_surface.get_width()
            pygame.draw.line(screen, TEXT_PRIMARY, (cursor_x, y + 48), (cursor_x, y + 72), 2)
    
    def update(self):
        """Update game state"""
        # Handle continuous backspace
        if self.backspace_held:
            keys = pygame.key.get_pressed()
            if not keys[pygame.K_BACKSPACE]:
                self.backspace_held = False
            else:
                current_time = pygame.time.get_ticks()
                if current_time - self.backspace_repeat_timer > self.backspace_repeat_delay:
                    # Time for first repeat
                    if self.journal_text_active:
                        self.remove_journal_character()
                    elif self.character_name_editing:
                        self.character_name_edit_text = self.character_name_edit_text[:-1]
                    elif self.place_name_editing:
                        self.place_name_edit_text = self.place_name_edit_text[:-1]
                    elif self.session_name_editing:
                        self.session_name_edit_text = self.session_name_edit_text[:-1]
                    elif self.session_input_active:
                        self.session_input_text = self.session_input_text[:-1]
                    
                    # Switch to faster repeat rate after first repeat
                    self.backspace_repeat_timer = current_time
                    self.backspace_repeat_delay = self.backspace_repeat_rate
    
    def run(self):
        """Main game loop"""
        while self.running:
            # Handle events
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                    self.save_character_data()
                elif event.type == pygame.VIDEORESIZE:
                    self.handle_window_resize(event)
                
                self.handle_input(event)
            
            # Update game state
            self.update()
            
            # Draw everything
            self.draw()
            
            # Control frame rate
            self.clock.tick(FPS)
        
        # Ensure the world map viewer closes when the main app exits
        if self.map_viewer_process and self.map_viewer_process.poll() is None:
            try:
                self.map_viewer_process.terminate()
                self.map_viewer_process.wait(timeout=2)
            except Exception as exc:
                logging.warning(f"Could not cleanly terminate world map viewer: {exc}")
            finally:
                self.map_viewer_process = None

        pygame.quit()
        sys.exit()
    
    def add_item(self):
        """Add a new item to the current inventory category"""
        if self.item_input_text.strip():
            if self.current_inventory_type not in self.inventory:
                self.inventory[self.current_inventory_type] = []
            self.inventory[self.current_inventory_type].append(self.item_input_text.strip())
            logging.info(f"Added {self.current_inventory_type} item: {self.item_input_text.strip()}")
            self.item_input_text = ""
            
            # Auto-save after adding item
            self.save_character_data()
    
    def remove_item(self, index):
        """Remove an item from the current inventory category"""
        current_items = self.inventory.get(self.current_inventory_type, [])
        if 0 <= index < len(current_items):
            removed_item = current_items.pop(index)
            logging.info(f"Removed {self.current_inventory_type} item: {removed_item}")
            
            # Clear item rects to prevent index issues
            if hasattr(self, 'item_rects'):
                self.item_rects = []
            
            # Auto-save after removing item
            self.save_character_data()
    
    def modify_coins(self, coin_type, amount):
        """Add or remove coins of a specific type"""
        if coin_type in self.coins:
            new_amount = max(0, self.coins[coin_type] + amount)
            old_amount = self.coins[coin_type]
            self.coins[coin_type] = new_amount
            
            if amount > 0:
                logging.info(f"Added {amount} {coin_type.upper()} (was {old_amount}, now {new_amount})")
            else:
                logging.info(f"Removed {abs(amount)} {coin_type.upper()} (was {old_amount}, now {new_amount})")
            
            # Auto-save after coin change
            self.save_character_data()
    
    def handle_journal_menu_clicks(self, pos, event=None):
        """Handle mouse clicks on journal menu"""
        if hasattr(self, 'journal_mode_toggle_rects'):
            for mode, rect in self.journal_mode_toggle_rects.items():
                if rect and rect.collidepoint(pos):
                    self.set_journal_entity_mode(mode)
                    return

        # Check session buttons (all except last one which is back button)
        sessions = list(self.journal.get("sessions", {}).keys())
        for i, button in enumerate(self.journal_buttons[:-1]):  # Exclude back button
            click_type, clicked = button.handle_click(pos)
            if click_type == 'button' and clicked:
                if i < len(sessions):
                    # Save current session before switching
                    self.save_current_journal_session()
                    
                    # Switch to new session
                    old_session = self.current_journal_session
                    self.current_journal_session = sessions[i]
                    if old_session != self.current_journal_session:
                        self.create_journal_buttons()  # Recreate buttons to update selection
                        self.journal_scroll_offset = 0  # Reset scroll
                        # Initialize cursor position at end of text
                        self.set_journal_cursor_position(len(self.journal["sessions"].get(self.current_journal_session, "")))
                        self.active_entry_type = "journal"
                        self.journal_text_active = False
                        self.session_name_editing = False
                        self.character_name_editing = False
                return
        
        # Check back button (last button)
        click_type, clicked = self.journal_buttons[-1].handle_click(pos)
        if click_type == 'button' and clicked:
            self.save_current_journal_session()  # Save before leaving
            self.switch_to_main_menu()
            return
        
        # Check navigation buttons
        if hasattr(self, 'journal_prev_button'):
            click_type, clicked = self.journal_prev_button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.scroll_journal(-5)
                return
        
        if hasattr(self, 'journal_next_button'):
            click_type, clicked = self.journal_next_button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.scroll_journal(5)
                return
        
        prefix = self._entity_prefix()
        
        buttons_attr = f"{prefix}_name_buttons"
        buttons = getattr(self, buttons_attr, [])
        if buttons:
            for button in buttons:
                if button.rect.collidepoint(pos):
                    mouse_button = getattr(event, "button", 1)
                    if mouse_button == 1:
                        selected_name = button.entity_name
                        self.set_current_entity_name(selected_name)
                        self.session_name_editing = False
                        self.character_name_editing = False
                        self.place_name_editing = False
                        store = self.characters if prefix == "character" else self.places
                        text = store.get(selected_name, "")
                        if prefix == "character":
                            self.active_entry_type = "character"
                            self.character_scroll_offset = 0
                        else:
                            self.active_entry_type = "place"
                            self.place_scroll_offset = 0
                        self.set_journal_cursor_position(len(text))
                        self.journal_scroll_offset = 0
                        self.journal_text_active = False
                        logging.info(f"Selected {prefix}: {selected_name}")
                    elif mouse_button == 3:
                        self.delete_character(button.entity_name)
                    return
        
        create_button = getattr(self, f"{prefix}_create_button", None)
        if create_button:
            click_type, clicked = create_button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.create_new_character()
                return
        
        back_button = getattr(self, f"{prefix}_back_button", None)
        if back_button:
            click_type, clicked = back_button.handle_click(pos)
            if click_type == 'button' and clicked:
                page_attr = f"{prefix}_page"
                current_page = getattr(self, page_attr, 0)
                setattr(self, page_attr, max(0, current_page - 1))
                return
        
        forward_button = getattr(self, f"{prefix}_forward_button", None)
        if forward_button:
            click_type, clicked = forward_button.handle_click(pos)
            if click_type == 'button' and clicked:
                page_attr = f"{prefix}_page"
                current_page = getattr(self, page_attr, 0)
                setattr(self, page_attr, current_page + 1)
                return
    
    def add_session(self):
        """Add a new journal session"""
        if self.session_input_text.strip():
            session_name = self.session_input_text.strip()
            
            # Avoid duplicate session names
            if session_name not in self.journal.get("sessions", {}):
                # Save current session before switching
                self.save_current_journal_session()
                
                # Create new session
                self.journal["sessions"][session_name] = f"Session: {session_name}\n\nDate: [Add date here]\n\nNotes:\n"
                self.current_journal_session = session_name
                self.journal["current_session"] = session_name
                
                logging.info(f"Added journal session: {session_name}")
                self.session_input_text = ""
                self.journal_scroll_offset = 0
                
                # Recreate buttons to include new session
                self.create_journal_buttons()
                
                # Auto-save after adding session
                self.save_character_data()
    
    def save_current_journal_session(self):
        """Save the current journal session content"""
        # This will be expanded when we implement text editing
        # For now, changes are saved in real-time
        self.journal["current_session"] = self.current_journal_session
        self.save_character_data()
    
    def scroll_journal(self, direction):
        """Scroll the journal content"""
        if self.active_entry_type == "character" and self.current_character:
            current_text = self.characters.get(self.current_character, "")
        elif self.active_entry_type == "place" and self.current_place:
            current_text = self.places.get(self.current_place, "")
        else:
            current_text = self.journal.get("sessions", {}).get(self.current_journal_session, "")
        display_lines = getattr(self, "journal_display_lines", [])
        visible_lines = max(1, getattr(self, "journal_visible_lines", 18))
        total_lines = len(display_lines) if display_lines else len(current_text.split('\n'))
        max_scroll = max(0, total_lines - visible_lines)
        
        self.journal_scroll_offset = max(0, min(max_scroll, self.journal_scroll_offset + direction))
        if self.active_entry_type == "character":
            self.character_scroll_offset = self.journal_scroll_offset
        elif self.active_entry_type == "place":
            self.place_scroll_offset = self.journal_scroll_offset
    
    def cursor_position_from_mouse(self, pos):
        """Compute the journal cursor index for a given mouse position.
        Returns the character index, or None if it cannot be determined."""
        if not hasattr(self, 'journal_content_rect'):
            return None

        current_text = self.get_current_journal_text()
        display_lines = getattr(self, "journal_display_lines", [])
        if not display_lines:
            return len(current_text)

        relative_y = max(0, pos[1] - self.journal_content_rect.top - 10)
        line_height = 22
        total_display_lines = len(display_lines)
        display_idx = relative_y // line_height + self.journal_scroll_offset
        display_idx = max(0, min(display_idx, total_display_lines - 1))

        line_meta = display_lines[display_idx]
        line_text = line_meta.get("text", "")
        char_map = line_meta.get("char_map")

        relative_x = max(0, pos[0] - self.journal_content_rect.left)
        cumulative_width = 0
        char_offset = len(line_text)
        for i, char in enumerate(line_text):
            char_width = self.text_font.size(char)[0]
            if cumulative_width + char_width / 2 >= relative_x:
                char_offset = i
                break
            cumulative_width += char_width

        if char_map and char_offset < len(char_map):
            new_position = char_map[char_offset]
        else:
            new_position = line_meta.get("start", 0) + char_offset
        return max(0, min(len(current_text), new_position))

    def handle_journal_cursor_click(self, pos):
        """Handle clicks in journal text area to position cursor"""
        new_pos = self.cursor_position_from_mouse(pos)
        if new_pos is not None:
            self.set_journal_cursor_position(new_pos)

    def clear_journal_selection(self):
        """Clear the current text selection."""
        self.journal_selection_start = None
        self.journal_selection_end = None

    def has_journal_selection(self):
        """Return True if there is an active non-empty text selection."""
        return (self.journal_selection_start is not None and
                self.journal_selection_end is not None and
                self.journal_selection_start != self.journal_selection_end)

    def get_journal_selection_range(self):
        """Return (start, end) indices of the selection, ordered low-to-high."""
        if not self.has_journal_selection():
            return None
        s = self.journal_selection_start
        e = self.journal_selection_end
        return (min(s, e), max(s, e))

    def delete_journal_selection(self):
        """Delete the currently selected text and place cursor at start."""
        sel = self.get_journal_selection_range()
        if not sel:
            return
        start, end = sel
        if self.active_entry_type == "character" and self.current_character:
            current_text = self.characters.get(self.current_character, "")
            self.characters[self.current_character] = current_text[:start] + current_text[end:]
            self.character_scroll_offset = self.journal_scroll_offset
        elif self.active_entry_type == "place" and self.current_place:
            current_text = self.places.get(self.current_place, "")
            self.places[self.current_place] = current_text[:start] + current_text[end:]
            self.place_scroll_offset = self.journal_scroll_offset
        elif self.current_journal_session in self.journal.get("sessions", {}):
            current_text = self.journal["sessions"][self.current_journal_session]
            self.journal["sessions"][self.current_journal_session] = current_text[:start] + current_text[end:]
        else:
            self.clear_journal_selection()
            return
        self.set_journal_cursor_position(start)
        self.clear_journal_selection()
        self.save_character_data()
    
    def add_journal_character(self, char):
        """Add a character to the current journal session"""
        if self.has_journal_selection():
            self.delete_journal_selection()
        text_increment = len(char)
        if self.active_entry_type == "character" and self.current_character:
            current_text = self.characters.get(self.current_character, "")
            new_text = current_text[:self.journal_cursor_position] + char + current_text[self.journal_cursor_position:]
            self.characters[self.current_character] = new_text
            self.set_journal_cursor_position(self.journal_cursor_position + text_increment)
            self.character_scroll_offset = self.journal_scroll_offset
            self.save_character_data()
        elif self.active_entry_type == "place" and self.current_place:
            current_text = self.places.get(self.current_place, "")
            new_text = current_text[:self.journal_cursor_position] + char + current_text[self.journal_cursor_position:]
            self.places[self.current_place] = new_text
            self.set_journal_cursor_position(self.journal_cursor_position + text_increment)
            self.place_scroll_offset = self.journal_scroll_offset
            self.save_character_data()
        elif self.current_journal_session in self.journal.get("sessions", {}):
            current_text = self.journal["sessions"][self.current_journal_session]
            # Insert at cursor position
            new_text = current_text[:self.journal_cursor_position] + char + current_text[self.journal_cursor_position:]
            self.journal["sessions"][self.current_journal_session] = new_text
            self.set_journal_cursor_position(self.journal_cursor_position + text_increment)
            # Auto-save on each change (could be optimized to save periodically)
            self.save_character_data()
    
    def remove_journal_character(self):
        """Remove character at cursor position from the current journal session"""
        if self.active_entry_type == "character" and self.current_character:
            current_text = self.characters.get(self.current_character, "")
            if self.journal_cursor_position > 0:
                new_text = current_text[:self.journal_cursor_position - 1] + current_text[self.journal_cursor_position:]
                self.characters[self.current_character] = new_text
                self.set_journal_cursor_position(self.journal_cursor_position - 1)
                self.character_scroll_offset = self.journal_scroll_offset
                self.save_character_data()
        elif self.active_entry_type == "place" and self.current_place:
            current_text = self.places.get(self.current_place, "")
            if self.journal_cursor_position > 0:
                new_text = current_text[:self.journal_cursor_position - 1] + current_text[self.journal_cursor_position:]
                self.places[self.current_place] = new_text
                self.set_journal_cursor_position(self.journal_cursor_position - 1)
                self.place_scroll_offset = self.journal_scroll_offset
                self.save_character_data()
        elif self.current_journal_session in self.journal.get("sessions", {}):
            current_text = self.journal["sessions"][self.current_journal_session]
            if self.journal_cursor_position > 0:
                new_text = current_text[:self.journal_cursor_position - 1] + current_text[self.journal_cursor_position:]
                self.journal["sessions"][self.current_journal_session] = new_text
                self.set_journal_cursor_position(self.journal_cursor_position - 1)
                # Auto-save on each change
                self.save_character_data()
    
    def create_new_character(self):
        """Create a new journal entity (character/place)"""
        store = self.get_active_entity_store()
        prefix = self._entity_prefix()
        base_label = "Character" if prefix == "character" else "Place"

        entity_num = len(store) + 1
        new_name = f"{base_label} {entity_num}"
        while new_name in store:
            entity_num += 1
            new_name = f"{base_label} {entity_num}"

        store[new_name] = ""
        self.set_current_entity_name(new_name)

        if prefix == "character":
            self.character_cursor_position = 0
            self.character_scroll_offset = 0
            self.active_entry_type = "character"
        else:
            self.place_cursor_position = 0
            self.place_scroll_offset = 0
            self.active_entry_type = "place"

        self.set_journal_cursor_position(0)
        self.journal_scroll_offset = 0
        self.journal_text_active = False

        per_page = 13
        self.set_active_entity_page(max(0, (len(store) - 1) // per_page))
        self.save_character_data()

        logging.info(f"Created new {prefix}: {new_name}")
    
    def delete_character(self, entity_name):
        """Delete a journal entity (character/place)"""
        store = self.get_active_entity_store()
        prefix = self._entity_prefix()

        if entity_name not in store:
            return

        del store[entity_name]
        logging.info(f"Deleted {prefix}: {entity_name}")

        if prefix == "character":
            if self.current_character == entity_name:
                self.current_character = None
                self.character_name_editing = False
                self.character_name_edit_text = ""
                self.active_entry_type = "journal"
                self.journal_text_active = False
                self.set_journal_cursor_position(len(self.journal["sessions"].get(self.current_journal_session, "")))
                self.journal_scroll_offset = 0
                self.character_cursor_position = 0
                self.character_scroll_offset = 0
        elif prefix == "place":
            if self.current_place == entity_name:
                self.current_place = None
                self.place_name_editing = False
                self.place_name_edit_text = ""
                self.active_entry_type = "journal"
                self.journal_text_active = False
                self.set_journal_cursor_position(len(self.journal["sessions"].get(self.current_journal_session, "")))
                self.journal_scroll_offset = 0
                self.place_cursor_position = 0
                self.place_scroll_offset = 0

        per_page = 13
        total_entities = len(store)
        max_page = max(0, (total_entities - 1) // per_page) if total_entities > 0 else 0
        self.set_active_entity_page(min(self.get_active_entity_page(), max_page))

        self.save_character_data()
    
    def save_character_name_edit(self):
        """Save the edited journal entity name"""
        prefix = self._entity_prefix()
        if prefix == "character":
            pending_text = self.character_name_edit_text.strip()
            current_name = self.current_character
            store = self.characters
        else:
            pending_text = self.place_name_edit_text.strip()
            current_name = self.current_place
            store = self.places

        if not pending_text or current_name is None or pending_text == current_name:
            return

        if pending_text in store:
            logging.warning(f"{prefix.title()} name '{pending_text}' already exists")
            return

        store[pending_text] = store.pop(current_name)
        self.set_current_entity_name(pending_text)

        if prefix == "character":
            self.character_name_edit_text = ""
            self.character_name_editing = False
        else:
            self.place_name_edit_text = ""
            self.place_name_editing = False

        logging.info(f"Renamed {prefix} to: {pending_text}")
        self.save_character_data()
    
    def switch_to_journal_menu(self):
        """Switch to journal submenu"""
        self.current_screen = "journal"
        self.create_journal_buttons()
        self.session_input_text = ""
        self.session_input_active = False
        self.journal_text_active = False
        self.journal_scroll_offset = 0
        self.session_name_editing = False
        self.session_name_edit_text = ""
        self.backspace_held = False
        self.active_entry_type = "journal"
        self.character_name_editing = False
    
    def save_session_name_edit(self):
        """Save the edited session name"""
        if self.session_name_edit_text.strip() and self.session_name_edit_text != self.current_journal_session:
            # Get the current session content
            current_content = self.journal["sessions"].get(self.current_journal_session, "")
            
            # Remove old session name and add new one
            del self.journal["sessions"][self.current_journal_session]
            self.journal["sessions"][self.session_name_edit_text] = current_content
            
            # Update current session reference
            self.current_journal_session = self.session_name_edit_text
            self.journal["current_session"] = self.session_name_edit_text
            
            # Recreate buttons to reflect name change
            self.create_journal_buttons()
            
            self.session_name_editing = False
            self.session_name_edit_text = ""
            self.save_character_data()
    
    def draw_actions_menu(self, screen):
        """Draw the actions submenu"""
        # Draw background
        if self.submenu_backgrounds.get('actions'):
            screen.blit(self.submenu_backgrounds['actions'], (0, 0))
        elif self.background_image:
            screen.blit(self.background_image, (0, 0))
        else:
            screen.fill(DARK_BG)
        
        # Title
        title = self.title_font.render("ACTIONS", True, TEXT_PRIMARY)
        title_rect = title.get_rect(center=(self.current_width // 2, 50))
        screen.blit(title, title_rect)
        
        # Draw action buttons
        for button in self.action_buttons:
            button.draw(screen)
        
        # Draw action action buttons
        for button in self.action_action_buttons:
            button.draw(screen)
        
        # Draw action info box if an action is selected
        if self.selected_action:
            self.draw_action_info_box(screen)
        
        # Draw action results
        self.draw_action_results(screen)
    
    def draw_action_info_box(self, screen):
        """Draw action information in the center"""
        if not self.selected_action or self.selected_action not in self.actions:
            return
        
        action_data = self.actions[self.selected_action]
        
        # Center info box
        width, height = 400, 200
        x = (self.current_width - width) // 2
        y = 250
        
        # Draw action info card
        card_y = self.draw_card(screen, x, y, width, height, action_data["name"], "center", 200)
        
        current_y = card_y + 10
        
        # Action description
        desc_surface = self.text_font.render(action_data["description"], True, TEXT_PRIMARY)
        screen.blit(desc_surface, (x + 20, current_y))
        current_y += 35
        
        # Action details
        if "dice" in action_data:
            dice_text = f"Roll: {action_data['dice']}"
            if action_data.get("bonus", 0) > 0:
                dice_text += f" + {action_data['bonus']}"
            dice_surface = self.text_font.render(dice_text, True, TEXT_SECONDARY)
            screen.blit(dice_surface, (x + 20, current_y))
            current_y += 25
        
        # Availability status
        if action_data.get("available", True):
            status_text = "Available"
            status_color = ACCENT  # Use the orange accent color
        else:
            status_text = "Used (recharges on rest)"
            status_color = (200, 80, 80)
        
        status_surface = self.text_font.render(status_text, True, status_color)
        screen.blit(status_surface, (x + 20, current_y))
        
        # Recharge info
        recharge_info = action_data.get("recharge", "long_rest")
        if recharge_info == "short_rest":
            recharge_text = "Recharges on short or long rest"
        else:
            recharge_text = "Recharges on long rest"
        
        recharge_surface = self.small_font.render(recharge_text, True, TEXT_SECONDARY)
        screen.blit(recharge_surface, (x + 20, current_y + 25))
    
    def draw_action_results(self, screen):
        """Draw action roll results"""
        if not self.last_action_roll:
            return
        
        # Position below the USE ACTION button
        if self.action_action_buttons:
            button_rect = self.action_action_buttons[0].rect
            result_x = button_rect.centerx
            y = button_rect.bottom + 20
        else:
            # Fallback to center
            result_x = self.current_width // 2
            y = 520
        
        total, breakdown = self.last_action_roll
        
        # Main result
        result_text = f"Result: {total}"
        result_surface = self.header_font.render(result_text, True, TEXT_PRIMARY)
        result_rect = result_surface.get_rect(center=(result_x, y))
        screen.blit(result_surface, result_rect)
        
        # Breakdown
        if breakdown:
            breakdown_text = f"({' + '.join(map(str, breakdown))})"
            breakdown_surface = self.text_font.render(breakdown_text, True, TEXT_SECONDARY)
            breakdown_rect = breakdown_surface.get_rect(center=(result_x, y + 40))
            screen.blit(breakdown_surface, breakdown_rect)
    
    def draw_spells_menu(self, screen):
        """Draw the spells submenu"""
        # Draw background
        if self.submenu_backgrounds.get('spells'):
            screen.blit(self.submenu_backgrounds['spells'], (0, 0))
        elif self.background_image:
            screen.blit(self.background_image, (0, 0))
        else:
            screen.fill(DARK_BG)
        
        # Title
        title = self.title_font.render("SPELL MENU", True, TEXT_PRIMARY)
        title_rect = title.get_rect(center=(self.current_width // 2, 50))
        screen.blit(title, title_rect)
        
        # Draw spell buttons
        for button in self.spell_buttons:
            button.draw(screen)
        
        # Draw spell info box if a spell is selected
        if self.selected_spell:
            self.draw_spell_info_box(screen)
        
        # Draw spell slots on the right
        self.draw_spell_slots(screen)
        
        # Draw action buttons if spell is selected
        if self.selected_spell:
            spell_info = self.spell_data[self.selected_spell]
            
            # Check if this spell has delayed damage
            has_delayed_damage = spell_info.get("has_delayed_damage", False)
            
            if has_delayed_damage:
                # Show both buttons - position them side by side
                self.spell_action_buttons[0].draw(screen)  # Cast Spell
                self.spell_action_buttons[1].draw(screen)  # Delayed DMG
            else:
                # Show only Cast Spell button - center it
                # Temporarily center the Cast Spell button
                info_box_center = self.current_width // 2
                button_width = 169
                centered_x = info_box_center - button_width // 2
                
                # Save original position
                original_x = self.spell_action_buttons[0].rect.x
                
                # Center the button
                self.spell_action_buttons[0].rect.x = centered_x
                self.spell_action_buttons[0].draw(screen)
                
                # Restore original position for next frame
                self.spell_action_buttons[0].rect.x = original_x
        
        # Draw spell damage results
        self.draw_spell_results(screen)
    
    def handle_action_menu_clicks(self, pos):
        """Handle mouse clicks on action menu"""
        # Check action buttons (excluding back button)
        actions = list(self.actions.keys())
        for i, button in enumerate(self.action_buttons[1:]):  # Skip back button
            click_type, clicked = button.handle_click(pos)
            if click_type == 'button' and clicked:
                if i < len(actions):
                    # Clear previous action selection results
                    self.last_action_roll = None
                    
                    # Select new action
                    action_key = actions[i]
                    self.selected_action = action_key
                    logging.info(f"Selected action: {self.actions[action_key]['name']}")
                    self.create_action_buttons()  # Recreate to show action buttons
                return
        
        # Check back button
        click_type, clicked = self.action_buttons[0].handle_click(pos)
        if click_type == 'button' and clicked:
            self.switch_to_main_menu()
            return
        
        # Check action buttons (Use Action)
        for button in self.action_action_buttons:
            click_type, clicked = button.handle_click(pos)
            if click_type == 'button' and clicked:
                self.perform_action()
                return
    
    def switch_to_action_menu(self):
        """Switch to action submenu"""
        self.current_screen = "actions"
        self.selected_action = None  # Clear selected action first
        self.last_action_roll = None
        self.create_action_buttons()  # Then create buttons (this will clear action_action_buttons)
    
    def perform_action(self):
        """Perform the selected action"""
        if not self.selected_action or self.selected_action not in self.actions:
            return
        
        if self.selected_action == "raven_form":
            if self.raven_form_active:
                self.show_temp_overlay("Already in raven form. Click Raven to revert.")
                return
            if self.raven_form_uses_remaining <= 0:
                self.show_temp_overlay("No Raven Form uses remaining.")
                return
            if self.activate_raven_form():
                self.last_action_roll = None
                self.create_action_buttons()
            return
        
        action_data = self.actions[self.selected_action]
        
        # Check if action is available
        if not action_data.get("available", True):
            logging.warning(f"Action {action_data['name']} is not available!")
            return
        
        # Roll for the action
        dice_notation = action_data.get("dice", "1d1")
        bonus = action_data.get("bonus", 0)
        full_notation = f"{dice_notation}+{bonus}" if bonus > 0 else dice_notation
        
        total, breakdown = self.roll_dice(full_notation)
        self.last_action_roll = (total, breakdown)
        
        # Apply action effects
        if self.selected_action == "second_wind":
            # Heal HP
            old_hp = self.current_hp
            self.current_hp = min(self.max_hp, self.current_hp + total)
            healed = self.current_hp - old_hp
            logging.info(f"Second Wind: Healed {healed} HP (rolled {total})")
            
            # Mark as used
            self.actions["second_wind"]["available"] = False
            
            # Update button to show it's used
            self.create_action_buttons()
            
            # Auto-save
            self.save_character_data()
    
    def handle_skill_clicks(self, pos):
        """Handle clicks on skill boxes for d20 rolls"""
        if not hasattr(self, 'skill_rects'):
            return
            
        for skill_rect, i, skill, stat, proficient, modifier in self.skill_rects:
            if skill_rect.collidepoint(pos):
                # Roll d20 + modifier
                roll_total, roll_details = self.roll_dice("1d20")
                total = roll_total + modifier
                
                # Create overlay text
                self.temp_overlay_text = f"{skill}: {roll_total} + {modifier} = {total}"
                self.temp_overlay_timer = pygame.time.get_ticks()
                break
    
    def show_temp_overlay(self, message: str):
        """Display a temporary overlay message."""
        self.temp_overlay_text = message
        self.temp_overlay_timer = pygame.time.get_ticks()
    
    def draw_temporary_overlay(self, screen):
        """Draw temporary overlay for skill roll results"""
        if not self.temp_overlay_text or self.temp_overlay_timer == 0:
            return
            
        current_time = pygame.time.get_ticks()
        elapsed = current_time - self.temp_overlay_timer
        
        if elapsed >= self.temp_overlay_duration:
            # Clear overlay after duration
            self.temp_overlay_text = ""
            self.temp_overlay_timer = 0
            return
        
        # Calculate fade effect (optional)
        alpha = 255
        if elapsed > self.temp_overlay_duration - 500:  # Fade in last 500ms
            fade_time = elapsed - (self.temp_overlay_duration - 500)
            alpha = max(0, 255 - int(fade_time * 255 / 500))
        
        # Draw overlay in center of screen
        overlay_width = 400
        overlay_height = 60
        x = (self.current_width - overlay_width) // 2
        y = (self.current_height - overlay_height) // 2
        
        # Background
        overlay_surface = pygame.Surface((overlay_width, overlay_height), pygame.SRCALPHA)
        pygame.draw.rect(overlay_surface, (0, 0, 0, min(alpha, 180)), (0, 0, overlay_width, overlay_height), border_radius=10)
        pygame.draw.rect(overlay_surface, (*ACCENT, min(alpha, 200)), (0, 0, overlay_width, overlay_height), 3, border_radius=10)
        screen.blit(overlay_surface, (x, y))
        
        # Text
        text_color = (*TEXT_PRIMARY, min(alpha, 255))
        text_surface = self.header_font.render(self.temp_overlay_text, True, text_color)
        text_rect = text_surface.get_rect(center=(x + overlay_width // 2, y + overlay_height // 2))
        screen.blit(text_surface, text_rect)


def main():
    try:
        logging.info("Creating D&D Character Tool application")
        app = DnDCharacterTool()
        logging.info("Starting application main loop")
        app.run()
        logging.info("Application closed successfully")
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        import traceback
        logging.error("Full traceback:")
        logging.error(traceback.format_exc())

if __name__ == "__main__":
    main()
