# Requirements Document

## Introduction

This spec covers leveling Madea (Shadow Sorcerer) from level 5 to level 7 in the Next.js D&D Character Tracker web app. The changes include: updating the character level, increasing HP, adding 3rd- and 4th-level spell slots, adding Counterspell and Banishment to the spell registry, increasing sorcery points from 5 to 7, extending the SP-to-slot conversion table to support 4th-level slots, fixing the Sorcery Incarnate feature to use 2 free activations per long rest before costing SP, downloading and assigning correct BG3 wiki icons for the new spells and familiars, and unlocking Hound of Ill Omen (already implemented).

## Glossary

- **Tracker**: The Next.js web application that manages D&D character state, served via Vercel KV
- **Spell_Registry**: The TypeScript module (`src/src/data/spell-registry.ts` / `src/data/spell-registry.ts`) that defines all spell metadata as `SpellData` objects
- **Character_Data**: The persisted JSON object (type `CharacterData`) stored in Vercel KV, containing all character state including level, HP, spell slots, spells, and class resources
- **Sorcery_Point_Module**: The TypeScript module (`sorcery-points.ts`) containing pure conversion logic between sorcery points and spell slots
- **SP**: Sorcery Points, a class resource for sorcerers used to fuel metamagic and create spell slots
- **Sorcery_Incarnate**: A sorcerer feat that grants 2 free activations of Innate Sorcery per long rest; after the free uses are spent, subsequent activations cost 2 SP each
- **Innate_Sorcery**: A sorcerer class feature that, when active, grants +1 to spell save DC and advantage on spell attack rolls; tracked via `innateSorceryActive`, `innateSorceryUsesRemaining`, and `innateSorceryMaxUses` in ClassResources
- **Icon_Fetcher**: The script (`src/scripts/fetch-icons.ts`) that downloads spell icons from the BG3 wiki and saves them to `public/images/icons/spells/`
- **Familiar_Icon**: A PNG image at `public/images/icons/familiars/{type}.png` displayed by the `FamiliarIcon` component on both spell cards and familiar cards
- **SP_TO_SLOT_COST**: The lookup table in `sorcery-points.ts` mapping spell slot level keys to their SP creation cost
- **CON_Modifier**: The Constitution ability score modifier for the character, used in HP calculations
- **Tough_Feat**: A feat granting +2 HP per character level

## Requirements

### Requirement 1: Update Character Level

**User Story:** As a player, I want Madea's character level updated from 5 to 7, so that the app reflects the correct level for all level-dependent calculations.

#### Acceptance Criteria

1. WHEN the level-up data is applied, THE Character_Data SHALL set the `level` field to 7
2. THE Character_Data SHALL set `proficiencyBonus` to the value appropriate for a level 7 character (3)

### Requirement 2: Increase Hit Points

**User Story:** As a player, I want Madea's max HP increased by the correct amount for 2 levels, so that the character sheet reflects accurate health.

#### Acceptance Criteria

1. WHEN the level-up data is applied, THE Character_Data SHALL increase `maxHp` by 2 × (4 + CON_Modifier) + 4, where 4 is the mean d6 hit die result and the additional +4 comes from the Tough_Feat (+2 HP per level for 2 levels)
2. WHEN the level-up data is applied, THE Character_Data SHALL increase `currentHp` by the same amount as `maxHp` increased

### Requirement 3: Add 3rd-Level and 4th-Level Spell Slots

**User Story:** As a player, I want Madea to gain access to 3rd-level and 4th-level spell slots, so that the new higher-level spells can be cast.

#### Acceptance Criteria

1. WHEN the level-up data is applied, THE Character_Data SHALL add a `"3rd"` entry to `spellSlots` with a value of 1
2. WHEN the level-up data is applied, THE Character_Data SHALL add a `"3rd"` entry to `currentSpellSlots` with a value of 1
3. WHEN the level-up data is applied, THE Character_Data SHALL add a `"4th"` entry to `spellSlots` with a value of 1
4. WHEN the level-up data is applied, THE Character_Data SHALL add a `"4th"` entry to `currentSpellSlots` with a value of 1

### Requirement 4: Add Counterspell to Spell Registry

**User Story:** As a player, I want Counterspell available in the spell registry, so that it appears on the spells page with correct metadata.

#### Acceptance Criteria

1. THE Spell_Registry SHALL contain an entry for "Counterspell" with level 3, school "Abjuration", casting time "1 reaction, which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components", range "60 feet", somatic component only, duration "Instantaneous", and a description matching the 2024 D&D rules for Counterspell
2. THE Spell_Registry entry for "Counterspell" SHALL include `saveType: "CON"` to reflect the Constitution saving throw the target must make
3. WHEN the level-up data is applied, THE Character_Data SHALL add "Counterspell" to the `spells["3rd"]` array

### Requirement 5: Add Banishment to Spell Registry

**User Story:** As a player, I want Banishment available in the spell registry, so that it appears on the spells page with correct metadata.

#### Acceptance Criteria

