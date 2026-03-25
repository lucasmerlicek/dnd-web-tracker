# Implementation Plan: D&D Web Tracker

## Overview

Port two pygame-based D&D 5E character trackers into a unified Next.js 14 web application. Implementation proceeds bottom-up: project scaffolding → data layer → auth → shared UI components → screen pages → 3D dice → interactive maps → rest mechanics → ambient effects → data migration. Each task builds incrementally so the app is runnable at every checkpoint.

## Tasks

- [x] 1. Project scaffolding and core types
  - [x] 1.1 Initialize Next.js 14 project with TypeScript, Tailwind CSS, and App Router
    - Run `npx create-next-app@14` with TypeScript and Tailwind enabled
    - Install dependencies: `next-auth`, `@vercel/kv`, `framer-motion`, `react-zoom-pan-pinch`, `@react-three/fiber`, `@react-three/cannon`, `three`, `uuid`
    - Configure `tailwind.config.ts` with dark fantasy color palette (dark backgrounds, gold/amber accents, parchment text)
    - Create base `app/layout.tsx` server component with dark background and font setup
    - _Requirements: 17.1, 17.2_

  - [x] 1.2 Define TypeScript interfaces and types
    - Create `src/types/character.ts` with `CharacterData`, `AbilityName`, `Skill`, `Weapon`, `Action`, `ClassResources` interfaces
    - Create `src/types/dice.ts` with `DiceRoll`, `DieSpec`, `DiceResult` interfaces
    - Create `src/types/map.ts` with `MapMarker` interface
    - Create `src/types/index.ts` barrel export
    - _Requirements: 15.2, 15.9_

  - [x] 1.3 Write property test for CharacterData type validation
    - **Property 1: Round-trip JSON serialization preserves all CharacterData fields**
    - **Validates: Requirements 15.2, 15.7**

  - [x] 1.4 Copy static image assets into `/public`
    - Copy `Tracker_Madea/images/*` to `public/images/madea/`
    - Copy `Tracker_Barian/images/*` to `public/images/shared/` (shared UI textures)
    - Copy `Maps/Valerion_lowres.jpg` and `Maps/Atherion_map.png` to `public/images/maps/`
    - Copy `Tracker_Madea/images/icon_*.png` to `public/images/icons/`
    - _Requirements: 16.1, 16.2_

- [x] 2. Authentication and session management
  - [x] 2.1 Configure NextAuth.js with credentials provider
    - Create `app/api/auth/[...nextauth]/route.ts` with CredentialsProvider
    - Hardcode two credential pairs: "Madea"/"Blackthorn" → characterId "madea", "Ramil"/"alSaif" → characterId "ramil"
    - Configure JWT strategy with `characterId` and `characterName` in the token/session
    - Create `src/lib/auth.ts` with `authOptions` export
    - _Requirements: 1.2, 1.4, 1.5_

  - [x] 2.2 Create auth middleware and session provider
    - Create `middleware.ts` at project root to redirect unauthenticated users to `/login`
    - Exclude `/login`, `/api/auth/*`, and static assets from the auth guard
    - Create `src/components/providers/SessionProvider.tsx` client component wrapping NextAuth SessionProvider
    - Wire SessionProvider into `app/layout.tsx`
    - _Requirements: 1.1, 1.7_

  - [x] 2.3 Build the login page
    - Create `app/login/page.tsx` with username/password form
    - Style with dark fantasy aesthetic (background image, UI panel texture)
    - Handle `signIn("credentials")` call, display error on invalid credentials
    - Redirect to `/dashboard` on success
    - _Requirements: 1.2, 1.3_

  - [x] 2.4 Add logout functionality
    - Add a logout button/control accessible from all authenticated pages (in NavButtons or layout)
    - Call `signOut()` and redirect to `/login`
    - _Requirements: 1.6_

  - [x] 2.5 Write unit tests for auth flow
    - Test valid credentials return session with correct characterId
    - Test invalid credentials return error
    - Test middleware redirects unauthenticated requests
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. API routes and data layer
  - [x] 3.1 Implement Vercel KV character data API routes
    - Create `src/lib/kv.ts` with helper functions for `get`/`set` on Vercel KV using key pattern `character:{characterId}`
    - Create `app/api/character/get/route.ts` — GET handler that reads session, fetches character data from KV
    - Create `app/api/character/update/route.ts` — POST handler that deep-merges partial update into stored data and persists
    - Validate session on all API routes, return 401 if unauthenticated
    - _Requirements: 15.7, 15.8, 17.5_

  - [x] 3.2 Implement map markers API routes
    - Create `app/api/markers/get/route.ts` — GET handler with `map` and `floor` query params, returns `MapMarker[]`
    - Create `app/api/markers/update/route.ts` — POST handler supporting create/update/delete actions
    - Use key pattern `markers:{characterId}` in Vercel KV
    - _Requirements: 14.4, 14.8_

  - [x] 3.3 Create custom hooks for data fetching
    - Create `src/hooks/useCharacterData.ts` — fetches character data, provides `mutate` for optimistic updates with debounced auto-save
    - Create `src/hooks/useAutoSave.ts` — debounced persist to `/api/character/update` after state changes
    - Create `src/hooks/useMapMarkers.ts` — fetches and mutates per-character map markers
    - _Requirements: 15.8, 14.8_

  - [x] 3.4 Write unit tests for API routes
    - Test GET returns correct character data for authenticated user
    - Test POST merges partial updates correctly
    - Test 401 response for unauthenticated requests
    - _Requirements: 15.7, 15.8_

