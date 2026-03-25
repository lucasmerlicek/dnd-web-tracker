"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useDiceRoll } from "@/hooks/useDiceRoll";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import DiceResultOverlay from "@/components/ui/DiceResultOverlay";
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

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-parchment/50">Loading...</div>;

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
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-parchment/70">Roll Mode:</span>
            {(["normal", "advantage", "disadvantage"] as AdvMode[]).map((mode) => (
              <button key={mode} onClick={() => setAdvMode(mode)} className={`min-h-[44px] rounded px-4 py-2 text-sm capitalize transition ${advMode === mode ? "bg-gold-dark text-parchment" : "bg-dark-border text-parchment/70 hover:bg-dark-surface"}`}>
                {mode}
              </button>
            ))}
          </div>
        </UIPanel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ABILITIES.map((stat) => {
            const proficient = data.saveProficiencies.includes(stat);
            const mod = getSaveMod(stat);
            return (
              <UIPanel key={stat} variant="box1">
                <button onClick={() => rollSave(stat)} className="min-h-[44px] w-full text-center transition hover:opacity-80" aria-label={`Roll ${stat} saving throw`}>
                  <div className="flex items-center justify-center gap-2">
                    {proficient && <span className="h-2 w-2 rounded-full bg-gold" aria-label="Proficient" />}
                    <span className="font-serif text-lg text-parchment">{stat}</span>
                  </div>
                  <div className="font-serif text-2xl text-gold">{mod >= 0 ? "+" : ""}{mod}</div>
                </button>
              </UIPanel>
            );
          })}
        </div>
      </div>
      {currentRoll && <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} />}
    </div>
  );
}
