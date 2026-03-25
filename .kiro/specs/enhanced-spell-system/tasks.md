# Implementation Plan: Enhanced Spell System

## Overview

Replace the string-based spell lists on the Spells page with a metadata-driven spell system. Implementation proceeds bottom-up: types first, then pure calculation functions, then the static spell registry, then the SpellCard UI component, and finally the page rewrite and file sync.

## Tasks

- [x] 1. Create SpellData type and re-export from types barrel
  - [x] 1.1 Create `src/src/types/spell.ts` with the `SpellData` interface, `SpellSchool` type, and `METAMAGIC_OPTIONS` constant
    - Define `SpellData` interface with all fields from the design: `name`, `level`, `school`, `castingTime`, `range`, `components` (with `verbal`, `somatic`, `material`, `materialDescription`), `duration`, `description`, `damageDice?`, `damageType?`, `saveType?`, `attackRoll?`, `ritual?`, `upcast?` (with `perLevel`), `cantripScaling?`
    - Define `SpellSchool` union type
    - Export `METAMAGIC_OPTIONS` constant with empowered (cost 1) and quickened (cost 2)
    - Export `LEVEL_KEYS` mapping numeric levels to string keys ("1st", "2nd", etc.)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 1.2 Update `src/src/types/index.ts` to re-export `SpellData`, `SpellSchool`, and related types from `./spell`
    - _Requirements: 1.1_

  - [x] 1.3 Write property test for SpellData serialization round-trip
    - Create `src/src/types/__tests__/spell.property.test.ts`
    - **Property 9: Spell data serialization round-trip**
    - Generate random valid `SpellData` objects with all optional fields varied using fast-check
    - Assert `JSON.parse(JSON.stringify(spellData))` deeply equals the original
    - **Validates: Requirements 10.1, 10.2**

