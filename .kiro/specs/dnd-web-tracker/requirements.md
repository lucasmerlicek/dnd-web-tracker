# Requirements Document

## Introduction

Port the existing pygame-based D&D 5th Edition Character Tracker to a modern web application. The current system consists of per-character monolithic Python/pygame desktop apps (~5000–6500 lines each) managing two active characters: Madea Blackthorn (Shadow Sorcerer 5) and Ramil al-Sayif (Fighter 1 / Wizard 4 Bladesinger). The web version unifies both characters under a single Next.js application with credentials-based authentication, Vercel KV persistence, 3D dice rolling, interactive maps, and the same dark fantasy aesthetic using the existing background and UI texture assets.

## Glossary

- **App**: The Next.js 14 web application deployed on Vercel
- **Dashboard**: The main character screen showing stats, HP, skills, feats, and navigation buttons
- **Auth_System**: The NextAuth.js credentials provider handling login and JWT sessions
- **Character_Data_Store**: The Vercel KV (Redis) backend persisting all character state
- **Dice_Roller**: The 3D physics-based dice rolling system using @react-three/fiber and @react-three/cannon
- **Map_Viewer**: The interactive pan/zoom map component using react-zoom-pan-pinch
- **Marker**: A categorized annotation on a map with title, description, position, and category (artifact, treasure, enemy, person, note)
- **Spell_Slot**: A consumable resource used to cast spells, tracked per level (1st through 3rd)
- **Sorcery_Point**: A class resource for Sorcerers used for metamagic and spell slot creation/conversion
- **Bladesong**: A class resource for Bladesinger Wizards granting AC, speed, and other bonuses
- **Hit_Die**: A die rolled during short rest to recover HP, size determined by class (d6 for Sorcerer/Wizard, d10 for Fighter)
- **Death_Save**: A d20 roll made when a character is at 0 HP; 3 successes stabilize, 3 failures kill
- **Short_Rest**: A rest period where characters spend hit dice to heal and recharge short-rest abilities
- **Long_Rest**: A full rest restoring all HP, spell slots, class resources, and long-rest abilities
- **Prepared_Spell**: A spell selected from a Wizard's spellbook for the day; Sorcerers know all their spells innately
- **Class_Resource**: A character-specific ability with limited uses (Sorcery Points, Bladesong, Raven Form, Second Wind)
- **Ambient_Effect**: A Framer Motion visual effect providing atmosphere (firepit glow, moonlight, dust particles, light rays)
- **Overlay**: A temporary UI element displaying dice results or status messages that dismisses on click or auto-fades
- **Session_Entry**: A journal entry associated with a named session containing freeform notes
- **NPC_Entry**: A tracked non-player character with name and freeform description
- **Place_Entry**: A tracked location with name and freeform description

## Requirements

### Requirement 1: Authentication and Session Management

**User Story:** As a player, I want to log in with my character's credentials so that I can access my character's data securely.

#### Acceptance Criteria

1. WHEN a user navigates to the App without an active session, THE Auth_System SHALL redirect the user to the login page
2. WHEN a user submits valid credentials (username and password), THE Auth_System SHALL create a JWT session and redirect the user to the Dashboard
3. WHEN a user submits invalid credentials, THE Auth_System SHALL display an error message and remain on the login page
4. THE Auth_System SHALL support exactly two credential pairs: "Madea" / "Blackthorn" mapping to Madea Blackthorn, and "Ramil" / "alSaif" mapping to Ramil al-Sayif
5. WHEN a user is authenticated, THE Auth_System SHALL associate the session with the corresponding character data in the Character_Data_Store
6. WHEN a user clicks the logout control, THE Auth_System SHALL destroy the session and redirect to the login page
7. WHILE a user has no valid session, THE App SHALL deny access to all routes except the login page

### Requirement 2: Character Dashboard

**User Story:** As a player, I want to see my character's core information at a glance so that I can make decisions during gameplay.

#### Acceptance Criteria

