"use client";

import { useState } from "react";
import UIPanel from "@/components/ui/UIPanel";
import FamiliarIcon from "./FamiliarIcon";
import type { FamiliarInstance, FamiliarStatBlock, AbilityName } from "@/types/character";
import type { DiceRoll } from "@/types/dice";

interface FamiliarCardProps {
  familiar: FamiliarInstance;
  statBlock: FamiliarStatBlock;
  onRollDice: (roll: DiceRoll) => void;
  onDamage: (familiarId: string, damage: number) => void;
  onDismiss: (familiarId: string) => void;
}

const ABILITY_ORDER: AbilityName[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export default function FamiliarCard({
  familiar,
  statBlock,
  onRollDice,
  onDamage,
  onDismiss,
}: FamiliarCardProps) {
  const [damageInput, setDamageInput] = useState("");

  const hpPercent = familiar.maxHp > 0 ? (familiar.currentHp / familiar.maxHp) * 100 : 0;
  const isHound = familiar.familiarType === "hound";

  const handleAbilityCheck = (stat: AbilityName) => {
    onRollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier: statBlock.abilities[stat].modifier,
      label: `${statBlock.name} ${stat} Check`,
    });
  };

  const handleBiteAttack = () => {
    const attack = statBlock.attacks?.[0];
    if (!attack) return;
    onRollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier: attack.toHit,
      label: `${attack.name} Attack — ${statBlock.name}`,
    });
  };

  const handleBiteDamage = () => {
    onRollDice({
      dice: [{ sides: 6, count: 2 }],
      modifier: 3,
      label: `Bite Damage — ${statBlock.name} (piercing)`,
    });
  };

  const handleApplyDamage = () => {
    const val = parseInt(damageInput);
    if (isNaN(val) || val <= 0) return;
    onDamage(familiar.id, val);
    setDamageInput("");
  };

  return (
    <UIPanel variant="box1">
      {/* Header: Icon + Name + Type badge */}
      <div className="mb-3 flex items-center gap-2">
        <FamiliarIcon familiarType={familiar.familiarType} size={32} />
        <div className="flex-1">
          <h3 className="text-lg text-gold">{statBlock.name}</h3>
        </div>
        <span className="rounded bg-ff12-panel-light/50 px-2 py-0.5 text-xs text-ff12-text-dim">
          {statBlock.type}
        </span>
      </div>

      {/* HP Bar + AC + Speed */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-ff12-text-dim">HP</span>
            <span className="text-sm tabular-nums text-gold">
              {familiar.currentHp} / {familiar.maxHp}
              {familiar.tempHp > 0 && (
                <span className="ml-1 text-blue-400">(+{familiar.tempHp} temp)</span>
              )}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ff12-panel-light">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ff12-hp-start to-ff12-hp-end transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ff12-text-dim">AC</span>
          <span className="text-lg tabular-nums text-gold">{statBlock.ac}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ff12-text-dim">Speed</span>
          <span className="text-sm tabular-nums text-ff12-text">{statBlock.speed}</span>
        </div>
      </div>

      {/* Ability Scores — 6 clickable buttons */}
      <div className="mb-3">
        <h4 className="mb-2 text-sm text-ff12-text-dim">Ability Checks</h4>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {ABILITY_ORDER.map((stat) => (
            <button
              key={stat}
              onClick={() => handleAbilityCheck(stat)}
              className="min-h-[44px] rounded border border-ff12-border-dim bg-ff12-panel-dark p-2 text-center transition hover:border-ff12-border"
              aria-label={`Roll ${statBlock.name} ${stat} check`}
            >
              <div className="text-xs text-ff12-text-dim">{stat}</div>
              <div className="text-sm tabular-nums text-ff12-text">{statBlock.abilities[stat].value}</div>
              <div className="text-xs tabular-nums text-gold">
                {statBlock.abilities[stat].modifier >= 0 ? "+" : ""}
                {statBlock.abilities[stat].modifier}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Passive Perception */}
      {statBlock.passivePerception !== undefined && (
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-ff12-text-dim">Passive Perception</span>
          <span className="tabular-nums text-gold">{statBlock.passivePerception}</span>
        </div>
      )}

      {/* Traits */}
      {statBlock.traits.length > 0 && (
        <div className="mb-3">
          <h4 className="mb-1 text-sm text-ff12-text-dim">Traits</h4>
          <ul className="space-y-1">
            {statBlock.traits.map((trait) => (
              <li key={trait} className="text-sm text-ff12-text/80">{trait}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Attacks (Hound only) */}
      {isHound && statBlock.attacks && statBlock.attacks.length > 0 && (
        <div className="mb-3">
          <h4 className="mb-2 text-sm text-ff12-text-dim">Attacks</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBiteAttack}
              className="min-h-[44px] rounded bg-ff12-danger/40 px-3 py-2 text-sm text-ff12-text transition hover:bg-ff12-danger/60"
            >
              Bite (d20+5)
            </button>
            <button
              onClick={handleBiteDamage}
              className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-sm text-ff12-text transition hover:bg-ff12-border-dim"
            >
              Damage (2d6+3)
            </button>
          </div>
          <p className="mt-1 text-xs text-ff12-text-dim">
            DC 13 STR save or knocked prone
          </p>
        </div>
      )}

      {/* Help action (normal familiars only) */}
      {!isHound && (
        <div className="mb-3">
          <h4 className="mb-2 text-sm text-ff12-text-dim">Actions</h4>
          <button
            className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-sm text-ff12-text transition hover:bg-ff12-border-dim"
            aria-label={`${statBlock.name} Help action`}
          >
            Help
          </button>
          <p className="mt-1 text-xs text-ff12-text-dim">
            Grants advantage on next ally ability check or attack roll
          </p>
        </div>
      )}

      {/* Damage input + Apply Damage */}
      <div className="mb-3 flex gap-2">
        <input
          type="number"
          value={damageInput}
          onChange={(e) => setDamageInput(e.target.value)}
          placeholder="Damage"
          className="w-20 rounded border border-ff12-border-dim bg-ff12-panel-dark px-2 py-2 text-sm text-ff12-text"
          aria-label={`Damage amount for ${statBlock.name}`}
        />
        <button
          onClick={handleApplyDamage}
          className="min-h-[44px] rounded bg-ff12-danger/40 px-3 py-2 text-xs text-ff12-text hover:bg-ff12-danger/60"
        >
          Apply Damage
        </button>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(familiar.id)}
        className="min-h-[44px] w-full rounded bg-ff12-panel-light px-3 py-2 text-sm text-ff12-text-dim transition hover:bg-ff12-border-dim hover:text-ff12-text"
      >
        Dismiss
      </button>
    </UIPanel>
  );
}
