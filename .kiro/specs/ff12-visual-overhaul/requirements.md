# Requirements Document

## Introduction

A complete visual and interaction overhaul of the D&D Character Tracker web application (Next.js 14, TypeScript, Tailwind CSS) to match the UI aesthetic of Final Fantasy XII (FF12). The overhaul replaces the current dark-fantasy/parchment/gold theme with FF12's signature semi-transparent dark blue-grey panels, thin bright borders, clean sans-serif typography, and an animated cursor-based selection system. All existing application logic, data persistence, and functionality remain unchanged — this is purely a visual and interaction layer transformation. The affected components span all 8 pages (Dashboard, Attack, Spells, Saves, Actions, Bag, Journal, Map) and the shared UI components (UIPanel, NavButtons, ScreenBackground, AmbientEffects, CounterControl).

## Glossary

- **App**: The Next.js 14 web application deployed on Vercel
- **FF12_Panel**: A semi-transparent dark blue-grey panel with a thin bright border (1–2px), matching the menu box style from Final Fantasy XII
- **Cursor_Indicator**: An animated triangular arrow (▶) that appears next to the currently selected or hovered interactive item, replicating FF12's selection indicator
- **Cursor_Navigation_System**: A keyboard and mouse-driven navigation system that moves the Cursor_Indicator through interactive lists using arrow keys and mouse hover
- **Blurred_Background**: A fixed-position background image with a CSS blur filter applied, over which UI panels float
- **FF12_Color_Palette**: The set of colors derived from FF12's UI: dark navy/blue-grey panel backgrounds at ~70% opacity, white/light-grey primary text, blue-grey secondary text, bright white or light-blue selection highlights, green HP gradient, gold stat accents
- **FF12_Nav_Bar**: A horizontal menu bar at the top of the screen replacing the current tab-based NavButtons, styled as an FF12_Panel with Cursor_Indicator support
- **Icon_Fetcher**: A utility script that downloads spell and weapon icon images from the BG3 wiki (bg3.wiki) and stores them in the local public assets directory
- **Icon_Display**: The rendering of fetched icon images next to spell names, weapon names, and inventory item names in the UI
- **UIPanel**: The existing React component (`src/components/ui/UIPanel.tsx`) that renders styled container panels, currently supporting variants: box, box1, box2, box4, dark, fancy
- **NavButtons**: The existing React component (`src/components/ui/NavButtons.tsx`) that renders the tab-based page navigation
- **ScreenBackground**: The existing React component (`src/components/ui/ScreenBackground.tsx`) that renders per-page background images
- **AmbientEffects**: The existing React component (`src/components/ui/AmbientEffects.tsx`) that renders animated ambient visual effects (light rays, dust particles, glows)
- **Interactive_List**: Any list of clickable/selectable items in the app, including spell lists, skill lists, weapon cards, inventory items, action cards, saving throw buttons, and navigation links
- **Dashboard_Page**: The `/dashboard` route displaying character overview
- **Attack_Page**: The `/attack` route displaying weapon attack cards
- **Spells_Page**: The `/spells` route displaying spell management
- **Saves_Page**: The `/saves` route displaying saving throws
- **Actions_Page**: The `/actions` route displaying combat actions
- **Bag_Page**: The `/bag` route displaying inventory
- **Journal_Page**: The `/journal` route displaying session notes
- **Map_Page**: The `/map` route displaying interactive world maps

## Requirements

### Requirement 1: FF12-Style UI Panels

**User Story:** As a player, I want the UI panels to look like FF12's semi-transparent dark blue-grey menu boxes with thin bright borders so that the app feels like a Final Fantasy XII interface.

#### Acceptance Criteria

