"use client";

import UIPanel from "@/components/ui/UIPanel";
import type { CharacterData, DiceRoll, DiceResult } from "@/types";
import { getGearBonus } from "@/lib/gear-stats";
import { resolveDeathSave } from "@/lib/death-save";

interface Props {
  data: CharacterData;
  mutate: (partial: Partial<CharacterData>) => void;
  onRoll: (roll: DiceRoll) => Promise<DiceResult>;
}

export default function DeathSaveTracker({ data, mutate, onRoll }: Props) {
  const { successes, failures } = data.deathSaves;
  const isResolved = successes >= 3 || failures >= 3;

  // Death saves get the general save bonus (Ring/Cloak of Protection) plus any
  // death-save-specific gear bonus (e.g. Ramil's Family Ring +2).
  const gear = data.inventoryItems?.gear;
  const deathSaveBonus = getGearBonus(gear, "save") + getGearBonus(gear, "deathSave");

  const handleDeathSave = async () => {
    const result = await onRoll({
      dice: [{ sides: 20, count: 1 }],
      modifier: deathSaveBonus,
      label: deathSaveBonus ? `Death Save (+${deathSaveBonus})` : "Death Save",
    });

    // Nat 1 / nat 20 use the raw die; everything else is d20 + bonus vs DC 10.
    const nat = result.natural ?? result.total - deathSaveBonus;
    mutate(resolveDeathSave({ successes, failures }, nat, deathSaveBonus));
  };

  const handleClickSuccess = () => {
    if (isResolved) return;
    const newSuccesses = Math.min(3, successes + 1);
    mutate({ deathSaves: { successes: newSuccesses, failures } });
  };

  const handleClickFailure = () => {
    if (isResolved) return;
    const newFailures = Math.min(3, failures + 1);
    mutate({ deathSaves: { successes, failures: newFailures } });
  };

  const handleReset = () => {
    mutate({ deathSaves: { successes: 0, failures: 0 } });
  };

  return (
    <UIPanel variant="dark">
      <h2 className="mb-3 text-sm text-ff12-danger">Death Saves</h2>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ff12-text-dim">Successes:</span>
          {[0, 1, 2].map((i) => (
            <button
              key={`s${i}`}
              type="button"
              onClick={handleClickSuccess}
              disabled={isResolved}
              className={`h-5 w-5 rounded-full border-2 transition-colors ${
                i < successes
                  ? "border-green-500 bg-green-500"
                  : "border-ff12-border-dim hover:border-green-500/50"
              } disabled:cursor-default disabled:hover:border-ff12-border-dim`}
              aria-label={
                i < successes ? `Success ${i + 1} filled` : `Add success`
              }
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ff12-text-dim">Failures:</span>
          {[0, 1, 2].map((i) => (
            <button
              key={`f${i}`}
              type="button"
              onClick={handleClickFailure}
              disabled={isResolved}
              className={`h-5 w-5 rounded-full border-2 transition-colors ${
                i < failures
                  ? "border-ff12-danger bg-ff12-danger"
                  : "border-ff12-border-dim hover:border-ff12-danger/50"
              } disabled:cursor-default disabled:hover:border-ff12-border-dim`}
              aria-label={
                i < failures ? `Failure ${i + 1} filled` : `Add failure`
              }
            />
          ))}
        </div>
        <button
          onClick={handleDeathSave}
          disabled={isResolved}
          className="min-h-[44px] rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-border-dim disabled:opacity-30"
        >
          Roll Death Save
        </button>
        <button
          onClick={handleReset}
          className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-sm text-ff12-text-dim transition hover:bg-ff12-danger/30 hover:text-ff12-text"
          aria-label="Reset death saves"
        >
          Reset
        </button>
      </div>
      {successes >= 3 && (
        <p className="mt-2 text-sm text-green-400">Stabilized!</p>
      )}
      {failures >= 3 && <p className="mt-2 text-sm text-ff12-danger">Dead.</p>}
    </UIPanel>
  );
}
