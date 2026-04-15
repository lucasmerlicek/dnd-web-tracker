# Implementation Plan: Madea Sorcerer Features

## Overview

Incremental implementation of five sorcerer class feature enhancements for Madea in the Next.js D&D Character Tracker. Tasks are ordered: data model first, then Innate Sorcery toggle + effects, Raven Form filter verification, Empowered Spell reroll, Sorcerous Restoration, and finally rest handler wiring. All code is TypeScript/React, following existing patterns with `useCharacterData`, `useDiceRoll`, and the toggle UI pattern from Bladesong/Raven Form.

## Tasks

- [x] 1. Extend ClassResources data model
  - [x] 1.1 Add Innate Sorcery fields to `ClassResources` in `src/types/character.ts`
    - Add `innateSorceryActive?: boolean`, `innateSorceryUsesRemaining?: number`, `innateSorceryMaxUses?: number` to the `ClassResources` interface
    - Place them in the Sorcerer (Madea) section alongside existing `ravenFormActive` / `ravenFormUsesRemaining` / `ravenFormMaxUses`
    - _Requirements: 3.1, 3.3_

  - [x] 1.2 Seed Innate Sorcery fields in Madea's character data JSON
    - Add `innateSorceryActive: false`, `innateSorceryUsesRemaining: 2`, `innateSorceryMaxUses: 2` to Madea's `classResources` in the KV/API data store
    - _Requirements: 3.3_

- [x] 2. Implement Innate Sorcery toggle on Actions page
  - [x] 2.1 Add Innate Sorcery panel to `src/app/actions/page.tsx`
    - Add a `hasInnateSorcery` guard (`cr.innateSorceryMaxUses !== undefined`)
    - Create a `UIPanel variant="fancy"` block between the Raven Form panel and the generic actions grid
    - Display title "Innate Sorcery", uses `{innateSorceryUsesRemaining}/{innateSorceryMaxUses}`, SP cost "2 SP per activation"
    - Show Active/Inactive status text (emerald-400 when active)
    - Add Activate/Deactivate button following the Raven Form toggle pattern
    - _Requirements: 1.1, 1.4, 1.7_

  - [x] 2.2 Implement `toggleInnateSorcery` handler in `src/app/actions/page.tsx`
    - If activating: check `innateSorceryUsesRemaining >= 1` AND `currentSorceryPoints >= 2`, then decrement uses by 1, deduct 2 SP, set active to true
    - If deactivating: set active to false, no SP or uses restored
    - Disable activate button when `innateSorceryActive === false` AND (`innateSorceryUsesRemaining === 0` OR `currentSorceryPoints < 2`)
    - _Requirements: 1.2, 1.3, 1.5, 1.6_

  - [x] 2.3 Write property tests for Innate Sorcery activation/deactivation
    - **Property 1: Innate Sorcery activation produces correct state**
    - **Validates: Requirements 1.2**
    - **Property 2: Innate Sorcery deactivation preserves SP and uses**
    - **Validates: Requirements 1.3**
    - **Property 3: Innate Sorcery activation guard**
    - **Validates: Requirements 1.5, 1.6**

- [x] 3. Checkpoint — Verify Innate Sorcery toggle
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Innate Sorcery effects on Spells page
  - [x] 4.1 Add auto-advantage on spell attacks in `src/app/spells/SpellCard.tsx`
    - Initialize `advantage` state to `cr.innateSorceryActive ?? false` when the spell has `attackRoll: true`
    - Add a `useEffect` to sync the `advantage` state when `innateSorceryActive` changes
    - Track manual overrides via a `manualAdvantage` ref so deactivation reverts to false only if not manually set
    - _Requirements: 2.1, 2.4_

  - [x] 4.2 Add +1 DC bonus in `src/app/spells/SpellCard.tsx`
    - When `innateSorceryActive === true` and the spell has a `saveType`, compute `displayDC = calcSpellSaveDC(...) + 1`
    - Update the DC badge to use `displayDC` instead of the raw `calcSpellSaveDC` value
    - _Requirements: 2.2_

  - [x] 4.3 Add Innate Sorcery active banner on `src/app/spells/page.tsx`
    - Below the warning area, render a banner when `data.classResources.innateSorceryActive` is true
    - Text: "Innate Sorcery Active — Spell attacks have advantage, Save DC +1"
    - Style: `rounded bg-emerald-800/40 px-4 py-2 text-center text-sm text-emerald-400`
    - _Requirements: 2.3_

  - [x] 4.4 Write property tests for Innate Sorcery spell effects
    - **Property 5: Innate Sorcery DC bonus**
    - **Validates: Requirements 2.2**

- [x] 5. Verify Raven Form filter in Actions page
  - [x] 5.1 Confirm `raven_form` is excluded from generic actions in `src/app/actions/page.tsx`
    - The existing filter already excludes `raven_form` — verify no code change is needed
    - If the filter is missing `raven_form`, add it to the exclusion list
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Write property test for generic actions filter
    - **Property 7: Generic actions exclude reserved keys**
    - **Validates: Requirements 4.1**

