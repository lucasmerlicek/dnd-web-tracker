# Implementation Plan: D&D Tracker Enhancements

## Overview

Incremental implementation of 16 enhancements to the D&D Character Tracker Next.js app. Tasks are ordered to build foundational types and pure logic first, then wire into UI components, and finish with integration and polish. All code is TypeScript, using the existing `useCharacterData`/`useAutoSave`/`useDiceRoll` patterns.

## Tasks

- [x] 1. Extend data models and types
  - [x] 1.1 Add new types to `src/src/types/character.ts`
    - Add `HitDicePool`, `StatModifier`, `GearItem`, `UtilityItem`, `TreasureItem`, `InventoryItemBase`, `SpellCreatedWeapon` interfaces
    - Add `hitDicePools`, `inventoryItems`, `spellCreatedWeapons` optional fields to `CharacterData`
    - Keep existing `hitDiceTotal`/`hitDiceAvailable`/`hitDiceSize` and `inventory` fields for backward compatibility
    - _Requirements: 6.1, 9.4, 10.6, 11.5, 14.1, 14.2_

  - [x] 1.2 Extend `SpellData` in `src/src/types/spell.ts`
    - Add optional `upcastDescription: string` field
    - Add optional `createsWeapon` field with `name`, `damageDice`, `damageType`, `attackStat`, `properties`, `upcastDice`
    - _Requirements: 1.1, 1.4, 14.2_

  - [x] 1.3 Update `src/src/types/index.ts` to re-export new types
    - Ensure `HitDicePool`, `GearItem`, `UtilityItem`, `TreasureItem`, `SpellCreatedWeapon`, `StatModifier` are exported
    - _Requirements: 6.1, 9.4, 10.6, 11.5, 14.1_

- [x] 2. Implement pure logic modules
  - [x] 2.1 Create `src/src/lib/undo-stack.ts`
    - Implement `UndoSnapshot` interface, `pushSnapshot`, `popSnapshot`, `captureSnapshot` pure functions
    - `pushSnapshot` enforces max stack size of 20, discarding oldest
    - `popSnapshot` returns the top snapshot and remaining stack, or null if empty
    - `captureSnapshot` extracts specified keys from `CharacterData` into a snapshot
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 2.2 Write property tests for undo stack
    - **Property 4: Undo round-trip** — applying a mutation then undoing restores original fields
    - **Property 5: Undo stack size cap** — stack never exceeds 20 after any number of pushes
    - **Validates: Requirements 4.2, 4.3, 4.6**

  - [x] 2.3 Create `src/src/lib/ac-calc.ts`
    - Implement `ACInputs` interface and `calculateAC` pure function
    - Base AC = `defaultBaseAc` unless mageArmorActive, then `13 + dexModifier`
    - Add `+5` if shieldActive, add `intModifier` if bladesongActive
    - Sum `gearAcBonuses` from equipped gear
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.3_

  - [x] 2.4 Write property test for AC calculation
    - **Property 10: AC toggle round-trip** — toggling Shield or Mage Armor on then off returns AC to pre-toggle value
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

  - [x] 2.5 Create `src/src/lib/hit-dice.ts`
    - Implement `HitDicePool` operations: `spendHitDie(pools, className)` and `longRestRestore(pools)`
    - `spendHitDie` decrements only the target pool's `available` by 1, returns null if pool has 0 available
    - `longRestRestore` restores `floor(totalAcrossAllPools / 2)` dice (min 1), no pool exceeds its total
    - _Requirements: 6.1, 6.3, 6.5_

  - [x] 2.6 Write property tests for hit dice
    - **Property 7: Hit dice pool spend correctness** — spending decrements only the target pool by 1
    - **Property 8: Hit dice long rest restoration** — restores floor(total/2) dice, min 1, no pool exceeds total
    - **Validates: Requirements 6.1, 6.3, 6.5**

  - [x] 2.7 Create `src/src/lib/treasure-calc.ts`
    - Implement `totalTreasureValue(items: TreasureItem[]): number` — sums all `estimatedValue` fields
    - _Requirements: 11.2, 11.4_

  - [x] 2.8 Write property test for treasure calculation
    - **Property 13: Treasure total value calculation** — total equals exact sum of all estimatedValue fields
    - **Validates: Requirements 11.2, 11.4**

  - [x] 2.9 Create `src/src/lib/gear-stats.ts`
    - Implement `aggregateGearModifiers(items: GearItem[]): StatModifier[]` — collects modifiers from equipped items
    - Implement `getEquippedAcBonus(items: GearItem[]): number` — sums AC bonuses from equipped gear
    - _Requirements: 10.3, 10.4_

  - [x] 2.10 Write property test for gear stats
    - **Property 12: Gear equip/unequip stat modifier round-trip** — equipping then unequipping returns stats to original
    - **Validates: Requirements 10.3, 10.4**

