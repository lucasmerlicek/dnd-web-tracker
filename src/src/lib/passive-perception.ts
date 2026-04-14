import type { Skill } from "../types/character";

/**
 * Calculate passive perception from a character's skills array.
 * Passive Perception = 10 + Perception skill modifier.
 * Returns 10 if no Perception skill entry is found.
 */
export function calculatePassivePerception(skills: Skill[]): number {
  const perceptionSkill = skills.find((s) => s.name === "Perception");
  return 10 + (perceptionSkill?.modifier ?? 0);
}
