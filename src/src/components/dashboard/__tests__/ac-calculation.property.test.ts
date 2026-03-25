import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 3: AC correctly reflects shield and mage armor toggle states
 * Validates: Requirements 3.4, 3.5
 *
 * Tests the pure AC toggle logic extracted from DashboardPage:
 *   Shield: active → ac + 5, deactivated → ac - 5
 *   Mage Armor: active → baseAc = 13 + dexMod, ac adjusted by diff;
 *               deactivated → baseAc = defaultBaseAc, ac adjusted by diff
 */

interface AcState {
  ac: number;
  baseAc: number;
  defaultBaseAc: number;
  shieldActive: boolean;
  mageArmorActive: boolean;
  dexMod: number;
}

function toggleShield(state: AcState): AcState {
  const active = !state.shieldActive;
  return {
    ...state,
    shieldActive: active,
    ac: active ? state.ac + 5 : state.ac - 5,
  };
}

function toggleMageArmor(state: AcState): AcState {
  const active = !state.mageArmorActive;
  const newBaseAc = active ? 13 + state.dexMod : state.defaultBaseAc;
  const acDiff = newBaseAc - state.baseAc;
  return {
    ...state,
    mageArmorActive: active,
    baseAc: newBaseAc,
    ac: state.ac + acDiff,
  };
}

describe("AC calculation property tests", () => {
  it("Property 3: AC correctly reflects shield and mage armor toggle states", () => {
    /**
     * **Validates: Requirements 3.4, 3.5**
     *
     * Toggling shield on then off returns AC to original value.
     * Toggling mage armor on then off returns AC to original value.
     * Shield always adds exactly +5 when activated.
     * Mage armor sets baseAc to 13 + dexMod when activated.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 25 }),   // defaultBaseAc
        fc.integer({ min: -2, max: 5 }),    // dexMod
        fc.boolean(),                        // initial shieldActive
        fc.boolean(),                        // initial mageArmorActive
        (defaultBaseAc, dexMod, shieldOn, mageArmorOn) => {
          // Build a consistent initial state: start with no toggles, then apply
          let state: AcState = {
            ac: defaultBaseAc,
            baseAc: defaultBaseAc,
            defaultBaseAc,
            shieldActive: false,
            mageArmorActive: false,
            dexMod,
          };

          // Optionally activate mage armor first
          if (mageArmorOn) state = toggleMageArmor(state);
          // Optionally activate shield
          if (shieldOn) state = toggleShield(state);

          const acBefore = state.ac;

          // --- Shield toggle round-trip ---
          const afterShieldToggle = toggleShield(state);
          const afterShieldRoundTrip = toggleShield(afterShieldToggle);

          // Round-trip restores AC
          expect(afterShieldRoundTrip.ac).toBe(acBefore);

          // Shield adds exactly +5 when going from inactive to active
          if (!state.shieldActive) {
            expect(afterShieldToggle.ac).toBe(acBefore + 5);
          } else {
            // Deactivating removes exactly 5
            expect(afterShieldToggle.ac).toBe(acBefore - 5);
          }

          // --- Mage Armor toggle round-trip ---
          const afterMaToggle = toggleMageArmor(state);
          const afterMaRoundTrip = toggleMageArmor(afterMaToggle);

          // Round-trip restores AC
          expect(afterMaRoundTrip.ac).toBe(acBefore);

          // When mage armor activates, baseAc becomes 13 + dexMod
          if (!state.mageArmorActive) {
            expect(afterMaToggle.baseAc).toBe(13 + dexMod);
          } else {
            // When deactivated, baseAc reverts to defaultBaseAc
            expect(afterMaToggle.baseAc).toBe(defaultBaseAc);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
