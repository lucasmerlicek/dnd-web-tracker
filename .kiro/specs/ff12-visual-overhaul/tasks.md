# Implementation Plan: FF12 Visual Overhaul

## Overview

Transform the D&D Character Tracker from its dark-fantasy/parchment/gold aesthetic into a Final Fantasy XII-inspired UI. The implementation builds foundational layers first (Tailwind config, fonts, globals, shared components), then adds new modules (cursor hook, icon system), then sweeps through each page to apply FF12 styling. Checkpoints after each major group ensure incremental validation.

## Tasks

- [x] 1. Foundation: Tailwind config, fonts, and global styles
  - [x] 1.1 Update Tailwind config with FF12 color palette and font family
    - Add all `ff12-*` color tokens to `tailwind.config.ts` under `theme.extend.colors` (panel, border, text, accent tokens as specified in design)
    - Update `fontFamily.sans` to `['var(--font-inter)', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif']`
    - Add `boxShadow` entry `ff12-glow` for subtle inner glow along border edges
    - Preserve existing color tokens for backward compatibility during migration
    - _Requirements: 4.1, 6.1_

  - [x] 1.2 Update layout.tsx with Inter font via next/font
    - Import `Inter` from `next/font/google` with `subsets: ['latin']`, `variable: '--font-inter'`, `display: 'swap'`
    - Apply the font variable class to `<body>`
    - Replace `bg-dark-bg text-parchment` with `bg-dark-bg text-ff12-text` on body
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Update globals.css with FF12 styles
    - Change body `font-family` to the new sans-serif stack
    - Update scrollbar colors to FF12 blue-grey tones
    - Add `@keyframes cursor-pulse` animation (translateX 0→3px→0, 1s ease-in-out infinite)
    - Add `.animate-cursor-pulse` utility class
    - Add `.tabular-nums` utility class for stat displays
    - _Requirements: 6.1, 6.5, 6.6, 2.7_