1. WHEN an authenticated user reaches the Dashboard, THE App SHALL display the character name, race, class, and level
2. THE App SHALL display all six ability scores (STR, DEX, CON, INT, WIS, CHA) with their values and modifiers
3. THE App SHALL display all 18 skills with their modifiers and proficiency indicators
4. THE App SHALL display the character's feats and traits list
5. THE App SHALL display navigation buttons for Attack, Spells, Saves, Actions, Bag, Journal, and Map screens
6. THE App SHALL render the main background image (background.png) behind the Dashboard content
7. THE App SHALL render UI panel backgrounds using the existing UI box texture images (UI_box.png, UI_Box_1.png)
8. WHEN a user clicks an ability score, THE Dice_Roller SHALL roll a d20 and add the ability modifier
9. WHEN a user clicks a skill, THE Dice_Roller SHALL roll a d20 and add the skill modifier (including proficiency if applicable)

### Requirement 3: HP and Resource Tracking

**User Story:** As a player, I want to track my HP and manage damage and healing so that I can keep my character's health accurate during combat.

#### Acceptance Criteria

1. THE App SHALL display current HP, maximum HP, and Armor Class on the Dashboard
2. WHEN a user enters a damage value and confirms, THE App SHALL subtract the value from current HP (minimum 0) and persist the change to the Character_Data_Store
3. WHEN a user enters a healing value and confirms, THE App SHALL add the value to current HP (maximum equal to max HP) and persist the change to the Character_Data_Store
4. WHEN a user toggles Shield, THE App SHALL add 5 to AC while Shield is active and subtract 5 when deactivated
5. WHEN a user toggles Mage Armor, THE App SHALL set base AC to 13 + DEX modifier while active and revert to the default base AC when deactivated
6. THE App SHALL display inspiration points and allow incrementing and decrementing (range 0 to 10)
7. THE App SHALL display luck points and allow incrementing and decrementing (range 0 to 3)
8. WHEN the character's current HP reaches 0, THE App SHALL display the death save tracker

### Requirement 4: Death Saves

**User Story:** As a player, I want to track death saving throws so that I can determine whether my character stabilizes or dies at 0 HP.

#### Acceptance Criteria

1. WHILE the character's current HP is 0, THE App SHALL display the death save tracker with 3 success slots and 3 failure slots
2. WHEN a user triggers a death save, THE Dice_Roller SHALL roll a d20
3. WHEN the death save roll is 10 or higher, THE App SHALL mark one success
4. WHEN the death save roll is below 10, THE App SHALL mark one failure
5. WHEN the death save roll is a natural 20, THE App SHALL set current HP to 1 and reset all death saves
6. WHEN the death save roll is a natural 1, THE App SHALL mark two failures
7. WHEN 3 successes are accumulated, THE App SHALL display a stabilized message and reset death saves
8. WHEN 3 failures are accumulated, THE App SHALL display a death message
9. WHEN the character takes damage while at 0 HP, THE App SHALL mark one failure
10. WHEN the character receives healing while at 0 HP, THE App SHALL reset all death saves and set HP to the healed amount

### Requirement 5: Attack System

**User Story:** As a player, I want to make attack rolls and damage rolls with my weapons so that I can resolve combat actions.

#### Acceptance Criteria

1. WHEN a user navigates to the Attack screen, THE App SHALL display all character weapons with their properties
2. WHEN a user selects a weapon and triggers an attack roll, THE Dice_Roller SHALL roll a d20 and add the attack bonus (proficiency bonus + relevant ability modifier + magic bonus)
3. WHEN a user triggers a damage roll for the selected weapon, THE Dice_Roller SHALL roll the weapon's damage dice and add the damage bonus (ability modifier + magic bonus)
4. THE App SHALL calculate the attack stat based on weapon properties: DEX for finesse weapons, STR otherwise, or INT when Bladesong is active for Ramil
5. WHERE the character has the Two-Weapon Fighting style, THE App SHALL add the ability modifier to off-hand weapon damage rolls
6. THE App SHALL display an advantage/disadvantage toggle on attack rolls
7. WHEN advantage is enabled, THE Dice_Roller SHALL roll two d20s and use the higher result
8. WHEN disadvantage is enabled, THE Dice_Roller SHALL roll two d20s and use the lower result
9. THE App SHALL render the attack background image (attack_background.png) on the Attack screen

### Requirement 6: Spell Management

