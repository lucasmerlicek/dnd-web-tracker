"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useDiceRoll } from "@/hooks/useDiceRoll";
import { useUndoStack } from "@/hooks/useUndoStack";
import { useCursorNavigation } from "@/hooks/useCursorNavigation";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import CounterControl from "@/components/ui/CounterControl";
import DiceResultOverlay from "@/components/ui/DiceResultOverlay";
import DeathSaveTracker from "@/components/dashboard/DeathSaveTracker";
import RestModal from "@/components/ui/RestModal";
import CursorIndicator from "@/components/ui/CursorIndicator";
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

  const ABILITY_ORDER: AbilityName[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

  const rollAbilityAtIndex = (index: number) => {
    if (!data) return;
    const stat = ABILITY_ORDER[index];
    rollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier: data.stats[stat].modifier,
      label: `${stat} Check`,
    });
  };

  const rollSkillAtIndex = (index: number) => {
    if (!data) return;
    const skill = data.skills[index];
    rollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier: skill.modifier,
      label: `${skill.name}`,
    });
  };

  const abilityCursor = useCursorNavigation({
    itemCount: ABILITY_ORDER.length,
    columns: 6,
    onActivate: rollAbilityAtIndex,
  });

  const skillsCursor = useCursorNavigation({
    itemCount: data?.skills.length ?? 0,
    columns: 3,
    onActivate: rollSkillAtIndex,
  });

  if (loading || !data) {
    return <div className="flex min-h-screen items-center justify-center text-ff12-text-dim">Loading...</div>;
  }

  // Compute AC from current state including gear bonuses
  const gearAcBonuses = data.inventoryItems
    ? [getEquippedAcBonus(data.inventoryItems.gear)]
    : [];
  const computedAC = calculateAC({
    defaultBaseAc: data.defaultBaseAc,
    dexModifier: data.stats.DEX.modifier,
    mageArmorActive: data.mageArmorActive,
    shieldActive: data.shieldActive,
    bladesongActive: data.classResources.bladesongActive ?? false,
    intModifier: data.stats.INT.modifier,
    gearAcBonuses,
  });

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

  const handleShortRest = (hitDiceToSpend?: number, poolSelections?: PoolSelections, useSorcerousRestoration?: boolean) => {
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

    // Sorcerous Restoration — only when opted in
    if (useSorcerousRestoration && data.classResources.sorceryPointsMax !== undefined && !data.classResources.sorcerousRestorationUsed) {
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
      // AC includes gear bonuses even after long rest (all toggles deactivated)
      ...(() => {
        const restGearAcBonuses = data.inventoryItems
          ? [getEquippedAcBonus(data.inventoryItems.gear)]
          : [];
        const restAC = calculateAC({
          defaultBaseAc: data.defaultBaseAc,
          dexModifier: data.stats.DEX.modifier,
          mageArmorActive: false,
          shieldActive: false,
          bladesongActive: false,
          intModifier: data.stats.INT.modifier,
          gearAcBonuses: restGearAcBonuses,
        });
        return { ac: restAC.ac };
      })(),
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
              <h1 className="text-2xl text-gold">{data.characterName}</h1>
              <p className="text-sm text-ff12-text-dim">{data.race} · {data.charClass} · Level {data.level}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRestType("short")} className="min-h-[44px] rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-border-dim">Short Rest</button>
              <button onClick={() => setRestType("long")} className="min-h-[44px] rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-border-dim">Long Rest</button>
            </div>
          </div>
        </UIPanel>

        {/* HP and Resources */}
        <UIPanel variant="box1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* LEFT column: AC, toggles, passive perception, initiative, class badges */}
            <div className="space-y-2">
              <div className="flex flex-col items-center justify-center py-2">
                <span className="text-xs text-ff12-text-dim uppercase tracking-wider">Armor Class</span>
                <span className="text-4xl font-bold tabular-nums text-gold">{computedAC.ac}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={toggleShield} className={`min-h-[32px] flex-1 rounded px-2 py-1 text-[10px] transition ${data.shieldActive ? "bg-ff12-border-dim text-ff12-text" : "bg-ff12-panel-light text-ff12-text-dim hover:bg-ff12-border-dim"}`}>
                  Shield {data.shieldActive ? "(Active)" : ""}
                </button>
                <button onClick={toggleMageArmor} className={`min-h-[32px] flex-1 rounded px-2 py-1 text-[10px] transition ${data.mageArmorActive ? "bg-ff12-border-dim text-ff12-text" : "bg-ff12-panel-light text-ff12-text-dim hover:bg-ff12-border-dim"}`}>
                  Mage Armor {data.mageArmorActive ? "(Active)" : ""}
                </button>
              </div>
              <div className="flex flex-col items-center rounded border border-ff12-border-dim bg-ff12-panel-dark/50 py-1">
                <span className="text-[10px] text-ff12-text-dim uppercase tracking-wider">Passive Perception</span>
                <span className="text-lg font-bold tabular-nums text-gold">{passivePerception}</span>
              </div>
              <button
                onClick={rollInitiative}
                className="min-h-[32px] w-full rounded bg-ff12-panel-light px-2 py-1 text-[10px] text-ff12-text transition hover:bg-ff12-border-dim"
                aria-label="Roll Initiative"
              >
                Initiative
              </button>
              {data.classResources.bladesongActive && (
                <div className="flex justify-center">
                  <span className="rounded bg-ff12-select/20 px-2 py-0.5 text-xs text-ff12-select">Bladesong</span>
                </div>
              )}
              {data.classResources.ravenFormActive && (
                <div className="flex justify-center">
                  <span className="rounded bg-ff12-panel-light px-2 py-0.5 text-xs text-ff12-text-dim">Raven Form</span>
                </div>
              )}
            </div>
            {/* CENTER column: HP bar (prominent), damage/heal controls */}
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-ff12-text-dim">HP</span>
                <span className="text-2xl tabular-nums text-gold">{data.currentHp} / {data.maxHp}</span>
              </div>
              <div className="h-5 overflow-hidden rounded-full bg-ff12-panel-light">
                <div className="h-full rounded-full bg-gradient-to-r from-ff12-hp-start to-ff12-hp-end transition-all" style={{ width: `${(data.currentHp / data.maxHp) * 100}%` }} />
              </div>
              <div className="mt-3 flex justify-center gap-2">
                <input
                  type="number"
                  value={dmgHealValue}
                  onChange={(e) => setDmgHealValue(e.target.value)}
                  placeholder="Amount"
                  className="w-20 rounded border border-ff12-border-dim bg-ff12-panel-dark px-2 py-2 text-sm text-ff12-text"
                  aria-label="Damage or healing amount"
                />
                <button onClick={applyDamage} className="min-h-[44px] rounded bg-ff12-danger/40 px-3 py-2 text-xs text-ff12-text hover:bg-ff12-danger/60">Damage</button>
                <button onClick={applyHealing} className="min-h-[44px] rounded bg-green-800/40 px-3 py-2 text-xs text-ff12-text hover:bg-green-800/60">Heal</button>
              </div>
            </div>
            {/* RIGHT column: Inspiration, Luck */}
            <div className="space-y-2">
              <CounterControl label="Inspiration" value={data.inspiration} min={0} max={2} onChange={(v) => undoableMutate({ inspiration: v })} />
              {data.featsTraits.some(f => f.includes("Lucky")) && (
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
          <h2 className="mb-3 text-sm text-ff12-text-dim">Ability Scores</h2>
          <div {...abilityCursor.containerProps} className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {ABILITY_ORDER.map((stat, index) => (
              <button
                key={stat}
                {...abilityCursor.getItemProps(index)}
                onClick={() => rollAbility(stat)}
                className={`min-h-[44px] rounded border border-ff12-border-dim bg-ff12-panel-dark p-3 text-center transition hover:border-ff12-border ${abilityCursor.isActive(index) ? "bg-white/10" : ""}`}
                aria-label={`Roll ${stat} check`}
              >
                <div className="flex items-center justify-center gap-1">
                  <CursorIndicator visible={abilityCursor.isActive(index)} />
                  <span className="text-xs text-ff12-text-dim">{stat}</span>
                </div>
                <div className="text-xl tabular-nums text-ff12-text">{data.stats[stat].value}</div>
                <div className="text-sm tabular-nums text-gold">
                  {data.stats[stat].modifier >= 0 ? "+" : ""}{data.stats[stat].modifier}
                </div>
              </button>
            ))}
          </div>
        </UIPanel>

        {/* Skills */}
        <UIPanel variant="box">
          <h2 className="mb-3 text-sm text-ff12-text-dim">Skills</h2>
          <div {...skillsCursor.containerProps} className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {data.skills.map((skill, index) => (
              <button
                key={skill.name}
                {...skillsCursor.getItemProps(index)}
                onClick={() => rollSkill(skill.name, skill.modifier)}
                className={`flex min-h-[44px] items-center justify-between rounded px-3 py-2 text-left text-sm transition hover:bg-white/10 ${skillsCursor.isActive(index) ? "bg-white/10" : ""}`}
                aria-label={`Roll ${skill.name}`}
              >
                <span className="flex items-center gap-1">
                  <CursorIndicator visible={skillsCursor.isActive(index)} />
                  {skill.proficient && <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-label="Proficient" />}
                  <span className="text-ff12-text/80">{skill.name}</span>
                </span>
                <span className="tabular-nums text-gold">{skill.modifier >= 0 ? "+" : ""}{skill.modifier}</span>
              </button>
            ))}
          </div>
        </UIPanel>

        {/* Feats & Traits */}
        {data.featsTraits.length > 0 && (
          <UIPanel variant="dark">
            <h2 className="mb-2 text-sm text-ff12-text-dim">Feats & Traits</h2>
            <ul className="grid grid-cols-2 gap-1 md:grid-cols-3">
              {data.featsTraits.map((feat) => (
                <li key={feat} className="text-sm text-ff12-text/80">{feat}</li>
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