1. THE UIPanel component SHALL render panels with a dark navy/blue-grey background at approximately 70% opacity and a thin (1–2px) solid bright border in light blue or white
2. THE UIPanel component SHALL replace all current variant styles (box, box1, box2, box4, dark, fancy) with FF12_Panel styling while preserving the variant prop interface for backward compatibility
3. THE UIPanel component SHALL apply a subtle inner glow or soft shadow along the border edges to replicate the FF12 panel depth effect
4. WHEN an FF12_Panel is rendered, THE UIPanel SHALL use rounded corners of 4px or less to match FF12's near-rectangular panel shape
5. THE FF12_Panel border color SHALL be a light blue-white tone (approximately #8eafc0 to #b0d0e8) to match FF12's characteristic panel borders
6. THE UIPanel SHALL support a "header" sub-variant that renders a slightly brighter or more opaque top edge, matching FF12's panel header style used for section titles

### Requirement 2: Cursor Selection and Navigation System

**User Story:** As a player, I want an animated ▶ cursor indicator that follows my mouse hover and responds to arrow key navigation so that interacting with lists feels like navigating FF12's menus.

#### Acceptance Criteria

1. WHEN a user hovers over an item in an Interactive_List, THE Cursor_Indicator SHALL appear to the left of the hovered item as a small animated triangular arrow (▶)
2. WHEN a user presses the ArrowDown key, THE Cursor_Navigation_System SHALL move the Cursor_Indicator to the next item in the current Interactive_List
3. WHEN a user presses the ArrowUp key, THE Cursor_Navigation_System SHALL move the Cursor_Indicator to the previous item in the current Interactive_List
4. WHEN a user presses the ArrowRight key in a multi-column layout, THE Cursor_Navigation_System SHALL move the Cursor_Indicator to the corresponding item in the next column
5. WHEN a user presses the ArrowLeft key in a multi-column layout, THE Cursor_Navigation_System SHALL move the Cursor_Indicator to the corresponding item in the previous column
6. WHEN a user presses Enter or Space while the Cursor_Indicator is on an item, THE Cursor_Navigation_System SHALL activate that item (equivalent to a click)
7. THE Cursor_Indicator SHALL animate with a gentle horizontal oscillation (left-right pulse) to replicate FF12's selection arrow animation
8. THE Cursor_Navigation_System SHALL operate on all Interactive_Lists: spell lists, skill lists, weapon cards, inventory items, action cards, saving throw buttons, navigation links, and universal action entries
9. WHEN the Cursor_Indicator reaches the first item in a list and ArrowUp is pressed, THE Cursor_Navigation_System SHALL keep the Cursor_Indicator on the first item without wrapping
10. WHEN the Cursor_Indicator reaches the last item in a list and ArrowDown is pressed, THE Cursor_Navigation_System SHALL keep the Cursor_Indicator on the last item without wrapping
11. THE Cursor_Indicator SHALL have a fixed width and height of approximately 12–16px and render in bright white or light blue color

### Requirement 3: Blurred Fixed Background

**User Story:** As a player, I want the existing background images to be blurred and fixed in place so that the FF12-style panels float over a soft, atmospheric scene.

#### Acceptance Criteria

1. THE ScreenBackground component SHALL apply a CSS blur filter of 4–8px to the background image so that the scene is softly out of focus
2. THE ScreenBackground component SHALL use CSS `position: fixed` so that the background image remains stationary when the page content scrolls
3. THE ScreenBackground component SHALL cover the full viewport using `object-fit: cover` and `width: 100vw; height: 100vh`
4. THE ScreenBackground component SHALL render the background at reduced opacity (30–50%) so that the blurred image does not overpower the FF12_Panel foreground elements
5. WHEN a user navigates between pages, THE ScreenBackground SHALL transition to the new page's background image without a jarring visual jump

### Requirement 4: FF12 Color Palette

**User Story:** As a player, I want the app's color scheme to shift from gold/crimson/parchment to FF12's blue-grey tones so that the entire interface matches the Final Fantasy XII aesthetic.

#### Acceptance Criteria

1. THE Tailwind configuration SHALL define FF12_Color_Palette tokens replacing the current dark-fantasy palette: panel backgrounds as dark navy/blue-grey (#1a2332 to #243044) at ~70% opacity, primary text as white (#ffffff) or light grey (#e0e8f0), secondary text as blue-grey (#8899aa), selection highlights as bright white (#ffffff) or light blue (#7ec8e3)
2. THE HP bar on the Dashboard_Page SHALL use a green gradient (from #2d8a4e to #4aba6a) matching FF12's HP gauge style, replacing the current crimson bar
3. THE App SHALL retain gold (#c9a84c) accent color exclusively for important stat values (AC, ability score modifiers, proficiency indicators) to maintain visual hierarchy
4. THE App SHALL replace all crimson/blood-red button and indicator colors with FF12-appropriate alternatives: blue-grey for neutral actions, soft red (#a04040) for destructive actions
5. WHEN an item in an Interactive_List is selected or hovered, THE App SHALL highlight that item's row with a bright white or light-blue background tint at low opacity (10–20%)
6. THE AmbientEffects component SHALL shift its color palette from warm amber/orange tones to cool blue/cyan tones matching the FF12 atmosphere

### Requirement 5: Icon Fetcher Utility for Spells and Weapons

**User Story:** As a player, I want spell and weapon icons displayed next to their names so that the interface is more visual and easier to scan, similar to FF12's equipment and magic menus.

#### Acceptance Criteria

1. THE Icon_Fetcher SHALL be a standalone Node.js script (runnable via `npx ts-node` or `node`) that accepts a list of spell or weapon names and downloads their icon images from the BG3 wiki (https://bg3.wiki/wiki/)
2. THE Icon_Fetcher SHALL store downloaded icon images in the `public/images/icons/spells/` and `public/images/icons/weapons/` directories with filenames derived from the item name (lowercase, hyphens replacing spaces)
3. THE Icon_Fetcher SHALL skip downloading icons that already exist locally to avoid redundant network requests
4. WHEN the Icon_Fetcher cannot find an icon for a given item name on the BG3 wiki, THE Icon_Fetcher SHALL log a warning and continue processing remaining items without failing
5. THE Spells_Page SHALL display the corresponding icon image (24x24px) to the left of each spell name in the spell list, falling back to a generic spell icon placeholder when no specific icon is available
6. THE Attack_Page SHALL display the corresponding icon image (24x24px) to the left of each weapon name in the weapon card, falling back to a generic weapon icon placeholder when no specific icon is available
7. THE Bag_Page SHALL display the corresponding icon image (20x20px) to the left of each item name in the inventory lists, falling back to a generic item icon placeholder when no specific icon is available

### Requirement 6: FF12-Style Typography

**User Story:** As a player, I want the app to use a clean sans-serif font matching FF12's UI text so that the typography feels modern and game-like rather than heavy fantasy.

#### Acceptance Criteria

1. THE App SHALL use a clean sans-serif font family as the primary body font, replacing the current Georgia/serif stack with a stack such as "Inter", "Segoe UI", system-ui, sans-serif
2. THE App SHALL load the chosen sans-serif font via `next/font` or a Google Fonts import to ensure consistent rendering across platforms
3. THE App SHALL remove the `font-serif` and `font-fantasy` Tailwind utility classes from all UI text elements and replace them with the new sans-serif font
4. THE App SHALL use a slightly condensed or regular weight (400) for body text and a medium weight (500) for headings and labels to match FF12's clean text hierarchy
5. THE App SHALL set the base font size to 14px for body text and 12px for secondary/label text to match FF12's compact information density
6. WHEN displaying stat values (AC, ability scores, HP numbers), THE App SHALL use a tabular-nums font-variant-numeric to ensure numbers align cleanly in columns

### Requirement 7: FF12-Style Navigation Bar

**User Story:** As a player, I want the tab navigation to become an FF12-style horizontal menu bar at the top with cursor selection support so that navigating between pages feels like using FF12's main menu.

#### Acceptance Criteria

1. THE NavButtons component SHALL render as a horizontal FF12_Panel bar fixed or sticky at the top of the viewport, containing all page links (Dashboard, Attack, Spells, Saves, Actions, Bag, Journal, Map)
2. THE NavButtons component SHALL display the Cursor_Indicator (▶) to the left of the currently hovered or keyboard-selected navigation link
3. WHEN a user presses ArrowLeft or ArrowRight while the FF12_Nav_Bar has focus, THE Cursor_Navigation_System SHALL move the Cursor_Indicator between navigation links horizontally
4. WHEN a user presses Enter while the Cursor_Indicator is on a navigation link, THE Cursor_Navigation_System SHALL navigate to that page
5. THE currently active page link in the FF12_Nav_Bar SHALL be visually distinguished with a brighter text color (white) and a subtle underline or background highlight compared to inactive links (blue-grey text)
6. THE FF12_Nav_Bar SHALL include the Logout button positioned at the right end, visually separated from the page links
7. THE FF12_Nav_Bar SHALL use the same FF12_Panel styling (semi-transparent dark blue-grey background, thin bright border) as all other panels

### Requirement 8: Preservation of Existing Functionality

**User Story:** As a player, I want all existing features to continue working identically after the visual overhaul so that no game-tracking functionality is lost or broken.

#### Acceptance Criteria

1. THE App SHALL preserve all existing page routes, data fetching, state management, and API interactions without modification
2. THE App SHALL preserve all existing dice rolling, spell slot tracking, sorcery point conversion, hit dice spending, death save tracking, inventory management, journal editing, and map marker functionality
3. THE App SHALL preserve all existing keyboard shortcuts (Ctrl+Z undo) and mouse interactions (double-click map marker creation, click-to-expand cards)
4. THE App SHALL preserve all existing accessibility attributes (aria-labels, aria-current, role attributes, min-h-[44px] touch targets)
5. WHEN a user performs any action that was functional before the visual overhaul, THE App SHALL produce the same data result and state change as before the overhaul
6. THE App SHALL preserve all existing responsive layout breakpoints (sm, md, lg grid configurations) while adapting them to the FF12 visual style
