import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ClassResources } from "../../types/character";

// ---------------------------------------------------------------------------
// Pure helper functions mirroring Innate Sorcery toggle logic
// ---------------------------------------------------------------------------

/**
 * Activate Innate Sorcery: costs 2 SP and 1 use.
 * Returns null if preconditions are not met.
 */
function activateInnateSorcery(cr: ClassResources): ClassResources | null {
  if (cr.innateSorceryActive) return null;
  if ((cr.innateSorceryUsesRemaining ?? 0) < 1) return null;
  if ((cr.currentSorceryPoints ?? 0) < 2) return null;
  return {
    ...cr,
    innateSorceryActive: true,
    innateSorceryUsesRemaining: (cr.innateSorceryUsesRemaining ?? 0) - 1,
    currentSorceryPoints: (cr.currentSorceryPoints ?? 0) - 2,
  };
}

/**
 * Deactivate Innate Sorcery: sets active to false, no SP or uses restored.
 */
function deactivateInnateSorcery(cr: ClassResources): ClassResources {
  return {
    ...cr,
    innateSorceryActive: false,
  };
}

/**
 * Determine if the Activate button should be disabled.
 * Disabled when: inactive AND (no uses remaining OR insufficient SP).
 */
function isActivateDisabled(cr: ClassResources): boolean {
  if (cr.innateSorceryActive) return false;
  return (cr.innateSorceryUsesRemaining ?? 0) === 0 || (cr.currentSorceryPoints ?? 0) < 2;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate ClassResources valid for activation (inactive, uses >= 1, SP >= 2). */
const arbActivatableResources: fc.Arbitrary<ClassResources> = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 2, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 2, max: 20 }),
    innateSorceryUsesRemaining: fc.integer({ min: 1, max: 10 }),
    innateSorceryMaxUses: fc.integer({ min: 1, max: 10 }),
  })
  .map((r) => ({
    ...r,
    innateSorceryActive: false,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
    innateSorceryUsesRemaining: Math.min(r.innateSorceryUsesRemaining, r.innateSorceryMaxUses),
  }));

/** Generate ClassResources where Innate Sorcery is currently active. */
const arbActiveResources: fc.Arbitrary<ClassResources> = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 0, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 20 }),
    innateSorceryUsesRemaining: fc.integer({ min: 0, max: 10 }),
    innateSorceryMaxUses: fc.integer({ min: 1, max: 10 }),
  })
  .map((r) => ({
    ...r,
    innateSorceryActive: true,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
    innateSorceryUsesRemaining: Math.min(r.innateSorceryUsesRemaining, r.innateSorceryMaxUses),
  }));

/** Generate ClassResources with inactive Innate Sorcery and arbitrary SP/uses (for guard testing). */
const arbInactiveResources: fc.Arbitrary<ClassResources> = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 0, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 20 }),
    innateSorceryUsesRemaining: fc.integer({ min: 0, max: 10 }),
    innateSorceryMaxUses: fc.integer({ min: 0, max: 10 }),
  })
  .map((r) => ({
    ...r,
    innateSorceryActive: false,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
    innateSorceryUsesRemaining: Math.min(r.innateSorceryUsesRemaining, r.innateSorceryMaxUses),
  }));

// ---------------------------------------------------------------------------
// Property 1: Innate Sorcery activation produces correct state
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 1: Innate Sorcery activation produces correct state", () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any ClassResources where currentSorceryPoints >= 2 and
   * innateSorceryUsesRemaining >= 1 and innateSorceryActive === false,
   * activating Innate Sorcery should produce a new state where
   * innateSorceryActive === true, innateSorceryUsesRemaining is decremented
   * by 1, and currentSorceryPoints is decremented by 2, with all other
   * fields unchanged.
   */
  it("sets active to true, decrements uses by 1, and deducts 2 SP", () => {
    fc.assert(
      fc.property(arbActivatableResources, (cr) => {
        const result = activateInnateSorcery(cr);
        expect(result).not.toBeNull();
        expect(result!.innateSorceryActive).toBe(true);
        expect(result!.innateSorceryUsesRemaining).toBe(
          (cr.innateSorceryUsesRemaining ?? 0) - 1
        );
        expect(result!.currentSorceryPoints).toBe(
          (cr.currentSorceryPoints ?? 0) - 2
        );
      }),
      { numRuns: 100 }
    );
  });

  it("preserves sorceryPointsMax and innateSorceryMaxUses", () => {
    fc.assert(
      fc.property(arbActivatableResources, (cr) => {
        const result = activateInnateSorcery(cr)!;
        expect(result.sorceryPointsMax).toBe(cr.sorceryPointsMax);
        expect(result.innateSorceryMaxUses).toBe(cr.innateSorceryMaxUses);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Innate Sorcery deactivation preserves SP and uses
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 2: Innate Sorcery deactivation preserves SP and uses", () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * For any ClassResources where innateSorceryActive === true, deactivating
   * Innate Sorcery should produce a new state where innateSorceryActive ===
   * false, and both currentSorceryPoints and innateSorceryUsesRemaining
   * remain unchanged from the pre-deactivation values.
   */
  it("sets active to false without changing SP or uses", () => {
    fc.assert(
      fc.property(arbActiveResources, (cr) => {
        const result = deactivateInnateSorcery(cr);
        expect(result.innateSorceryActive).toBe(false);
        expect(result.currentSorceryPoints).toBe(cr.currentSorceryPoints);
        expect(result.innateSorceryUsesRemaining).toBe(cr.innateSorceryUsesRemaining);
      }),
      { numRuns: 100 }
    );
  });

  it("preserves sorceryPointsMax and innateSorceryMaxUses", () => {
    fc.assert(
      fc.property(arbActiveResources, (cr) => {
        const result = deactivateInnateSorcery(cr);
        expect(result.sorceryPointsMax).toBe(cr.sorceryPointsMax);
        expect(result.innateSorceryMaxUses).toBe(cr.innateSorceryMaxUses);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Innate Sorcery activation guard
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 3: Innate Sorcery activation guard", () => {
  /**
   * **Validates: Requirements 1.5, 1.6**
   *
   * For any ClassResources where innateSorceryActive === false, the activate
   * button should be disabled if and only if innateSorceryUsesRemaining === 0
   * OR currentSorceryPoints < 2.
   */
  it("button is disabled iff uses === 0 OR SP < 2", () => {
    fc.assert(
      fc.property(arbInactiveResources, (cr) => {
        const disabled = isActivateDisabled(cr);
        const shouldBeDisabled =
          (cr.innateSorceryUsesRemaining ?? 0) === 0 ||
          (cr.currentSorceryPoints ?? 0) < 2;
        expect(disabled).toBe(shouldBeDisabled);
      }),
      { numRuns: 100 }
    );
  });

  it("activation returns null when guard conditions are not met", () => {
    fc.assert(
      fc.property(arbInactiveResources, (cr) => {
        const disabled = isActivateDisabled(cr);
        const result = activateInnateSorcery(cr);
        if (disabled) {
          expect(result).toBeNull();
        } else {
          expect(result).not.toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });
});
