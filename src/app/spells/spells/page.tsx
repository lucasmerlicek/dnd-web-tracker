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
import type { DieSpec } from "@/types";
import {
  SP_TO_SLOT_COST,
  slotToSpGain,
  convertSpToSlot as pureConvertSpToSlot,
  convertSlotToSp as pureConvertSlotToSp,
} from "./sorcery-points";

const COMMON_SPELL_DICE: { label: string; dice: DieSpec[]; modifier: number }[] = [
  { label: "1d4", dice: [{ sides: 4, count: 1 }], modifier: 0 },
  { label: "1d6", dice: [{ sides: 6, count: 1 }], modifier: 0 },
  { label: "1d8", dice: [{ sides: 8, count: 1 }], modifier: 0 },
  { label: "1d10", dice: [{ sides: 10, count: 1 }], modifier: 0 },
  { label: "1d12", dice: [{ sides: 12, count: 1 }], modifier: 0 },
  { label: "2d6", dice: [{ sides: 6, count: 2 }], modifier: 0 },
  { label: "2d8", dice: [{ sides: 8, count: 2 }], modifier: 0 },
  { label: "2d10", dice: [{ sides: 10, count: 2 }], modifier: 0 },
  { label: "3d6", dice: [{ sides: 6, count: 3 }], modifier: 0 },
  { label: "3d8", dice: [{ sides: 8, count: 3 }], modifier: 0 },
  { label: "4d6", dice: [{ sides: 6, count: 4 }], modifier: 0 },
  { label: "4d10", dice: [{ sides: 10, count: 4 }], modifier: 0 },
];

