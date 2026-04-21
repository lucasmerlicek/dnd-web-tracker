# Implementation Plan: Shadow Sorcerer Familiars

## Overview

Incremental implementation of Shadow Sorcerer subclass abilities (Eyes of the Dark, Strength of the Grave, Hound of Ill Omen) and a Familiars system for the Next.js D&D Character Tracker. Tasks are ordered: data model extensions first, then pure logic modules, spell registry additions, SpellCard modifications, familiar components, navigation wiring, dashboard integration, and rest handler updates. All code is TypeScript/React, following existing patterns with `useCharacterData`, `useDiceRoll`, `SpellCard`, `UIPanel`, and `NavButtons`.

## Tasks

- [x] 1. Extend data models and create familiar registry
  - [x] 1.1 Add `FamiliarStatBlock` and `FamiliarInstance` interfaces to `src/types/character.ts`
    - Add `FamiliarStatBlock` interface with name, type, ac, maxHp, speed, abilities, passivePerception, traits, attacks
    - Add `FamiliarInstance` interface with id, familiarType, currentHp, maxHp, tempHp, summonedAt
    - Add `strengthOfTheGraveUsed?: boolean` and `familiars?: FamiliarInstance[]` to `ClassResources`
    - _Requirements: 3.4, 4.1, 6.3, 6.4, 8.1_

  - [x] 1.2 Create familiar registry at `src/data/familiar-registry.ts`
    - Define `FAMILIAR_STAT_BLOCKS` record with entries for falcon, fox, and hound
    - Falcon: AC 13, HP 1, Hawk stats, Keen Sight trait, no attacks
    - Fox: AC 13, HP 2, custom stats, Keen Hearing + Darkvision traits, no attacks
    - Hound: AC 14, HP 37, dire wolf stats, Bite attack (+5, 2d6+3), special traits
    - _Requirements: 3.4, 6.3, 6.4, 6.9, 6.10_

  - [ ]* 1.3 Write property test: normal familiars have no attacks (Property 9)
    - **Property 9: Normal familiars have no attacks**
    - Generate random familiar types; verify falcon/fox have no attacks, hound has at least one
    - **Validates: Requirements 6.11**

  - [ ]* 1.4 Write property test: character-specific familiar type mapping (unit test for Property 8)
    - Verify Ramil maps to falcon, Madea maps to fox
    - Verify created familiar's maxHp matches the corresponding registry entry
    - **Validates: Requirements 6.2**


- [x] 2. Implement pure logic modules
  - [x] 2.1 Create `src/lib/familiar-logic.ts`
    - Implement `createFamiliar(type, sorcererLevel?)` — returns a new `FamiliarInstance` with `crypto.randomUUID()`, correct maxHp from registry, tempHp = floor(sorcererLevel/2) for hound or 0 for others
    - Implement `applyFamiliarDamage(familiar, damage)` — reduces tempHp first, then currentHp, both clamped to 0
    - Implement `dismissFamiliar(familiars, familiarId)` — filters out the familiar with the given ID
    - Implement `removeDead(familiars)` — filters out familiars with currentHp <= 0
    - _Requirements: 3.4, 4.5, 4.6, 4.7, 6.12_

  - [x] 2.2 Create `src/lib/strength-of-the-grave.ts`
    - Implement `shouldPromptStrengthOfGrave(currentHp, newHp, damageType, isCriticalHit, strengthOfTheGraveUsed)` — returns true iff newHp <= 0 AND damageType !== "radiant" AND !isCriticalHit AND !strengthOfTheGraveUsed
    - Implement `calcStrengthOfGraveDC(damageTaken)` — returns 5 + damageTaken
    - Implement `applyStrengthOfGraveResult(rollTotal, dc)` — returns { survived: rollTotal >= dc, newHp: survived ? 1 : 0 }
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 2.3 Write property test: SP-cost deduction and guard (Property 1)
    - **Property 1: SP-cost deduction and guard**
    - Generate random SP values (0-20) and costs (2, 3); verify deduction succeeds iff SP >= cost, producing SP - cost
    - **Validates: Requirements 1.2, 1.3, 3.2, 3.3**

  - [ ]* 2.4 Write property test: Strength of the Grave prompt conditions (Property 2)
    - **Property 2: Strength of the Grave prompt conditions**
    - Generate random (currentHp, damage, damageType, isCrit, used); verify shouldPrompt returns true iff all conditions met
    - **Validates: Requirements 2.1, 2.6, 2.7**

  - [ ]* 2.5 Write property test: Strength of the Grave save outcome (Property 3)
    - **Property 3: Strength of the Grave save outcome**
    - Generate random rollTotal (1-30) and damageTaken (1-100); verify applyStrengthOfGraveResult returns correct survived/newHp
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ]* 2.6 Write property test: familiar damage reduces tempHp first (Property 4)
    - **Property 4: Familiar damage reduces temporary HP first**
    - Generate random FamiliarInstance (tempHp 0-20, currentHp 1-50) and damage (1-100); verify tempHp reduced first, then currentHp
    - **Validates: Requirements 4.5**

  - [ ]* 2.7 Write property test: familiar removal by ID (Property 5)
    - **Property 5: Familiar removal by ID**
    - Generate random arrays of FamiliarInstances (1-5 items), pick a random ID; verify dismissal removes exactly that ID
    - **Validates: Requirements 4.6, 4.7, 6.12**

  - [ ]* 2.8 Write property test: Hound creation with level-scaled tempHp (Property 7)
    - **Property 7: Hound creation with level-scaled temporary HP**
    - Generate random sorcerer levels (1-20); verify Hound creation produces tempHp = floor(level/2) and fixed stats
    - **Validates: Requirements 3.4**

  - [ ]* 2.9 Write property test: dead familiar removal (Property 11)
    - **Property 11: Dead familiar removal**
    - Generate random arrays of FamiliarInstances with mixed HP values; verify removeDead keeps only hp > 0 familiars in order
    - **Validates: Requirements 4.6, 6.12**

