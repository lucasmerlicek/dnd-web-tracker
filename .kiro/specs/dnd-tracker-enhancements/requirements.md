# Requirements Document

## Introduction

A batch of enhancements to the D&D Character Tracker web application (Next.js 14, TypeScript, Tailwind CSS, NextAuth, Vercel KV, react-zoom-pan-pinch, framer-motion). The changes span spell upcasting descriptions, a death save system, universal actions, an undo system, character-specific feat gating, hit dice fixes, inspiration caps, persistent Shield/Mage Armor toggles, improved bag item display, gear stat integration, treasure valuation, map zoom/pan fixes, Second Wind tracking, spell-created weapons in the attack menu, an attack menu redesign, and dashboard UI improvements. Two primary characters are affected: Madea Blackthorn (Shadow Sorcerer 5) and Ramil al-Sayif (Fighter 1 / Wizard 4 Bladesinger). A third character, Barian the Broken, may also benefit from shared improvements.

## Glossary

- **App**: The Next.js 14 web application deployed on Vercel
- **Dashboard**: The `/dashboard` route displaying character overview (HP, AC, inspiration, luck, Shield/Mage Armor toggles)
- **Attack_Page**: The `/attack` route displaying weapon attack cards and roll buttons
- **Spells_Page**: The `/spells` route displaying spell management UI with expandable Spell_Cards
- **Saves_Page**: The `/saves` route displaying saving throw modifiers and death save tracking
- **Actions_Page**: The `/actions` route displaying class-specific and universal combat actions
- **Bag_Page**: The `/bag` route displaying inventory (gear, utility, treasure) and coin management
- **Map_Page**: The `/map` route displaying interactive world maps with zoom, pan, and markers
- **Spell_Card**: An expandable UI element for a single spell showing its full description and action buttons
- **Spell_Registry**: The static lookup table (`spell-registry.ts`) mapping spell names to SpellData objects
- **Upcast_Description**: A human-readable text field on SpellData describing the effect of casting a spell at a higher level
- **Death_Save_Tracker**: A UI component on the Saves_Page tracking death saving throw successes (0–3) and failures (0–3)
- **Universal_Action**: A standard D&D combat action available to all characters regardless of class (Grapple, Shove, Hide, Disengage, Dash, Dodge, Help, Ready, Search, Use an Object)
- **Undo_System**: A mechanism that records state snapshots before irreversible actions and allows reverting via Ctrl+Z
- **State_Snapshot**: A serialized copy of the CharacterData at a point in time, stored in memory for undo purposes
- **Character_Data_Store**: The Vercel KV (Redis) backend persisting all character state
- **Luck_Points**: A feat-based resource granting rerolls, currently only applicable to Ramil
- **Hit_Dice**: A per-class healing resource used during short rests, with die size determined by class (d10 for Fighter, d6 for Wizard)
- **Inspiration_Counter**: A resource counter on the Dashboard capped at a maximum value
- **Shield_Toggle**: A persistent on/off state for the Shield spell that adds +5 AC while active
- **Mage_Armor_Toggle**: A persistent on/off state for Mage Armor that sets base AC to 13 + DEX modifier while active
- **Bag_Item_Card**: An expandable UI element for an inventory item showing details and quantity
- **Gear_Item**: An inventory item in the gear category that can be equipped and/or attuned, with stat effects
- **Treasure_Item**: An inventory item in the treasure category with an estimated gold value
- **Map_Viewer**: The interactive map component using react-zoom-pan-pinch for zoom and pan on world maps
- **Map_Marker**: A positioned annotation on a map with category, title, and description
- **Second_Wind**: A Fighter class feature that heals 1d10 + Fighter level HP, usable once per short rest
- **Spell_Created_Weapon**: A temporary weapon entry generated when a spell (e.g., Shadow Blade) is cast, added to the Attack_Page
- **Weapon_Card**: A redesigned UI element on the Attack_Page showing full weapon details, properties, masteries, and roll buttons
- **Passive_Perception**: A static value equal to 10 + Wisdom (Perception) modifier, displayed on the Dashboard
- **Initiative_Roll**: A d20 roll plus Dexterity modifier used to determine turn order, triggered from the Dashboard
- **Dice_Roller**: The existing 3D physics-based dice rolling system using @react-three/fiber

## Requirements

### Requirement 1: Spell Upcasting Descriptions

**User Story:** As a player, I want to see a human-readable description of what happens when I upcast a spell so that I understand the full effect without referencing external sources.

#### Acceptance Criteria

