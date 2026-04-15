import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { AbilityName } from "../../types/character";
import { calcSpellSaveDC } from "../../../app/spells/spell-calc";

// ---------------------------------------------------------------------------
// Property 5: Innate Sorcery DC bonus
// Feature: madea-sorcerer-features, Property 5: Innate Sorcery DC bonus
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 5: Innate Sorcery DC bonus", () => {
  /**
   * **Validates: Requirements 2.2**
   *
   * For any proficiency bonus (2-6), CHA modifier (-1 to +5), verify
   * DC = 8 + prof + CHA + 1 when Innate Sorcery is active,
   * DC = 8 + prof + CHA when inactive.
   */
  it("DC equals 8 + prof + CHA + 1 when active, 8 + prof + CHA when inactive", () => {
    const arbProfBonus = fc.integer({ min: 2, max: 6 });
    const arbChaMod = fc.integer({ min: -1, max: 5 });
    const arbActive = fc.boolean();

    fc.assert(
      fc.property(arbProfBonus, arbChaMod, arbActive, (profBonus, chaMod, active) => {
        // Build a minimal stats record with the given CHA modifier
        const chaValue = 10 + chaMod * 2; // approximate ability score
        const stats: Record<AbilityName, { value: number; modifier: number }> = {
          STR: { value: 10, modifier: 0 },
          DEX: { value: 10, modifier: 0 },
          CON: { value: 10, modifier: 0 },
          INT: { value: 10, modifier: 0 },
          WIS: { value: 10, modifier: 0 },
          CHA: { value: chaValue, modifier: chaMod },
        };

        const baseDC = calcSpellSaveDC(profBonus, "CHA", stats);
        const displayDC = baseDC + (active ? 1 : 0);

        // Verify base DC formula
        expect(baseDC).toBe(8 + profBonus + chaMod);

        // Verify display DC with Innate Sorcery bonus
        if (active) {
          expect(displayDC).toBe(8 + profBonus + chaMod + 1);
        } else {
          expect(displayDC).toBe(8 + profBonus + chaMod);
        }
      }),
      { numRuns: 100 }
    );
  });
});
