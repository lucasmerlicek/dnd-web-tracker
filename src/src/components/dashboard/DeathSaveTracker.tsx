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
      // Req 4.5: Nat 20 — set HP to 1, reset all death saves
      mutate({ currentHp: 1, deathSaves: { successes: 0, failures: 0 } });
      return;
    } else if (nat === 1) {
      // Req 4.6: Nat 1 — mark two failures
      newFailures += 2;
    } else if (nat >= 10) {
      // Req 4.3: ≥10 — mark one success
      newSuccesses += 1;
    } else {
      // Req 4.4: <10 — mark one failure
      newFailures += 1;
    }

    newSuccesses = Math.min(3, newSuccesses);
    newFailures = Math.min(3, newFailures);

    // Req 4.7: 3 successes — stabilized, reset death saves
    if (newSuccesses >= 3) {
      mutate({ deathSaves: { successes: 3, failures: newFailures } });
      return;
    }

    mutate({ deathSaves: { successes: newSuccesses, failures: newFailures } });
  };

  return (
    <UIPanel variant="dark">
      <h2 className="mb-3 font-serif text-sm text-crimson">Death Saves</h2>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-parchment/70">Successes:</span>
          {[0, 1, 2].map((i) => (
            <div
              key={`s${i}`}
              className={`h-5 w-5 rounded-full border-2 ${i < successes ? "border-green-500 bg-green-500" : "border-dark-border"}`}
              aria-label={i < successes ? "Success" : "Empty"}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-parchment/70">Failures:</span>
          {[0, 1, 2].map((i) => (
            <div
              key={`f${i}`}
              className={`h-5 w-5 rounded-full border-2 ${i < failures ? "border-crimson bg-crimson" : "border-dark-border"}`}
              aria-label={i < failures ? "Failure" : "Empty"}
            />
          ))}
        </div>
        <button
          onClick={handleDeathSave}
          disabled={successes >= 3 || failures >= 3}
          className="min-h-[44px] rounded bg-dark-border px-4 py-2 text-sm text-parchment transition hover:bg-gold-dark disabled:opacity-30"
        >
          Roll Death Save
        </button>
      </div>
      {successes >= 3 && <p className="mt-2 text-sm text-green-400">Stabilized!</p>}
      {failures >= 3 && <p className="mt-2 text-sm text-crimson">Dead.</p>}
    </UIPanel>
  );
}
