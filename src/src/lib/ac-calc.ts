export interface ACInputs {
  defaultBaseAc: number;
  dexModifier: number;
  mageArmorActive: boolean;
  shieldActive: boolean;
  bladesongActive: boolean;
  intModifier: number;
  gearAcBonuses: number[];
}

/**
 * Pure AC calculation from base AC, active toggles, and gear bonuses.
 *
 * 1. baseAc = mageArmorActive ? (13 + dexModifier) : defaultBaseAc
 * 2. ac = baseAc
 * 3. if shieldActive: ac += 5
 * 4. if bladesongActive: ac += intModifier
 * 5. ac += sum of gearAcBonuses
 */
export function calculateAC(inputs: ACInputs): { ac: number; baseAc: number } {
  const baseAc = inputs.mageArmorActive
    ? 13 + inputs.dexModifier
    : inputs.defaultBaseAc;

  let ac = baseAc;

  if (inputs.shieldActive) {
    ac += 5;
  }

  if (inputs.bladesongActive) {
    ac += inputs.intModifier;
  }

  ac += inputs.gearAcBonuses.reduce((sum, bonus) => sum + bonus, 0);

  return { ac, baseAc };
}