**User Story:** As a player, I want to manage my spells, spell slots, and class-specific casting resources so that I can track my magical abilities during sessions.

#### Acceptance Criteria

1. WHEN a user navigates to the Spells screen, THE App SHALL display cantrips and spells organized by level
2. THE App SHALL display current and maximum spell slots for each spell level
3. WHEN a user casts a spell at a given level, THE App SHALL decrement the corresponding spell slot by 1
4. IF a user attempts to cast a spell with no remaining slots at that level, THEN THE App SHALL display a warning message
5. WHEN a user selects a spell, THE App SHALL display the spell's details (name, level, damage dice if applicable)
6. WHERE the character is a Wizard (Ramil), THE App SHALL display the spell preparation interface showing prepared count versus maximum prepared spells (INT modifier + Wizard level)
7. WHERE the character is a Wizard (Ramil), THE App SHALL allow toggling spell preparation status for known spells
8. WHERE the character is a Wizard (Ramil), THE App SHALL display auto-prepared spells (e.g., Charm Person from Druid Initiate) as always prepared and non-toggleable
9. WHERE the character is a Sorcerer (Madea), THE App SHALL display current and maximum sorcery points
10. WHERE the character is a Sorcerer (Madea), THE App SHALL allow converting sorcery points to spell slots (costs: 2 SP for 1st, 3 SP for 2nd, 5 SP for 3rd)
11. WHERE the character is a Sorcerer (Madea), THE App SHALL allow converting spell slots to sorcery points (1 SP per slot level)
12. WHEN a user triggers a spell damage roll, THE Dice_Roller SHALL roll the spell's damage dice and display the result
13. THE App SHALL render the spells background image (spells_background.png) on the Spells screen

### Requirement 7: Saving Throws

**User Story:** As a player, I want to make saving throw rolls so that I can resolve effects that require saves.

#### Acceptance Criteria

1. WHEN a user navigates to the Saves screen, THE App SHALL display all six saving throws with their modifiers
2. THE App SHALL indicate which saving throws have proficiency (CON and CHA for Madea; STR and CON for Ramil)
3. WHEN a user selects a saving throw and triggers a roll, THE Dice_Roller SHALL roll a d20 and add the save modifier (ability modifier + proficiency bonus if proficient)
4. THE App SHALL display an advantage/disadvantage toggle on saving throw rolls
5. THE App SHALL render the saves background image (save_background.png) on the Saves screen

### Requirement 8: Actions and Class Resources

**User Story:** As a player, I want to use and track my class-specific actions and limited-use abilities so that I can manage my resources during encounters.

#### Acceptance Criteria

1. WHEN a user navigates to the Actions screen, THE App SHALL display all available actions with their descriptions and remaining uses
2. WHEN a user activates an action, THE App SHALL decrement the action's remaining uses by 1 and mark it unavailable when uses reach 0
3. WHERE the character is Ramil, THE App SHALL display the Bladesong tracker showing remaining uses out of maximum (INT modifier per long rest)
4. WHERE the character is Ramil, THE App SHALL allow toggling Bladesong active/inactive status
5. WHILE Bladesong is active for Ramil, THE App SHALL add INT modifier to AC calculations
6. WHERE the character is Ramil, THE App SHALL display Second Wind (heal 1d10 + Fighter level, recharges on short rest)
7. WHERE the character is Madea, THE App SHALL display Raven Form with its uses (1 per short rest)
8. THE App SHALL track free-cast flags for feat-granted spells: Fey Touched (Bane, Misty Step) for Madea, Druid Initiate (Charm Person) for Ramil
9. THE App SHALL render the actions background image (action_backround.png) on the Actions screen

### Requirement 9: Inventory and Coins

**User Story:** As a player, I want to manage my inventory items and currency so that I can track what my character carries.

#### Acceptance Criteria

1. WHEN a user navigates to the Bag screen, THE App SHALL display inventory items organized into three categories: gear, utility, and treasure
2. THE App SHALL allow adding new items to any inventory category
3. THE App SHALL allow removing items from any inventory category
4. THE App SHALL display coin amounts for all five denominations: copper (cp), silver (sp), electrum (ep), gold (gp), and platinum (pp)
5. WHEN a user modifies a coin amount, THE App SHALL update the value and persist the change to the Character_Data_Store
6. THE App SHALL render the bag background image (bag_background.png) on the Bag screen

