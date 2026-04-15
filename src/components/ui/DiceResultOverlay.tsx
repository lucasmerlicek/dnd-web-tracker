"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { DiceRoll, DiceResult } from "@/types";
import type { CharacterData } from "@/types/character";
import { applyEmpoweredReroll } from "@/lib/empowered-spell";

interface Props {
  roll: DiceRoll;
  result: DiceResult | null;
  onDismiss: () => void;
  characterData?: CharacterData;
  onMutate?: (partial: Partial<CharacterData>) => void;
}

/** Labels that indicate non-damage rolls — Empowered Spell should NOT appear for these. */
const NON_DAMAGE_PATTERNS = ["Spell Attack", "Check", "Save", "Second Wind (heal)"];

function isDamageRoll(label: string): boolean {
  return !NON_DAMAGE_PATTERNS.some((p) => label.includes(p));
}

export default function DiceResultOverlay({ roll, result, onDismiss, characterData, onMutate }: Props) {
  const [empoweredUsed, setEmpoweredUsed] = useState(false);
  const [displayRolls, setDisplayRolls] = useState<number[]>([]);
  const [displayTotal, setDisplayTotal] = useState(0);

  // Sync display state from result whenever result changes
  useEffect(() => {
    if (result) {
      setDisplayRolls(result.rolls);
      setDisplayTotal(result.total);
      setEmpoweredUsed(false);
    }
  }, [result]);

  const handleEmpoweredSpell = useCallback(() => {
    if (!result || !characterData || !onMutate || empoweredUsed) return;
    const sp = characterData.classResources.currentSorceryPoints ?? 0;
    if (sp < 1) return;

    // Determine die sides from the roll spec
    const dieSides = roll.dice[0]?.sides ?? 6;

    const newRolls = applyEmpoweredReroll(displayRolls, dieSides);
    const newTotal = newRolls.reduce((sum, v) => sum + v, 0) + roll.modifier;

    setDisplayRolls(newRolls);
    setDisplayTotal(newTotal);
    setEmpoweredUsed(true);

    // Deduct 1 SP
    onMutate({
      classResources: {
        ...characterData.classResources,
        currentSorceryPoints: sp - 1,
      },
    });
  }, [result, characterData, onMutate, empoweredUsed, displayRolls, roll]);

  const isAdvantageRoll = roll.advantage || roll.disadvantage;

  // Empowered Spell button visibility
  const showEmpowered =
    result &&
    characterData &&
    onMutate &&
    (characterData.classResources.currentSorceryPoints ?? 0) >= 1 &&
    isDamageRoll(roll.label) &&
    !empoweredUsed;

  const empoweredDisabled =
    (characterData?.classResources.currentSorceryPoints ?? 0) < 1 || empoweredUsed;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={result ? onDismiss : undefined}
      role="dialog"
      aria-label="Dice roll result"
    >
      <motion.div
        className="rounded border bg-ff12-panel/70 border-ff12-border p-8 text-center"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
      >
        <p className="mb-2 text-sm text-ff12-text-dim">{roll.label}</p>
        {result ? (
          <>
            <p
              className={`text-5xl ${
                result.isCritical
                  ? "text-gold"
                  : result.isFumble
                    ? "text-ff12-danger"
                    : "text-ff12-text"
              }`}
            >
              {displayTotal}
            </p>

            {/* Individual rolls — highlight used die for advantage/disadvantage */}
            {isAdvantageRoll && result.usedIndex != null ? (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                {displayRolls.map((r, i) => {
                  const isUsed = i === result.usedIndex;
                  return (
                    <span
                      key={i}
                      className={
                        isUsed
                          ? "rounded border border-gold/50 bg-gold/10 px-2 py-0.5 font-semibold text-gold"
                          : "px-2 py-0.5 text-ff12-text-dim/40 line-through"
                      }
                    >
                      {r}
                    </span>
                  );
                })}
                {roll.modifier !== 0 && (
                  <span className="text-ff12-text-dim">
                    {roll.modifier >= 0 ? "+" : ""}
                    {roll.modifier}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ff12-text-dim">
                [{displayRolls.join(", ")}]
                {roll.modifier !== 0
                  ? ` ${roll.modifier >= 0 ? "+" : ""}${roll.modifier}`
                  : ""}
              </p>
            )}

            {/* Advantage / disadvantage label */}
            {roll.advantage && (
              <p className="mt-1 text-xs font-medium text-emerald-400">
                Advantage
              </p>
            )}
            {roll.disadvantage && (
              <p className="mt-1 text-xs font-medium text-rose-400">
                Disadvantage
              </p>
            )}

            {result.isCritical && (
              <p className="mt-1 text-sm text-gold">Critical!</p>
            )}
            {result.isFumble && (
              <p className="mt-1 text-sm text-ff12-danger">Fumble!</p>
            )}

            {/* Empowered Spell button */}
            {showEmpowered && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmpoweredSpell();
                }}
                disabled={empoweredDisabled}
                className="mt-3 min-h-[44px] rounded bg-purple-700/60 px-4 py-2 text-sm text-ff12-text transition hover:bg-purple-600/70 disabled:opacity-30"
              >
                Empowered Spell (1 SP)
              </button>
            )}
          </>
        ) : (
          <p className="animate-pulse text-3xl text-ff12-text-dim">
            Rolling...
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
