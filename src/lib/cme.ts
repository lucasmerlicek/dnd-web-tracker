import type { ClassResources } from "@/types/character";
import type { DieSpec } from "@/types/dice";

const VALID_SIDES = new Set([4, 6, 8, 10, 12, 20]);

/**
 * Conjure Minor Elementals (Ramil).
 *
 * While the CME concentration toggle is active, any attack the caster makes
 * (weapon or spell attack) deals extra elemental damage equal to `cmeDice`
 * (2d8 at 4th level, +1d8 per slot level above 4). This helper returns the
 * bonus damage die spec to append to an attack's damage roll, or `null` when
 * the effect is inactive/unavailable.
 */
export function getCmeBonusDice(cr: ClassResources | undefined): DieSpec | null {
  if (!cr?.cmeActive || !cr.cmeDice) return null;
  const match = cr.cmeDice.match(/^\s*(\d+)\s*d\s*(\d+)\s*$/i);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  if (count <= 0 || !VALID_SIDES.has(sides)) return null;
  return { count, sides: sides as DieSpec["sides"] };
}

/** Label suffix for rolls that include the CME bonus, e.g. " + CME 2d8 fire". */
export function cmeLabelSuffix(cr: ClassResources | undefined): string {
  const die = getCmeBonusDice(cr);
  if (!die) return "";
  const type = cr?.cmeDamageType ? ` ${cr.cmeDamageType}` : " elemental";
  return ` + CME ${die.count}d${die.sides}${type}`;
}