- [x] 3. Checkpoint — Verify data models and pure logic
  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Add spell registry entries and SpellCard modifications
  - [x] 4.1 Add Find Familiar and Hound of Ill Omen to `src/data/spell-registry.ts`
    - Add "Find Familiar" entry: level 1, Conjuration, casting time "1 bonus action", range "10 feet", V/S components, duration "Instantaneous"
    - Add "Hound of Ill Omen" entry: level 0 (SP-based), Necromancy, casting time "1 bonus action", range "30 feet of target", no components, duration "Until dismissed or destroyed"
    - _Requirements: 3.1, 6.1_

  - [x] 4.2 Add SP cast button for Darkness in `src/app/spells/SpellCard.tsx`
    - When spellName === "Darkness" and character is a sorcerer (sorceryPointsMax defined), show "Cast with SP (2)" button
    - On click: deduct 2 SP via onMutate, display visual indicator "You can see through this darkness"
    - Disable when currentSP < 2; show warning on insufficient SP
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.3 Add Find Familiar summon button in `src/app/spells/SpellCard.tsx`
    - When spellName === "Find Familiar", show "Summon" button with "Free" label (no slot cost)
    - On click: determine familiar type from character (falcon for Ramil, fox for Madea), call createFamiliar, add to familiars array via onMutate
    - If a familiar of the same type already exists, dismiss the old one first
    - _Requirements: 6.1, 6.2_

  - [x] 4.4 Add Hound of Ill Omen summon button in `src/app/spells/SpellCard.tsx`
    - When spellName === "Hound of Ill Omen" and character is a sorcerer, show "Summon (3 SP)" button
    - On click: deduct 3 SP, call createFamiliar("hound", sorcererLevel), add to familiars array via onMutate
    - Disable when currentSP < 3; show warning on insufficient SP
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [ ]* 4.5 Write property test: SP cast button restricted to Darkness for sorcerers (unit test for Property 12)
    - Verify "Cast with SP" button is available iff spellName === "Darkness" AND character has sorceryPointsMax defined
    - **Validates: Requirements 1.5**

- [x] 5. Seed character data with new spells and class resources
  - [x] 5.1 Update Madea's character data in KV/API store
    - Add `strengthOfTheGraveUsed: false` and `familiars: []` to classResources
    - Add "Find Familiar" to 1st level spells, "Hound of Ill Omen" to 3rd level spells
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 5.2 Update Ramil's character data in KV/API store
    - Add `familiars: []` to classResources
    - Add "Find Familiar" to 1st level spells
    - _Requirements: 8.1_

- [x] 6. Checkpoint — Verify spell registry and SpellCard modifications
  - Ensure all tests pass, ask the user if questions arise.


- [x] 7. Build FamiliarIcon and FamiliarCard components
  - [x] 7.1 Create `src/components/familiars/FamiliarIcon.tsx`
    - Accept `familiarType` ("falcon" | "fox" | "hound") and optional `size` prop
    - Render icon image from `public/images/icons/familiars/{type}.png`
    - Fall back to a text `<span>` with the familiar name when image fails to load (onError handler)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.2 Download/place familiar icon images in `public/images/icons/familiars/`
    - `falcon.png`, `fox.png`, `hound.png`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.3 Create `src/components/familiars/FamiliarCard.tsx`
    - Accept props: familiar (FamiliarInstance), statBlock (FamiliarStatBlock), onRollDice, onDamage, onDismiss
    - Render UIPanel with: FamiliarIcon + name + type badge in header
    - HP bar (currentHp/maxHp + tempHp display), AC, Speed
    - Six clickable ability check buttons (d20 + modifier) following dashboard pattern
    - Traits listed as text
    - For hound: "Bite" attack button (d20+5), "Damage" button (2d6+3), DC 13 STR save note
    - For normal familiars: "Help" action button (descriptive only), no attack buttons
    - Damage input + "Apply Damage" button
    - "Dismiss" button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_

  - [ ]* 7.4 Write unit tests for FamiliarCard rendering
    - Verify FamiliarCard renders ability check buttons for all 6 abilities
    - Verify FamiliarCard renders "Help" button for falcon/fox but NOT attack buttons
    - Verify FamiliarCard renders "Bite" and "Damage" buttons for hound
    - **Validates: Requirements 4.2, 4.3, 6.7, 6.8, 6.11**

