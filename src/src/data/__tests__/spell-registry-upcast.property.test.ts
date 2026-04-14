import { describe, it, expect } from "vitest";
import { SPELL_REGISTRY } from "@/data/spell-registry";

// ---------------------------------------------------------------------------
// Property 1: Spell registry upcast description consistency
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 1: Spell registry upcast description consistency", () => {
  /**
   * **Validates: Requirements 1.1, 1.3, 1.4**
   *
   * For any spell in the SPELL_REGISTRY, the spell has an `upcastDescription`
   * field if and only if it has an `upcast` field. Spells without `upcast` must
   * not have `upcastDescription`, and spells with `upcast` must have a non-empty
   * `upcastDescription`.
   */

  const spellEntries = Object.entries(SPELL_REGISTRY);

  it("every spell with upcast has a non-empty upcastDescription", () => {
    for (const [name, spell] of spellEntries) {
      if (spell.upcast !== undefined) {
        expect(
          spell.upcastDescription,
          `Spell "${name}" has upcast but missing upcastDescription`
        ).toBeDefined();
        expect(
          typeof spell.upcastDescription === "string" &&
            spell.upcastDescription.trim().length > 0,
          `Spell "${name}" has upcast but upcastDescription is empty`
        ).toBe(true);
      }
    }
  });

  it("no spell without upcast has an upcastDescription", () => {
    for (const [name, spell] of spellEntries) {
      if (spell.upcast === undefined) {
        expect(
          spell.upcastDescription,
          `Spell "${name}" has no upcast but has upcastDescription`
        ).toBeUndefined();
      }
    }
  });

  it("biconditional — upcast present iff upcastDescription present", () => {
    for (const [name, spell] of spellEntries) {
      const hasUpcast = spell.upcast !== undefined;
      const hasUpcastDesc = spell.upcastDescription !== undefined;
      expect(
        hasUpcast,
        `Spell "${name}": upcast=${hasUpcast} but upcastDescription=${hasUpcastDesc} — these must match`
      ).toBe(hasUpcastDesc);
    }
  });
});