### Requirement 10: Session Journal

**User Story:** As a player, I want to keep session notes and track NPCs and places so that I can reference campaign events and characters.

#### Acceptance Criteria

1. WHEN a user navigates to the Journal screen, THE App SHALL display a list of session entries
2. THE App SHALL allow creating new session entries with a session name
3. THE App SHALL allow editing session entry text with freeform input
4. THE App SHALL allow renaming existing session entries
5. THE App SHALL display a scrollable view of the current session's notes
6. THE App SHALL provide an NPC tracking section listing all tracked NPCs with their descriptions
7. THE App SHALL allow creating, editing, and deleting NPC entries
8. THE App SHALL provide a Place tracking section listing all tracked places with their descriptions
9. THE App SHALL allow creating, editing, and deleting Place entries
10. WHEN a user modifies any journal content, THE App SHALL persist the change to the Character_Data_Store
11. THE App SHALL render the journal background image (journal_background.png) on the Journal screen

### Requirement 11: Short Rest

**User Story:** As a player, I want to take a short rest so that I can spend hit dice to recover HP and recharge short-rest abilities.

#### Acceptance Criteria

1. WHEN a user triggers a short rest, THE App SHALL display a modal prompting for the number of hit dice to spend
2. THE App SHALL display available hit dice count and hit die size (d6 for Sorcerer/Wizard levels, d10 for Fighter levels)
3. WHEN the user confirms hit dice spending, THE Dice_Roller SHALL roll the specified number of hit dice and add CON modifier per die rolled
4. THE App SHALL add the total roll result to current HP (capped at max HP) and decrement available hit dice
5. THE App SHALL recharge all actions marked with "short_rest" recharge type
6. WHERE the character is Madea and Sorcerous Restoration has not been used since the last long rest, THE App SHALL restore sorcery points equal to half the character level (rounded down)
7. IF the user has no hit dice remaining, THEN THE App SHALL display a message indicating no hit dice are available

### Requirement 12: Long Rest

**User Story:** As a player, I want to take a long rest so that all my resources are fully restored.

#### Acceptance Criteria

1. WHEN a user triggers a long rest, THE App SHALL restore current HP to maximum HP
2. THE App SHALL restore all spell slots to their maximum values
3. THE App SHALL restore all hit dice to their maximum count
4. THE App SHALL restore all class resources to maximum (sorcery points, bladesong uses, raven form uses)
5. THE App SHALL reset all free-cast flags (Fey Bane, Fey Misty Step, Druid Charm Person, Sorcerous Restoration)
6. THE App SHALL recharge all actions regardless of recharge type
7. THE App SHALL deactivate Shield and Mage Armor if active
8. THE App SHALL deactivate Bladesong if active
9. THE App SHALL reset luck points to 3 and increment inspiration by 1 (capped at 10)
10. THE App SHALL clear any created spell slots (from sorcery point conversion)
11. THE App SHALL persist all restored values to the Character_Data_Store

### Requirement 13: 3D Dice Rolling

**User Story:** As a player, I want to see satisfying 3D dice rolls so that the digital experience feels tactile and immersive.

#### Acceptance Criteria

1. THE Dice_Roller SHALL render correct polyhedra for each die type: d4 (tetrahedron), d6 (cube), d8 (octahedron), d10 (pentagonal trapezohedron), d12 (dodecahedron), d20 (icosahedron)
2. THE Dice_Roller SHALL apply physics-based tumble animation using @react-three/cannon
3. THE Dice_Roller SHALL use a dark metal/stone material aesthetic for all dice
4. WHEN a dice roll is triggered, THE Dice_Roller SHALL display the rolling animation as a temporary Overlay
5. WHEN the dice come to rest, THE Dice_Roller SHALL display the numerical result
6. WHEN the user clicks the Overlay or 3 seconds elapse, THE Overlay SHALL dismiss with a fade-out animation
7. THE Dice_Roller SHALL support rolling multiple dice simultaneously (e.g., 2d6, 4d6)
8. THE Dice_Roller SHALL support advantage rolls (two d20s, highlight the higher) and disadvantage rolls (two d20s, highlight the lower)

