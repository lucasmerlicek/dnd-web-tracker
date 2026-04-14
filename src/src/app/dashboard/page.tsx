"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useDiceRoll } from "@/hooks/useDiceRoll";
import { useUndoStack } from "@/hooks/useUndoStack";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import CounterControl from "@/components/ui/CounterControl";
import DiceResultOverlay from "@/components/ui/DiceResultOverlay";
import DeathSaveTracker from "@/components/dashboard/DeathSaveTracker";
import RestModal from "@/components/ui/RestModal";
import { useState } from "react";
import { calculateAC } from "@/lib/ac-calc";
import { getEquippedAcBonus } from "@/lib/gear-stats";
import { calculatePassivePerception } from "@/lib/passive-perception";
import { spendHitDie, longRestRestore } from "@/lib/hit-dice";
import type { AbilityName, CharacterData } from "@/types";
import type { PoolSelections } from "@/components/ui/RestModal";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const { undoableMutate } = useUndoStack(data, mutate);
  const { currentRoll, result, rollDice, dismiss } = useDiceRoll();
  const [restType, setRestType] = useState<"short" | "long" | null>(null);
  const [dmgHealValue, setDmgHealValue] = useState("");

  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";

  if (loading || !data) {
    return <div className="flex min-h-screen items-center justify-center text-parchment/50">Loading...</div>;
  }

  const rollAbility = (stat: AbilityName) => {
    rollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier: data.stats[stat].modifier,
      label: `${stat} Check`,
    });
  };

  const rollSkill = (name: string, modifier: number) => {
    rollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier,
      label: `${name}`,
    });
  };

  const applyDamage = () => {
    const val = parseInt(dmgHealValue);
    if (isNaN(val) || val <= 0) return;
    const newHp = Math.max(0, data.currentHp - val);
    const updates: Partial<CharacterData> = { currentHp: newHp };

    // Req 4.9: Damage at 0 HP marks one death save failure
    if (data.currentHp === 0) {
      const newFailures = Math.min(3, data.deathSaves.failures + 1);
      updates.deathSaves = { successes: data.deathSaves.successes, failures: newFailures };
    }

    undoableMutate(updates);
    setDmgHealValue("");
  };

  const applyHealing = () => {
    const val = parseInt(dmgHealValue);
    if (isNaN(val) || val <= 0) return;
    const updates: Partial<CharacterData> = {};

    // Req 4.10: Healing at 0 HP resets death saves and sets HP to healed amount
    if (data.currentHp === 0) {
      updates.currentHp = Math.min(data.maxHp, val);
      updates.deathSaves = { successes: 0, failures: 0 };
    } else {
      updates.currentHp = Math.min(data.maxHp, data.currentHp + val);
    }

    undoableMutate(updates);
    setDmgHealValue("");
  };

  const toggleShield = () => {
    const active = !data.shieldActive;
    const gearAcBonuses = data.inventoryItems
      ? [getEquippedAcBonus(data.inventoryItems.gear)]
      : [];
    const { ac, baseAc } = calculateAC({
      defaultBaseAc: data.defaultBaseAc,
      dexModifier: data.stats.DEX.modifier,
      mageArmorActive: data.mageArmorActive,
      shieldActive: active,
      bladesongActive: data.classResources.bladesongActive ?? false,
      intModifier: data.stats.INT.modifier,
      gearAcBonuses,
    });
    undoableMutate({ shieldActive: active, ac, baseAc });
  };

  const toggleMageArmor = () => {
    const active = !data.mageArmorActive;
    const gearAcBonuses = data.inventoryItems
      ? [getEquippedAcBonus(data.inventoryItems.gear)]
      : [];
    const { ac, baseAc } = calculateAC({
      defaultBaseAc: data.defaultBaseAc,
      dexModifier: data.stats.DEX.modifier,
      mageArmorActive: active,
      shieldActive: data.shieldActive,
      bladesongActive: data.classResources.bladesongActive ?? false,
      intModifier: data.stats.INT.modifier,
      gearAcBonuses,
    });
    undoableMutate({ mageArmorActive: active, ac, baseAc });
  };

  const handleShortRest = (hitDiceToSpend?: number, poolSelections?: PoolSelections) => {
    const conMod = data.stats.CON.modifier;
    const updates: Partial<CharacterData> = {};

    if (data.hitDicePools && data.hitDicePools.length > 0 && poolSelections) {
      // Multiclass pool path: use spendHitDie for each class
      let pools = [...data.hitDicePools.map((p) => ({ ...p }))];
      let totalHealing = 0;

      for (const [className, count] of Object.entries(poolSelections)) {
        const pool = pools.find((p) => p.className === className);
        if (!pool || count <= 0) continue;

        for (let i = 0; i < count; i++) {
          const result = spendHitDie(pools, className);
          if (!result) break; // pool exhausted
          pools = result;
          totalHealing += Math.max(1, Math.floor(Math.random() * pool.dieSize) + 1 + conMod);
        }
      }

      updates.hitDicePools = pools;
      // Also sync legacy fields for backward compatibility
      updates.hitDiceAvailable = pools.reduce((sum, p) => sum + p.available, 0);
      updates.currentHp = Math.min(data.maxHp, data.currentHp + totalHealing);
    } else {
      // Legacy single-pool path
      const diceToSpend = Math.max(0, hitDiceToSpend ?? 0);
      let totalHealing = 0;
      for (let i = 0; i < diceToSpend; i++) {
        totalHealing += Math.max(1, Math.floor(Math.random() * data.hitDiceSize) + 1 + conMod);
      }
      updates.currentHp = Math.min(data.maxHp, data.currentHp + totalHealing);
      updates.hitDiceAvailable = data.hitDiceAvailable - diceToSpend;
    }

    // Recharge short rest actions
    const updatedActions = { ...data.actions };
    for (const key of Object.keys(updatedActions)) {
      if (updatedActions[key].recharge === "short_rest") {
        updatedActions[key] = { ...updatedActions[key], uses: updatedActions[key].maxUses, available: true };
      }
    }
    updates.actions = updatedActions;

    // Sorcerous Restoration for Madea
    if (data.classResources.sorceryPointsMax !== undefined && !data.classResources.sorcerousRestorationUsed) {
      const restore = Math.floor(data.level / 2);
      const newSP = Math.min(
        data.classResources.sorceryPointsMax,
        (data.classResources.currentSorceryPoints ?? 0) + restore
      );
      updates.classResources = {
        ...data.classResources,
        currentSorceryPoints: newSP,
        sorcerousRestorationUsed: true,
      };
    }

    mutate(updates);
    setRestType(null);
  };

  const handleLongRest = () => {
    // Req 12.1: Restore HP to max
    // Req 12.3: Restore hit dice to max
    // Req 12.7/12.8/12.9: Deactivate Shield, Mage Armor, Bladesong
    // Req 12.9: Reset luck to 3, increment inspiration (capped at 10)
    // Req 12.2: Restore all spell slots to max
    // Req 12.10: Clear created spell slots
    const updates: Partial<CharacterData> = {
      currentHp: data.maxHp,
      hitDiceAvailable: data.hitDiceTotal,
      ...(data.hitDicePools ? (() => {
        const restoredPools = longRestRestore(data.hitDicePools);
        return {
          hitDicePools: restoredPools,
          hitDiceAvailable: restoredPools.reduce((sum, p) => sum + p.available, 0),
        };
      })() : {}),
      shieldActive: false,
      mageArmorActive: false,
      luckPoints: 3,
      inspiration: Math.min(2, data.inspiration + 1),
      currentSpellSlots: { ...data.spellSlots },
      createdSpellSlots: {},
      baseAc: data.defaultBaseAc,
      // AC is simply defaultBaseAc — all toggles (shield, mage armor, bladesong) are deactivated
      ac: data.defaultBaseAc,
    };

    // Req 12.6: Recharge all actions regardless of recharge type
    const updatedActions = { ...data.actions };
    for (const key of Object.keys(updatedActions)) {
      updatedActions[key] = { ...updatedActions[key], uses: updatedActions[key].maxUses, available: true };
    }
    updates.actions = updatedActions;

    // Req 12.4: Restore all class resources to max
    // Req 12.5: Reset all free-cast flags
    const cr = { ...data.classResources };
    if (cr.sorceryPointsMax !== undefined) cr.currentSorceryPoints = cr.sorceryPointsMax;
    if (cr.ravenFormMaxUses !== undefined) { cr.ravenFormUsesRemaining = cr.ravenFormMaxUses; cr.ravenFormActive = false; }
    if (cr.bladesongMaxUses !== undefined) { cr.bladesongUsesRemaining = cr.bladesongMaxUses; cr.bladesongActive = false; }
    cr.sorcerousRestorationUsed = false;
    cr.feyBaneUsed = false;
    cr.feyMistyStepUsed = false;
    cr.druidCharmPersonUsed = false;
    updates.classResources = cr;

    // Req 12.11: Persist all changes
    mutate(updates);
    setRestType(null);
  };

  // Req 16.1, 16.6: Passive Perception = 10 + Perception skill modifier
  const passivePerception = calculatePassivePerception(data.skills);

  const rollInitiative = () => {
    rollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier: data.stats.DEX.modifier,
      label: "Initiative",
    });
  };

  const ABILITY_ORDER: AbilityName[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="dashboard" characterId={characterId} />
      <AmbientEffects screen="dashboard" />

      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons />

        {/* Character Header */}
        <UIPanel variant="fancy">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl text-gold">{data.characterName}</h1>
              <p className="text-sm text-parchment/70">{data.race} · {data.charClass} · Level {data.level}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRestType("short")} className="min-h-[44px] rounded bg-dark-border px-4 py-2 text-sm text-parchment transition hover:bg-gold-dark">Short Rest</button>
              <button onClick={() => setRestType("long")} className="min-h-[44px] rounded bg-dark-border px-4 py-2 text-sm text-parchment transition hover:bg-gold-dark">Long Rest</button>
            </div>
          </div>
        </UIPanel>

        {/* HP and Resources */}
        <UIPanel variant="box1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-parchment/70">HP</span>
                <span className="font-serif text-lg text-gold">{data.currentHp} / {data.maxHp}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-dark-border">
                <div className="h-full rounded-full bg-crimson transition-all" style={{ width: `${(data.currentHp / data.maxHp) * 100}%` }} />
              </div>
              <div className="mt-2 flex justify-center gap-2">
                <input
                  type="number"
                  value={dmgHealValue}
                  onChange={(e) => setDmgHealValue(e.target.value)}
                  placeholder="Amount"
                  className="w-20 rounded border border-dark-border bg-dark-bg px-2 py-2 text-sm text-parchment"
                  aria-label="Damage or healing amount"
                />
                <button onClick={applyDamage} className="min-h-[44px] rounded bg-crimson/80 px-3 py-2 text-xs text-parchment hover:bg-crimson">Damage</button>
                <button onClick={applyHealing} className="min-h-[44px] rounded bg-green-800/80 px-3 py-2 text-xs text-parchment hover:bg-green-700">Heal</button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col items-center justify-center rounded border border-gold-dark/30 bg-dark-bg/50 py-2">
                <span className="text-xs text-parchment/50 uppercase tracking-wider">Armor Class</span>
                <span className="font-serif text-4xl font-bold text-gold">{data.ac}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={toggleShield} className={`min-h-[32px] flex-1 rounded px-2 py-1 text-[10px] transition ${data.shieldActive ? "bg-gold-dark text-parchment" : "bg-dark-border text-parchment/70 hover:bg-dark-surface"}`}>
                  Shield {data.shieldActive ? "(Active)" : ""}
                </button>
                <button onClick={toggleMageArmor} className={`min-h-[32px] flex-1 rounded px-2 py-1 text-[10px] transition ${data.mageArmorActive ? "bg-gold-dark text-parchment" : "bg-dark-border text-parchment/70 hover:bg-dark-surface"}`}>
                  Mage Armor {data.mageArmorActive ? "(Active)" : ""}
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col items-center rounded border border-dark-border bg-dark-bg/50 py-1">
                  <span className="text-[10px] text-parchment/50 uppercase tracking-wider">Passive Perception</span>
                  <span className="font-serif text-lg font-bold text-gold">{passivePerception}</span>
                </div>
                <button
                  onClick={rollInitiative}
                  className="min-h-[32px] flex-1 rounded bg-dark-border px-2 py-1 text-[10px] text-parchment transition hover:bg-gold-dark"
                  aria-label="Roll Initiative"
                >
                  Initiative (d20{data.stats.DEX.modifier >= 0 ? "+" : ""}{data.stats.DEX.modifier})
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <CounterControl label="Inspiration" value={data.inspiration} min={0} max={2} onChange={(v) => undoableMutate({ inspiration: v })} />
              {data.featsTraits.includes("Lucky") && (
                <CounterControl label="Luck" value={data.luckPoints} min={0} max={3} onChange={(v) => undoableMutate({ luckPoints: v })} />
              )}
            </div>
          </div>
        </UIPanel>

        {data.currentHp === 0 && (
          <DeathSaveTracker data={data} mutate={undoableMutate} onRoll={rollDice} />
        )}

        {/* Ability Scores */}
        <UIPanel variant="box2">
          <h2 className="mb-3 font-serif text-sm text-gold/70">Ability Scores</h2>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {ABILITY_ORDER.map((stat) => (
              <button
                key={stat}
                onClick={() => rollAbility(stat)}
                className="min-h-[44px] rounded border border-dark-border bg-dark-bg p-3 text-center transition hover:border-gold-dark"
                aria-label={`Roll ${stat} check`}
              >
                <div className="text-xs text-parchment/50">{stat}</div>
                <div className="font-serif text-xl text-parchment">{data.stats[stat].value}</div>
                <div className="text-sm text-gold">
                  {data.stats[stat].modifier >= 0 ? "+" : ""}{data.stats[stat].modifier}
                </div>
              </button>
            ))}
          </div>
        </UIPanel>

        {/* Skills */}
        <UIPanel variant="box">
          <h2 className="mb-3 font-serif text-sm text-gold/70">Skills</h2>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {data.skills.map((skill) => (
              <button
                key={skill.name}
                onClick={() => rollSkill(skill.name, skill.modifier)}
                className="flex min-h-[44px] items-center justify-between rounded px-3 py-2 text-left text-sm transition hover:bg-dark-border"
                aria-label={`Roll ${skill.name}`}
              >
                <span className="flex items-center gap-1">
                  {skill.proficient && <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-label="Proficient" />}
                  <span className="text-parchment/80">{skill.name}</span>
                </span>
                <span className="text-gold">{skill.modifier >= 0 ? "+" : ""}{skill.modifier}</span>
              </button>
            ))}
          </div>
        </UIPanel>

        {/* Feats & Traits */}
        {data.featsTraits.length > 0 && (
          <UIPanel variant="dark">
            <h2 className="mb-2 font-serif text-sm text-gold/70">Feats & Traits</h2>
            <ul className="grid grid-cols-2 gap-1 md:grid-cols-3">
              {data.featsTraits.map((feat) => (
                <li key={feat} className="text-sm text-parchment/80">{feat}</li>
              ))}
            </ul>
          </UIPanel>
        )}
      </div>

      {/* Rest Modal */}
      {restType && (
        <RestModal
          type={restType}
          characterData={data}
          onConfirm={restType === "short" ? handleShortRest : handleLongRest}
          onCancel={() => setRestType(null)}
        />
      )}

      {/* Dice Overlay */}
      {currentRoll && (
        <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} />
      )}
    </div>
  );
}
