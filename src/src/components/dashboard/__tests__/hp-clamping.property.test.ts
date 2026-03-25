import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 2: HP after damage is always clamped between 0 and maxHp
 * Validates: Requirements 3.2, 3.3
 *
 * Tests the pure HP clamping logic extracted from DashboardPage:
 *   Damage: Math.max(0, currentHp - val)
 *   Healing: Math.min(maxHp, currentHp + val)
 */

function applyDamage(currentHp: number, damage: number): number {
  return Math.max(0, currentHp - damage);
}

function applyHealing(currentHp: number, maxHp: number, healing: number): number {
  return Math.min(maxHp, currentHp + healing);
}

describe("HP clamping property tests", () => {
  it("Property 2: HP after damage is always clamped between 0 and maxHp", () => {
    /**
     * **Validates: Requirements 3.2, 3.3**
     *
     * For any valid currentHp (0..maxHp), maxHp (≥1), and positive damage/healing value,
     * the resulting HP must always be in [0, maxHp].
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),   // maxHp
        fc.integer({ min: 1, max: 1000 }),   // damage/heal value
        (maxHp, val) => {
          // Generate currentHp within valid range
          const currentHp = fc.sample(fc.integer({ min: 0, max: maxHp }), 1)[0];

          // After damage, HP is in [0, maxHp]
          const afterDamage = applyDamage(currentHp, val);
          expect(afterDamage).toBeGreaterThanOrEqual(0);
          expect(afterDamage).toBeLessThanOrEqual(maxHp);

          // After healing, HP is in [0, maxHp]
          const afterHealing = applyHealing(currentHp, maxHp, val);
          expect(afterHealing).toBeGreaterThanOrEqual(0);
          expect(afterHealing).toBeLessThanOrEqual(maxHp);
        }
      ),
      { numRuns: 300 }
    );
  });
});