1. THE Spell_Registry SHALL contain an entry for "Banishment" with level 4, school "Abjuration", casting time "Action", range "30 feet", components V, S, M (a pentacle), duration "Concentration, up to 1 minute", and a description matching the 2024 D&D rules for Banishment
2. THE Spell_Registry entry for "Banishment" SHALL include `saveType: "CHA"` to reflect the Charisma saving throw the target must make
3. THE Spell_Registry entry for "Banishment" SHALL include upcast information indicating one additional creature per spell slot level above 4
4. WHEN the level-up data is applied, THE Character_Data SHALL add "Banishment" to the `spells["4th"]` array (creating the `"4th"` key if it does not exist)

### Requirement 6: Increase Sorcery Points Maximum

**User Story:** As a player, I want Madea's sorcery point maximum increased from 5 to 7, so that the resource pool matches the new level.

#### Acceptance Criteria

1. WHEN the level-up data is applied, THE Character_Data SHALL set `classResources.sorceryPointsMax` to 7
2. WHEN the level-up data is applied, THE Character_Data SHALL set `classResources.currentSorceryPoints` to 7

### Requirement 7: Extend SP-to-Slot Conversion for 4th-Level Slots

**User Story:** As a player, I want to convert sorcery points into 4th-level spell slots and vice versa, so that the Flexible Casting feature works with the new slot level.

#### Acceptance Criteria

1. THE Sorcery_Point_Module SHALL include a `"4th"` entry in `SP_TO_SLOT_COST` with a cost of 6 SP
2. THE Sorcery_Point_Module `slotLevelNumber` function SHALL return 4 for the input `"4th"`
3. WHEN a sorcerer converts a 4th-level slot to SP, THE Sorcery_Point_Module SHALL return 4 SP gained
4. WHEN a sorcerer spends 6 SP to create a 4th-level slot, THE Sorcery_Point_Module SHALL deduct 6 SP and increment the `"4th"` current slot count by 1
5. IF a sorcerer attempts to create a 4th-level slot with fewer than 6 SP, THEN THE Sorcery_Point_Module SHALL return an error result without modifying state

### Requirement 8: Fix Sorcery Incarnate Free Uses

**User Story:** As a player, I want Sorcery Incarnate to provide 2 free Innate Sorcery activations per long rest before costing SP, so that the feat works as described in the 2024 D&D rules.

#### Acceptance Criteria

1. WHILE `innateSorceryUsesRemaining` is greater than 0, THE Tracker SHALL activate Innate Sorcery without deducting SP, decrementing only `innateSorceryUsesRemaining` by 1
2. WHILE `innateSorceryUsesRemaining` equals 0 and `currentSorceryPoints` is at least 2, THE Tracker SHALL activate Innate Sorcery by deducting 2 SP (without decrementing `innateSorceryUsesRemaining`)
3. IF `innateSorceryUsesRemaining` equals 0 and `currentSorceryPoints` is less than 2, THEN THE Tracker SHALL disable the Innate Sorcery activate button
4. WHEN a long rest is performed, THE Tracker SHALL reset `innateSorceryUsesRemaining` to `innateSorceryMaxUses` (which is 2 for Sorcery Incarnate)
5. THE Character_Data SHALL set `classResources.innateSorceryMaxUses` to 2

### Requirement 9: Download New Spell Icons

**User Story:** As a player, I want Counterspell and Banishment to have BG3-style icons, so that the spell cards display consistent artwork.

#### Acceptance Criteria

1. WHEN the Icon_Fetcher script is run, THE Icon_Fetcher SHALL download the Counterspell icon from the BG3 wiki and save it to `public/images/icons/spells/counterspell.png`
2. WHEN the Icon_Fetcher script is run, THE Icon_Fetcher SHALL download the Banishment icon from the BG3 wiki and save it to `public/images/icons/spells/banishment.png`

### Requirement 10: Fix Familiar Icons

**User Story:** As a player, I want the familiar icons to use the correct BG3 wiki artwork, so that the fox familiar, Hound of Ill Omen, and raven familiar display appropriate icons on both spell cards and familiar cards.

#### Acceptance Criteria

1. THE Tracker SHALL display the "Find Familiar Scratch" icon from the BG3 wiki as the fox familiar icon at `public/images/icons/familiars/fox.png`
2. THE Tracker SHALL display the "Hound of Ill Omen" icon from the BG3 wiki as the hound familiar icon at `public/images/icons/familiars/hound.png`
3. THE Tracker SHALL display the "Find Familiar Raven" icon from the BG3 wiki as the falcon familiar icon at `public/images/icons/familiars/falcon.png` (Ramil's raven uses the falcon familiar type)
4. WHEN the Find Familiar spell card is displayed for Madea, THE Tracker SHALL show the same fox familiar icon as the familiar card
5. WHEN the Hound of Ill Omen spell card is displayed, THE Tracker SHALL show the same hound icon as the familiar card

### Requirement 11: Add Hound of Ill Omen to Spell List

**User Story:** As a player, I want Hound of Ill Omen to appear in Madea's spell list at the appropriate level, so that the newly unlocked feature is accessible from the spells page.

#### Acceptance Criteria

1. THE Spell_Registry entry for "Hound of Ill Omen" SHALL remain at level 0 (it is a class feature, not a leveled spell) with its existing metadata unchanged
2. WHEN the level-up data is applied, THE Character_Data SHALL verify that "Hound of Ill Omen" is present in the character's spell data (it is already included as a class feature spell)
