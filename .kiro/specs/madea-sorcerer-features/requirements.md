# Requirements Document

## Introduction

This spec covers four sorcerer class feature enhancements for Madea (Shadow Sorcerer 5) in the Next.js D&D Character Tracker app. The features are: Innate Sorcery / Sorcery Incarnate as an activate/deactivate toggle, removal of the duplicate Raven Form action card, Empowered Spell metamagic with post-roll dice rerolling, and Sorcerous Restoration as an opt-in toggle during Short Rest.

## Glossary

- **Actions_Page**: The page at `src/app/actions/page.tsx` that displays class feature toggles (Bladesong, Raven Form) and generic action cards.
- **Spells_Page**: The page at `src/app/spells/page.tsx` that renders spell cards with attack rolls, damage rolls, and metamagic options.
- **SpellCard**: The component at `src/app/spells/SpellCard.tsx` that renders an individual spell's details, rolls, and metamagic buttons.
- **DiceResultOverlay**: The overlay component at `src/components/ui/DiceResultOverlay.tsx` that displays dice roll results.
- **RestModal**: The modal component at `src/components/ui/RestModal.tsx` that handles Short Rest and Long Rest confirmation UI.
- **Dashboard_Page**: The page at `src/app/dashboard/dashboard/page.tsx` that contains rest handlers and the RestModal integration.
- **ClassResources**: The TypeScript interface in `src/types/character.ts` that holds class-specific state such as sorcery points, toggle flags, and usage counters.
- **Innate_Sorcery**: A Shadow Sorcerer feature that can be activated as a bonus action, granting advantage on spell attack rolls and +1 to spell save DC. Costs 2 sorcery points per activation, with 2 uses per long rest.
- **Empowered_Spell**: A sorcerer metamagic option that costs 1 sorcery point and allows rerolling damage dice that rolled below the expected mean value of each die.
- **Sorcerous_Restoration**: A sorcerer feature that recovers sorcery points equal to half the sorcerer level (rounded down) on a short rest, usable once per long rest.
- **Sorcery_Points**: A sorcerer resource tracked in ClassResources as `currentSorceryPoints` / `sorceryPointsMax`.

## Requirements

### Requirement 1: Innate Sorcery Toggle on Actions Page

**User Story:** As a player controlling Madea, I want to activate and deactivate Innate Sorcery from the Actions page, so that I can manage this class feature like other toggleable abilities (Bladesong, Raven Form).

#### Acceptance Criteria

1. WHEN Madea's character data is loaded, THE Actions_Page SHALL display an Innate Sorcery panel with an activate/deactivate toggle button, following the same layout pattern as the existing Raven Form panel.
2. WHEN the player clicks "Activate" on the Innate Sorcery panel and `currentSorceryPoints` is at least 2 and `innateSorceryUsesRemaining` is at least 1, THE Actions_Page SHALL set `innateSorceryActive` to true, decrement `innateSorceryUsesRemaining` by 1, and deduct 2 from `currentSorceryPoints`.
3. WHEN the player clicks "Deactivate" on the Innate Sorcery panel, THE Actions_Page SHALL set `innateSorceryActive` to false without restoring sorcery points or uses.
4. WHILE `innateSorceryActive` is true, THE Actions_Page SHALL display a visible "Active" indicator in emerald-400 text on the Innate Sorcery panel, matching the style of the Bladesong and Raven Form active indicators.
5. WHILE `innateSorceryUsesRemaining` is 0 and `innateSorceryActive` is false, THE Actions_Page SHALL disable the "Activate" button with reduced opacity.
6. WHILE `currentSorceryPoints` is less than 2 and `innateSorceryActive` is false, THE Actions_Page SHALL disable the "Activate" button with reduced opacity.
7. THE Actions_Page SHALL display the remaining uses as "{innateSorceryUsesRemaining}/{innateSorceryMaxUses}" on the Innate Sorcery panel.

### Requirement 2: Innate Sorcery Effects on Spells Page

**User Story:** As a player controlling Madea, I want the Spells page to reflect Innate Sorcery's effects on spell attacks and save DCs, so that I can see accurate combat values while the feature is active.

#### Acceptance Criteria

1. WHILE `innateSorceryActive` is true and a spell has `attackRoll` set to true, THE SpellCard SHALL automatically set the advantage checkbox to checked for spell attack rolls.
2. WHILE `innateSorceryActive` is true and a spell has a `saveType`, THE SpellCard SHALL display the spell save DC with a +1 bonus added to the calculated value.
3. WHILE `innateSorceryActive` is true, THE Spells_Page SHALL display a visible indicator (e.g., a banner or badge) showing that Innate Sorcery is active and affecting spell values.
4. WHEN `innateSorceryActive` changes from true to false, THE SpellCard SHALL revert the advantage checkbox to unchecked (unless manually set by the player) and remove the +1 DC bonus.

