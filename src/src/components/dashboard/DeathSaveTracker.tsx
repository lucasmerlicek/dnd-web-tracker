"use client";

import UIPanel from "@/components/ui/UIPanel";
import type { CharacterData, DiceRoll, DiceResult } from "@/types";

interface Props {
  data: CharacterData;
  mutate: (partial: Partial<CharacterData>) => void;
  onRoll: (roll: DiceRoll) => Promise<DiceResult>;
}

export default function DeathSaveTracker({ data, mutate, onRoll }: Props) {
  const { successes, failures } = data.deathSaves;
  const isResolved = successes >= 3 || failures >= 3;

  const handleDeathSave = async () => {
    const result = await onRoll({
      dice: [{ sides: 20, count: 1 }],
      modifier: 0,
      label: "Death Save",
    });

    const nat = result.natural ?? result.total;
    let newSuccesses = successes;
    let newFailures = failures;

    if (nat === 20) {
      mutate({ currentHp: 1, deathSaves: { successes: 0, failures: 0 } });
      return;
    } else if (nat === 1) {
      newFailures += 2;
    } else if (nat >= 10) {
      newSuccesses += 1;
    } else {
      newFailures += 1;
    }

    newSuccesses = Math.min(3, newSuccesses);
    newFailures = Math.min(3, newFailures);

    if (newSuccesses >= 3) {
      mutate({ deathSaves: { successes: 3, failures: newFailures } });
      return;
    }

    mutate({ deathSaves: { successes: newSuccesses, failures: newFailures } });
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
      <h2 className="mb-3 font-serif text-sm text-crimson">Death Saves</h2>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-parchment/70">Successes:</span>
          {[0, 1, 2].map((i) => (
            <button
              key={`s${i}`}
              type="button"
              onClick={handleClickSuccess}
              disabled={isResolved}
              className={`h-5 w-5 rounded-full border-2 transition-colors ${
                i < successes
                  ? "border-green-500 bg-green-500"
                  : "border-dark-border hover:border-green-500/50"
              } disabled:cursor-default disabled:hover:border-dark-border`}
              aria-label={
                i < successes ? `Success ${i + 1} filled` : `Add success`
              }
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-parchment/70">Failures:</span>
          {[0, 1, 2].map((i) => (
            <button
              key={`f${i}`}
              type="button"
              onClick={handleClickFailure}
              disabled={isResolved}
              className={`h-5 w-5 rounded-full border-2 transition-colors ${
                i < failures
                  ? "border-crimson bg-crimson"
                  : "border-dark-border hover:border-crimson/50"
              } disabled:cursor-default disabled:hover:border-dark-border`}
              aria-label={
                i < failures ? `Failure ${i + 1} filled` : `Add failure`
              }
            />
          ))}
        </div>
        <button
          onClick={handleDeathSave}
          disabled={isResolved}
          className="min-h-[44px] rounded bg-dark-border px-4 py-2 text-sm text-parchment transition hover:bg-gold-dark disabled:opacity-30"
        >
          Roll Death Save
        </button>
        <button
          onClick={handleReset}
          className="min-h-[44px] rounded bg-dark-border px-3 py-2 text-sm text-parchment/70 transition hover:bg-crimson/30 hover:text-parchment"
          aria-label="Reset death saves"
        >
          Reset
        </button>
      </div>
      {successes >= 3 && (
        <p className="mt-2 text-sm text-green-400">Stabilized!</p>
      )}
      {failures >= 3 && <p className="mt-2 text-sm text-crimson">Dead.</p>}
    </UIPanel>
  );
}