1. WHERE a spell can be upcast, THE Spell_Registry SHALL include an Upcast_Description text field describing the effect of casting at higher levels (e.g., "When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d8 for each slot level above 1st")
2. WHEN a Spell_Card is expanded for a spell that has an Upcast_Description, THE Spell_Card SHALL display the Upcast_Description below the spell's main description text
3. THE Spell_Registry SHALL contain Upcast_Descriptions for all spells in both characters' spell lists that support upcasting, sourced from D&D 2024 rules at dnd2024.wikidot.com/spell:all
4. WHERE a spell does not support upcasting, THE SpellData SHALL omit the Upcast_Description field

### Requirement 2: Death Save System

**User Story:** As a player, I want to track death saving throw successes and failures so that I can manage the life-or-death state of my character during combat.

#### Acceptance Criteria

1. THE Saves_Page SHALL display a Death_Save_Tracker component showing three success slots and three failure slots
2. WHEN a user clicks a success slot, THE Death_Save_Tracker SHALL increment the death save success count by 1, up to a maximum of 3
3. WHEN a user clicks a failure slot, THE Death_Save_Tracker SHALL increment the death save failure count by 1, up to a maximum of 3
4. WHEN the death save success count reaches 3, THE Death_Save_Tracker SHALL display a visual indicator that the character has stabilized
5. WHEN the death save failure count reaches 3, THE Death_Save_Tracker SHALL display a visual indicator that the character has died
6. WHEN a user resets death saves, THE Death_Save_Tracker SHALL set both success and failure counts to 0
7. THE App SHALL persist the death save success and failure counts to the Character_Data_Store after each change
8. FOR ALL valid death save states, serializing to JSON and deserializing back SHALL produce an equivalent death save state (round-trip property)

### Requirement 3: Universal Actions

**User Story:** As a player, I want to see standard D&D combat actions available to all characters so that I can quickly reference actions like Grapple, Hide, and Disengage during combat.

#### Acceptance Criteria

1. THE Actions_Page SHALL display a "Universal Actions" section below the character's class-specific actions
2. THE Universal_Action list SHALL include: Grapple, Shove, Hide, Disengage, Dash, Dodge, Help, Ready, Search, and Use an Object
3. WHEN a user clicks on a Universal_Action, THE Actions_Page SHALL expand the action to show its full D&D 2024 rules description
4. THE Universal_Action entries SHALL be identical across all characters and not depend on class or character-specific data

### Requirement 4: Undo System

**User Story:** As a player, I want to undo accidental button clicks (spell slots used, items removed, etc.) so that I can recover from mistakes without manually reverting changes.

#### Acceptance Criteria

1. WHEN a user performs an irreversible action (spell slot consumption, item removal, hit dice usage, inspiration change, luck point change, sorcery point change, coin change, death save change), THE Undo_System SHALL capture a State_Snapshot of the affected CharacterData fields before the action executes
2. WHEN a user presses Ctrl+Z (or Cmd+Z on macOS), THE Undo_System SHALL restore the most recent State_Snapshot and persist the restored state to the Character_Data_Store
3. THE Undo_System SHALL maintain a stack of up to 20 State_Snapshots in memory
4. WHEN the State_Snapshot stack is empty, THE Undo_System SHALL ignore the Ctrl+Z input without error
5. WHEN a page navigation occurs, THE Undo_System SHALL clear the State_Snapshot stack for the previous page
6. FOR ALL undo operations, restoring a State_Snapshot SHALL produce a CharacterData state equivalent to the state before the undone action was performed (round-trip property)

### Requirement 5: Character-Specific Luck Points

**User Story:** As a player, I want the Luck feat UI to appear only for characters that have the Luck feat so that characters without the feat do not see irrelevant controls.

#### Acceptance Criteria

1. THE Dashboard SHALL display the Luck_Points counter only for characters whose featsTraits array includes the "Lucky" feat
2. WHERE a character does not have the "Lucky" feat in featsTraits, THE Dashboard SHALL hide the Luck_Points counter entirely
3. WHEN the App loads character data, THE Dashboard SHALL check the featsTraits array to determine Luck_Points visibility

### Requirement 6: Hit Dice Fix for Multiclass Characters

**User Story:** As a multiclass player, I want my hit dice to reflect each class's contribution so that I can use the correct die sizes during short rests.

#### Acceptance Criteria

1. THE CharacterData model SHALL support multiple hit dice pools, each with a class name, die size, total count, and available count
2. WHEN Ramil's character data is loaded, THE App SHALL provide 1 hit die of size d10 (Fighter) and 4 hit dice of size d6 (Wizard)
3. WHEN a user spends a hit die during a short rest, THE Dashboard SHALL allow the user to choose which class's hit die pool to spend from
4. THE App SHALL persist each hit dice pool's available count independently to the Character_Data_Store
5. WHEN a long rest occurs, THE App SHALL restore hit dice according to D&D 2024 rules (regain up to half total hit dice, minimum 1)

### Requirement 7: Inspiration Cap

