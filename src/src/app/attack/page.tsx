"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useUndoStack } from "@/hooks/useUndoStack";
import { useDiceRoll } from "@/hooks/useDiceRoll";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import DiceResultOverlay from "@/components/ui/DiceResultOverlay";
import { useState } from "react";
import type { Weapon, SpellCreatedWeapon } from "@/types";
import { calcAttackBonus, calcDamageBonus } from "./attack-calc";

type AdvMode = "normal" | "advantage" | "disadvantage";

export default function AttackPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const { undoableMutate } = useUndoStack(data, mutate);
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

  /** Convert a SpellCreatedWeapon into a Weapon-compatible object for roll calculations */
  const toWeapon = (sw: SpellCreatedWeapon): Weapon => ({
    name: sw.name,
    damageDice: sw.damageDice,
    damageType: sw.damageType,
    attackStat: sw.attackStat,
    properties: sw.properties,
    magicBonus: sw.magicBonus,
    usesDueling: false,
    twoHanded: false,
  });

  const dismissSpellWeapon = (id: string) => {
    const current = data.spellCreatedWeapons ?? [];
    undoableMutate({ spellCreatedWeapons: current.filter((sw) => sw.id !== id) });
  };

  const spellWeapons = data.spellCreatedWeapons ?? [];

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

        {/* Permanent Weapon Cards */}
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

        {/* Spell-Created Weapons */}
        {spellWeapons.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {spellWeapons.map((sw) => {
              const w = toWeapon(sw);
              const attackBonus = calcAttackBonus(w, data.proficiencyBonus, data.stats, bladesongActive);
              const damageBonus = calcDamageBonus(w, data.stats, bladesongActive, false, hasTwoWeaponFighting);
              return (
                <div
                  key={sw.id}
                  className="rounded-lg border-2 border-arcane-blue/50 shadow-[0_0_10px_rgba(100,149,237,0.3)]"
                >
                  <UIPanel variant="box1">
                    {/* Header with spell icon and dismiss */}
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-arcane-blue" title="Spell-created weapon">✦</span>
                        <h3 className="font-serif text-lg text-arcane-blue">
                          {sw.name}
                          {sw.magicBonus > 0 && (
                            <span className="ml-2 text-sm text-arcane-blue/70">+{sw.magicBonus}</span>
                          )}
                        </h3>
                      </div>
                      <button
                        onClick={() => dismissSpellWeapon(sw.id)}
                        className="shrink-0 rounded bg-crimson/30 px-2 py-1 text-xs text-parchment/70 transition hover:bg-crimson/60 hover:text-parchment"
                        title="Dismiss spell weapon"
                      >
                        Dismiss
                      </button>
                    </div>

                    {/* Source spell info */}
                    <div className="mb-2 text-xs text-arcane-blue/60">
                      {sw.sourceSpell} · Level {sw.castLevel}
                    </div>

                    {/* Stats line */}
                    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-parchment/70">
                      <span>{sw.damageDice} {sw.damageType}</span>
                      <span>+{attackBonus} to hit</span>
                      <span>+{damageBonus} damage</span>
                    </div>

                    {/* Properties */}
                    {sw.properties.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {sw.properties.map((prop) => (
                          <span
                            key={prop}
                            className="rounded bg-arcane-blue/10 px-2 py-0.5 text-xs text-arcane-blue/70"
                          >
                            {prop}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Roll buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => rollAttack(w)}
                        className="min-h-[44px] rounded bg-crimson/80 px-4 py-2 text-sm text-parchment transition hover:bg-crimson"
                      >
                        Attack Roll
                      </button>
                      <button
                        onClick={() => rollDamage(w, false)}
                        className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment transition hover:bg-gold"
                      >
                        Damage Roll
                      </button>
                      {isLightWeapon(w) && (
                        <button
                          onClick={() => rollDamage(w, true)}
                          className="min-h-[44px] rounded bg-gold-dark/60 px-4 py-2 text-sm text-parchment transition hover:bg-gold-dark"
                        >
                          Off-hand Damage
                        </button>
                      )}
                    </div>
                  </UIPanel>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {currentRoll && <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} />}
    </div>
  );
}
