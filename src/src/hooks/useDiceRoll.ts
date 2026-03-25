"use client";

import { useState, useCallback, useRef } from "react";
import type { DiceRoll, DiceResult } from "@/types";

/** Roll a single die with the given number of sides (1-indexed result). */
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Time in ms to wait for the physics animation before showing the result. */
const SETTLE_DELAY = 1500;

export function useDiceRoll() {
  const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null);
  const [result, setResult] = useState<DiceResult | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rollDice = useCallback((diceRoll: DiceRoll): Promise<DiceResult> => {
    // Clear any pending settle timer from a previous roll
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }

    // Reset result and set the new roll (triggers overlay)
    setResult(null);
    setCurrentRoll(diceRoll);

    return new Promise((resolve) => {
      settleTimer.current = setTimeout(() => {
        const isAdvantageOrDisadvantage =
          (diceRoll.advantage || diceRoll.disadvantage) ?? false;

        // Determine if this is a single-d20 roll that qualifies for advantage/disadvantage
        const isSingleD20 =
          diceRoll.dice.length === 1 &&
          diceRoll.dice[0].sides === 20 &&
          diceRoll.dice[0].count === 1;

        let rolls: number[];
        let total: number;
        let natural: number | undefined;
        let isCritical = false;
        let isFumble = false;
        let usedIndex: number | undefined;

        if (isSingleD20 && isAdvantageOrDisadvantage) {
          // Advantage / disadvantage: roll two d20s
          const r1 = rollDie(20);
          const r2 = rollDie(20);
          rolls = [r1, r2];

          if (diceRoll.advantage) {
            // Use the higher roll
            usedIndex = r1 >= r2 ? 0 : 1;
          } else {
            // Disadvantage: use the lower roll
            usedIndex = r1 <= r2 ? 0 : 1;
          }

          natural = rolls[usedIndex];
          total = natural + diceRoll.modifier;
          isCritical = natural === 20;
          isFumble = natural === 1;
        } else {
          // Standard roll: roll all dice in the spec
          rolls = [];
          for (const die of diceRoll.dice) {
            for (let i = 0; i < die.count; i++) {
              rolls.push(rollDie(die.sides));
            }
          }

          total = rolls.reduce((sum, r) => sum + r, 0) + diceRoll.modifier;

          // Track natural value for single d20 rolls (no advantage/disadvantage)
          if (isSingleD20) {
            natural = rolls[0];
            isCritical = natural === 20;
            isFumble = natural === 1;
          }
        }

        const diceResult: DiceResult = {
          rolls,
          total,
          natural,
          isCritical,
          isFumble,
          usedIndex,
        };

        setResult(diceResult);
        resolve(diceResult);
      }, SETTLE_DELAY);
    });
  }, []);

  const dismiss = useCallback(() => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    setCurrentRoll(null);
    setResult(null);
  }, []);

  return { currentRoll, result, rollDice, dismiss };
}
