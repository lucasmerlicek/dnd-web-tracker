import { HitDicePool } from '../types/character';

/**
 * Spend one hit die from the named class pool.
 *
 * Returns a new array with the target pool's `available` decremented by 1,
 * or null if the class is not found or has 0 available dice.
 */
export function spendHitDie(
  pools: HitDicePool[],
  className: string
): HitDicePool[] | null {
  const idx = pools.findIndex((p) => p.className === className);
  if (idx === -1 || pools[idx].available === 0) {
    return null;
  }

  return pools.map((p, i) =>
    i === idx ? { ...p, available: p.available - 1 } : p
  );
}

/**
 * Restore hit dice after a long rest.
 *
 * Restores floor(totalDice / 2) dice (minimum 1), distributed across pools
 * that have missing dice (total - available > 0), filling pools with the
 * most missing dice first. No pool's available exceeds its total.
 */
export function longRestRestore(pools: HitDicePool[]): HitDicePool[] {
  const totalDice = pools.reduce((sum, p) => sum + p.total, 0);
  let toRestore = Math.max(1, Math.floor(totalDice / 2));

  // Build a mutable copy with missing counts
  const work = pools.map((p, i) => ({
    index: i,
    pool: { ...p },
    missing: p.total - p.available,
  }));

  // Sort by most missing first (descending)
  work.sort((a, b) => b.missing - a.missing);

  for (const entry of work) {
    if (toRestore <= 0) break;
    const restore = Math.min(toRestore, entry.missing);
    entry.pool.available += restore;
    toRestore -= restore;
  }

  // Rebuild array in original order
  const result = new Array<HitDicePool>(pools.length);
  for (const entry of work) {
    result[entry.index] = entry.pool;
  }

  return result;
}
