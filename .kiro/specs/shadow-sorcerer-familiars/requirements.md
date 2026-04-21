# Requirements Document

## Introduction

This feature adds Shadow Sorcerer subclass abilities (Eyes of the Dark, Strength of the Grave, Hound of Ill Omen) and a new Familiars tab to the D&D Character Tracker Next.js app. The Familiars tab provides mini-dashboard cards for summoned creatures (Falcon, Fox, Hound of Ill Omen) with HP tracking, ability checks, and attack rolls. The Shadow Sorcerer features integrate with the existing sorcery point system, spell list, HP/damage system, and rest mechanics.

## Glossary

- **Tracker**: The D&D Character Tracker Next.js application
- **Dashboard**: The main character overview page displaying HP, AC, ability scores, and skills
- **Spell_Page**: The spells screen that displays cantrips, leveled spells, spell slots, and sorcery points
- **Familiar_Tab**: A new navigation tab that appears conditionally when one or more familiars are summoned
- **Familiar_Card**: A UI card within the Familiar_Tab displaying a single familiar's stats, HP, and action buttons
- **Sorcery_Points**: A class resource (SP) used by sorcerers to fuel metamagic and subclass features
- **Hound**: The Hound of Ill Omen, a Shadow Sorcerer feature that summons a modified dire wolf
- **Falcon**: Ramil's familiar, using Hawk stat block
- **Fox**: Madea's familiar, using a custom Fox stat block
- **NavBar**: The sticky top navigation bar containing links to all screens (Dashboard, Attack, Spells, Saves, Actions, Bag, Journal, Map)
- **Rest_Modal**: The modal dialog used for short rest and long rest resource recovery
- **SP_Cast**: Casting a spell using sorcery points instead of a spell slot
- **Strength_Save**: The Charisma saving throw made via Strength of the Grave when reduced to 0 HP

## Requirements

### Requirement 1: Eyes of the Dark — Darkness SP Casting

**User Story:** As Madea's player, I want to cast Darkness using 2 sorcery points instead of a spell slot, so that I can conserve spell slots and see through the magical darkness.

#### Acceptance Criteria

1. WHEN Madea views the Darkness spell card on the Spell_Page, THE Spell_Card SHALL display an additional "Cast with SP (2)" button alongside the existing spell slot cast button
2. WHEN Madea presses the "Cast with SP (2)" button and current Sorcery_Points are 2 or greater, THE Spell_Page SHALL deduct 2 from current Sorcery_Points without consuming a spell slot
3. IF Madea presses the "Cast with SP (2)" button and current Sorcery_Points are less than 2, THEN THE Spell_Page SHALL display a warning message indicating insufficient sorcery points
4. WHEN Darkness is cast using Sorcery_Points, THE Spell_Card SHALL display a visual indicator that Madea can see through the darkness created by the spell
5. THE Spell_Card SHALL restrict the "Cast with SP" button to the Darkness spell for Madea's character only

### Requirement 2: Strength of the Grave

**User Story:** As Madea's player, I want the tracker to prompt me for a Strength of the Grave saving throw when Madea is reduced to 0 HP, so that I can attempt to stay at 1 HP instead.

#### Acceptance Criteria

1. WHEN damage reduces Madea's current HP to 0 and the damage type is not radiant, THE Dashboard SHALL display a Strength_Save prompt with a "Roll CHA Save" button showing the DC (5 + damage taken)
2. WHEN the Strength_Save prompt is displayed, THE Dashboard SHALL allow Madea to roll a d20 + Charisma modifier saving throw using the existing dice roll system
3. WHEN the Strength_Save roll result meets or exceeds the DC, THE Dashboard SHALL set Madea's current HP to 1 instead of 0
4. WHEN the Strength_Save roll result is below the DC, THE Dashboard SHALL keep Madea's current HP at 0 and proceed to normal 0 HP behavior (death saves)
5. WHEN Strength of the Grave is used successfully (HP set to 1), THE Dashboard SHALL mark the feature as used and prevent further use until a long rest
6. WHILE Strength of the Grave has been used successfully since the last long rest, THE Dashboard SHALL skip the Strength_Save prompt when Madea is reduced to 0 HP
7. IF the damage that reduces Madea to 0 HP is from a critical hit, THEN THE Dashboard SHALL skip the Strength_Save prompt
8. WHEN a long rest is completed, THE Rest_Modal SHALL reset the Strength of the Grave used flag to allow future use

