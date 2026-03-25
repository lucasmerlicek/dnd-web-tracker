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
import type { Weapon } from "@/types";
import { calcAttackBonus, calcDamageBonus } from "./attack-calc";

type AdvMode = "normal" | "advantage" | "disadvantage";

export default function AttackPage() {
  const { data: session } = useSession();
  const { data, loading } = useCharacterData();
  const { currentRoll, result, rollDice, dismiss } = useDiceRoll();
  const [advMode, setAdvMode] = useState<AdvMode>("normal");
  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-parchment/50">Loading...</div>;

  const bladesongActive = data.classResources.bladesongActive ?? false;
  const hasTwoWeaponFighting = data.fightingStyles?.twoWeaponFighting ?? data.fightingStyles?.two_weapon_fighting ?? false;

  const rollAttack = (w: Weapon) => {
    rollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier: calcAttackBonus(w, data.proficiencyBonus, data.stats, bladesongActive),
      advantage: advMode === "advantage",
      disadvantage: advMode === "disadvantage",
      label: `Attack — ${w.name}`,
    });
  };

  const rollDamage = (w: Weapon, isOffHand: boolean) => {
    const match = w.damageDice.match(/(\d+)d(\d+)/);
    if (!match) return;
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]) as 4 | 6 | 8 | 10 | 12 | 20;
    const modifier = calcDamageBonus(w, data.stats, bladesongActive, isOffHand, hasTwoWeaponFighting);
    rollDice({
      dice: [{ sides, count }],
      modifier,
      label: `${isOffHand ? "Off-hand " : ""}Damage — ${w.name} (${w.damageType})`,
    });
  };

  const isLightWeapon = (w: Weapon) => w.properties.some((p) => p.toLowerCase() === "light");

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="attack" characterId={characterId} />
      <AmbientEffects screen="attack" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons />

        {/* Advantage Toggle */}
        <UIPanel variant="box2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-parchment/70">Roll Mode:</span>
            {(["normal", "advantage", "disadvantage"] as AdvMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setAdvMode(mode)}
                className={`min-h-[44px] rounded px-4 py-2 text-sm capitalize transition ${advMode === mode ? "bg-gold-dark text-parchment" : "bg-dark-border text-parchment/70 hover:bg-dark-surface"}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </UIPanel>

        {/* Weapon Cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {data.weapons.map((w) => {
            const attackBonus = calcAttackBonus(w, data.proficiencyBonus, data.stats, bladesongActive);
            const damageBonus = calcDamageBonus(w, data.stats, bladesongActive, false, hasTwoWeaponFighting);
            return (
              <UIPanel key={w.name} variant="box1">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-serif text-gold">{w.name}</h3>
                  <span className="text-xs text-parchment/50">{w.properties.join(", ")}</span>
                </div>
                <div className="mb-3 text-sm text-parchment/70">
                  {w.damageDice} {w.damageType} · +{attackBonus} to hit · +{damageBonus} damage
                  {w.magicBonus > 0 && ` · +${w.magicBonus} magic`}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => rollAttack(w)} className="min-h-[44px] rounded bg-crimson/80 px-4 py-2 text-sm text-parchment transition hover:bg-crimson">
                    Attack Roll
                  </button>
                  <button onClick={() => rollDamage(w, false)} className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment transition hover:bg-gold">
                    Damage Roll
                  </button>
                  {isLightWeapon(w) && (
                    <button onClick={() => rollDamage(w, true)} className="min-h-[44px] rounded bg-gold-dark/60 px-4 py-2 text-sm text-parchment transition hover:bg-gold-dark">
                      Off-hand Damage
                    </button>
                  )}
                </div>
              </UIPanel>
            );
          })}
        </div>
      </div>
      {currentRoll && <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} />}
    </div>
  );
}