export default function SpellsPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const { currentRoll, result, rollDice, dismiss } = useDiceRoll();
  const [warning, setWarning] = useState("");
  const [selectedSpell, setSelectedSpell] = useState<{ name: string; level: string } | null>(null);
  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";

  const cantripCursor = useCursorNavigation({
    itemCount: data?.cantrips.length ?? 0,
    columns: 4,
  });

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-ff12-text-dim">Loading...</div>;

  const isSorcerer = data.classResources.sorceryPointsMax !== undefined;
  const isWizard = data.classResources.preparedSpells !== undefined;

  const showWarning = (msg: string) => {
    setWarning(msg);
    setTimeout(() => setWarning(""), 2000);
  };

  const castSpell = (level: string) => {
    const current = data.currentSpellSlots[level] ?? 0;
    if (current <= 0) { showWarning(`No ${level} slots remaining!`); return; }
    mutate({ currentSpellSlots: { ...data.currentSpellSlots, [level]: current - 1 } });
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

  const togglePrepared = (spell: string) => {
    const prepared = data.classResources.preparedSpells ?? [];
    const auto = data.classResources.autoPreparedSpells ?? [];
    if (auto.includes(spell)) return;
    const updated = prepared.includes(spell) ? prepared.filter((s) => s !== spell) : [...prepared, spell];
    mutate({ classResources: { ...data.classResources, preparedSpells: updated } });
  };

  // Wizard level = total level - 1 (Fighter 1 / Wizard N)
  const maxPrepared = data.stats.INT.modifier + (data.level - 1);
  const preparedCount = (data.classResources.preparedSpells ?? []).length;

  // Build spell level entries for cursor navigation
  const spellLevelEntries = Object.entries(data.spells);

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="spells" characterId={characterId} />
      <AmbientEffects screen="spells" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons />

        {warning && <div className="rounded bg-ff12-danger/80 px-4 py-2 text-center text-sm text-ff12-text" role="alert">{warning}</div>}

        {/* Spell Slots */}
        <UIPanel variant="box1">
          <h2 className="mb-3 text-sm text-gold/70">Spell Slots</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(data.spellSlots).map(([level, max]) => (
              <div key={level} className="text-center">
                <div className="text-xs text-ff12-text-dim">{level}</div>
                <div className="text-lg text-gold">{data.currentSpellSlots[level] ?? 0}/{max}</div>
                <button onClick={() => castSpell(level)} className="mt-1 min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim">Cast</button>
              </div>
            ))}
          </div>
        </UIPanel>

        {/* Spell Damage Roller */}
        <UIPanel variant="box2">
          <h2 className="mb-3 text-sm text-gold/70">Spell Damage Roll</h2>
          <div className="flex flex-wrap gap-2">
            {COMMON_SPELL_DICE.map((d) => (
              <button
                key={d.label}
                onClick={() => rollDice({ dice: d.dice, modifier: d.modifier, label: `Spell Damage (${d.label})` })}
                className="min-h-[44px] rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-border-dim"
              >
                {d.label}
              </button>
            ))}
          </div>
        </UIPanel>

        {/* Sorcery Points Panel (Madea only) */}
        {isSorcerer && (
          <UIPanel variant="fancy">
            <h2 className="mb-3 text-sm text-gold/70">Sorcery Points</h2>
            <div className="mb-3 text-lg text-gold">
              {data.classResources.currentSorceryPoints} / {data.classResources.sorceryPointsMax}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SP_TO_SLOT_COST).map(([level, cost]) => (
                <div key={level} className="flex gap-1">
                  <button onClick={() => handleConvertSpToSlot(level)} className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim">
                    {cost} SP → {level} slot
                  </button>
                  <button onClick={() => handleConvertSlotToSp(level)} className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim">
                    {level} slot → {slotToSpGain(level)} SP
                  </button>
                </div>
              ))}
            </div>
          </UIPanel>
        )}

        {/* Spell Preparation Panel (Ramil only) */}
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
            <div className="flex flex-wrap gap-2" {...cantripCursor.containerProps}>
              {data.cantrips.map((c, idx) => (
                <div
                  key={c}
                  {...cantripCursor.getItemProps(idx)}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-sm transition ${selectedSpell?.name === c ? "bg-gold/20 text-gold" : cantripCursor.isActive(idx) ? "bg-white/10 text-ff12-text" : "bg-ff12-panel-light text-ff12-text hover:bg-ff12-panel-light/80"}`}
                >
                  <CursorIndicator visible={cantripCursor.isActive(idx)} />
                  <IconImage type="spell" name={c} size={24} />
                  {c}
                </div>
              ))}
            </div>
          </UIPanel>
        )}

        {/* Spell Detail View */}
        {selectedSpell && (
          <UIPanel variant="dark">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base text-gold">{selectedSpell.name}</h3>
                <p className="text-xs text-ff12-text-dim">
                  {selectedSpell.level === "cantrip" ? "Cantrip" : `${selectedSpell.level} Level`}
                </p>
              </div>
              <button onClick={() => setSelectedSpell(null)} className="text-xs text-ff12-text-dim/60 hover:text-ff12-text">✕</button>
            </div>
          </UIPanel>
        )}

        {/* Spells by Level */}
        {spellLevelEntries.map(([level, spells]) => (
          <AltSpellLevelPanel
            key={level}
            level={level}
            spells={spells}
            selectedSpell={selectedSpell}
            setSelectedSpell={setSelectedSpell}
            isWizard={isWizard}
            data={data}
            togglePrepared={togglePrepared}
          />
        ))}
      </div>
      {currentRoll && <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} />}
    </div>
  );
}

/** Sub-component so each spell level gets its own cursor navigation instance */
function AltSpellLevelPanel({
  level,
  spells,
  selectedSpell,
  setSelectedSpell,
  isWizard,
  data,
  togglePrepared,
}: {
  level: string;
  spells: string[];
  selectedSpell: { name: string; level: string } | null;
  setSelectedSpell: (s: { name: string; level: string } | null) => void;
  isWizard: boolean;
  data: import("@/types/character").CharacterData;
  togglePrepared: (spell: string) => void;
}) {
  const cursor = useCursorNavigation({
    itemCount: spells.length,
  });

  return (
    <UIPanel variant="box2">
      <h2 className="mb-2 text-sm text-gold/70">{level} Level</h2>
      <div className="space-y-1" {...cursor.containerProps}>
        {spells.map((spell, idx) => {
          const isPrepared = (data.classResources.preparedSpells ?? []).includes(spell);
          const isAuto = (data.classResources.autoPreparedSpells ?? []).includes(spell);
          const isSelected = selectedSpell?.name === spell;
          return (
            <div
              key={spell}
              {...cursor.getItemProps(idx)}
              className={`flex items-center justify-between rounded px-2 py-1 cursor-pointer transition ${isSelected ? "bg-gold/10" : cursor.isActive(idx) ? "bg-white/10" : "hover:bg-ff12-panel-light"}`}
            >
              <div className="flex items-center gap-2">
                <CursorIndicator visible={cursor.isActive(idx)} />
                <IconImage type="spell" name={spell} size={24} />
                <span className={`text-sm ${isSelected ? "text-gold" : "text-ff12-text/80"}`}>{spell}</span>
              </div>
              <div className="flex items-center gap-2">
                {isWizard && (
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePrepared(spell); }}
                    disabled={isAuto}
                    className={`text-xs ${isPrepared || isAuto ? "text-gold" : "text-ff12-text-dim/30"} ${isAuto ? "cursor-default" : "hover:text-gold-light"}`}
                  >
                    {isAuto ? "Auto" : isPrepared ? "Prepared" : "Prepare"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </UIPanel>
  );
}