- [x] 2. Foundation: Shared UI components
  - [x] 2.1 Redesign UIPanel with FF12 styling
    - Replace all `VARIANT_STYLES` entries with FF12 panel classes (`bg-ff12-panel/70 border-ff12-border`, etc.) as specified in design
    - Change `rounded-lg` to `rounded` for near-rectangular FF12 shape
    - Add `shadow-ff12-glow` for subtle inner glow
    - Add brighter top border on `fancy` variant (`border-t-ff12-border-bright`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.2 Write property test for UIPanel FF12 styling (Property 1)
    - **Property 1: UIPanel FF12 Styling Invariant**
    - For any valid variant string, rendered panel contains FF12 panel bg classes, FF12 border class, and uses `rounded` not `rounded-lg`
    - Test file: `src/components/ui/__tests__/UIPanel.property.test.tsx`
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [x] 2.3 Update ScreenBackground with blur and fixed positioning
    - Wrap Image in a fixed container div with `fixed inset-0`
    - Add `blur-[6px]` filter to the Image element
    - Change to `w-screen h-screen` with `object-cover`
    - Adjust opacity to ~35%
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.4 Write property test for ScreenBackground FF12 styling (Property 5)
    - **Property 5: ScreenBackground FF12 Styling**
    - For any valid screen prop, component renders with blur filter, fixed positioning, and opacity 30–50%
    - Test file: `src/components/ui/__tests__/ScreenBackground.property.test.tsx`
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [x] 2.5 Update AmbientEffects with cool blue/cyan palette
    - Dashboard: replace orange firepit glow with cool blue pulse, keep moonlight
    - Submenu screens: replace amber light rays with blue-cyan rays, amber dust with blue-white particles
    - _Requirements: 4.6_

  - [ ]* 2.6 Write property test for AmbientEffects cool palette (Property 7)
    - **Property 7: AmbientEffects Cool Palette**
    - For any valid screen prop, rendered color classes contain blue/cyan tones and do not contain warm amber/orange
    - Test file: `src/components/ui/__tests__/AmbientEffects.property.test.tsx`
    - **Validates: Requirements 4.6**

  - [x] 2.7 Update CounterControl with FF12 colors
    - Replace `text-parchment/70` → `text-ff12-text-dim`, `bg-dark-border` → `bg-ff12-panel-light`, `text-gold` → `text-gold` (kept for stat values), `text-parchment` → `text-ff12-text`
    - Remove `font-serif` references
    - _Requirements: 4.1, 4.3, 6.3_

  - [x] 2.8 Update DiceResultOverlay with FF12 panel and colors
    - Replace `border-gold-dark/50 bg-dark-surface` with FF12 panel styling
    - Replace `text-parchment` → `text-ff12-text`, `text-gold` → `text-gold` (crits), `text-crimson` → `text-ff12-danger` (fumbles)
    - Replace `font-serif` with default sans-serif
    - _Requirements: 4.1, 4.4, 6.3_

  - [x] 2.9 Update RestModal with FF12 panel and colors
    - Replace `border-dark-border bg-dark-surface` with FF12 panel styling
    - Replace `text-gold` → `text-gold` (headings/bullets), `text-parchment` → `text-ff12-text`, `text-crimson` → `text-ff12-danger`
    - Replace `bg-gold-dark` confirm button with `bg-ff12-panel-light` and `text-ff12-text`
    - Remove `font-serif` from heading
    - _Requirements: 4.1, 4.4, 6.3_

- [x] 3. Checkpoint — Foundation complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. New module: Cursor navigation hook and indicator
  - [x] 4.1 Create `useCursorNavigation` hook
    - Create `src/hooks/useCursorNavigation.ts` implementing the `CursorNavigationOptions` and `CursorNavigationResult` interfaces from design
    - ArrowUp/Down for vertical movement, ArrowLeft/Right for column movement
    - Clamped to [0, N-1] with no wrapping; empty list returns activeIndex -1
    - Enter/Space triggers `onActivate` callback
    - Mouse hover sets activeIndex, mouse leave resets to -1
    - `enabled` flag for multi-list pages
    - Generate ARIA attributes (`role="listbox"`, `role="option"`, `aria-selected`, `aria-activedescendant`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9, 2.10_

  - [ ]* 4.2 Write property test for cursor grid movement (Property 2)
    - **Property 2: Cursor Navigation Grid Movement**
    - For any (itemCount, columns, activeIndex, arrowKey), new activeIndex follows the clamped formula with no wrapping
    - Test file: `src/hooks/__tests__/useCursorNavigation.property.test.ts`
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.9, 2.10**

  - [ ]* 4.3 Write property test for cursor activation (Property 3)
    - **Property 3: Cursor Activation Dispatches Callback**
    - For any (itemCount, activeIndex), Enter/Space invokes onActivate with the correct index exactly once
    - Test file: `src/hooks/__tests__/useCursorNavigation.property.test.ts`
    - **Validates: Requirements 2.6**

  - [ ]* 4.4 Write property test for cursor indicator visibility (Property 4)
    - **Property 4: Cursor Indicator Visibility on Hover**
    - For any (itemCount, activeIndex), exactly one CursorIndicator is visible at the active position
    - Test file: `src/hooks/__tests__/useCursorNavigation.property.test.ts`
    - **Validates: Requirements 2.1**

  - [ ]* 4.5 Write property test for hover highlight (Property 6)
    - **Property 6: Interactive List Hover Highlight**
    - Active items have a low-opacity highlight class; non-active items do not
    - Test file: `src/hooks/__tests__/useCursorNavigation.property.test.ts`
    - **Validates: Requirements 4.5**

  - [x] 4.6 Create `CursorIndicator` component
    - Create `src/components/ui/CursorIndicator.tsx` rendering a 14px bright white/light-blue ▶ character
    - Apply `animate-cursor-pulse` CSS animation class
    - `visible=false` renders invisible spacer of same width to prevent layout shift
    - _Requirements: 2.1, 2.7, 2.11_

- [x] 5. New module: Icon system
  - [x] 5.1 Create icon filename derivation utility
    - Create a pure function (e.g., in `src/lib/icon-utils.ts`) that converts item names to icon filenames: lowercase, spaces→hyphens, alphanumeric+hyphens only, ending with `.png`
    - _Requirements: 5.2_

  - [ ]* 5.2 Write property test for icon filename derivation (Property 8)
    - **Property 8: Icon Filename Derivation**
    - For any non-empty string, the derived filename is lowercase, spaces→hyphens, alphanumeric+hyphens only, ends with `.png`
    - Test file: `scripts/__tests__/icon-filename.property.test.ts`
    - **Validates: Requirements 5.2**

  - [x] 5.3 Create `IconImage` component
    - Create `src/components/ui/IconImage.tsx` with `type`, `name`, `size`, `className` props
    - Resolve path via `public/images/icons/{type}s/{name-kebab}.png` using the filename derivation utility
    - Use `next/image` with `onError` fallback to generic placeholder per type
    - Graceful degradation if placeholder also missing (render nothing)
    - _Requirements: 5.5, 5.6, 5.7_

  - [x] 5.4 Create icon fetcher script
    - Create `scripts/fetch-icons.ts` that reads spell names from `src/data/spell-registry.ts` and weapon names from character data
    - Fetch BG3 wiki pages, parse HTML for icon image URL, download to `public/images/icons/spells/` and `public/images/icons/weapons/`
    - Skip existing files, log warnings for missing/failed icons, continue processing
    - Create target directories if they don't exist
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Checkpoint — New modules complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update NavButtons with FF12 styling and cursor navigation
  - [x] 7.1 Redesign NavButtons as FF12 nav bar
    - Apply FF12 panel styling (semi-transparent bg, thin bright border)
    - Add sticky positioning at top of viewport
    - Integrate `useCursorNavigation` for ArrowLeft/ArrowRight keyboard nav between links
    - Add `CursorIndicator` next to hovered/selected link
    - Active page: white text + subtle bg highlight; inactive: blue-grey text
    - Logout button at right end, visually separated
    - Remove `font-serif` references
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 7.2 Write property test for NavButtons active page styling (Property 9)
    - **Property 9: NavButtons Active Page Styling**
    - For any valid pathname, the matching link has brighter text class vs dimmer text on non-matching links
    - Test file: `src/components/ui/__tests__/NavButtons.property.test.tsx`
    - **Validates: Requirements 7.5**

  - [ ]* 7.3 Write property test for NavButtons cursor indicator (Property 10)
    - **Property 10: NavButtons Cursor Indicator**
    - For any activeIndex, exactly one CursorIndicator is visible at that nav link position
    - Test file: `src/components/ui/__tests__/NavButtons.property.test.tsx`
    - **Validates: Requirements 7.2**

- [x] 8. Page sweep: Dashboard
  - Replace `text-parchment` → `text-ff12-text`, `text-parchment/70` → `text-ff12-text-dim`
  - Replace `text-gold` on stat values → keep `text-gold` for AC/ability modifiers
  - Replace `bg-crimson` HP bar → green gradient `bg-gradient-to-r from-ff12-hp-start to-ff12-hp-end`
  - Remove all `font-serif` / `font-fantasy` references
  - Add `useCursorNavigation` to skills list and ability scores grid
  - Add `tabular-nums` class to stat number displays
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 6.3, 6.4, 6.6, 2.8, 8.1, 8.2_

- [x] 9. Page sweep: Attack
  - Replace hardcoded color classes with FF12 equivalents
  - Remove `font-serif` references
  - Add `useCursorNavigation` to weapon cards and roll mode buttons
  - Add `IconImage` (24px) next to weapon names
  - Update WeaponCard component with FF12 panel colors
  - _Requirements: 4.1, 4.5, 5.6, 6.3, 2.8, 8.1, 8.2_

- [x] 10. Page sweep: Spells
  - Replace hardcoded color classes with FF12 equivalents
  - Remove `font-serif` references
  - Add `useCursorNavigation` to spell lists per level and cantrips
  - Add `IconImage` (24px) next to spell names
  - Update SpellCard component with FF12 panel colors
  - _Requirements: 4.1, 4.5, 5.5, 6.3, 2.8, 8.1, 8.2_

- [x] 11. Page sweep: Saves
  - Replace hardcoded color classes with FF12 equivalents
  - Remove `font-serif` references
  - Add `useCursorNavigation` to saving throw buttons
  - Keep gold for proficiency dot indicator
  - _Requirements: 4.1, 4.3, 4.5, 6.3, 2.8, 8.1, 8.2_

- [x] 12. Page sweep: Actions
  - Replace hardcoded color classes with FF12 equivalents
  - Remove `font-serif` references
  - Add `useCursorNavigation` to action cards and universal actions
  - Update Bladesong/Raven Form panels with FF12 colors
  - _Requirements: 4.1, 4.5, 6.3, 2.8, 8.1, 8.2_

- [x] 13. Checkpoint — First five pages complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Page sweep: Bag
  - Replace hardcoded color classes with FF12 equivalents
  - Remove `font-serif` references
  - Add `useCursorNavigation` to inventory item lists (gear/utility/treasure)
  - Add `IconImage` (20px) next to item names
  - Update equipped/attuned badges with FF12 colors
  - Update BagItemCard component
  - _Requirements: 4.1, 4.5, 5.7, 6.3, 2.8, 8.1, 8.2_

- [x] 15. Page sweep: Journal
  - Replace hardcoded color classes with FF12 equivalents
  - Remove `font-serif` references
  - Add `useCursorNavigation` to session list, NPC list, and places list
  - Update editor textarea border with FF12 colors
  - _Requirements: 4.1, 4.5, 6.3, 2.8, 8.1, 8.2_

- [x] 16. Page sweep: Map
  - Replace hardcoded color classes with FF12 equivalents
  - Remove `font-serif` references
  - Add `useCursorNavigation` to category filter buttons and floor buttons
  - Map marker icons remain unchanged
  - _Requirements: 4.1, 4.5, 6.3, 2.8, 8.1, 8.2_

- [x] 17. Page sweep: Login
  - Replace hardcoded color classes with FF12 equivalents on the login page
  - Remove `font-serif` references
  - _Requirements: 4.1, 6.3_

- [x] 18. Final checkpoint — All pages complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major group
- Property tests validate universal correctness properties using `fast-check`
- Existing color tokens are preserved in Tailwind config during migration for backward compatibility
- All existing functionality, routes, data persistence, and accessibility attributes must be preserved (Requirement 8)