### Requirement 3: Innate Sorcery State in Character Data

**User Story:** As a developer, I want Innate Sorcery state tracked in the character data model, so that the feature persists across page navigations and rest cycles.

#### Acceptance Criteria

1. THE ClassResources interface SHALL include `innateSorceryActive` (boolean), `innateSorceryUsesRemaining` (number), and `innateSorceryMaxUses` (number) as optional fields.
2. WHEN a long rest is performed, THE Dashboard_Page SHALL reset `innateSorceryUsesRemaining` to `innateSorceryMaxUses`, set `innateSorceryActive` to false, and persist the changes.
3. THE ClassResources interface SHALL default `innateSorceryMaxUses` to 2 for Madea's character data.

### Requirement 4: Remove Duplicate Raven Form Action Card

**User Story:** As a player controlling Madea, I want the duplicate Raven Form generic action card removed from the Actions page, so that only the dedicated Raven Form toggle UI remains.

#### Acceptance Criteria

1. THE Actions_Page SHALL exclude the action with key "raven_form" from the generic actions list by filtering it out alongside "second_wind" and "bladesong".
2. WHEN the Actions_Page renders generic action cards, THE Actions_Page SHALL verify that no action card with the description "Bonus Action: Transform into raven (1/short rest)" is displayed.
3. THE Actions_Page SHALL continue to display the dedicated Raven Form activate/deactivate panel with its existing toggle functionality.

### Requirement 5: Empowered Spell Post-Roll Reroll

**User Story:** As a player controlling Madea, I want to use Empowered Spell after seeing a damage roll result, so that I can reroll low damage dice to improve the outcome.

#### Acceptance Criteria

1. WHEN a damage roll result is displayed in the DiceResultOverlay and the character is a sorcerer with at least 1 sorcery point, THE DiceResultOverlay SHALL display an "Empowered Spell" button.
2. WHEN the player clicks the "Empowered Spell" button, THE DiceResultOverlay SHALL deduct 1 sorcery point from `currentSorceryPoints`.
3. WHEN the player clicks the "Empowered Spell" button, THE DiceResultOverlay SHALL reroll each individual damage die that rolled at or below the mean value of that die (for a d6: reroll dice showing 1, 2, or 3; for a d8: reroll dice showing 1, 2, 3, or 4; mean = sides / 2).
4. WHEN the Empowered Spell reroll is complete, THE DiceResultOverlay SHALL display the new total, the updated individual die results, and keep the non-rerolled dice unchanged.
5. WHILE `currentSorceryPoints` is 0, THE DiceResultOverlay SHALL disable the "Empowered Spell" button with reduced opacity.
6. THE DiceResultOverlay SHALL only show the "Empowered Spell" button for damage rolls (rolls whose label contains a damage dice expression or damage type), not for attack rolls or saving throws.
7. WHEN the "Empowered Spell" button has been used on a roll result, THE DiceResultOverlay SHALL hide or disable the button to prevent using Empowered Spell more than once per damage roll.

### Requirement 6: Sorcerous Restoration in Short Rest Modal

**User Story:** As a player controlling Madea, I want to optionally recover sorcery points during a short rest via Sorcerous Restoration, so that I can manage this once-per-long-rest feature through the rest UI.

#### Acceptance Criteria

1. WHEN the RestModal is opened for a short rest and the character has `sorceryPointsMax` defined and `sorcerousRestorationUsed` is false, THE RestModal SHALL display a "Sorcerous Restoration" checkbox or toggle.
2. WHEN the "Sorcerous Restoration" checkbox is displayed, THE RestModal SHALL show the number of sorcery points that will be recovered (equal to floor(character level / 2), which is 2 for level 5).
3. WHEN the player confirms a short rest with the "Sorcerous Restoration" checkbox checked, THE Dashboard_Page SHALL add floor(character level / 2) sorcery points to `currentSorceryPoints` (capped at `sorceryPointsMax`) and set `sorcerousRestorationUsed` to true.
4. WHILE `sorcerousRestorationUsed` is true, THE RestModal SHALL disable the "Sorcerous Restoration" checkbox and display it as already used.
5. WHEN a long rest is performed, THE Dashboard_Page SHALL reset `sorcerousRestorationUsed` to false (this is already implemented in the existing long rest handler).
6. WHEN the player confirms a short rest with the "Sorcerous Restoration" checkbox unchecked, THE Dashboard_Page SHALL not modify `currentSorceryPoints` or `sorcerousRestorationUsed` via Sorcerous Restoration (other short rest effects still apply).
