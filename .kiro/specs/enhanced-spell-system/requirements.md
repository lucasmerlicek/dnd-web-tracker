# Requirements Document

## Introduction

Rework the Spells page in the D&D 5E web tracker to replace the current simple string-based spell lists with a rich spell data model. Each spell gains full metadata (description, school, casting time, range, components, duration, damage dice, save type, attack roll flag, ritual tag, and upcasting rules) sourced from D&D 2024 spell data. The enhanced page provides one-click spell attack rolls, damage rolls, and save DC display integrated with the existing 3D Dice_Roller. Upcasting automatically adjusts damage dice and consumes the correct higher-level slot. Ritual casting allows slot-free casting, with Wizards able to ritual-cast unprepared spells. Non-ritual casts automatically decrement the appropriate spell slot.

Two characters are affected: Madea Blackthorn (Shadow Sorcerer 5, spellcasting modifier = CHA) and Ramil al-Sayif (Fighter 1 / Wizard 4 Bladesinger, spellcasting modifier = INT). Sorcerers (Madea) gain Metamagic integration on the Spells page, with Empowered Spell (1 SP) and Quickened Spell (2 SP) buttons that automatically consume sorcery points.

## Glossary

- **App**: The Next.js 14 web application deployed on Vercel
- **Spells_Page**: The `/spells` route displaying spell management UI
- **Spell_Data**: A structured object containing all metadata for a single spell (name, level, school, casting time, range, components, duration, description, damage dice, save type, attack roll flag, ritual tag, upcast rules)
- **Spell_Registry**: A static lookup table mapping spell names to their Spell_Data, sourced from D&D 2024 rules at dnd2024.wikidot.com/spell:all
- **Spell_Card**: An expandable UI element for a single spell showing its full description and action buttons
- **Spell_Attack_Roll**: A d20 roll plus proficiency bonus plus spellcasting ability modifier, triggered via the Dice_Roller
- **Spell_Save_DC**: The difficulty class for a spell's saving throw, calculated as 8 + proficiency bonus + spellcasting ability modifier
- **Damage_Roll**: A roll of the spell's specific damage dice plus any applicable bonuses, triggered via the Dice_Roller
- **Upcast**: Casting a spell using a spell slot higher than the spell's base level, modifying damage dice according to the spell's upcast rules
- **Ritual_Cast**: Casting a spell with the ritual tag without consuming a spell slot, adding 10 minutes to the casting time
- **Spellcasting_Modifier**: The ability modifier used for spellcasting (CHA for Madea, INT for Ramil)
- **Dice_Roller**: The existing 3D physics-based dice rolling system using @react-three/fiber
- **Character_Data_Store**: The Vercel KV (Redis) backend persisting all character state
- **Prepared_Spell**: A spell selected from a Wizard's spellbook for the day; Sorcerers know all their spells innately
- **Spell_Slot**: A consumable resource used to cast spells, tracked per level
- **Metamagic**: A Sorcerer class feature allowing modification of spells by spending Sorcery_Points
- **Sorcery_Point**: A class resource for Sorcerers consumed when applying Metamagic options
- **Empowered_Spell**: A Metamagic option costing 1 Sorcery_Point, allowing reroll of damage dice up to CHA modifier (implementation: spend SP only, no reroll mechanic)
- **Quickened_Spell**: A Metamagic option costing 2 Sorcery_Points, changing a 1-action casting time to a bonus action (implementation: spend SP only, no casting time mechanic)

## Requirements

### Requirement 1: Spell Data Model

**User Story:** As a player, I want each spell to have complete metadata so that I can see all relevant information without referencing external sources.

#### Acceptance Criteria