- [x] 8. Build FamiliarsPage
  - [x] 8.1 Create `src/app/familiars/page.tsx`
    - Follow existing page patterns: useCharacterData, useDiceRoll, useSession
    - Render ScreenBackground (reuse "spells" background), AmbientEffects, NavButtons
    - Map over `data.classResources.familiars` to render a FamiliarCard for each active familiar
    - Wire onDamage to applyFamiliarDamage + removeDead, onDismiss to dismissFamiliar, onRollDice to rollDice
    - Show empty state message or redirect to dashboard when no familiars are active
    - Include DiceResultOverlay for dice rolls
    - _Requirements: 5.4, 5.5, 4.5, 4.6, 4.7, 6.12_

  - [x] 8.2 Add "familiars" screen mapping to `src/components/ui/ScreenBackground.tsx`
    - Map "familiars" to "spells_background.png" in SCREEN_BACKGROUNDS
    - _Requirements: 5.5_


- [x] 9. Wire NavButtons conditional Familiars tab
  - [x] 9.1 Modify `src/components/ui/NavButtons.tsx` to accept `hasFamiliars` prop
    - Add optional `hasFamiliars?: boolean` to NavButtonsProps
    - When `hasFamiliars` is true, append `{ href: "/familiars", label: "Familiars" }` to the screens list
    - Style the Familiars tab with blue hue: `text-blue-400 hover:text-blue-300`, active: `bg-blue-900/30 text-blue-300`
    - Update cursor navigation itemCount to account for the dynamic screen
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 9.2 Pass `hasFamiliars` prop from all pages that render NavButtons
    - Update dashboard, attack, spells, saves, actions, bag, journal, map pages to pass `hasFamiliars={(data?.classResources.familiars?.length ?? 0) > 0}`
    - Update the new familiars page to pass `hasFamiliars={true}` (it's always visible when on that page)
    - _Requirements: 5.1, 5.2_

  - [ ]* 9.3 Write property test: Familiars tab visibility (Property 6)
    - **Property 6: Familiars tab visibility**
    - Generate random familiars arrays (0-5 items); verify tab visibility = (length > 0)
    - **Validates: Requirements 5.1, 5.2, 3.6, 6.5**

- [x] 10. Checkpoint — Verify familiar components and navigation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Strength of the Grave prompt on Dashboard
  - [x] 11.1 Add Strength of the Grave prompt to `src/app/dashboard/dashboard/page.tsx`
    - Add state: `strengthOfGravePrompt` (null or { damage: number, dc: number })
    - In `applyDamage`, after computing newHp, call `shouldPromptStrengthOfGrave` — if true, set prompt state instead of immediately applying 0 HP
    - Render a modal/overlay when prompt is active: show DC, "Roll CHA Save" button
    - On roll: use `useDiceRoll` with d20 + CHA modifier, then call `applyStrengthOfGraveResult`
    - If survived: set HP to 1, mark `strengthOfTheGraveUsed: true` in classResources
    - If failed: set HP to 0, proceed to normal death save flow
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 12. Implement rest integration
  - [x] 12.1 Add familiar dismissal and Strength of the Grave reset to `handleLongRest` in dashboard
    - Set `familiars: []` in classResources to dismiss all familiars
    - Set `strengthOfTheGraveUsed: false` in classResources
    - _Requirements: 8.3, 8.4_

  - [x] 12.2 Update `buildLongRestItems` in `src/components/ui/RestModal.tsx`
    - Add line item for familiar dismissal when familiars array is non-empty (e.g., "All familiars dismissed")
    - Add line item for Strength of the Grave reset when `strengthOfTheGraveUsed` is true (e.g., "Strength of the Grave reset")
    - _Requirements: 2.8, 8.3, 8.4_

  - [ ]* 12.3 Write property test: long rest resets familiars and Strength of the Grave (Property 10)
    - **Property 10: Long rest resets familiars and Strength of the Grave**
    - Generate random CharacterData with familiars and strengthOfTheGraveUsed; verify long rest produces empty familiars and used=false
    - **Validates: Requirements 2.8, 8.3, 8.4**

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The pure logic modules (familiar-logic.ts, strength-of-the-grave.ts) are side-effect-free, making them straightforward to test
- SpellCard modifications reuse the existing metamagic/free-cast button patterns
- NavButtons receives `hasFamiliars` as a prop to avoid coupling it to character data directly