- [x] 2. Implement pure calculation functions
  - [x] 2.1 Create `src/src/app/spells/spell-calc.ts` with all pure functions
    - Implement `calcSpellAttackBonus(proficiencyBonus, spellcastingAbility, stats)` returning `proficiencyBonus + stats[spellcastingAbility].modifier`
    - Implement `calcSpellSaveDC(proficiencyBonus, spellcastingAbility, stats)` returning `8 + proficiencyBonus + stats[spellcastingAbility].modifier`
    - Implement `calcCantripDice(baseDice, characterLevel)` using cantrip scaling multiplier (1 at 1–4, 2 at 5–10, 3 at 11–16, 4 at 17–20)
    - Implement `calcUpcastDamage(baseDamage, baseLevel, castLevel, perLevel)` adding `(castLevel - baseLevel) * perLevel count` dice
    - Implement `canRitualCast(spell, charClass, preparedSpells, spellName)` — Wizards always true for ritual spells, Sorcerers always false
    - Implement `consumeSpellSlot(currentSlots, level)` — decrement by 1 if available, error if 0
    - Implement `applyMetamagic(option, currentSP)` — deduct cost if sufficient SP, error otherwise
    - Implement helper `parseDiceExpression(expr)` to parse strings like "8d6" into `{ count, sides }`
    - Implement `getSpellcastingAbility(charClass)` returning "CHA" for Sorcerer, "INT" for Wizard
    - _Requirements: 3.2, 3.3, 4.3, 5.2, 6.2, 6.3, 6.4, 7.3, 7.4, 8.1, 8.3, 9.3, 9.6_

  - [x] 2.2 Write property test: Spell attack bonus calculation
    - Create `src/src/app/spells/__tests__/spell-calc.property.test.ts`
    - **Property 2: Spell attack bonus calculation**
    - Generate random proficiency (1–6) and random ability modifiers (−5 to +5)
    - Assert result equals `proficiency + stats[ability].modifier`
    - **Validates: Requirements 3.2, 3.3**

  - [x] 2.3 Write property test: Spell save DC calculation
    - Same test file as 2.2
    - **Property 3: Spell save DC calculation**
    - Generate random proficiency (1–6) and random ability modifiers (−5 to +5)
    - Assert result equals `8 + proficiency + stats[ability].modifier`
    - **Validates: Requirements 5.2**

  - [x] 2.4 Write property test: Cantrip damage scaling
    - Same test file as 2.2
    - **Property 4: Cantrip damage scaling**
    - Generate random base dice expressions and random character levels (1–20)
    - Assert dice count equals base count × scaling multiplier, die size unchanged
    - **Validates: Requirements 4.3**

  - [x] 2.5 Write property test: Upcast damage calculation
    - Same test file as 2.2
    - **Property 5: Upcast damage calculation**
    - Generate random base damage, random base/cast level pairs (cast > base), random perLevel dice
    - Assert dice count equals `baseCount + (castLevel - baseLevel) * perLevelCount`, die size unchanged
    - **Validates: Requirements 6.2**

  - [x] 2.6 Write property test: Spell slot consumption
    - Same test file as 2.2
    - **Property 6: Spell slot consumption**
    - Generate random slot states (0–4 per level) and random target levels
    - Assert success with decrement by 1 when slots ≥ 1, failure when slots = 0
    - **Validates: Requirements 6.3, 6.4, 8.1, 8.3**

  - [x] 2.7 Write property test: Ritual casting class rules
    - Same test file as 2.2
    - **Property 7: Ritual casting class rules**
    - Generate random class strings (Wizard/Sorcerer), random ritual flags, random prepared lists
    - Assert Wizard can ritual-cast any ritual spell regardless of preparation; Sorcerer cannot ritual-cast
    - **Validates: Requirements 7.3, 7.4**

  - [x] 2.8 Write property test: Metamagic sorcery point consumption
    - Same test file as 2.2
    - **Property 8: Metamagic sorcery point consumption**
    - Generate random SP totals (0–20) and random Metamagic options
    - Assert success with `newSP = currentSP - cost` when SP ≥ cost, failure with unchanged SP when SP < cost
    - **Validates: Requirements 9.3, 9.4, 9.6, 9.7**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build the static spell registry
  - [x] 4.1 Create `src/src/data/spell-registry.ts` with `SPELL_REGISTRY: Record<string, SpellData>`
    - Add a `SpellData` entry for every cantrip and leveled spell used by both characters (Madea and Ramil)
    - Source spell descriptions from D&D 2024 rules (dnd2024.wikidot.com/spell:all)
    - Include all required fields: name, level, school, castingTime, range, components, duration, description
    - Include conditional fields where applicable: damageDice, damageType, saveType, attackRoll, ritual, upcast, cantripScaling
    - Reference both characters' `cantrips` and `spells` arrays from their character data to determine the full spell list
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 4.2 Write property test: Spell registry completeness and data consistency
    - Create `src/src/data/__tests__/spell-registry.property.test.ts`
    - **Property 1: Spell registry completeness and data consistency**
    - Iterate over all character spell names and validate each registry entry has non-empty required fields
    - Assert conditional consistency: damageDice ↔ damageType, saveType is valid AbilityName, upcast.perLevel is valid dice expression
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.8**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build the SpellCard component and rewrite the Spells page
  - [x] 6.1 Create `src/src/app/spells/SpellCard.tsx` component
    - Implement collapsed state: spell name, level badge, ritual "R" badge (Req 2.5), prepared/auto indicator for Wizards
    - Implement expanded state on click (Req 2.1, 2.4): metadata header with school, casting time, range, components, duration (Req 2.2), full description text (Req 2.3)
    - Render "Spell Attack" button when `attackRoll === true` (Req 3.1); on click, call `onRollDice` with d20 + `calcSpellAttackBonus` modifier and spell name label (Req 3.2); include advantage/disadvantage toggles (Req 3.4)
    - Render "Damage" button when `damageDice` is defined (Req 4.1); on click, call `onRollDice` with the spell's damage dice and label including spell name + damage type (Req 4.2, 4.4); for cantrips with `cantripScaling`, use `calcCantripDice` (Req 4.3)
    - Render save DC badge when `saveType` is defined, showing "DC {value} {ability}" (Req 5.1)
    - Render level selector dropdown when spell is upcastable and character has higher-level slots (Req 6.1); update displayed damage dice on level change (Req 6.2); consume slot at selected level on cast (Req 6.3); disable levels with 0 remaining slots (Req 6.4); roll adjusted dice on Damage click (Req 6.5)
    - Render "Cast as Ritual" button when `ritual === true` and `canRitualCast` returns true (Req 7.1, 7.3, 7.4); ritual cast does not consume a slot (Req 7.2)
    - Render "Cast" button for leveled spells that calls `consumeSpellSlot` and persists via `onMutate` (Req 8.1, 8.2); show warning if no slots (Req 8.3); no slot consumption for cantrips (Req 8.4); display remaining slots for the spell's level (Req 8.5)
    - Render Metamagic row for Sorcerer characters only (Req 9.1, 9.9): "Empowered Spell (1 SP)" on damage spells (Req 9.2), "Quickened Spell (2 SP)" on 1-action spells (Req 9.5); call `applyMetamagic` and persist SP via `onMutate` (Req 9.3, 9.6); disable buttons when insufficient SP (Req 9.4, 9.7); show current SP total (Req 9.8)
    - _Requirements: 2.1–2.5, 3.1–3.4, 4.1–4.4, 5.1–5.3, 6.1–6.5, 7.1–7.4, 8.1–8.5, 9.1–9.9_

  - [x] 6.2 Rewrite `src/src/app/spells/page.tsx` to use SpellCard components
    - Remove `COMMON_SPELL_DICE` quick-roller and the old string-based spell list rendering
    - Resolve spellcasting ability from `charClass` using `getSpellcastingAbility`
    - Look up each spell in `SPELL_REGISTRY` and pass `SpellData` to `SpellCard`
    - Manage expanded spell state (only one card expanded at a time)
    - Wire `useDiceRoll` hook to `SpellCard.onRollDice`
    - Wire `useCharacterData.mutate` to `SpellCard.onMutate`
    - Keep existing Sorcery Points panel (SP-to-slot / slot-to-SP conversions) and Wizard spell preparation panel
    - _Requirements: 2.1, 3.2, 5.2, 8.1, 8.2_

  - [x] 6.3 Sync modified files from `src/src/app/spells/` to `src/app/spells/`
    - Copy `src/src/app/spells/page.tsx` → `src/app/spells/page.tsx`
    - Copy `src/src/app/spells/SpellCard.tsx` → `src/app/spells/SpellCard.tsx`
    - Copy `src/src/app/spells/spell-calc.ts` → `src/app/spells/spell-calc.ts`
    - Ensure Next.js App Router picks up the updated routes

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The spell registry (task 4.1) is the largest single task — it requires actual D&D 2024 spell text for all spells used by both characters
- After modifying files in `src/src/app/`, the corresponding files in `src/app/` must be synced (task 6.3)