**User Story:** As a player, I want inspiration to be capped at a maximum value so that it cannot be incremented beyond the allowed limit.

#### Acceptance Criteria

1. THE Dashboard SHALL cap the Inspiration_Counter at a maximum value of 2
2. WHEN a user attempts to increment inspiration beyond 2, THE Dashboard SHALL keep the value at 2 and provide no further increment
3. WHEN a user decrements inspiration, THE Dashboard SHALL allow the value to decrease to a minimum of 0
4. THE App SHALL persist the inspiration value to the Character_Data_Store after each change

### Requirement 8: Shield and Mage Armor Persistent Toggles

**User Story:** As a player, I want Shield and Mage Armor to activate when cast and remain active until I manually deactivate them so that I do not have to re-enable them each round.

#### Acceptance Criteria

1. WHEN a user activates the Shield_Toggle, THE Dashboard SHALL add +5 to the character's displayed AC and persist the shieldActive state as true to the Character_Data_Store
2. WHEN a user deactivates the Shield_Toggle, THE Dashboard SHALL remove the +5 AC bonus and persist the shieldActive state as false to the Character_Data_Store
3. WHEN a user activates the Mage_Armor_Toggle, THE Dashboard SHALL set the character's base AC to 13 + DEX modifier and persist the mageArmorActive state as true to the Character_Data_Store
4. WHEN a user deactivates the Mage_Armor_Toggle, THE Dashboard SHALL revert the character's base AC to the defaultBaseAc value and persist the mageArmorActive state as false to the Character_Data_Store
5. WHEN the App loads character data with shieldActive set to true, THE Dashboard SHALL display the Shield as active and include the +5 AC bonus
6. WHEN the App loads character data with mageArmorActive set to true, THE Dashboard SHALL display Mage Armor as active and use the 13 + DEX modifier base AC
7. THE Shield_Toggle and Mage_Armor_Toggle SHALL remain in their active/inactive state across page navigations within the same session

### Requirement 9: Bag Item Cards with Quantity

**User Story:** As a player, I want inventory items to show quantity and expand into detail cards when clicked so that I can manage my inventory more effectively.

#### Acceptance Criteria

1. THE Bag_Page SHALL display each item with a quantity indicator before the item name (e.g., "3x Healing Potion")
2. WHEN a user clicks on an item in the Bag_Page, THE Bag_Item_Card SHALL expand to show the item's description and details
3. WHEN a user clicks on an already-expanded Bag_Item_Card, THE Bag_Item_Card SHALL collapse
4. THE inventory data model SHALL support a quantity field for each item, defaulting to 1 for items without an explicit quantity
5. WHEN a user adds an item that already exists in the inventory, THE App SHALL increment the existing item's quantity rather than creating a duplicate entry
6. THE App SHALL persist item quantities to the Character_Data_Store after each change

### Requirement 10: Gear Equipped and Attuned Indicators with Stat Effects

**User Story:** As a player, I want gear items to show equipped/attuned status and automatically affect my stats so that magical items like +1 weapons and Ring of Protection are reflected in my character's numbers.

#### Acceptance Criteria

1. THE Bag_Page SHALL display an "Equipped" indicator on Gear_Items that are currently equipped
2. THE Bag_Page SHALL display an "Attuned" indicator on Gear_Items that require and have attunement
3. WHEN a user toggles a Gear_Item to equipped, THE App SHALL apply the item's stat modifiers to the character's stats (e.g., a +1 weapon adds +1 to attack and damage rolls for that weapon, Ring of Protection +1 adds +1 to AC)
4. WHEN a user toggles a Gear_Item to unequipped, THE App SHALL remove the item's stat modifiers from the character's stats
5. THE App SHALL persist the equipped and attuned state of each Gear_Item to the Character_Data_Store
6. THE gear data model SHALL support fields for: equipped (boolean), requiresAttunement (boolean), attuned (boolean), and statModifiers (a list of stat-effect pairs such as {stat: "ac", value: +1})

### Requirement 11: Treasure Estimated Value

**User Story:** As a player, I want treasure items to have an estimated gold value and see a total sum so that I can track the party's wealth from non-coin loot.

#### Acceptance Criteria

1. THE Bag_Page SHALL display an estimated gold value next to each Treasure_Item
2. THE Bag_Page SHALL display a total estimated value sum at the bottom of the treasure section
3. WHEN a user adds or edits a Treasure_Item, THE Bag_Page SHALL allow the user to set an estimated gold value
4. WHEN a Treasure_Item is removed, THE Bag_Page SHALL recalculate and update the total estimated value sum
5. THE treasure data model SHALL support an estimatedValue field (number, in gold pieces) for each Treasure_Item
6. THE App SHALL persist treasure estimated values to the Character_Data_Store after each change

### Requirement 12: Map Zoom and Pan Improvements