- [x] 3. Checkpoint — Ensure all pure logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create data modules and undo hook
  - [x] 4.1 Create `src/src/data/universal-actions.ts`
    - Define `UniversalAction` interface and `UNIVERSAL_ACTIONS` array with all 10 D&D 2024 universal actions (Grapple, Shove, Hide, Disengage, Dash, Dodge, Help, Ready, Search, Use an Object)
    - Each entry has `name` and full `description` from D&D 2024 rules
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 4.2 Add upcast descriptions to spell registry
    - Update `src/src/data/spell-registry.ts` to add `upcastDescription` field to all spells that have an `upcast` field
    - Add `createsWeapon` field to Shadow Blade and any other weapon-creating spells
    - Ensure spells without `upcast` do NOT have `upcastDescription`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 14.2_

  - [x] 4.3 Write property test for spell registry upcast consistency
    - **Property 1: Spell registry upcast description consistency** — spell has upcastDescription iff it has upcast
    - **Validates: Requirements 1.1, 1.3, 1.4**

  - [x] 4.4 Create `src/src/hooks/useUndoStack.ts`
    - React hook wrapping `useCharacterData.mutate` to capture snapshots before mutations
    - Listen for Ctrl+Z / Cmd+Z keyboard events to trigger undo
    - Maintain stack of up to 20 snapshots in memory
    - Clear stack on route change via `usePathname()`
    - Return `{ undoableMutate, undo, canUndo }`
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 4.5 Create data migration script `src/scripts/migrate.ts`
    - Convert `inventory.gear: string[]` → `inventoryItems.gear: GearItem[]` (quantity 1, not equipped, no attunement)
    - Convert `hitDiceTotal/hitDiceAvailable/hitDiceSize` → `hitDicePools` (single pool for Madea, two pools for Ramil)
    - Default `spellCreatedWeapons` to `[]`
    - _Requirements: 6.2, 9.4_

- [x] 5. Checkpoint — Ensure all data modules and undo hook are complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update Dashboard page
  - [x] 6.1 Conditionally render Luck counter based on feats
    - Show `CounterControl` for Luck only when `data.featsTraits.includes("Lucky")`
    - Hide entirely for characters without the Lucky feat
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Write property test for luck visibility
    - **Property 6: Luck points visibility matches feat presence** — visible iff featsTraits includes "Lucky"
    - **Validates: Requirements 5.1, 5.2**

  - [x] 6.3 Cap inspiration at 2
    - Change `CounterControl` max prop from 10 to 2 for inspiration
    - Update long rest handler to cap inspiration at 2 instead of 10
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 6.4 Write property test for inspiration bounds
    - **Property 9: Inspiration counter bounds** — value always in [0, 2] after increment/decrement
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 6.5 Integrate AC calculation with `ac-calc.ts`
    - Replace inline AC toggle logic in `toggleShield`/`toggleMageArmor` with `calculateAC` from `ac-calc.ts`
    - Include gear AC bonuses from `getEquippedAcBonus` when computing AC
    - Reduce Shield/Mage Armor button size (smaller padding and font)
    - Display AC in a larger, more prominent element
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 16.4, 16.5_

  - [x] 6.6 Add passive perception and initiative
    - Display passive perception as `10 + perceptionSkillModifier` (find Perception in `data.skills`)
    - Add "Initiative" button that triggers `rollDice` with d20 + DEX modifier
    - Center the HP bar horizontally in the layout
    - _Requirements: 16.1, 16.2, 16.3, 16.6_

  - [x] 6.7 Write property test for passive perception
    - **Property 17: Passive perception calculation** — equals 10 + perception skill modifier
    - **Validates: Requirements 16.1, 16.6**

  - [x] 6.8 Update Death Save Tracker
    - Add clickable success/failure slots for manual increment (in addition to existing roll button)
    - Add a reset button to set both successes and failures to 0
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 6.9 Write property tests for death saves
    - **Property 2: Death save state bounds** — successes and failures always in [0, 3]
    - **Property 3: Death save state round-trip serialization** — JSON round-trip produces equivalent state
    - **Validates: Requirements 2.2, 2.3, 2.8**

  - [x] 6.10 Integrate undo system into Dashboard
    - Replace direct `mutate` calls with `undoableMutate` from `useUndoStack` for irreversible actions (spell slots, inspiration, luck, hit dice, death saves, coins)
    - _Requirements: 4.1, 4.2_

