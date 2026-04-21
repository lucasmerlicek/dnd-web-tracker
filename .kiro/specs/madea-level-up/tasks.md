# Implementation Plan: Madea Level-Up (5 → 7)

## Overview

Level Madea (Shadow Sorcerer) from 5 to 7 by extending the spell registry, sorcery point module, and Innate Sorcery activation logic, then migrating character data in Vercel KV. Icon downloads and verification round out the work.

## Tasks

- [x] 1. Add Counterspell and Banishment to the spell registry
  - [x] 1.1 Add Counterspell entry to `src/src/data/spell-registry.ts`
    - Add a `"Counterspell"` key to `SPELL_REGISTRY` with level 3, school "Abjuration", casting time reaction (when you see a creature casting a spell), range 60 feet, somatic-only components, duration "Instantaneous", description per 2024 rules, and `saveType: "CON"`
    - _Requirements: 4.1, 4.2_
  - [x] 1.2 Add Banishment entry to `src/src/data/spell-registry.ts`
    - Add a `"Banishment"` key to `SPELL_REGISTRY` with level 4, school "Abjuration", casting time "1 action", range "30 feet", components V/S/M (a pentacle), duration "Concentration, up to 1 minute", description per 2024 rules, `saveType: "CHA"`, and upcast info (`perLevel: "1 target"` with upcastDescription)
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 1.3 Verify Hound of Ill Omen remains at level 0 in the registry
    - Confirm the existing `"Hound of Ill Omen"` entry in `SPELL_REGISTRY` is unchanged at level 0 with its current metadata
    - _Requirements: 11.1_

- [x] 2. Extend SP-to-slot conversion for 4th-level slots
  - [x] 2.1 Add 4th-level entries to `src/src/app/spells/sorcery-points.ts`
    - Add `"4th": 6` to `SP_TO_SLOT_COST`
    - Add `"4th": 4` to the `slotLevelNumber` map
    - No changes needed to `convertSpToSlot` or `convertSlotToSp` — they use the lookup tables generically
    - _Requirements: 7.1, 7.2_
  - [x]* 2.2 Write property test: SP-to-slot and slot-to-SP conservation for all levels including 4th
    - **Property 1: SP-to-slot and slot-to-SP conversions maintain resource conservation for all levels including 4th**
    - Extend `src/src/app/spells/__tests__/sorcery-points.property.test.ts`: update `slotLevelArb` to include `"4th"`, update `stateArb` to include a `"4th"` slot field, and update all "other levels" iteration arrays to include `"4th"`
    - Verify: SP→slot deducts exactly 6 SP for 4th-level, slot→SP yields exactly 4 SP, round-trip is conservative (cost 6 > gain 4), insufficient SP fails without state change
    - Minimum 100 iterations per property
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 3. Checkpoint — Ensure SP conversion tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Fix Sorcery Incarnate two-phase activation
  - [x] 4.1 Rewrite `toggleInnateSorcery` in `src/app/actions/page.tsx`
    - Replace the current activation logic (which always requires both uses AND 2 SP) with two-phase logic:
      - Phase 1: If `innateSorceryUsesRemaining > 0`, activate for free (decrement uses only, no SP cost)
      - Phase 2: If `innateSorceryUsesRemaining === 0` and `currentSorceryPoints >= 2`, activate by deducting 2 SP (no uses decremented)
      - If neither condition is met, do nothing (return early)
    - Update the `disabled` prop on the activate button: disabled iff `innateSorceryUsesRemaining === 0 AND currentSorceryPoints < 2` (change OR to AND)
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 4.2 Apply the same fix to `src/src/app/actions/page.tsx` if it contains duplicate Innate Sorcery logic
    - Mirror the two-phase activation and updated disabled guard
    - _Requirements: 8.1, 8.2, 8.3_
  - [x]* 4.3 Write property test: Innate Sorcery two-phase activation
    - **Property 2: Innate Sorcery two-phase activation follows correct cost path**
    - Rewrite `src/src/lib/__tests__/innate-sorcery.property.test.ts`: update `activateInnateSorcery` to implement two-phase logic (free uses first, then SP cost), update `isActivateDisabled` to use AND instead of OR, and update all property assertions accordingly
    - Three generator regions: `usesRemaining > 0` (free path), `usesRemaining === 0 && SP >= 2` (paid path), `usesRemaining === 0 && SP < 2` (blocked)
    - Minimum 100 iterations per property
    - **Validates: Requirements 8.1, 8.2, 8.3**
  - [x]* 4.4 Write property test: Innate Sorcery activate button disabled guard
    - **Property 3: Innate Sorcery activate button disabled iff no free uses AND insufficient SP**
    - Update the guard property test in `src/src/lib/__tests__/innate-sorcery.property.test.ts` to assert: disabled iff `usesRemaining === 0 AND SP < 2`
    - Minimum 100 iterations
    - **Validates: Requirements 8.3**

- [x] 5. Checkpoint — Ensure Innate Sorcery tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Character data migration
  - [x] 6.1 Create a level-up migration function in `src/scripts/migrate.ts` (or a new `src/scripts/level-up-madea.ts` script)
    - Update `level` from 5 to 7
    - Update `proficiencyBonus` from 2 to 3
    - Increase `maxHp` by 16 (2 × (4 + 2) + 4 for Tough feat)
    - Increase `currentHp` by 16
    - Add `spellSlots["3rd"] = 1` and `currentSpellSlots["3rd"] = 1`
    - Add `spellSlots["4th"] = 1` and `currentSpellSlots["4th"] = 1`
    - Append `"Counterspell"` to `spells["3rd"]`
    - Create `spells["4th"] = ["Banishment"]`
    - Set `classResources.sorceryPointsMax = 7`
    - Set `classResources.currentSorceryPoints = 7`
    - Set `classResources.innateSorceryMaxUses = 2`
    - Set `classResources.innateSorceryUsesRemaining = 2`
    - Verify `"Hound of Ill Omen"` is present in the character's spell data
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.3, 5.4, 6.1, 6.2, 8.4, 8.5, 11.2_
  - [x]* 6.2 Write unit tests for the migration function
    - Assert all CharacterData fields have correct post-migration values
    - Test that `level` is 7, `proficiencyBonus` is 3, HP increased by 16, spell slots added, spells added, SP max is 7, innate sorcery uses set to 2
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 8.5_

- [x] 7. Download spell and familiar icons
  - [x] 7.1 Run `fetch-icons.ts` to download Counterspell and Banishment icons
    - Since Counterspell and Banishment are now in `SPELL_REGISTRY`, running `npx tsx src/scripts/fetch-icons.ts` will automatically download their icons to `public/images/icons/spells/`
    - _Requirements: 9.1, 9.2_
  - [x] 7.2 Download familiar icons (fox, hound, falcon)
    - Download "Find Familiar Scratch" icon from BG3 wiki → `public/images/icons/familiars/fox.png`
    - Download "Hound of Ill Omen" icon from BG3 wiki → `public/images/icons/familiars/hound.png`
    - Download "Find Familiar Raven" icon from BG3 wiki → `public/images/icons/familiars/falcon.png`
    - Either extend `fetch-icons.ts` with a familiar icon section or download manually
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The design uses TypeScript throughout — all implementation uses TypeScript
- Property tests use fast-check with vitest (existing pattern in the codebase)
- The `fetch-icons.ts` script auto-discovers spells from `SPELL_REGISTRY`, so adding registry entries before running the script is required
- The migration script writes to Vercel KV — requires `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars
