import type { TreasureItem } from '../types/character';

export function totalTreasureValue(items: TreasureItem[]): number {
  return items.reduce((sum, item) => sum + item.estimatedValue, 0);
}