- [x] 7. Checkpoint — Ensure dashboard changes work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update Attack page with weapon card redesign
  - [x] 8.1 Create `src/src/components/attack/WeaponCard.tsx`
    - Display weapon name, full description, properties, damage dice, damage type, masteries, magic bonus
    - Include "Attack Roll" and "Damage Roll" buttons with advantage/disadvantage toggles per card
    - Support off-hand damage for Light weapons
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 8.2 Add spell-created weapon support to Attack page
    - Render `spellCreatedWeapons` from character data alongside permanent weapons
    - Show spell-created weapons with distinct visual treatment (glowing border or spell icon)
    - Add dismiss button to remove spell-created weapons
    - Persist `spellCreatedWeapons` changes via `mutate`
    - _Requirements: 14.1, 14.3, 14.4, 14.5_

  - [x] 8.3 Write property tests for spell-created weapons
    - **Property 15: Spell-created weapon upcast damage scaling** — damage dice scale correctly with cast level
    - **Property 16: Spell-created weapon create/dismiss round-trip** — dismissing removes exactly one weapon
    - **Validates: Requirements 14.1, 14.2, 14.3**

  - [x] 8.4 Integrate undo system into Attack page
    - Wrap mutate with `undoableMutate` for spell-created weapon dismissal
    - _Requirements: 4.1_

- [x] 9. Update Spells page
  - [x] 9.1 Display upcast descriptions in SpellCard
    - When a spell has `upcastDescription`, show it below the main description in the expanded SpellCard
    - _Requirements: 1.2_

  - [x] 9.2 Add spell-created weapon creation on cast
    - When casting a spell that has `createsWeapon`, add a `SpellCreatedWeapon` entry to `data.spellCreatedWeapons`
    - Calculate damage dice based on cast level and `upcastDice`
    - Persist via `mutate`
    - _Requirements: 14.1, 14.2_

  - [x] 9.3 Write property test for spell weapon upcast scaling
    - **Property 15: Spell-created weapon upcast damage scaling** (if not already covered in 8.3)
    - **Validates: Requirements 14.2**

- [x] 10. Update Actions page with universal actions
  - [x] 10.1 Add Universal Actions section
    - Import `UNIVERSAL_ACTIONS` from `src/src/data/universal-actions.ts`
    - Render a "Universal Actions" section below class-specific actions
    - Each action is expandable to show its full description
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 10.2 Write property test for action use/recharge
    - **Property 14: Action use decrement and short rest recharge** — activating decrements by 1, short rest restores to max
    - **Validates: Requirements 13.2, 13.4**

- [x] 11. Redesign Bag page with structured inventory
  - [x] 11.1 Update Bag page to use structured inventory items
    - Migrate from `string[]` rendering to `GearItem[]`, `UtilityItem[]`, `TreasureItem[]`
    - Fall back to legacy `inventory` field if `inventoryItems` is not present
    - Show quantity indicator before item name (e.g., "3x Healing Potion")
    - Implement expandable `BagItemCard` with click-to-expand/collapse
    - Handle add-item with deduplication (increment quantity if item name exists)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 11.2 Write property test for inventory deduplication
    - **Property 11: Inventory item quantity default and deduplication** — adding existing item increments quantity, not duplicates
    - **Validates: Requirements 9.4, 9.5**

  - [x] 11.3 Add gear equipped/attuned indicators
    - Create `GearItemCard` component with equipped/attuned toggle buttons
    - Display stat modifiers on gear items
    - Apply/remove stat modifiers on equip/unequip via `gear-stats.ts`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 11.4 Add treasure estimated value display
    - Create `TreasureItemCard` component with estimated gold value display and edit
    - Show total treasure value sum at bottom of treasure section using `totalTreasureValue`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 11.5 Integrate undo system into Bag page
    - Wrap mutate with `undoableMutate` for item removal, coin changes, and quantity changes
    - _Requirements: 4.1_

- [x] 12. Checkpoint — Ensure attack, spells, actions, and bag pages work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Update Map page zoom/pan and markers
  - [x] 13.1 Fix TransformWrapper configuration
    - Change `minScale` from 0.5 to 1 and `maxScale` from 4 to 5
    - Enable `limitToBounds` to prevent panning map off-screen
    - Enable smooth interpolated transitions for zoom/pan
    - Reset zoom/pan to default when switching between Valerion and Aetherion tabs
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_

  - [x] 13.2 Verify Aetherion marker support
    - Confirm markers work on Aetherion maps with same create/edit/display as Valerion
    - Ensure marker positions remain accurate at all zoom levels
    - _Requirements: 12.5, 12.7_

- [x] 14. Update hit dice UI for multiclass support
  - [x] 14.1 Update Dashboard short rest to use hit dice pools
    - If `hitDicePools` exists, show per-class pool selection (e.g., "d10 Fighter: 1/1", "d6 Wizard: 4/4")
    - Use `spendHitDie` from `hit-dice.ts` for spending
    - Fall back to legacy single-pool if `hitDicePools` is not present
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 14.2 Update long rest to restore hit dice pools
    - Use `longRestRestore` from `hit-dice.ts` when `hitDicePools` exists
    - _Requirements: 6.5_

- [x] 15. Final checkpoint — Ensure all tests pass and features are integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design document path `src/src/lib/` reflects the actual codebase structure (nested `src/src/`)
- Existing patterns (`useCharacterData`, `useDiceRoll`, `UIPanel`, `CounterControl`) are reused throughout
