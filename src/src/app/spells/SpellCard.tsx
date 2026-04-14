"use client";

import { useState } from "react";
import type { SpellData } from "@/types/spell";
import type { CharacterData, SpellCreatedWeapon } from "@/types/character";
import type { DiceRoll, DieSpec } from "@/types/dice";
import { METAMAGIC_OPTIONS, LEVEL_KEYS } from "@/types/spell";
import {
  calcSpellAttackBonus,
  calcSpellSaveDC,
  calcCantripDice,
  calcUpcastDamage,
  canRitualCast,
  consumeSpellSlot,
  applyMetamagic,
  getSpellcastingAbility,
  parseDiceExpression,
} from "./spell-calc";

interface SpellCardProps {
  spellName: string;
  spellLevel: string;
  spellData: SpellData | undefined;
  characterData: CharacterData;
  isExpanded: boolean;
  onToggle: () => void;
  onRollDice: (roll: DiceRoll) => void;
  onMutate: (partial: Partial<CharacterData>) => void;
  onWarning: (msg: string) => void;
}

const VALID_DIE_SIDES = new Set([4, 6, 8, 10, 12, 20]);

function toDieSpec(parsed: { count: number; sides: number }): DieSpec {
  const sides = VALID_DIE_SIDES.has(parsed.sides)
    ? (parsed.sides as DieSpec["sides"])
    : 6;
  return { count: parsed.count, sides };
}

