"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { DiceRoll, DiceResult } from "@/types";

interface Props {
  roll: DiceRoll;
  result: DiceResult | null;
  onDismiss: () => void;
}

export default function DiceResultOverlay({ roll, result, onDismiss }: Props) {
  useEffect(() => {
    if (result) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, onDismiss]);

  const isAdvantageRoll = roll.advantage || roll.disadvantage;

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
        className="rounded-lg border border-gold-dark/50 bg-dark-surface p-8 text-center"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
      >
        <p className="mb-2 text-sm text-parchment/70">{roll.label}</p>
        {result ? (
          <>
            <p
              className={`font-serif text-5xl ${
                result.isCritical
                  ? "text-gold"
                  : result.isFumble
                    ? "text-crimson"
                    : "text-parchment"
              }`}
            >
              {result.total}
            </p>

            {/* Individual rolls — highlight used die for advantage/disadvantage */}
            {isAdvantageRoll && result.usedIndex != null ? (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                {result.rolls.map((r, i) => {
                  const isUsed = i === result.usedIndex;
                  return (
                    <span
                      key={i}
                      className={
                        isUsed
                          ? "rounded border border-gold/50 bg-gold/10 px-2 py-0.5 font-semibold text-gold"
                          : "px-2 py-0.5 text-parchment/30 line-through"
                      }
                    >
                      {r}
                    </span>
                  );
                })}
                {roll.modifier !== 0 && (
                  <span className="text-parchment/50">
                    {roll.modifier >= 0 ? "+" : ""}
                    {roll.modifier}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-parchment/50">
                [{result.rolls.join(", ")}]
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
              <p className="mt-1 text-sm text-crimson">Fumble!</p>
            )}
          </>
        ) : (
          <p className="animate-pulse font-serif text-3xl text-parchment/50">
            Rolling...
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