**User Story:** As a player, I want smooth and responsive zoom/pan on all maps so that I can navigate the world maps without clunky or janky behavior.

#### Acceptance Criteria

1. THE Map_Viewer SHALL use smooth interpolated transitions for zoom and pan operations instead of discrete jumps
2. THE Map_Viewer SHALL support pinch-to-zoom on touch devices and scroll-wheel zoom on desktop with consistent sensitivity
3. THE Map_Viewer SHALL clamp zoom levels to a minimum of 1x and a maximum of 5x to prevent over-zoom or under-zoom
4. THE Map_Viewer SHALL clamp pan boundaries so the map image cannot be panned entirely off-screen
5. THE Map_Page SHALL support Map_Markers on Aetherion maps with the same marker creation, editing, and display functionality as Valerion maps
6. WHEN a user switches between Valerion and Aetherion map tabs, THE Map_Viewer SHALL reset zoom and pan to the default view
7. THE Map_Viewer SHALL maintain marker positions accurately at all zoom levels

### Requirement 13: Second Wind Tracking

**User Story:** As a Fighter player, I want to track Second Wind usage so that I know when I can use it and when it recharges.

#### Acceptance Criteria

1. WHERE the character has the Second Wind action, THE Actions_Page SHALL display a Second Wind action card with current uses and maximum uses (max 1)
2. WHEN a user activates Second Wind, THE App SHALL decrement the Second Wind uses by 1 and trigger a healing roll of 1d10 + Fighter level via the Dice_Roller
3. IF Second Wind uses are at 0, THEN THE Actions_Page SHALL disable the Second Wind button and display it as unavailable
4. WHEN a short rest occurs, THE App SHALL restore Second Wind uses to 1
5. THE App SHALL persist the Second Wind uses count to the Character_Data_Store after each change

### Requirement 14: Spell-Created Weapons in Attack Menu

**User Story:** As a player, I want spells that create weapons (like Shadow Blade) to add a temporary weapon entry to the Attack menu so that I can make attack and damage rolls with the conjured weapon.

#### Acceptance Criteria

1. WHEN a user casts a spell that creates a weapon (e.g., Shadow Blade), THE App SHALL add a temporary Spell_Created_Weapon entry to the Attack_Page weapon list
2. THE Spell_Created_Weapon entry SHALL use the weapon stats defined by the spell (damage dice, damage type, properties, attack stat) and reflect the casting level if upcast
3. WHEN the spell's duration ends or the user manually dismisses the Spell_Created_Weapon, THE App SHALL remove the temporary weapon entry from the Attack_Page
4. THE Spell_Created_Weapon SHALL appear visually distinct from permanent weapons on the Attack_Page (e.g., a glowing border or spell icon indicator)
5. THE App SHALL persist active Spell_Created_Weapons to the Character_Data_Store so they survive page navigation

### Requirement 15: Attack Menu Redesign

**User Story:** As a player, I want the attack menu to show weapon cards with full details and clean roll buttons so that I can quickly reference weapon properties and make attacks without visual clutter.

#### Acceptance Criteria

1. THE Attack_Page SHALL display each weapon as a Weapon_Card containing the weapon name, full description, properties (e.g., Finesse, Light, Thrown), damage dice, damage type, and weapon masteries
2. THE Weapon_Card SHALL display an "Attack Roll" button that triggers a d20 + attack bonus roll via the Dice_Roller
3. THE Weapon_Card SHALL display a "Damage Roll" button that triggers the weapon's damage dice + damage bonus roll via the Dice_Roller
4. THE Attack_Page SHALL remove the current colored button layout and replace it with the Weapon_Card layout
5. THE Weapon_Card SHALL support advantage and disadvantage toggles on attack rolls
6. WHEN a weapon has a magic bonus (magicBonus > 0), THE Weapon_Card SHALL display the magic bonus and include it in both attack and damage calculations

### Requirement 16: Dashboard UI Improvements

**User Story:** As a player, I want the dashboard to show passive perception and initiative, center the health bar, make AC more prominent, and shrink the Shield/Mage Armor buttons so that the most important information is easy to read at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display the character's Passive_Perception value, calculated as 10 + Wisdom (Perception) skill modifier
2. THE Dashboard SHALL display an "Initiative" button that triggers a d20 + DEX modifier roll via the Dice_Roller
3. THE Dashboard SHALL center the HP bar horizontally in the dashboard layout instead of left-aligning it
4. THE Dashboard SHALL display the AC value in a larger, more prominent visual element than the current layout
5. THE Dashboard SHALL reduce the size of the Shield_Toggle and Mage_Armor_Toggle buttons relative to their current size so they do not dominate the dashboard layout
6. WHEN the character's Wisdom score or Perception proficiency changes, THE Dashboard SHALL recalculate and display the updated Passive_Perception value