1. THE Spell_Registry SHALL contain a Spell_Data entry for every spell and cantrip in both characters' spell lists
2. WHEN a Spell_Data entry is defined, THE Spell_Registry SHALL include the spell's name, level (cantrip or 1st through 9th), school of magic, casting time, range, components (V, S, M with material description), and duration
3. WHEN a Spell_Data entry is defined, THE Spell_Registry SHALL include a full text description of the spell sourced from D&D 2024 rules
4. WHERE a spell deals damage, THE Spell_Data SHALL include the base damage dice expression (e.g., "8d6") and the damage type (e.g., "lightning")
5. WHERE a spell requires a saving throw, THE Spell_Data SHALL include the saving throw ability (STR, DEX, CON, INT, WIS, or CHA)
6. WHERE a spell requires a spell attack roll, THE Spell_Data SHALL include an attack roll flag set to true
7. WHERE a spell has the ritual tag, THE Spell_Data SHALL include a ritual flag set to true
8. WHERE a spell can be upcast, THE Spell_Data SHALL include upcast rules specifying the additional damage dice per slot level above the base level

### Requirement 2: Spell Description Display

**User Story:** As a player, I want to expand a spell to see its full description so that I can quickly reference spell effects during gameplay.

#### Acceptance Criteria

1. WHEN a user clicks on a spell name in the spell list, THE Spell_Card SHALL expand to display the spell's full description text
2. WHEN a Spell_Card is expanded, THE Spell_Card SHALL display the spell's school, casting time, range, components, and duration as a metadata header
3. WHEN a Spell_Card is expanded, THE Spell_Card SHALL display the spell's full description below the metadata header
4. WHEN a user clicks on an already-expanded spell, THE Spell_Card SHALL collapse and hide the description
5. THE Spell_Card SHALL display a visual indicator (e.g., "R" badge) for spells with the ritual tag

### Requirement 3: Spell Attack Roll

**User Story:** As a player, I want to roll a spell attack with one click so that I can resolve spell attacks quickly during combat.

#### Acceptance Criteria

1. WHERE a spell has the attack roll flag set to true, THE Spell_Card SHALL display a "Spell Attack" button
2. WHEN a user clicks the "Spell Attack" button, THE Dice_Roller SHALL roll a d20 and add the character's proficiency bonus and Spellcasting_Modifier
3. THE App SHALL calculate the Spell_Attack_Roll modifier as proficiency bonus + Spellcasting_Modifier (CHA modifier for Madea, INT modifier for Ramil)
4. THE Spell_Card SHALL support advantage and disadvantage toggles on the Spell_Attack_Roll

### Requirement 4: Spell Damage Roll

**User Story:** As a player, I want to roll a spell's specific damage dice with one click so that I can resolve spell damage quickly during combat.

#### Acceptance Criteria

1. WHERE a spell has damage dice defined in its Spell_Data, THE Spell_Card SHALL display a "Damage" button
2. WHEN a user clicks the "Damage" button, THE Dice_Roller SHALL roll the spell's specific damage dice as defined in the Spell_Data
3. WHEN a user clicks the "Damage" button for a cantrip that scales with character level, THE Dice_Roller SHALL roll the damage dice appropriate for the character's current level
4. THE Damage_Roll label displayed by the Dice_Roller SHALL include the spell name and damage type

### Requirement 5: Spell Save DC Display

**User Story:** As a player, I want to see the save DC for spells that require saving throws so that I can communicate the DC to the DM.

#### Acceptance Criteria

1. WHERE a spell requires a saving throw, THE Spell_Card SHALL display the Spell_Save_DC and the saving throw ability type (e.g., "DC 16 DEX")
2. THE App SHALL calculate the Spell_Save_DC as 8 + proficiency bonus + Spellcasting_Modifier (CHA modifier for Madea, INT modifier for Ramil)
3. WHEN the character's proficiency bonus or Spellcasting_Modifier changes, THE Spell_Card SHALL reflect the updated Spell_Save_DC

### Requirement 6: Upcasting

**User Story:** As a player, I want to cast a spell at a higher level so that I can deal more damage or gain stronger effects when I choose to use a higher slot.

#### Acceptance Criteria

