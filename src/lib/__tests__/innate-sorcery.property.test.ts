import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ClassResources } from "../../types/character";

// ---------------------------------------------------------------------------
// Pure helper functions mirroring Innate Sorcery two-phase toggle logic
// (Sorcery Incarnate: free uses first, then SP cost)
// ---------------------------------------------------------------------------

/**
 * Activate Innate Sorcery using two-phase logic:
 *   Phase 1: If usesRemaining > 0, activate for free (decrement uses only)
 *   Phase 2: If usesRemaining === 0 and SP >= 2, activate by spending 2 SP
 * Returns null if already active or neither condition is met.
 */
function activateInnateSorcery(cr: ClassResources): ClassResources | null {
  if (cr.innateSorceryActive) return null;

  // Phase 1: Free activation
  if ((cr.innateSorceryUsesRemaining ?? 0) > 0) {
    return {
      ...cr,
      innateSorceryActive: true,
      innateSorceryUsesRemaining: (cr.innateSorceryUsesRemaining ?? 0) - 1,
      // No SP deduction
    };
  }

  // Phase 2: Paid activation (2 SP)
  if ((cr.currentSorceryPoints ?? 0) >= 2) {
    return {
      ...cr,
      innateSorceryActive: true,
      currentSorceryPoints: (cr.currentSorceryPoints ?? 0) - 2,
      // No uses decremented
    };
  }

  // Cannot activate
  return null;
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
 * Disabled when: inactive AND (no uses remaining AND insufficient SP).
 * Enabled when either activation path is available.
 */
function isActivateDisabled(cr: ClassResources): boolean {
  if (cr.innateSorceryActive) return false;
  return (cr.innateSorceryUsesRemaining ?? 0) === 0 && (cr.currentSorceryPoints ?? 0) < 2;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Phase 1 region: usesRemaining > 0 (free activation path). SP can be anything. */
const arbFreeActivation: fc.Arbitrary<ClassResources> = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 0, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 20 }),
    innateSorceryUsesRemaining: fc.integer({ min: 1, max: 10 }),
    innateSorceryMaxUses: fc.integer({ min: 1, max: 10 }),
  })
  .map((r) => ({
    ...r,
    innateSorceryActive: false,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
    innateSorceryUsesRemaining: Math.min(r.innateSorceryUsesRemaining, r.innateSorceryMaxUses),
  }));

/** Phase 2 region: usesRemaining === 0 AND SP >= 2 (paid activation path). */
const arbPaidActivation: fc.Arbitrary<ClassResources> = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 2, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 2, max: 20 }),
    innateSorceryMaxUses: fc.integer({ min: 1, max: 10 }),
  })
  .map((r) => ({
    ...r,
    innateSorceryActive: false,
    innateSorceryUsesRemaining: 0,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
  }));

