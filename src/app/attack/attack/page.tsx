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
import IconImage from "@/components/ui/IconImage";
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

  const advModes: AdvMode[] = ["normal", "advantage", "disadvantage"];

  const rollModeCursor = useCursorNavigation({
    itemCount: advModes.length,
    columns: advModes.length,
    onActivate: (index) => setAdvMode(advModes[index]),
  });

  const weaponCursor = useCursorNavigation({
    itemCount: data?.weapons.length ?? 0,
    columns: 2,
  });

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-ff12-text-dim">Loading...</div>;

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

        {/* Weapon Cards */}
        <div {...weaponCursor.containerProps} className="grid gap-4 lg:grid-cols-2">
          {data.weapons.map((w, index) => {
            const attackBonus = calcAttackBonus(w, data.proficiencyBonus, data.stats, bladesongActive);
            const damageBonus = calcDamageBonus(w, data.stats, bladesongActive, false, hasTwoWeaponFighting);
            return (
              <div
                key={w.name}
                {...weaponCursor.getItemProps(index)}
                className={`transition ${weaponCursor.isActive(index) ? "bg-white/10 rounded" : ""}`}
              >
                <UIPanel variant="box1">
                  <div className="mb-2 flex items-center gap-2">
                    <CursorIndicator visible={weaponCursor.isActive(index)} />
                    <IconImage type="weapon" name={w.name} size={24} />
                    <h3 className="text-gold">{w.name}</h3>
                    {w.magicBonus > 0 && (
                      <span className="text-sm text-ff12-select">+{w.magicBonus}</span>
                    )}
                  </div>
                  {w.properties.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {w.properties.map((prop) => (
                        <span key={prop} className="rounded bg-ff12-panel-light/50 px-2 py-0.5 text-xs text-ff12-text-dim">
                          {prop.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mb-3 text-sm text-ff12-text-dim">
                    {w.damageDice} {w.damageType} · +{attackBonus} to hit · +{damageBonus} damage
                    {w.magicBonus > 0 && ` · +${w.magicBonus} magic`}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => rollAttack(w)} className="min-h-[44px] rounded bg-ff12-danger/40 px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-danger/60">
                      Attack Roll
                    </button>
                    <button onClick={() => rollDamage(w, false)} className="min-h-[44px] rounded bg-ff12-panel-light/60 px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-panel-light">
                      Damage Roll
                    </button>
                    {isLightWeapon(w) && (
                      <button onClick={() => rollDamage(w, true)} className="min-h-[44px] rounded bg-ff12-panel-light/60 px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-panel-light">
                        Off-hand Damage
                      </button>
                    )}
                  </div>
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
