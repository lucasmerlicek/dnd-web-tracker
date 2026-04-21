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

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-parchment/50">Loading...</div>;

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
  const preparedCount = (data.classResources.preparedSpells ?? []).length;

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="spells" characterId={characterId} />
      <AmbientEffects screen="spells" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons hasFamiliars={(data?.classResources.familiars?.length ?? 0) > 0} />

        {warning && <div className="rounded bg-crimson/80 px-4 py-2 text-center text-sm text-parchment" role="alert">{warning}</div>}

        {/* Spell Slots */}
        <UIPanel variant="box1">
          <h2 className="mb-3 font-serif text-sm text-gold/70">Spell Slots</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(data.spellSlots).map(([level, max]) => (
              <div key={level} className="text-center">
                <div className="text-xs text-parchment/50">{level}</div>
                <div className="font-serif text-lg text-gold">{data.currentSpellSlots[level] ?? 0}/{max}</div>
              </div>
            ))}
          </div>
        </UIPanel>

        {/* Sorcery Points Panel (Sorcerer only) */}
        {isSorcerer && (
          <UIPanel variant="fancy">
            <h2 className="mb-3 font-serif text-sm text-gold/70">Sorcery Points</h2>
            <div className="mb-3 font-serif text-lg text-gold">
              {data.classResources.currentSorceryPoints} / {data.classResources.sorceryPointsMax}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SP_TO_SLOT_COST).map(([level, cost]) => (
                <div key={level} className="flex gap-1">
                  <button onClick={() => handleConvertSpToSlot(level)} className="min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-parchment hover:bg-gold-dark">
                    {cost} SP → {level} slot
                  </button>
                  <button onClick={() => handleConvertSlotToSp(level)} className="min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-parchment hover:bg-gold-dark">
                    {level} slot → {slotToSpGain(level)} SP
                  </button>
                </div>
              ))}
            </div>
          </UIPanel>
        )}

        {/* Spell Preparation Panel (Wizard only) */}
        {isWizard && (
          <UIPanel variant="fancy">
            <h2 className="mb-2 font-serif text-sm text-gold/70">
              Spell Preparation
            </h2>
            <div className="mb-3 flex items-center gap-3">
              <span className="font-serif text-lg text-gold">
                {preparedCount} / {maxPrepared}
              </span>
              <span className="text-xs text-parchment/50">prepared</span>
            </div>
            {(data.classResources.autoPreparedSpells ?? []).length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-parchment/40">Always prepared: </span>
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
            <h2 className="mb-2 font-serif text-sm text-gold/70">Cantrips</h2>
            <div className="space-y-1">
              {data.cantrips.map((c) => (
                <SpellCard
                  key={c}
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
              ))}
            </div>
          </UIPanel>
        )}

        {/* Spells by Level */}
        {Object.entries(data.spells).map(([level, spells]) => (
          <UIPanel key={level} variant="box2">
            <h2 className="mb-2 font-serif text-sm text-gold/70">{level} Level</h2>
            <div className="space-y-1">
              {spells.map((spell) => (
                <SpellCard
                  key={spell}
                  spellName={spell}
                  spellLevel={level}
                  spellData={SPELL_REGISTRY[spell]}
                  characterData={data}
                  isExpanded={expandedSpell === spell}
                  onToggle={() => handleToggleSpell(spell)}
                  onRollDice={rollDice}
                  onMutate={mutate}
                  onWarning={showWarning}
                />
              ))}
            </div>
          </UIPanel>
        ))}
      </div>
      {currentRoll && <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} />}
    </div>
  );
}