- [x] 4. Checkpoint — Auth and data layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Shared UI components
  - [x] 5.1 Build ScreenBackground and UIPanel components
    - Create `src/components/ui/ScreenBackground.tsx` — renders full-screen background PNG based on screen name and characterId
    - Create `src/components/ui/UIPanel.tsx` — card/panel component with UI texture background image variants (box, box1, box2, box4, dark, fancy)
    - Use Next.js Image component for optimization
    - _Requirements: 16.1, 16.2, 17.4_

  - [x] 5.2 Build NavButtons component
    - Create `src/components/ui/NavButtons.tsx` — navigation bar with buttons for Dashboard, Attack, Spells, Saves, Actions, Bag, Journal, Map
    - Highlight current screen, include logout button
    - Style with dark fantasy aesthetic
    - _Requirements: 2.5, 1.6_

  - [x] 5.3 Build CounterControl and PageTransition components
    - Create `src/components/ui/CounterControl.tsx` — increment/decrement control with min/max bounds
    - Create `src/components/ui/PageTransition.tsx` — Framer Motion AnimatePresence wrapper for route transitions
    - Wire PageTransition into the root layout
    - _Requirements: 3.6, 3.7, 16.5_

  - [x] 5.4 Build AmbientEffects component
    - Create `src/components/ui/AmbientEffects.tsx` — Framer Motion ambient effects layer
    - Implement firepit glow and moonlight effects for Dashboard
    - Implement stray tavern light rays with dust particles for submenu screens
    - _Requirements: 16.3, 16.4_

  - [x] 5.5 Build RestModal component
    - Create `src/components/ui/RestModal.tsx` — modal for short/long rest mechanics
    - Short rest: hit die count selector, displays available dice and die size
    - Long rest: confirmation dialog showing what will be restored
    - _Requirements: 11.1, 11.2, 12.1_