export default function SpellCard({
  spellName,
  spellLevel,
  spellData,
  characterData,
  isExpanded,
  onToggle,
  onRollDice,
  onMutate,
  onWarning,
}: SpellCardProps) {
  const [castLevel, setCastLevel] = useState<number | null>(null);
  const [advantage, setAdvantage] = useState(false);
  const [disadvantage, setDisadvantage] = useState(false);

  const isCantrip = spellLevel === "cantrip";
  const isSorcerer = characterData.classResources.sorceryPointsMax !== undefined;
  const isWizard = characterData.classResources.preparedSpells !== undefined;
  const spellcastingAbility = getSpellcastingAbility(characterData.charClass);
  const currentSP = characterData.classResources.currentSorceryPoints ?? 0;

  // Determine the effective cast level for upcast spells
  const baseLevel = spellData?.level ?? 0;
  const effectiveCastLevel = castLevel ?? baseLevel;

  // Get current damage dice accounting for cantrip scaling and upcasting
  const getEffectiveDamageDice = (): string | undefined => {
    if (!spellData?.damageDice) return undefined;
    if (isCantrip && spellData.cantripScaling) {
      return calcCantripDice(spellData.damageDice, characterData.level);
    }
    if (spellData.upcast && effectiveCastLevel > baseLevel) {
      return calcUpcastDamage(
        spellData.damageDice,
        baseLevel,
        effectiveCastLevel,
        spellData.upcast.perLevel
      );
    }
    return spellData.damageDice;
  };

  // Available levels for upcasting
  const getUpcastLevels = (): number[] => {
    if (!spellData?.upcast || isCantrip || baseLevel === 0) return [];
    const levels: number[] = [];
    for (let lvl = baseLevel; lvl <= 9; lvl++) {
      const key = LEVEL_KEYS[lvl];
      if (key && characterData.spellSlots[key] !== undefined) {
        levels.push(lvl);
      }
    }
    return levels;
  };

  const upcastLevels = getUpcastLevels();
  const effectiveDamage = getEffectiveDamageDice();
  const slotKey = isCantrip ? null : LEVEL_KEYS[effectiveCastLevel];
  const remainingSlots = slotKey ? (characterData.currentSpellSlots[slotKey] ?? 0) : null;

  // --- Handlers ---

  const handleSpellAttack = () => {
    if (!spellData) return;
    const modifier = calcSpellAttackBonus(
      characterData.proficiencyBonus,
      spellcastingAbility,
      characterData.stats
    );
    onRollDice({
      dice: [{ sides: 20, count: 1 }],
      modifier,
      advantage,
      disadvantage,
      label: `${spellName} — Spell Attack`,
    });
  };

  const handleDamageRoll = () => {
    if (!effectiveDamage) return;
    const parsed = parseDiceExpression(effectiveDamage);
    if (!parsed) return;
    const die = toDieSpec(parsed);
    const damageLabel = spellData?.damageType
      ? `${spellName} — ${effectiveDamage} ${spellData.damageType}`
      : `${spellName} — ${effectiveDamage}`;
    onRollDice({
      dice: [die],
      modifier: 0,
      label: damageLabel,
    });
  };

  const handleCast = () => {
    if (isCantrip || !slotKey) return;
    const result = consumeSpellSlot(characterData.currentSpellSlots, slotKey);
    if (!result.success) {
      onWarning(result.error ?? `No ${slotKey} slots remaining!`);
      return;
    }

    const mutations: Partial<CharacterData> = { currentSpellSlots: result.newSlots };

    // If the spell creates a weapon, add it to spellCreatedWeapons
    if (spellData?.createsWeapon) {
      const cw = spellData.createsWeapon;
      let damageDice = cw.damageDice;

      if (cw.upcastDice && effectiveCastLevel > baseLevel) {
        const baseMatch = cw.damageDice.match(/(\d+)d(\d+)/);
        const upMatch = cw.upcastDice.match(/(\d+)d/);
        if (baseMatch && upMatch) {
          const baseCount = parseInt(baseMatch[1]);
          const sides = baseMatch[2];
          const upCount = parseInt(upMatch[1]);
          const additionalDice = (effectiveCastLevel - baseLevel) * upCount;
          damageDice = `${baseCount + additionalDice}d${sides}`;
        }
      }

      const weapon: SpellCreatedWeapon = {
        id: crypto.randomUUID(),
        name: cw.name,
        sourceSpell: spellName,
        castLevel: effectiveCastLevel,
        damageDice,
        damageType: cw.damageType,
        attackStat: cw.attackStat,
        properties: cw.properties,
        magicBonus: 0,
        active: true,
      };

      mutations.spellCreatedWeapons = [
        ...(characterData.spellCreatedWeapons ?? []),
        weapon,
      ];
    }

    onMutate(mutations);
  };

  const handleRitualCast = () => {
    // Ritual cast does NOT consume a spell slot — just a visual confirmation
    onWarning(`${spellName} cast as ritual (no slot consumed)`);
  };

  const handleMetamagic = (option: "empowered" | "quickened") => {
    const result = applyMetamagic(option, currentSP);
    if (!result.success) {
      onWarning(result.error ?? "Insufficient sorcery points");
      return;
    }
    onMutate({
      classResources: {
        ...characterData.classResources,
        currentSorceryPoints: result.newSP,
      },
    });
  };

  // --- Wizard prepared state ---
  const isPrepared = isWizard
    ? (characterData.classResources.preparedSpells ?? []).includes(spellName)
    : false;
  const isAutoPrepared = isWizard
    ? (characterData.classResources.autoPreparedSpells ?? []).includes(spellName)
    : false;

  // Can this character ritual-cast this spell?
  const showRitual =
    spellData?.ritual === true &&
    canRitualCast(
      spellData,
      characterData.charClass,
      characterData.classResources.preparedSpells ?? [],
      spellName
    );

  // --- Render ---

  return (
    <div className="rounded border border-dark-border/50 bg-dark-border/20">
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-dark-border/40"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-parchment">{spellName}</span>
          {!isCantrip && (
            <span className="rounded bg-dark-border px-1.5 py-0.5 text-[10px] text-gold/70">
              {spellLevel}
            </span>
          )}
          {isCantrip && (
            <span className="rounded bg-dark-border px-1.5 py-0.5 text-[10px] text-parchment/50">
              cantrip
            </span>
          )}
          {spellData?.ritual && (
            <span className="rounded bg-gold/20 px-1 py-0.5 text-[10px] font-bold text-gold">
              R
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isWizard && !isCantrip && (
            <span className={`text-[10px] ${isAutoPrepared ? "text-gold/60" : isPrepared ? "text-gold" : "text-parchment/30"}`}>
              {isAutoPrepared ? "Auto" : isPrepared ? "Prepared" : ""}
            </span>
          )}
          <span className="text-xs text-parchment/30">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && spellData && (
        <div className="border-t border-dark-border/30 px-3 pb-3 pt-2">
          {/* Metadata header */}
          <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-parchment/50">
            <span>{spellData.school}</span>
            <span>{spellData.castingTime}</span>
            <span>{spellData.range}</span>
            <span>
              {[
                spellData.components.verbal && "V",
                spellData.components.somatic && "S",
                spellData.components.material && "M",
              ]
                .filter(Boolean)
                .join(", ")}
              {spellData.components.material && spellData.components.materialDescription && (
                <> ({spellData.components.materialDescription})</>
              )}
            </span>
            <span>{spellData.duration}</span>
          </div>

          {/* Description */}
          <p className="mb-3 text-xs leading-relaxed text-parchment/70">
            {spellData.description}
          </p>

          {/* Upcast description */}
          {spellData.upcastDescription && (
            <p className="mb-3 text-xs leading-relaxed text-gold/70 italic">
              <span className="font-semibold not-italic">At Higher Levels: </span>
              {spellData.upcastDescription}
            </p>
          )}

          {/* Damage dice display (for reference) */}
          {effectiveDamage && (
            <div className="mb-2 text-xs text-parchment/50">
              Damage: <span className="text-gold">{effectiveDamage}</span>
              {spellData.damageType && (
                <span className="ml-1 text-parchment/40">{spellData.damageType}</span>
              )}
            </div>
          )}

          {/* Save DC badge */}
          {spellData.saveType && (
            <div className="mb-2">
              <span className="rounded bg-dark-border px-2 py-1 text-xs font-bold text-gold">
                DC{" "}
                {calcSpellSaveDC(
                  characterData.proficiencyBonus,
                  spellcastingAbility,
                  characterData.stats
                )}{" "}
                {spellData.saveType}
              </span>
            </div>
          )}

          {/* Level selector for upcasting */}
          {upcastLevels.length > 1 && (
            <div className="mb-2 flex items-center gap-2">
              <label className="text-xs text-parchment/50">Cast at:</label>
              <select
                value={effectiveCastLevel}
                onChange={(e) => setCastLevel(Number(e.target.value))}
                className="rounded bg-dark-border px-2 py-1 text-xs text-parchment"
              >
                {upcastLevels.map((lvl) => {
                  const key = LEVEL_KEYS[lvl];
                  const slots = characterData.currentSpellSlots[key] ?? 0;
                  return (
                    <option key={lvl} value={lvl} disabled={slots === 0}>
                      {key} ({slots} slots)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Remaining slots display */}
          {!isCantrip && remainingSlots !== null && (
            <div className="mb-2 text-xs text-parchment/40">
              Slots remaining ({slotKey}): <span className="text-gold">{remainingSlots}</span>
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex flex-wrap gap-2">
            {/* Spell Attack button */}
            {spellData.attackRoll && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSpellAttack}
                  className="min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-parchment hover:bg-gold-dark"
                >
                  Spell Attack
                </button>
                <label className="flex items-center gap-1 text-[10px] text-parchment/50">
                  <input
                    type="checkbox"
                    checked={advantage}
                    onChange={(e) => {
                      setAdvantage(e.target.checked);
                      if (e.target.checked) setDisadvantage(false);
                    }}
                    className="h-3 w-3"
                  />
                  Adv
                </label>
                <label className="flex items-center gap-1 text-[10px] text-parchment/50">
                  <input
                    type="checkbox"
                    checked={disadvantage}
                    onChange={(e) => {
                      setDisadvantage(e.target.checked);
                      if (e.target.checked) setAdvantage(false);
                    }}
                    className="h-3 w-3"
                  />
                  Dis
                </label>
              </div>
            )}

            {/* Damage button */}
            {effectiveDamage && (
              <button
                onClick={handleDamageRoll}
                className="min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-parchment hover:bg-gold-dark"
              >
                Damage ({effectiveDamage})
              </button>
            )}

            {/* Ritual Cast button */}
            {showRitual && (
              <button
                onClick={handleRitualCast}
                className="min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-gold hover:bg-gold-dark"
              >
                Cast as Ritual
              </button>
            )}

            {/* Cast button (leveled spells only) */}
            {!isCantrip && (
              <button
                onClick={handleCast}
                disabled={remainingSlots === 0}
                className={`min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-parchment hover:bg-gold-dark ${
                  remainingSlots === 0 ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                Cast ({slotKey})
              </button>
            )}
          </div>

          {/* Metamagic row — Sorcerer only */}
          {isSorcerer && (
            <div className="mt-2 border-t border-dark-border/30 pt-2">
              <div className="mb-1 text-[10px] text-parchment/40">
                Metamagic — SP: <span className="text-gold">{currentSP}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Empowered Spell — on damage spells */}
                {spellData.damageDice && (
                  <button
                    onClick={() => handleMetamagic("empowered")}
                    disabled={currentSP < METAMAGIC_OPTIONS.empowered.cost}
                    className={`min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-parchment hover:bg-gold-dark ${
                      currentSP < METAMAGIC_OPTIONS.empowered.cost
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    Empowered Spell ({METAMAGIC_OPTIONS.empowered.cost} SP)
                  </button>
                )}

                {/* Quickened Spell — on 1-action spells */}
                {spellData.castingTime === "1 action" && (
                  <button
                    onClick={() => handleMetamagic("quickened")}
                    disabled={currentSP < METAMAGIC_OPTIONS.quickened.cost}
                    className={`min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-parchment hover:bg-gold-dark ${
                      currentSP < METAMAGIC_OPTIONS.quickened.cost
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    Quickened Spell ({METAMAGIC_OPTIONS.quickened.cost} SP)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded but no spell data */}
      {isExpanded && !spellData && (
        <div className="border-t border-dark-border/30 px-3 py-2 text-xs text-parchment/40">
          No spell data available in registry.
        </div>
      )}
    </div>
  );
}