### Requirement 14: Interactive Maps

**User Story:** As a player, I want to view and annotate world and university maps so that I can track locations and discoveries.

#### Acceptance Criteria

1. WHEN a user navigates to the Map screen, THE Map_Viewer SHALL display the Valerion world map as the default view with pan and zoom controls
2. THE Map_Viewer SHALL provide a selector to switch between the Valerion world map and the Aetherion university map
3. WHERE the Aetherion map is selected, THE Map_Viewer SHALL display a floor selector for Ground through 4th floor
4. THE Map_Viewer SHALL display per-character Markers on the active map (each user sees only their own markers)
5. THE Map_Viewer SHALL render Marker icons using the existing category icon images (icon_artifact.png, icon_enemy.png, icon_friend.png, icon_rumor.png, icon_treasure.png)
6. WHEN a user clicks on an empty map area, THE Map_Viewer SHALL open a marker creation form with category selector, title, and description fields
7. WHEN a user clicks on an existing Marker, THE Map_Viewer SHALL display the marker's title and description with options to edit or delete
8. WHEN a user creates or edits a Marker, THE App SHALL persist the change to the Character_Data_Store
9. THE Map_Viewer SHALL support the five marker categories: Artifacts, Treasure, Enemy Encounters, Notable People, Notes & Rumors
10. THE Map_Viewer SHALL provide category toggle filters to show or hide markers by category

### Requirement 15: Data Migration and Persistence

**User Story:** As a player, I want my existing character data fully migrated to the web app so that I do not lose any campaign progress.

#### Acceptance Criteria

1. THE App SHALL migrate all existing character data from both Madea and Ramil's character_data.json files into the Character_Data_Store
2. THE App SHALL normalize all JSON keys to camelCase in the TypeScript data model
3. THE App SHALL migrate Ramil's 5 existing map markers from map_markers.json into per-character marker storage
4. THE App SHALL migrate all journal session entries, NPC entries, and place entries for both characters
5. THE App SHALL migrate all inventory items and coin balances for both characters
6. THE App SHALL migrate all spell data, spell slot states, and class resource states for both characters
7. WHEN the App reads character data from the Character_Data_Store, THE App SHALL validate the data against the TypeScript character interface
8. WHEN the App writes character data to the Character_Data_Store, THE App SHALL persist the complete character state atomically
9. THE App SHALL store class-specific boolean flags (raven_form_active, bladesong_active, fey_bane_used, etc.) within a classResources object in the data model

### Requirement 16: Visual Design and Ambient Effects

**User Story:** As a player, I want the web app to maintain the dark fantasy atmosphere of the original tracker so that the experience feels immersive.

#### Acceptance Criteria

1. THE App SHALL use the existing background PNG images as full-screen backgrounds for each route (background.png for Dashboard, attack_background.png for Attack, etc.)
2. THE App SHALL use the existing UI box texture images (UI_box.png, UI_Box_1.png, UI_box_2.png, UI_box_4.png, UI_box_dark.png, UI_box_fancy.png) as panel and card backgrounds
3. THE App SHALL render a firepit glow Ambient_Effect and moonlight Ambient_Effect on the Dashboard using Framer Motion
4. THE App SHALL render stray tavern light rays with dust particle Ambient_Effects on submenu screens using Framer Motion
5. THE App SHALL apply page transition animations between routes using Framer Motion
6. THE App SHALL use a dark fantasy color palette consistent with the existing pygame version
7. THE App SHALL be responsive and functional on both desktop and tablet screen sizes

### Requirement 17: Deployment and Performance

**User Story:** As a player, I want the app to load quickly and be accessible from any device so that I can use it during tabletop sessions.

#### Acceptance Criteria

1. THE App SHALL be deployable on Vercel's free tier
2. THE App SHALL use Next.js App Router with server components where appropriate to minimize client-side JavaScript
3. THE App SHALL lazy-load the 3D Dice_Roller component to avoid blocking initial page render
4. THE App SHALL use optimized image formats and Next.js Image component for background and texture assets
5. IF the Character_Data_Store is unreachable, THEN THE App SHALL display an error message and allow retry