- [x] 6. Character Dashboard screen
  - [x] 6.1 Build Dashboard page with character header and stats
    - Create `app/dashboard/page.tsx` as client component
    - Implement `CharacterHeader` showing name, race, class, level
    - Implement `AbilityScoresGrid` displaying 6 ability scores with values and modifiers, click-to-roll triggers
    - Implement `SkillsList` displaying 18 skills with modifiers and proficiency indicators, click-to-roll triggers
    - Implement `FeatsList` displaying feats and traits
    - Wire ScreenBackground, NavButtons, AmbientEffects, UIPanel
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

  - [x] 6.2 Build HealthDisplay with HP tracking and AC toggles
    - Create `src/components/dashboard/HealthDisplay.tsx` with HpBar, DamageHealInput, ShieldToggle, MageArmorToggle
    - Implement damage: subtract from currentHp (min 0), persist to KV
    - Implement healing: add to currentHp (max = maxHp), persist to KV
    - Shield toggle: +5 AC when active, -5 when deactivated
    - Mage Armor toggle: set baseAc to 13+DEX mod when active, revert to defaultBaseAc when deactivated
    - Implement InspirationCounter (0–10) and LuckCounter (0–3) using CounterControl
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 6.3 Build DeathSaveTracker
    - Create `src/components/dashboard/DeathSaveTracker.tsx` — visible only when currentHp === 0
    - Display 3 success slots and 3 failure slots
    - Roll d20 for death save: ≥10 = success, <10 = failure, nat 20 = set HP to 1 and reset, nat 1 = 2 failures
    - Handle 3 successes (stabilized message, reset) and 3 failures (death message)
    - Handle damage at 0 HP (mark failure) and healing at 0 HP (reset saves, set HP)
    - _Requirements: 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 6.4 Write property test for HP clamping logic
    - **Property 2: HP after damage is always clamped between 0 and maxHp**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 6.5 Write property test for AC calculation
    - **Property 3: AC correctly reflects shield and mage armor toggle states**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 6.6 Write property test for death save state machine
    - **Property 4: Death save accumulation never exceeds 3 successes or 3 failures**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**

- [x] 7. Attack screen
  - [x] 7.1 Build Attack page with weapon cards and roll mechanics
    - Create `app/attack/page.tsx` as client component
    - Implement `WeaponCard` displaying weapon name, damage dice, damage type, properties, magic bonus
    - Implement attack roll: d20 + proficiency bonus + ability modifier + magic bonus
    - Implement damage roll: weapon damage dice + ability modifier + magic bonus
    - Calculate attack stat: DEX for finesse, STR otherwise, INT when Bladesong active (Ramil)
    - Apply Two-Weapon Fighting style: add ability modifier to off-hand damage
    - Implement `AdvantageToggle` for advantage (higher of 2d20) / disadvantage (lower of 2d20)
    - Wire ScreenBackground (attack_background.png), NavButtons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 7.2 Write property test for attack bonus calculation
    - **Property 5: Attack bonus equals proficiency + ability modifier + magic bonus for all weapon configurations**
    - **Validates: Requirements 5.2, 5.4**

- [x] 8. Spells screen
  - [x] 8.1 Build Spells page with slot tracking and spell list
    - Create `app/spells/page.tsx` as client component
    - Implement `SpellSlotTracker` showing current/max slots per level with cast (decrement) buttons
    - Display warning when attempting to cast with no remaining slots
    - Implement `SpellList` showing cantrips and leveled spells organized by level, with detail view on select
    - Implement spell damage roll trigger using DiceRoller
    - Wire ScreenBackground (spells_background.png), NavButtons
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.12, 6.13_

  - [x] 8.2 Build class-specific spell panels
    - Implement `SorceryPointPanel` (Madea only): display current/max SP, convert SP→slots (2/3/5 SP for 1st/2nd/3rd), convert slots→SP (1 SP per slot level)
    - Implement `SpellPrepPanel` (Ramil only): show prepared count vs max (INT mod + Wizard level), toggle preparation status, display auto-prepared spells as non-toggleable
    - Conditionally render based on character class from session data
    - _Requirements: 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_

  - [x] 8.3 Write property test for sorcery point conversion
    - **Property 6: SP-to-slot and slot-to-SP conversions maintain resource conservation (SP spent equals defined cost)**
    - **Validates: Requirements 6.10, 6.11**