- [x] 6. Implement Empowered Spell post-roll reroll
  - [x] 6.1 Extend `DiceResultOverlay` props in `src/components/ui/DiceResultOverlay.tsx`
    - Add optional `characterData?: CharacterData` and `onMutate?: (partial: Partial<CharacterData>) => void` props
    - Add local state: `empoweredUsed` (boolean), `displayRolls` (number array), `displayTotal` (number)
    - Initialize `displayRolls` and `displayTotal` from `result.rolls` and `result.total`
    - _Requirements: 5.1_

  - [x] 6.2 Implement Empowered Spell reroll logic in `DiceResultOverlay`
    - Show "Empowered Spell (1 SP)" button when: `characterData` provided, `currentSorceryPoints >= 1`, roll is a damage roll (label does NOT contain "Spell Attack", "Check", "Save", or "Second Wind (heal)"), and `empoweredUsed === false`
    - On click: deduct 1 SP via `onMutate`, reroll each die where value `<= dieSides / 2` with a new random value `1..dieSides`, update `displayRolls` and `displayTotal`, set `empoweredUsed = true`
    - Determine die sides from `roll.dice` spec
    - Disable button when `currentSorceryPoints < 1` or `empoweredUsed === true`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 6.3 Pass `characterData` and `onMutate` to `DiceResultOverlay` in all call sites
    - Update `src/app/spells/page.tsx` to pass `characterData={data}` and `onMutate={mutate}` to `DiceResultOverlay`
    - Update `src/app/actions/page.tsx` similarly
    - Update `src/app/dashboard/dashboard/page.tsx` similarly
    - _Requirements: 5.1_

  - [x] 6.4 Write property tests for Empowered Spell reroll
    - **Property 8: Empowered Spell reroll preserves high dice and rerolls low dice**
    - **Validates: Requirements 5.3, 5.4**
    - **Property 9: Empowered Spell deducts exactly 1 SP**
    - **Validates: Requirements 5.2**

- [x] 7. Checkpoint — Verify Innate Sorcery effects and Empowered Spell
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Sorcerous Restoration opt-in in Short Rest
  - [x] 8.1 Add Sorcerous Restoration checkbox to `RestModal` in `src/components/ui/RestModal.tsx`
    - Add local state `useSorcerousRestoration` (boolean, default false)
    - Show checkbox labeled "Sorcerous Restoration (+{floor(level/2)} SP)" when `sorceryPointsMax` is defined and `sorcerousRestorationUsed !== true`
    - When `sorcerousRestorationUsed === true`, show checkbox as disabled with "(already used)" text
    - Pass `useSorcerousRestoration` to `onConfirm` callback
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 8.2 Update `onConfirm` signature in `RestModal` and `Props` interface
    - Change to `onConfirm: (hitDiceToSpend?: number, poolSelections?: PoolSelections, useSorcerousRestoration?: boolean) => void`
    - Update `handleConfirm` to pass `useSorcerousRestoration` for short rests
    - _Requirements: 6.1, 6.6_

  - [x] 8.3 Update `handleShortRest` in `src/app/dashboard/dashboard/page.tsx`
    - Accept `useSorcerousRestoration?: boolean` parameter
    - Only apply Sorcerous Restoration when `useSorcerousRestoration === true` (currently it applies unconditionally)
    - Keep the existing SP calculation: `floor(level / 2)` capped at `sorceryPointsMax`
    - _Requirements: 6.3, 6.6_

  - [x] 8.4 Write property tests for Sorcerous Restoration
    - **Property 12: Sorcerous Restoration applies correct SP recovery**
    - **Validates: Requirements 6.2, 6.3**
    - **Property 13: Sorcerous Restoration opt-out preserves state**
    - **Validates: Requirements 6.6**

- [x] 9. Wire Innate Sorcery into Long Rest handler
  - [x] 9.1 Add Innate Sorcery reset to `handleLongRest` in `src/app/dashboard/dashboard/page.tsx`
    - In the class resources reset block, add: if `cr.innateSorceryMaxUses !== undefined`, set `cr.innateSorceryUsesRemaining = cr.innateSorceryMaxUses` and `cr.innateSorceryActive = false`
    - _Requirements: 3.2_

  - [x] 9.2 Add Innate Sorcery to `buildLongRestItems` in `src/components/ui/RestModal.tsx`
    - Show "Innate Sorcery uses: X -> Y" when uses are depleted
    - Show "Innate Sorcery deactivated" when active
    - _Requirements: 3.2_

  - [x] 9.3 Write property test for long rest Innate Sorcery reset
    - **Property 6: Long rest resets Innate Sorcery and Sorcerous Restoration**
    - **Validates: Requirements 3.2, 6.5**

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing `raven_form` filter (task 5) is already implemented — task 5.1 is a verification step
- The Empowered Spell reroll uses local component state in DiceResultOverlay, keeping core dice types clean