### Requirement 3: Hound of Ill Omen — Spell Entry and Summoning

**User Story:** As Madea's player, I want to summon the Hound of Ill Omen from the spell list by spending 3 sorcery points, so that the hound appears as a familiar card I can interact with.

#### Acceptance Criteria

1. THE Spell_Page SHALL display "Hound of Ill Omen" as a spell entry in Madea's spell list with casting time "1 bonus action", range "30 feet of target", and cost "3 SP"
2. WHEN Madea presses the "Summon (3 SP)" button on the Hound of Ill Omen spell card and current Sorcery_Points are 3 or greater, THE Spell_Page SHALL deduct 3 from current Sorcery_Points and create a Hound familiar instance
3. IF Madea presses the "Summon (3 SP)" button and current Sorcery_Points are less than 3, THEN THE Spell_Page SHALL display a warning message indicating insufficient sorcery points
4. WHEN the Hound is summoned, THE Tracker SHALL initialize the Hound with AC 14, HP 37, temporary HP equal to floor(Madea's sorcerer level / 2), Speed 50 ft, and the dire wolf ability scores (STR 17, DEX 15, CON 15, INT 3, WIS 12, CHA 7)
5. WHEN the Hound is summoned, THE Tracker SHALL set the Hound's creature type to Medium monstrosity
6. WHEN the Hound is summoned, THE Familiar_Tab SHALL become visible in the NavBar and display the Hound's Familiar_Card

### Requirement 4: Hound of Ill Omen — Familiar Card

**User Story:** As Madea's player, I want the Hound of Ill Omen to have a familiar card with attack buttons and HP tracking, so that I can manage the hound in combat.

#### Acceptance Criteria

1. THE Familiar_Card for the Hound SHALL display: current HP / max HP, temporary HP, AC (14), Speed (50 ft), and all six ability scores with modifiers
2. THE Familiar_Card for the Hound SHALL display a "Bite" attack button that rolls +5 to hit (d20 + 5) using the existing dice roll system
3. WHEN the Bite attack hits, THE Familiar_Card SHALL provide a "Damage" button that rolls 2d6 + 3 piercing damage
4. THE Familiar_Card for the Hound SHALL display a note that the target must make a DC 13 STR save or be knocked prone on a hit
5. THE Familiar_Card SHALL display a damage input and "Damage" button to apply damage to the Hound, reducing temporary HP first, then regular HP
6. WHEN the Hound's HP reaches 0, THE Tracker SHALL remove the Hound familiar instance and hide the Familiar_Tab if no other familiars are summoned
7. THE Familiar_Card for the Hound SHALL display a "Dismiss" button that removes the Hound familiar instance
8. THE Familiar_Card for the Hound SHALL display the special traits: target has disadvantage on saves against caster's spells while Hound is within 5 ft, and Hound can move through creatures and objects as difficult terrain

### Requirement 5: Familiars Tab — Navigation and Visibility

**User Story:** As a player, I want a Familiars tab that only appears when I have active familiars, so that the navigation stays clean when no familiars are summoned.

#### Acceptance Criteria

1. WHILE one or more familiars are summoned, THE NavBar SHALL display a "Familiars" tab to the right of the "Map" tab
2. WHILE no familiars are summoned, THE NavBar SHALL hide the "Familiars" tab
3. THE NavBar SHALL style the "Familiars" tab with a blue hue to visually indicate the ephemeral nature of summoned creatures
4. WHEN the "Familiars" tab is clicked, THE Tracker SHALL navigate to the Familiar_Tab page displaying all active Familiar_Cards
5. THE Familiar_Tab page SHALL use the same ScreenBackground, AmbientEffects, and UIPanel layout patterns as other screens in the Tracker

### Requirement 6: Find Familiar — Normal Familiars (Falcon and Fox)

**User Story:** As a player, I want to summon my character's familiar (Falcon for Ramil, Fox for Madea) as a bonus action without spending a spell slot, so that I can use my familiar in gameplay.

#### Acceptance Criteria

1. THE Spell_Page SHALL display "Find Familiar" as a spell entry for both Ramil and Madea with casting time "1 bonus action" and cost "Free"
2. WHEN a player presses the "Summon" button on the Find Familiar spell card, THE Tracker SHALL create the character's familiar instance: Falcon (Hawk stats) for Ramil, Fox for Madea
3. WHEN the Falcon is summoned, THE Tracker SHALL initialize the Falcon with AC 13, HP 1, Speed 10 ft / 60 ft fly, and Hawk ability scores (STR 5, DEX 16, CON 8, INT 2, WIS 14, CHA 6)
4. WHEN the Fox is summoned, THE Tracker SHALL initialize the Fox with AC 13, HP 2, Speed 30 ft / burrow 5 ft, Darkvision 60 ft, and Fox ability scores (STR 2, DEX 16, CON 11, INT 3, WIS 12, CHA 6)
5. WHEN a normal familiar is summoned, THE Familiar_Tab SHALL become visible in the NavBar and display the familiar's Familiar_Card
6. THE Familiar_Card for normal familiars SHALL display: current HP / max HP, AC, Speed, all six ability scores with modifiers, and passive Perception
7. THE Familiar_Card for normal familiars SHALL display clickable ability check buttons for each of the six ability scores that roll d20 + ability modifier
8. THE Familiar_Card for normal familiars SHALL display a "Help" action button (descriptive only, no roll required)
9. THE Familiar_Card for the Falcon SHALL display the "Keen Sight" trait: advantage on Perception checks relying on sight
10. THE Familiar_Card for the Fox SHALL display the "Keen Hearing" trait: advantage on Perception checks relying on hearing, and Darkvision 60 ft
11. THE Familiar_Card for normal familiars SHALL NOT display attack buttons, as familiars summoned via Find Familiar cannot attack
12. WHEN a normal familiar's HP reaches 0, THE Tracker SHALL remove that familiar instance and hide the Familiar_Tab if no other familiars are summoned

### Requirement 7: Familiar Icons

**User Story:** As a player, I want each familiar card to display a recognizable icon, so that I can quickly identify which familiar is which.

#### Acceptance Criteria

1. THE Familiar_Card for the Falcon SHALL display the Find Familiar Raven icon from the BG3 spell icon set
2. THE Familiar_Card for the Fox SHALL display the Find Familiar Scratch icon from the BG3 spell icon set
3. THE Familiar_Card for the Hound SHALL display a distinct icon differentiating the Hound from normal familiars
4. WHEN a familiar icon image file is not found, THE Familiar_Card SHALL fall back to a text-based label displaying the familiar's name

### Requirement 8: Familiar State Persistence and Rest Integration

**User Story:** As a player, I want my familiar state to persist across page navigations and be properly handled during rests, so that I don't lose familiar data when switching tabs.

#### Acceptance Criteria

1. THE Tracker SHALL persist all active familiar instances (HP, temporary HP, summoned status) in the character data state managed by the useCharacterData hook
2. WHEN the player navigates between tabs, THE Tracker SHALL preserve all familiar state including current HP and temporary HP
3. WHEN a long rest is completed, THE Rest_Modal SHALL dismiss all summoned familiars and reset familiar state (familiars must be re-summoned after rest)
4. WHEN a long rest is completed, THE Rest_Modal SHALL reset the Strength of the Grave used flag