- [x] 9. Saves screen
  - [x] 9.1 Build Saves page with saving throw rolls
    - Create `app/saves/page.tsx` as client component
    - Display all 6 saving throws with modifiers and proficiency indicators (CON/CHA for Madea, STR/CON for Ramil)
    - Implement save roll: d20 + ability modifier + proficiency bonus (if proficient)
    - Include AdvantageToggle for saving throw rolls
    - Wire ScreenBackground (save_background.png), NavButtons
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Actions screen
  - [x] 10.1 Build Actions page with class resources
    - Create `app/actions/page.tsx` as client component
    - Implement `ActionCard` displaying action name, description, remaining uses, activate button (decrements uses, marks unavailable at 0)
    - Implement `BladesongTracker` (Ramil only): remaining uses, active/inactive toggle, AC bonus when active (add INT modifier)
    - Implement Second Wind display for Ramil (heal 1d10 + Fighter level, short rest recharge)
    - Implement `RavenFormTracker` (Madea only): uses display, toggle
    - Track free-cast flags: Fey Touched (Bane, Misty Step) for Madea, Druid Initiate (Charm Person) for Ramil
    - Wire ScreenBackground (action_backround.png), NavButtons
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 11. Bag screen
  - [x] 11.1 Build Bag page with inventory and coins
    - Create `app/bag/page.tsx` as client component
    - Implement `InventorySection` displaying gear, utility, treasure categories with add/remove item functionality
    - Implement `CoinTracker` displaying cp, sp, ep, gp, pp with editable amounts
    - Persist all changes to Character_Data_Store via useCharacterData hook
    - Wire ScreenBackground (bag_background.png), NavButtons
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 12. Journal screen
  - [x] 12.1 Build Journal page with sessions, NPCs, and places
    - Create `app/journal/page.tsx` as client component
    - Implement `SessionList` with create new session, rename session, select session
    - Implement `SessionEditor` with freeform text editing and scrollable view of current session notes
    - Implement `EntityTracker` for NPCs: list all NPCs with descriptions, create/edit/delete
    - Implement `EntityTracker` for Places: list all places with descriptions, create/edit/delete
    - Persist all journal changes to Character_Data_Store
    - Wire ScreenBackground (journal_background.png), NavButtons
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11_

- [x] 13. Checkpoint — All screen pages functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. 3D Dice Roller
  - [x] 14.1 Build DiceOverlay with 3D physics-based dice
    - Create `src/components/dice/DiceOverlay.tsx` as a lazy-loaded portal component using `React.lazy` and `dynamic` import
    - Create `src/components/dice/DiceScene.tsx` with @react-three/fiber Canvas and @react-three/cannon physics world
    - Implement correct polyhedra meshes: d4 (tetrahedron), d6 (cube), d8 (octahedron), d10 (pentagonal trapezohedron), d12 (dodecahedron), d20 (icosahedron)
    - Apply dark metal/stone material aesthetic to all dice
    - Implement physics-based tumble animation with random initial velocity/rotation
    - _Requirements: 13.1, 13.2, 13.3, 17.3_

  - [x] 14.2 Implement dice result display and dismissal
    - Display numerical result when dice come to rest (detect settled state via velocity threshold)
    - Support multiple simultaneous dice (e.g., 2d6, 4d6)
    - Support advantage (two d20s, highlight higher) and disadvantage (two d20s, highlight lower)
    - Dismiss overlay on click or after 3 seconds with fade-out animation
    - Create `src/hooks/useDiceRoll.ts` hook managing roll state, triggering overlay, returning result via callback
    - _Requirements: 13.4, 13.5, 13.6, 13.7, 13.8_

  - [x] 14.3 Wire dice roller into all roll triggers
    - Connect ability score clicks (Dashboard) to useDiceRoll
    - Connect skill clicks (Dashboard) to useDiceRoll
    - Connect attack rolls and damage rolls (Attack) to useDiceRoll
    - Connect saving throw rolls (Saves) to useDiceRoll
    - Connect spell damage rolls (Spells) to useDiceRoll
    - Connect death save rolls (Dashboard) to useDiceRoll
    - _Requirements: 2.8, 2.9, 5.2, 5.3, 7.3, 6.12, 4.2_

