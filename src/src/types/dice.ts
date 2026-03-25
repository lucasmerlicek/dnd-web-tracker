export interface DieSpec {
  sides: 4 | 6 | 8 | 10 | 12 | 20;
  count: number;
}

export interface DiceRoll {
  dice: DieSpec[];
  modifier: number;
  advantage?: boolean;
  disadvantage?: boolean;
  label: string;
}

export interface DiceResult {
  rolls: number[];
  total: number;
  natural?: number;
  isCritical?: boolean;
  isFumble?: boolean;
  /** Index into `rolls` of the die that was actually used (for advantage/disadvantage highlighting) */
  usedIndex?: number;
}
