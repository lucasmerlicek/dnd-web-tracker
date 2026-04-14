"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useDiceRoll } from "@/hooks/useDiceRoll";
import { useCursorNavigation } from "@/hooks/useCursorNavigation";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import DiceResultOverlay from "@/components/ui/DiceResultOverlay";
import CursorIndicator from "@/components/ui/CursorIndicator";
import { useState } from "react";
import type { AbilityName } from "@/types";

type AdvMode = "normal" | "advantage" | "disadvantage";
const ABILITIES: AbilityName[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export default function SavesPage() {
  const { data: session } = useSession();
  const { data, loading } = useCharacterData();
  const { currentRoll, result, rollDice, dismiss } = useDiceRoll();
  const [advMode, setAdvMode] = useState<AdvMode>("normal");
  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";

  const advModes: AdvMode[] = ["normal", "advantage", "disadvantage"];

  const rollModeCursor = useCursorNavigation({
    itemCount: advModes.length,
    columns: advModes.length,
    onActivate: (index) => setAdvMode(advModes[index]),
  });

  const saveCursor = useCursorNavigation({
    itemCount: ABILITIES.length,
    columns: 3,
    onActivate: (index) => rollSave(ABILITIES[index]),
  });

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-ff12-text-dim">Loading...</div>;

  const getSaveMod = (stat: AbilityName) => {
    const base = data.stats[stat].modifier;
    const proficient = data.saveProficiencies.includes(stat);
    return base + (proficient ? data.proficiencyBonus : 0);
  };

  const rollSave = (stat: AbilityName) => {
    rollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier: getSaveMod(stat),
      advantage: advMode === "advantage",
      disadvantage: advMode === "disadvantage",
      label: `${stat} Save`,
    });
  };

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="saves" characterId={characterId} />
      <AmbientEffects screen="saves" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons />
        <UIPanel variant="box2">
          <div {...rollModeCursor.containerProps} className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-ff12-text-dim">Roll Mode:</span>
            {advModes.map((mode, index) => (
              <button
                key={mode}
                {...rollModeCursor.getItemProps(index)}
                onClick={() => setAdvMode(mode)}
                className={`flex min-h-[44px] items-center gap-1 rounded px-4 py-2 text-sm capitalize transition ${advMode === mode ? "bg-ff12-panel-light text-ff12-text" : "bg-ff12-panel-dark text-ff12-text-dim hover:bg-ff12-panel-light"} ${rollModeCursor.isActive(index) ? "bg-white/10" : ""}`}
              >
                <CursorIndicator visible={rollModeCursor.isActive(index)} />
                {mode}
              </button>
            ))}
          </div>
        </UIPanel>
        <div {...saveCursor.containerProps} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ABILITIES.map((stat, index) => {
            const proficient = data.saveProficiencies.includes(stat);
            const mod = getSaveMod(stat);
            return (
              <div
                key={stat}
                {...saveCursor.getItemProps(index)}
                className={`transition ${saveCursor.isActive(index) ? "bg-white/10 rounded" : ""}`}
              >
                <UIPanel variant="box1">
                  <button onClick={() => rollSave(stat)} className="min-h-[44px] w-full text-center transition hover:opacity-80" aria-label={`Roll ${stat} saving throw`}>
                    <div className="flex items-center justify-center gap-2">
                      <CursorIndicator visible={saveCursor.isActive(index)} />
                      {proficient && <span className="h-2 w-2 rounded-full bg-gold" aria-label="Proficient" />}
                      <span className="text-lg text-ff12-text">{stat}</span>
                    </div>
                    <div className="text-2xl text-gold">{mod >= 0 ? "+" : ""}{mod}</div>
                  </button>
                </UIPanel>
              </div>
            );
          })}
        </div>
      </div>
      {currentRoll && <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} />}
    </div>
  );
}
