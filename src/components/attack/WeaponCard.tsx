"use client";

import { useState } from "react";
import UIPanel from "@/components/ui/UIPanel";
import IconImage from "@/components/ui/IconImage";
import { calcAttackBonus, calcDamageBonus } from "@/app/attack/attack-calc";
import type { Weapon, CharacterData, DiceRoll, DiceResult } from "@/types";

type AdvMode = "normal" | "advantage" | "disadvantage";

interface WeaponCardProps {
  weapon: Weapon;
  characterData: CharacterData;
  onRoll: (roll: DiceRoll) => Promise<DiceResult>;
}

export default function WeaponCard({ weapon, characterData, onRoll }: WeaponCardProps) {
  const [advMode, setAdvMode] = useState<AdvMode>("normal");

  const bladesongActive = characterData.classResources.bladesongActive ?? false;
  const hasTwoWeaponFighting =
    characterData.fightingStyles?.twoWeaponFighting ??
    characterData.fightingStyles?.two_weapon_fighting ??
    false;

  const attackBonus = calcAttackBonus(
    weapon,
    characterData.proficiencyBonus,
    characterData.stats,
    bladesongActive
  );
  const damageBonus = calcDamageBonus(
    weapon,
    characterData.stats,
    bladesongActive,
    false,
    hasTwoWeaponFighting
  );

  const isLight = weapon.properties.some((p) => p.toLowerCase() === "light");

  // Separate mastery properties from regular properties for display
  const masteries = weapon.properties.filter((p) => p.toLowerCase().includes("mastery"));
  const regularProps = weapon.properties.filter((p) => !p.toLowerCase().includes("mastery"));

  const handleAttackRoll = () => {
    onRoll({
      dice: [{ sides: 20, count: 1 }],
      modifier: attackBonus,
      advantage: advMode === "advantage",
      disadvantage: advMode === "disadvantage",
      label: `Attack — ${weapon.name}`,
    });
  };

  const handleDamageRoll = (isOffHand: boolean) => {
    const match = weapon.damageDice.match(/(\d+)d(\d+)/);
    if (!match) return;
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]) as 4 | 6 | 8 | 10 | 12 | 20;
    const modifier = isOffHand
      ? calcDamageBonus(weapon, characterData.stats, bladesongActive, true, hasTwoWeaponFighting)
      : damageBonus;
    onRoll({
      dice: [{ sides, count }],
      modifier,
      label: `${isOffHand ? "Off-hand " : ""}Damage — ${weapon.name} (${weapon.damageType})`,
    });
  };

  const advButtons: { mode: AdvMode; label: string }[] = [
    { mode: "normal", label: "Normal" },
    { mode: "advantage", label: "ADV" },
    { mode: "disadvantage", label: "DIS" },
  ];

  return (
    <UIPanel variant="box1">
      {/* Header: weapon name + icon + magic bonus */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg text-gold">
          <IconImage type="weapon" name={weapon.name} size={24} />
          {weapon.name}
          {weapon.magicBonus > 0 && (
            <span className="ml-2 text-sm text-ff12-select">+{weapon.magicBonus}</span>
          )}
        </h3>
        <span className="shrink-0 text-xs text-ff12-text-dim">{weapon.damageType}</span>
      </div>

      {/* Stats line */}
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ff12-text-dim">
        <span>{weapon.damageDice} {weapon.damageType}</span>
        <span>+{attackBonus} to hit</span>
        <span>+{damageBonus} damage</span>
      </div>

      {/* Properties */}
      {regularProps.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1.5">
          {regularProps.map((prop) => (
            <span
              key={prop}
              className="rounded bg-ff12-panel-light/50 px-2 py-0.5 text-xs text-ff12-text-dim"
            >
              {prop}
            </span>
          ))}
        </div>
      )}

      {/* Masteries */}
      {masteries.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {masteries.map((m) => (
            <span
              key={m}
              className="rounded bg-gold/20 px-2 py-0.5 text-xs text-gold"
            >
              {m.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Advantage/Disadvantage toggle */}
      <div className="mb-3 flex items-center gap-1.5">
        {advButtons.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setAdvMode(mode)}
            className={`min-h-[32px] rounded px-2.5 py-1 text-xs transition ${
              advMode === mode
                ? "bg-ff12-panel-light text-ff12-text"
                : "bg-ff12-panel-dark/40 text-ff12-text-dim hover:bg-ff12-panel-light"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Roll buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAttackRoll}
          className="min-h-[44px] rounded bg-ff12-danger/40 px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-danger/60"
        >
          Attack Roll
        </button>
        <button
          onClick={() => handleDamageRoll(false)}
          className="min-h-[44px] rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-border-dim"
        >
          Damage Roll
        </button>
        {isLight && (
          <button
            onClick={() => handleDamageRoll(true)}
            className="min-h-[44px] rounded bg-ff12-panel-light/60 px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-panel-light"
          >
            Off-hand Damage
          </button>
        )}
      </div>
    </UIPanel>
  );
}
