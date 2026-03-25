"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import type { DiceRoll, DiceResult } from "@/types";

// Lazy-load the heavy Three.js scene to avoid blocking initial page render
const DiceScene = lazy(() => import("./DiceScene"));

export interface DiceOverlayProps {
  roll: DiceRoll | null;
  result: DiceResult | null;
  onDismiss: () => void;
}

export default function DiceOverlay({ roll, result, onDismiss }: DiceOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  // Show overlay when a roll is active
  useEffect(() => {
    if (roll) {
      setVisible(true);
      setFading(false);
    }
  }, [roll]);

  const handleDismiss = useCallback(() => {
    setFading(true);
    const fadeTimer = setTimeout(() => {
      setVisible(false);
      setFading(false);
      onDismiss();
    }, 400);
    return () => clearTimeout(fadeTimer);
  }, [onDismiss]);

  // Auto-dismiss after 3 seconds once result is available
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [result, handleDismiss]);

  if (!roll || !visible || !portalRoot) return null;

  const isAdvantageRoll = roll.advantage || roll.disadvantage;

  const overlay = (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      onClick={result ? handleDismiss : undefined}
      role="dialog"
      aria-label="Dice roll animation"
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* 3D dice scene */}
      <div className="relative h-[50vh] w-[80vw] max-w-[600px]">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <p className="animate-pulse text-xl text-parchment/60">
                Loading dice...
              </p>
            </div>
          }
        >
          <DiceScene dice={roll.dice} />
        </Suspense>
      </div>

      {/* Result display below the scene */}
      <div className="relative mt-4 text-center">
        <p className="mb-1 text-sm text-parchment/70">{roll.label}</p>
        {result ? (
          <>
            <p
              className={`font-serif text-5xl font-bold ${
                result.isCritical
                  ? "text-gold"
                  : result.isFumble
                    ? "text-crimson"
                    : "text-parchment"
              }`}
            >
              {result.total}
            </p>

            {/* Individual rolls display */}
            {isAdvantageRoll && result.usedIndex != null ? (
              <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                {result.rolls.map((r: number, i: number) => {
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
              <p className="mt-1 text-xs text-parchment/50">
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
              <p className="mt-1 text-sm font-semibold text-gold">Critical!</p>
            )}
            {result.isFumble && (
              <p className="mt-1 text-sm font-semibold text-crimson">Fumble!</p>
            )}
          </>
        ) : (
          <p className="animate-pulse font-serif text-3xl text-parchment/50">
            Rolling...
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, portalRoot);
}
