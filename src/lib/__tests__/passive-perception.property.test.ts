import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculatePassivePerception } from "../passive-perception";
import type { Skill, AbilityName } from "../../types/character";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const arbAbilityName: fc.Arbitrary<AbilityName> = fc.constantFrom(
  "STR", "DEX", "CON", "INT", "WIS", "CHA"
);

const arbSkill = (name: string): fc.Arbitrary<Skill> =>
  fc.record({
    name: fc.constant(name),
    stat: arbAbilityName,
    proficient: fc.boolean(),
    modifier: fc.integer({ min: -5, max: 10 }),
  });

const arbPerceptionSkill: fc.Arbitrary<Skill> = arbSkill("Perception");

const arbOtherSkill: fc.Arbitrary<Skill> = fc.string({ minLength: 1, maxLength: 20 })
  .filter((name) => name !== "Perception")
  .chain((name) => arbSkill(name));

const arbOtherSkills: fc.Arbitrary<Skill[]> = fc.array(arbOtherSkill, {
  minLength: 0,
  maxLength: 10,
});

// ---------------------------------------------------------------------------
// Property 17: Passive perception calculation
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 17: Passive perception calculation", () => {
  it("equals 10 + perception skill modifier for any character with Perception skill", () => {
    fc.assert(
      fc.property(arbPerceptionSkill, arbOtherSkills, (perception, otherSkills) => {
        const skills = [...otherSkills, perception];
        const result = calculatePassivePerception(skills);
        expect(result).toBe(10 + perception.modifier);
      }),
      { numRuns: 100 }
    );
  });

  it("returns 10 when no Perception skill is present", () => {
    fc.assert(
      fc.property(arbOtherSkills, (skills) => {
        const result = calculatePassivePerception(skills);
        expect(result).toBe(10);
      }),
      { numRuns: 100 }
    );
  });

  it("is independent of other skills in the array", () => {
    fc.assert(
      fc.property(
        arbPerceptionSkill,
        arbOtherSkills,
        arbOtherSkills,
        (perception, otherSkillsA, otherSkillsB) => {
          const resultA = calculatePassivePerception([...otherSkillsA, perception]);
          const resultB = calculatePassivePerception([...otherSkillsB, perception]);
          expect(resultA).toBe(resultB);
        }
      ),
      { numRuns: 100 }
    );
  });
});
