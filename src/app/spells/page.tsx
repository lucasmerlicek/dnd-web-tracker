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
import {
  SP_TO_SLOT_COST,
  slotToSpGain,
  convertSpToSlot as pureConvertSpToSlot,
  convertSlotToSp as pureConvertSlotToSp,
} from "./sorcery-points";
import SpellCard from "./SpellCard";
import { SPELL_REGISTRY } from "@/data/spell-registry";

export default function SpellsPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const { currentRoll, result, rollDice, dismiss } = useDiceRoll();
  const [warning, setWarning] = useState("");
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null);
  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";

  const cantripCursor = useCursorNavigation({
    itemCount: data?.cantrips.length ?? 0,
  });

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-ff12-text-dim">Loading...</div>;

  const isSorcerer = data.classResources.sorceryPointsMax !== undefined;
  const isWizard = data.classResources.preparedSpells !== undefined;

  const showWarning = (msg: string) => {
    setWarning(msg);
    setTimeout(() => setWarning(""), 2000);
  };

  const handleConvertSpToSlot = (level: string) => {
    const state = {
      currentSorceryPoints: data.classResources.currentSorceryPoints ?? 0,
      sorceryPointsMax: data.classResources.sorceryPointsMax ?? 0,
      currentSlots: data.currentSpellSlots,
    };
    const res = pureConvertSpToSlot(state, level);
    if (!res.success) { showWarning(res.error ?? "Conversion failed"); return; }
    const created = { ...data.createdSpellSlots };
    created[level] = (created[level] ?? 0) + 1;
    mutate({
      classResources: { ...data.classResources, currentSorceryPoints: res.newSorceryPoints },
      currentSpellSlots: res.newSlots,
      createdSpellSlots: created,
    });
  };

  const handleConvertSlotToSp = (level: string) => {
    const state = {
      currentSorceryPoints: data.classResources.currentSorceryPoints ?? 0,
      sorceryPointsMax: data.classResources.sorceryPointsMax ?? 0,
      currentSlots: data.currentSpellSlots,
    };
    const res = pureConvertSlotToSp(state, level);
    if (!res.success) { showWarning(res.error ?? "Conversion failed"); return; }
    mutate({
      classResources: { ...data.classResources, currentSorceryPoints: res.newSorceryPoints },
      currentSpellSlots: res.newSlots,
    });
  };

  const handleToggleSpell = (spellName: string) => {
    setExpandedSpell((prev) => (prev === spellName ? null : spellName));
  };

  // Wizard level = total level - 1 (Fighter 1 / Wizard N)
  const maxPrepared = data.stats.INT.modifier + (data.level - 1);
  const preparedCount = (data.classResources.preparedSpells ?? []).filter(
    s => !(data.classResources.autoPreparedSpells ?? []).includes(s)
  ).length;

  // Build spell level entries for cursor navigation
  const spellLevelEntries = Object.entries(data.spells);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ScreenBackground screen="spells" characterId={characterId} />
      <AmbientEffects screen="spells" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons hasFamiliars={(data?.classResources.familiars?.length ?? 0) > 0} />

        {warning && <div className="rounded bg-ff12-danger/80 px-4 py-2 text-center text-sm text-ff12-text" role="alert">{warning}</div>}

        {data.classResources.innateSorceryActive && (
          <div className="rounded bg-emerald-800/40 px-4 py-2 text-center text-sm text-emerald-400">
            Innate Sorcery Active — Spell attacks have advantage, Save DC +1
          </div>
        )}

        {/* Spell Slots */}
        <UIPanel variant="box1">
          <h2 className="mb-3 text-sm text-gold/70">Spell Slots</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(data.spellSlots).map(([level, max]) => (
              <div key={level} className="text-center">
                <div className="text-xs text-ff12-text-dim">{level}</div>
                <div className="text-lg text-gold">{data.currentSpellSlots[level] ?? 0}/{max}</div>
              </div>
            ))}
          </div>
        </UIPanel>

        {/* Sorcery Points Panel (Sorcerer only) */}
        {isSorcerer && (() => {
          const curSP = data.classResources.currentSorceryPoints ?? 0;
          const maxSP = data.classResources.sorceryPointsMax ?? 0;
          // Only offer conversions for slot levels the character actually has
          // (this naturally enforces the minimum-sorcerer-level requirement).
          const rows = Object.entries(SP_TO_SLOT_COST).filter(
            ([lvl]) => data.spellSlots[lvl] !== undefined
          );
          return (
            <UIPanel variant="fancy">
              <div className="mb-2 flex items-end justify-between">
                <h2 className="text-sm text-gold/70">Sorcery Points · Font of Magic</h2>
                <div className="text-gold">
                  <span className="text-2xl font-bold tabular-nums">{curSP}</span>
                  <span className="text-sm text-ff12-text-dim"> / {maxSP}</span>
                </div>
              </div>

              {/* SP pips */}
              {maxSP > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {Array.from({ length: maxSP }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full transition ${
                        i < curSP ? "bg-gold" : "bg-ff12-panel-light/40 ring-1 ring-ff12-border-dim/40"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Conversion grid */}
              <div className="divide-y divide-ff12-border-dim/30 rounded border border-ff12-border-dim/40">
                <div className="flex items-center justify-between bg-ff12-panel-dark/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-ff12-text-dim">
                  <span>Slot / Available</span>
                  <span>Convert</span>
                </div>
                {rows.map(([lvl, cost]) => {
                  const cur = data.currentSpellSlots[lvl] ?? 0;
                  const max = data.spellSlots[lvl] ?? 0;
                  const gain = slotToSpGain(lvl);
                  return (
                    <div key={lvl} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-sm text-gold">{lvl}</span>
                        <span className="text-sm tabular-nums text-ff12-text-dim">
                          {cur}
                          <span className="text-ff12-text-dim/50">/{max}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleConvertSpToSlot(lvl)}
                          disabled={curSP < cost}
                          title={`Spend ${cost} SP to create a ${lvl} slot`}
                          className="min-h-[36px] rounded bg-ff12-panel-light px-2.5 py-1 text-xs text-ff12-text transition hover:bg-ff12-border-dim disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          + Slot <span className="text-gold/70">(−{cost})</span>
                        </button>
                        <button
                          onClick={() => handleConvertSlotToSp(lvl)}
                          disabled={cur <= 0}
                          title={`Break a ${lvl} slot into ${gain} SP`}
                          className="min-h-[36px] rounded bg-ff12-panel-light px-2.5 py-1 text-xs text-ff12-text transition hover:bg-ff12-border-dim disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          + SP <span className="text-gold/70">(+{gain})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-ff12-text-dim/60">
                Bonus action · break a slot for SP equal to its level · can’t create slots above 5th
              </p>
            </UIPanel>
          );
        })()}

        {/* Spell Preparation Panel (Wizard only) */}
        {isWizard && (
          <UIPanel variant="fancy">
            <h2 className="mb-2 text-sm text-gold/70">
              Spell Preparation
            </h2>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-lg text-gold">
                {preparedCount} / {maxPrepared}
              </span>
              <span className="text-xs text-ff12-text-dim">prepared</span>
            </div>
            {(data.classResources.autoPreparedSpells ?? []).length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-ff12-text-dim/60">Always prepared: </span>
                <span className="text-xs text-gold/60">
                  {(data.classResources.autoPreparedSpells ?? []).join(", ")}
                </span>
              </div>
            )}
          </UIPanel>
        )}

        {/* Cantrips */}
        {data.cantrips.length > 0 && (
          <UIPanel variant="box">
            <h2 className="mb-2 text-sm text-gold/70">Cantrips</h2>
            <div className="space-y-1" {...cantripCursor.containerProps}>
              {data.cantrips.map((c, idx) => (
                <div
                  key={c}
                  {...cantripCursor.getItemProps(idx)}
                  className={`flex items-center gap-2 rounded px-1 py-0.5 transition ${cantripCursor.isActive(idx) ? "bg-white/10" : ""}`}
                >
                  <CursorIndicator visible={cantripCursor.isActive(idx)} />
                  <SpellCard
                    spellName={c}
                    spellLevel="cantrip"
                    spellData={SPELL_REGISTRY[c]}
                    characterData={data}
                    isExpanded={expandedSpell === c}
                    onToggle={() => handleToggleSpell(c)}
                    onRollDice={rollDice}
                    onMutate={mutate}
                    onWarning={showWarning}
                  />
                </div>
              ))}
            </div>
          </UIPanel>
        )}

        {/* Spells by Level */}
        {spellLevelEntries.map(([level, spells]) => {
          return (
            <SpellLevelPanel
              key={level}
              level={level}
              spells={spells}
              expandedSpell={expandedSpell}
              data={data}
              onToggleSpell={handleToggleSpell}
              onRollDice={rollDice}
              onMutate={mutate}
              onWarning={showWarning}
            />
          );
        })}
      </div>
      {currentRoll && <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} characterData={data} onMutate={mutate} />}
    </div>
  );
}

/** Sub-component so each spell level gets its own cursor navigation instance */
function SpellLevelPanel({
  level,
  spells,
  expandedSpell,
  data,
  onToggleSpell,
  onRollDice,
  onMutate,
  onWarning,
}: {
  level: string;
  spells: string[];
  expandedSpell: string | null;
  data: import("@/types/character").CharacterData;
  onToggleSpell: (name: string) => void;
  onRollDice: (roll: import("@/types/dice").DiceRoll) => void;
  onMutate: (partial: Partial<import("@/types/character").CharacterData>) => void;
  onWarning: (msg: string) => void;
}) {
  const cursor = useCursorNavigation({
    itemCount: spells.length,
  });

  return (
    <UIPanel variant="box2">
      <h2 className="mb-2 text-sm text-gold/70">{level} Level</h2>
      <div className="space-y-1" {...cursor.containerProps}>
        {spells.map((spell, idx) => (
          <div
            key={spell}
            {...cursor.getItemProps(idx)}
            className={`flex items-center gap-2 rounded px-1 py-0.5 transition ${cursor.isActive(idx) ? "bg-white/10" : ""}`}
          >
            <CursorIndicator visible={cursor.isActive(idx)} />
            <SpellCard
              spellName={spell}
              spellLevel={level}
              spellData={SPELL_REGISTRY[spell]}
              characterData={data}
              isExpanded={expandedSpell === spell}
              onToggle={() => onToggleSpell(spell)}
              onRollDice={onRollDice}
              onMutate={onMutate}
              onWarning={onWarning}
            />
          </div>
        ))}
      </div>
    </UIPanel>
  );
}