/** Blocked region: usesRemaining === 0 AND SP < 2 (cannot activate). */
const arbBlockedActivation: fc.Arbitrary<ClassResources> = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 0, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 1 }),
    innateSorceryMaxUses: fc.integer({ min: 0, max: 10 }),
  })
  .map((r) => ({
    ...r,
    innateSorceryActive: false,
    innateSorceryUsesRemaining: 0,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
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
// Property 1: Innate Sorcery deactivation preserves SP and uses
// ---------------------------------------------------------------------------

describe("Feature: madea-level-up, Property 1: Innate Sorcery deactivation preserves SP and uses", () => {
  /**
   * **Validates: Requirements 8.1, 8.2**
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
// Property 2: Innate Sorcery two-phase activation follows correct cost path
// ---------------------------------------------------------------------------

describe("Feature: madea-level-up, Property 2: Innate Sorcery two-phase activation follows correct cost path", () => {
  /**
   * **Validates: Requirements 8.1, 8.2, 8.3**
   *
   * Phase 1 (free path): When usesRemaining > 0, activation sets active to
   * true, decrements usesRemaining by 1, and leaves SP unchanged.
   */
  it("Phase 1: free activation decrements uses only, SP unchanged", () => {
    fc.assert(
      fc.property(arbFreeActivation, (cr) => {
        const result = activateInnateSorcery(cr);
        expect(result).not.toBeNull();
        expect(result!.innateSorceryActive).toBe(true);
        expect(result!.innateSorceryUsesRemaining).toBe(
          (cr.innateSorceryUsesRemaining ?? 0) - 1
        );
        // SP must be unchanged in free path
        expect(result!.currentSorceryPoints).toBe(cr.currentSorceryPoints);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.2, 8.3**
   *
   * Phase 2 (paid path): When usesRemaining === 0 and SP >= 2, activation
   * sets active to true, deducts 2 SP, and leaves usesRemaining unchanged (at 0).
   */
  it("Phase 2: paid activation deducts 2 SP, uses unchanged at 0", () => {
    fc.assert(
      fc.property(arbPaidActivation, (cr) => {
        const result = activateInnateSorcery(cr);
        expect(result).not.toBeNull();
        expect(result!.innateSorceryActive).toBe(true);
        expect(result!.currentSorceryPoints).toBe(
          (cr.currentSorceryPoints ?? 0) - 2
        );
        // Uses must remain at 0 in paid path
        expect(result!.innateSorceryUsesRemaining).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.3**
   *
   * Blocked: When usesRemaining === 0 and SP < 2, activation returns null.
   */
  it("Blocked: returns null when no uses and insufficient SP", () => {
    fc.assert(
      fc.property(arbBlockedActivation, (cr) => {
        const result = activateInnateSorcery(cr);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("preserves sorceryPointsMax and innateSorceryMaxUses in free path", () => {
    fc.assert(
      fc.property(arbFreeActivation, (cr) => {
        const result = activateInnateSorcery(cr)!;
        expect(result.sorceryPointsMax).toBe(cr.sorceryPointsMax);
        expect(result.innateSorceryMaxUses).toBe(cr.innateSorceryMaxUses);
      }),
      { numRuns: 100 }
    );
  });

  it("preserves sorceryPointsMax and innateSorceryMaxUses in paid path", () => {
    fc.assert(
      fc.property(arbPaidActivation, (cr) => {
        const result = activateInnateSorcery(cr)!;
        expect(result.sorceryPointsMax).toBe(cr.sorceryPointsMax);
        expect(result.innateSorceryMaxUses).toBe(cr.innateSorceryMaxUses);
      }),
      { numRuns: 100 }
    );
  });
});


// ---------------------------------------------------------------------------
// Property 3: Innate Sorcery activate button disabled iff no free uses AND
//             insufficient SP
// ---------------------------------------------------------------------------

describe("Feature: madea-level-up, Property 3: Innate Sorcery activate button disabled iff no free uses AND insufficient SP", () => {
  /**
   * **Validates: Requirements 8.3**
   *
   * For any ClassResources where innateSorceryActive === false, the activate
   * button is disabled if and only if usesRemaining === 0 AND SP < 2.
   * The button is enabled when either activation path is available.
   */
  it("button is disabled iff usesRemaining === 0 AND SP < 2", () => {
    fc.assert(
      fc.property(arbInactiveResources, (cr) => {
        const disabled = isActivateDisabled(cr);
        const shouldBeDisabled =
          (cr.innateSorceryUsesRemaining ?? 0) === 0 &&
          (cr.currentSorceryPoints ?? 0) < 2;
        expect(disabled).toBe(shouldBeDisabled);
      }),
      { numRuns: 100 }
    );
  });

  it("activation returns null exactly when guard says disabled", () => {
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

  it("button is always enabled when active (deactivate is always available)", () => {
    fc.assert(
      fc.property(arbActiveResources, (cr) => {
        expect(isActivateDisabled(cr)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