- [x] 15. Interactive Map screen
  - [x] 15.1 Build MapViewer with pan/zoom and map switching
    - Create `app/map/page.tsx` as client component
    - Implement `MapViewer` using react-zoom-pan-pinch with Valerion world map as default
    - Implement map selector to switch between Valerion and Aetherion maps
    - Implement `FloorSelector` for Aetherion (Ground through 4th floor)
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 15.2 Build marker system with CRUD and filtering
    - Implement `MarkerLayer` rendering category-icon markers on the active map using existing icon PNGs (icon_artifact.png, icon_enemy.png, icon_friend.png, icon_rumor.png, icon_treasure.png)
    - Implement click on empty area → `MarkerForm` with category selector, title, description fields for creation
    - Implement click on existing marker → display title/description with edit/delete options
    - Implement `CategoryFilter` toggle filters to show/hide markers by category
    - Persist all marker changes via useMapMarkers hook
    - _Requirements: 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_

- [x] 16. Rest mechanics
  - [x] 16.1 Implement short rest logic
    - Wire RestModal (short rest mode) to Dashboard with hit die spending
    - Roll hit dice via DiceRoller: each die = hitDiceSize + CON modifier, add total to HP (capped at maxHp)
    - Decrement available hit dice by number spent
    - Recharge all actions with `recharge: 'short_rest'`
    - Implement Sorcerous Restoration for Madea: restore SP = floor(level/2) if not used since last long rest
    - Display message when no hit dice available
    - Persist all changes to Character_Data_Store
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 16.2 Implement long rest logic
    - Wire RestModal (long rest mode) to Dashboard
    - Restore: currentHp → maxHp, all spell slots → max, hit dice → max, all class resources → max
    - Reset all free-cast flags (feyBaneUsed, feyMistyStepUsed, druidCharmPersonUsed, sorcerousRestorationUsed)
    - Recharge all actions regardless of recharge type
    - Deactivate Shield, Mage Armor, Bladesong if active
    - Reset luck points to 3, increment inspiration by 1 (capped at 10)
    - Clear created spell slots
    - Persist all changes to Character_Data_Store
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11_

  - [x] 16.3 Write property test for long rest restoration
    - **Property 7: After long rest, all resources are at maximum values and all toggles are deactivated**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11**

  - [x] 16.4 Write property test for short rest hit die healing
    - **Property 8: Short rest healing never exceeds maxHp and hit dice spent never exceeds available**
    - **Validates: Requirements 11.3, 11.4, 11.7**

- [x] 17. Checkpoint — Full feature set complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Data migration script
  - [x] 18.1 Build migration script for existing character data
    - Create `scripts/migrate.ts` that reads `Tracker_Madea/character_data.json` and `Tracker_Ramil/character_data.json`
    - Convert all snake_case keys to camelCase
    - Consolidate class-specific flags (raven_form_active, sorcery_points_max, bladesong_active, etc.) into `classResources` object
    - Add `defaultBaseAc` to Ramil's data (default 13 if missing)
    - Load `Tracker_Ramil/map_markers.json`, add `map: 'valerion'` field to each marker, generate IDs and timestamps
    - Migrate all journal sessions, NPC entries, place entries, inventory, coins, spell data for both characters
    - Seed Vercel KV with transformed data (idempotent — overwrites on re-run)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.9_

  - [x] 18.2 Write unit tests for migration transforms
    - Test snake_case to camelCase conversion
    - Test classResources consolidation from flat flags
    - Test marker migration adds required fields
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 19. Responsive layout and polish
  - [x] 19.1 Ensure responsive design for desktop and tablet
    - Review and adjust all screen layouts for desktop and tablet breakpoints
    - Ensure touch-friendly controls for tablet use during tabletop sessions
    - Verify all background images and UI textures scale correctly
    - _Requirements: 16.6, 16.7_

  - [x] 19.2 Add root redirect and error handling
    - Create `app/page.tsx` that redirects to `/dashboard` if authenticated or `/login` if not
    - Add error boundary with retry for KV connection failures
    - _Requirements: 17.5_

- [x] 20. Final checkpoint — Full application ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- The design uses TypeScript throughout — all implementation uses TypeScript with Next.js 14 App Router
- Image assets from existing pygame trackers are reused via `/public` directory