1. WHERE a spell can be upcast and the character has spell slots above the spell's base level, THE Spell_Card SHALL display a level selector allowing the user to choose a casting level from the spell's base level up to the character's highest available slot level
2. WHEN a user selects a higher casting level, THE Spell_Card SHALL display the adjusted damage dice according to the spell's upcast rules
3. WHEN a user casts an upcast spell, THE App SHALL consume one spell slot at the selected higher level (not the spell's base level)
4. IF the character has no remaining spell slots at the selected casting level, THEN THE App SHALL display a warning and prevent the cast
5. WHEN a user casts an upcast spell via the "Damage" button, THE Dice_Roller SHALL roll the adjusted damage dice for the selected casting level

### Requirement 7: Ritual Casting

**User Story:** As a player, I want to cast ritual spells without using a spell slot so that I can conserve resources for combat spells.

#### Acceptance Criteria

1. WHERE a spell has the ritual flag set to true, THE Spell_Card SHALL display a "Cast as Ritual" button
2. WHEN a user clicks "Cast as Ritual", THE App SHALL not consume any spell slot
3. WHERE the character is a Wizard (Ramil), THE Spells_Page SHALL allow ritual casting of spells with the ritual tag even when the spell is not in the Prepared_Spell list
4. WHERE the character is a Sorcerer (Madea), THE Spells_Page SHALL only allow ritual casting of spells that the Sorcerer knows (Sorcerers cannot ritual cast in D&D 5E 2024 rules unless a class feature grants it; if Madea lacks ritual casting, the ritual button shall not appear for her spells)

### Requirement 8: Automatic Spell Slot Consumption

**User Story:** As a player, I want spell slots to be automatically consumed when I cast a spell so that I do not have to manually track slot usage.

#### Acceptance Criteria

1. WHEN a user casts a leveled spell (not a cantrip and not a ritual cast), THE App SHALL decrement the current spell slot count at the casting level by 1
2. WHEN a user casts a leveled spell, THE App SHALL persist the updated spell slot count to the Character_Data_Store
3. IF the character has no remaining spell slots at the required level, THEN THE App SHALL display a warning message and prevent the cast
4. WHEN a user casts a cantrip, THE App SHALL not consume any spell slot
5. THE Spell_Card SHALL display the remaining spell slots for the spell's casting level to provide at-a-glance resource awareness

### Requirement 9: Metamagic

**User Story:** As a Sorcerer player, I want to apply Metamagic options to my spells so that I can enhance my casting by spending sorcery points.

#### Acceptance Criteria

1. WHERE the character is a Sorcerer (Madea), THE Spell_Card SHALL display Metamagic buttons for each known Metamagic option when the spell card is expanded
2. THE Spell_Card SHALL display an "Empowered Spell" button (cost: 1 SP) on spells that deal damage
3. WHEN a user clicks "Empowered Spell", THE App SHALL decrement current sorcery points by 1 and persist the change to the Character_Data_Store
4. IF the character has fewer than 1 sorcery point remaining, THEN THE App SHALL disable the "Empowered Spell" button
5. THE Spell_Card SHALL display a "Quickened Spell" button (cost: 2 SP) on spells that have a casting time of 1 action
6. WHEN a user clicks "Quickened Spell", THE App SHALL decrement current sorcery points by 2 and persist the change to the Character_Data_Store
7. IF the character has fewer than 2 sorcery points remaining, THEN THE App SHALL disable the "Quickened Spell" button
8. THE Spell_Card SHALL display the current sorcery point total alongside the Metamagic buttons so the player can see remaining resources
9. WHERE the character is not a Sorcerer, THE Spell_Card SHALL not display any Metamagic buttons

### Requirement 10: Spell Data Serialization Round-Trip

**User Story:** As a developer, I want spell data to survive serialization and deserialization without loss so that persisted spell configurations remain accurate.

#### Acceptance Criteria

1. FOR ALL valid Spell_Data objects, serializing to JSON and deserializing back SHALL produce an equivalent Spell_Data object (round-trip property)
2. FOR ALL valid upcast configurations, serializing the selected casting level and adjusted damage dice to JSON and deserializing back SHALL produce equivalent values
3. THE App SHALL validate Spell_Data objects against the TypeScript Spell_Data interface when loading from the Spell_Registry
