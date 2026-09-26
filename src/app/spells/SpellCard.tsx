"use client";

import { useState, useEffect, useRef } from "react";
import type { SpellData } from "@/types/spell";
import type { CharacterData, SpellCreatedWeapon } from "@/types/character";
import type { DiceRoll, DieSpec } from "@/types/dice";
import { METAMAGIC_OPTIONS, LEVEL_KEYS, type MetamagicOption } from "@/types/spell";
import IconImage from "@/components/ui/IconImage";
import {
  calcSpellAttackBonus,
  calcSpellSaveDC,
  calcCantripDice,
  calcUpcastDamage,
  canRitualCast,
  consumeSpellSlot,
  applyMetamagic,
  canExtend,
  canHeighten,
  getSpellcastingAbility,
  parseDiceExpression,
} from "./spell-calc";
import { createFamiliar } from "@/lib/familiar-logic";
import { getCmeBonusDice, cmeLabelSuffix } from "@/lib/cme";
import { castContingency, contingencyBindLevels } from "@/lib/contingency";

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
  /** Number of non-auto prepared spells currently selected (Wizard only). */
  preparedCount?: number;
  /** Maximum number of spells that can be prepared (Wizard only). */
  maxPrepared?: number;
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
  preparedCount = 0,
  maxPrepared = 0,
}: SpellCardProps) {
  const [castLevel, setCastLevel] = useState<number | null>(null);
  const isContingency = spellName === "Contingency";
  const [contingencyBoundLevel, setContingencyBoundLevel] = useState<string>("");
  const [darknessSeeThrough, setDarknessSeeThrough] = useState(false);
  const cr = characterData.classResources;
  const innateSorceryActive = cr.innateSorceryActive ?? false;
  const hasAttackRoll = spellData?.attackRoll === true;
  const [advantage, setAdvantage] = useState(
    hasAttackRoll ? innateSorceryActive : false
  );
  const [disadvantage, setDisadvantage] = useState(false);
  const manualAdvantage = useRef(false);

  // Sync advantage when Innate Sorcery toggles
  useEffect(() => {
    if (!hasAttackRoll) return;
    if (innateSorceryActive) {
      setAdvantage(true);
    } else if (!manualAdvantage.current) {
      setAdvantage(false);
    }
  }, [innateSorceryActive, hasAttackRoll]);

  const isCantrip = spellLevel === "cantrip";
  // Winter's Clutches note is only relevant to whoever has the gloves equipped.
  const hasWintersClutches = (characterData.inventoryItems?.gear ?? []).some(
    (g) => g.equipped && /winter'?s? clu?t?ches/i.test(g.name)
  );
  const isSorcerer = characterData.classResources.sorceryPointsMax !== undefined;
  const isWizard = characterData.classResources.preparedSpells !== undefined;
  const spellcastingAbility = getSpellcastingAbility(characterData.charClass);
  const currentSP = characterData.classResources.currentSorceryPoints ?? 0;

  // Free cast system for Druid Initiate / Fey Touched spells.
  // Each entry is gated to the character whose feat grants the free cast,
  // so feat-specific free casts don't bleed across characters:
  //   - Fey Touched (Bane, Misty Step) → Madea (Sorcerer)
  //   - Druid Initiate (Charm Person)  → Ramil (Wizard)
  const freeCastMap: Record<
    string,
    { flag: keyof typeof characterData.classResources; eligible: boolean }
  > = {
    "Charm Person": { flag: "druidCharmPersonUsed", eligible: isWizard },
    "Bane": { flag: "feyBaneUsed", eligible: isSorcerer },
    "Misty Step": { flag: "feyMistyStepUsed", eligible: isSorcerer },
  };
  const freeCastEntry = freeCastMap[spellName];
  const freeCastFlag = freeCastEntry?.eligible ? freeCastEntry.flag : undefined;
  const freeCastUsed = freeCastFlag ? (characterData.classResources[freeCastFlag] as boolean ?? false) : false;
  const hasFreeCast = freeCastFlag !== undefined;

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
    const dice = [die];
    // Conjure Minor Elementals adds bonus elemental dice to spell *attacks*
    // (attack-roll spells), not save-based spells.
    const cmeDie = hasAttackRoll ? getCmeBonusDice(cr) : null;
    if (cmeDie) dice.push(cmeDie);
    const baseLabel = spellData?.damageType
      ? `${spellName} — ${effectiveDamage} ${spellData.damageType}`
      : `${spellName} — ${effectiveDamage}`;
    onRollDice({
      dice,
      modifier: 0,
      label: baseLabel + (cmeDie ? cmeLabelSuffix(cr) : ""),
    });
  };

  // Contingency: bound-spell levels the character has (5th or lower).
  const contingencyLevels = isContingency ? contingencyBindLevels(characterData.spellSlots) : [];
  const effectiveBoundLevel =
    contingencyBoundLevel ||
    contingencyLevels.find((l) => (characterData.currentSpellSlots[l] ?? 0) > 0) ||
    contingencyLevels[0] ||
    "";

  const handleCastContingency = () => {
    const result = castContingency(characterData.currentSpellSlots, effectiveBoundLevel);
    if (!result.success) {
      onWarning(result.error ?? "Cannot cast Contingency");
      return;
    }
    onMutate({ currentSpellSlots: result.newSlots });
    onWarning(`Contingency cast (6th + ${effectiveBoundLevel} slot expended)`);
  };

  const handleCast = () => {
    if (isContingency) {
      handleCastContingency();
      return;
    }
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

    // Auto-toggle Shield when cast
    if (spellName === "Shield" && !characterData.shieldActive) {
      mutations.shieldActive = true;
    }
    // Auto-toggle Mage Armor when cast
    if (spellName === "Mage Armor" && !characterData.mageArmorActive) {
      mutations.mageArmorActive = true;
    }
    // Auto-activate Conjure Minor Elementals when cast; scale the bonus dice with
    // the slot level (2d8 at 4th, +1d8 per slot level above 4).
    if (spellName === "Conjure Minor Elementals") {
      const bonusCount = 2 + Math.max(0, effectiveCastLevel - 4);
      mutations.classResources = {
        ...(mutations.classResources ?? characterData.classResources),
        cmeActive: true,
        cmeDice: `${bonusCount}d8`,
      };
    }

    onMutate(mutations);
  };

  const handleRitualCast = () => {
    // Ritual cast does NOT consume a spell slot — just a visual confirmation
    onWarning(`${spellName} cast as ritual (no slot consumed)`);
  };

  const handleFreeCast = () => {
    if (!freeCastFlag || freeCastUsed) return;
    const mutations: Partial<CharacterData> = {
      classResources: {
        ...characterData.classResources,
        [freeCastFlag]: true,
      },
    };
    // Auto-toggle for Shield/Mage Armor applies to free casts too
    if (spellName === "Shield" && !characterData.shieldActive) mutations.shieldActive = true;
    if (spellName === "Mage Armor" && !characterData.mageArmorActive) mutations.mageArmorActive = true;
    onMutate(mutations);
    onWarning(`${spellName} cast for free (1/long rest)`);
  };

  // --- Darkness SP Cast (Task 4.2) ---
  const handleDarknessSPCast = () => {
    if (currentSP < 2) {
      onWarning("Insufficient sorcery points (need 2)");
      return;
    }
    onMutate({
      classResources: {
        ...characterData.classResources,
        currentSorceryPoints: currentSP - 2,
      },
    });
    setDarknessSeeThrough(true);
  };

  // --- Find Familiar Summon (Task 4.3) ---
  const handleSummonFamiliar = () => {
    const familiarType: "falcon" | "fox" = characterData.characterName.includes("Ramil")
      ? "falcon"
      : "fox";
    const existingFamiliars = characterData.classResources.familiars ?? [];
    // Dismiss existing familiar of the same type first
    const filtered = existingFamiliars.filter((f) => f.familiarType !== familiarType);
    const newFamiliar = createFamiliar(familiarType);
    onMutate({
      classResources: {
        ...characterData.classResources,
        familiars: [...filtered, newFamiliar],
      },
    });
  };

  // --- Hound of Ill Omen Summon (Task 4.4) ---
  const handleSummonHound = () => {
    if (currentSP < 3) {
      onWarning("Insufficient sorcery points (need 3)");
      return;
    }
    const existingFamiliars = characterData.classResources.familiars ?? [];
    const newHound = createFamiliar("hound", characterData.level);
    onMutate({
      classResources: {
        ...characterData.classResources,
        currentSorceryPoints: currentSP - 3,
        familiars: [...existingFamiliars, newHound],
      },
    });
  };

  const handleMetamagic = (option: MetamagicOption) => {
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
    if (option === "heightened") {
      onWarning(`Heightened: one target has disadvantage on its first ${spellData?.saveType} save`);
    } else if (option === "extended") {
      onWarning(`Extended: ${spellName}'s duration is doubled (max 24 hours)`);
    }
  };

  // --- Wizard prepared state ---
  const isPrepared = isWizard
    ? (characterData.classResources.preparedSpells ?? []).includes(spellName)
    : false;
  const isAutoPrepared = isWizard
    ? (characterData.classResources.autoPreparedSpells ?? []).includes(spellName)
    : false;

  // Cantrips are always available and auto-prepared spells are locked, so
  // neither can be toggled.
  const canTogglePrepared = isWizard && !isCantrip && !isAutoPrepared;

  const handleTogglePrepared = () => {
    const prepared = characterData.classResources.preparedSpells ?? [];
    if (isPrepared) {
      onMutate({
        classResources: {
          ...characterData.classResources,
          preparedSpells: prepared.filter((s) => s !== spellName),
        },
      });
      return;
    }
    // Enforce the preparation limit when adding (auto-prepared don't count).
    if (maxPrepared > 0 && preparedCount >= maxPrepared) {
      onWarning(`Preparation limit reached (${preparedCount}/${maxPrepared})`);
      return;
    }
    onMutate({
      classResources: {
        ...characterData.classResources,
        preparedSpells: [...prepared, spellName],
      },
    });
  };

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
    <div className="w-full rounded border border-ff12-border-dim/50 bg-ff12-panel-light/20">
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-ff12-panel-light/40"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <IconImage type="spell" name={spellName} size={34} />
          <span className="text-base text-ff12-text">{spellName}</span>
          {!isCantrip && (
            <span className="rounded bg-ff12-panel-light px-1.5 py-0.5 text-[10px] text-gold/70">
              {spellLevel}
            </span>
          )}
          {isCantrip && (
            <span className="rounded bg-ff12-panel-light px-1.5 py-0.5 text-[10px] text-ff12-text-dim">
              cantrip
            </span>
          )}
          {spellData?.ritual && (
            <span className="rounded bg-gold/20 px-1 py-0.5 text-[10px] font-bold text-gold">
              R
            </span>
          )}
          {hasFreeCast && (
            <span className={`rounded px-1 py-0.5 text-[10px] ${freeCastUsed ? "bg-ff12-panel-light text-ff12-text-dim/30" : "bg-emerald-800/30 text-emerald-400"}`}>
              Free
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isWizard && !isCantrip && isAutoPrepared && (
            <span className="text-[10px] text-gold/60">Auto</span>
          )}
          <span className="text-xs text-ff12-text-dim/30">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Prepare toggle — rendered outside the header button so we don't nest
          interactive elements. Auto-prepared spells and cantrips aren't toggleable. */}
      {canTogglePrepared && (
        <div className="flex justify-end px-3 pb-1">
          <button
            onClick={handleTogglePrepared}
            role="switch"
            aria-checked={isPrepared}
            aria-label={`${isPrepared ? "Unprepare" : "Prepare"} ${spellName}`}
            title={isPrepared ? "Click to unprepare" : "Click to prepare"}
            className={`min-h-[28px] rounded px-2 py-0.5 text-[10px] transition ${
              isPrepared
                ? "bg-gold/20 text-gold hover:bg-gold/30"
                : "bg-ff12-panel-light text-ff12-text-dim/50 hover:bg-ff12-border-dim hover:text-ff12-text"
            }`}
          >
            {isPrepared ? "✓ Prepared" : "Prepare"}
          </button>
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && spellData && (
        <div className="border-t border-ff12-border-dim/30 px-3 pb-3 pt-2">
          {/* Metadata header */}
          <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ff12-text-dim">
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
          <p className="mb-3 text-xs leading-relaxed text-ff12-text-dim">
            {spellData.description}
          </p>

          {/* Gear note (e.g. Winter's Clutches) — only if this character has the item equipped */}
          {spellData.itemNote && hasWintersClutches && (
            <p className="mb-3 rounded bg-sky-900/30 px-2 py-1 text-xs leading-relaxed text-sky-300">
              ❄ {spellData.itemNote}
            </p>
          )}

          {/* Upcast description */}
          {spellData.upcastDescription && (
            <p className="mb-3 text-xs leading-relaxed text-gold/70 italic">
              <span className="font-semibold not-italic">At Higher Levels: </span>
              {spellData.upcastDescription}
            </p>
          )}

          {/* Damage dice display (for reference) */}
          {effectiveDamage && (
            <div className="mb-2 text-xs text-ff12-text-dim">
              Damage: <span className="text-gold">{effectiveDamage}</span>
              {spellData.damageType && (
                <span className="ml-1 text-ff12-text-dim/60">{spellData.damageType}</span>
              )}
            </div>
          )}

          {/* Save DC badge */}
          {spellData.saveType && (
            <div className="mb-2">
              <span className="rounded bg-ff12-panel-light px-2 py-1 text-xs font-bold text-gold">
                DC{" "}
                {calcSpellSaveDC(
                  characterData.proficiencyBonus,
                  spellcastingAbility,
                  characterData.stats
                ) + (innateSorceryActive ? 1 : 0)}{" "}
                {spellData.saveType}
              </span>
            </div>
          )}

          {/* Contingency: choose the bound spell's level instead of upcasting */}
          {isContingency && (
            <div className="mb-2 flex items-center gap-2">
              <label htmlFor={`contingency-bind-${spellName}`} className="text-xs text-ff12-text-dim">
                Cast for:
              </label>
              <select
                id={`contingency-bind-${spellName}`}
                value={effectiveBoundLevel}
                onChange={(e) => setContingencyBoundLevel(e.target.value)}
                className="rounded bg-ff12-panel-light px-2 py-1 text-xs text-ff12-text"
              >
                {contingencyLevels.map((lvl) => {
                  const slots = characterData.currentSpellSlots[lvl] ?? 0;
                  return (
                    <option key={lvl} value={lvl} disabled={slots === 0}>
                      {lvl}-level spell ({slots} slots)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Level selector for upcasting */}
          {!isContingency && upcastLevels.length > 1 && (
            <div className="mb-2 flex items-center gap-2">
              <label className="text-xs text-ff12-text-dim">Cast at:</label>
              <select
                value={effectiveCastLevel}
                onChange={(e) => setCastLevel(Number(e.target.value))}
                className="rounded bg-ff12-panel-light px-2 py-1 text-xs text-ff12-text"
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
            <div className="mb-2 text-xs text-ff12-text-dim/60">
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
                  className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim"
                >
                  Spell Attack
                </button>
                <label className="flex items-center gap-1 text-[10px] text-ff12-text-dim">
                  <input
                    type="checkbox"
                    checked={advantage}
                    onChange={(e) => {
                      setAdvantage(e.target.checked);
                      manualAdvantage.current = e.target.checked;
                      if (e.target.checked) setDisadvantage(false);
                    }}
                    className="h-3 w-3"
                  />
                  Adv
                </label>
                <label className="flex items-center gap-1 text-[10px] text-ff12-text-dim">
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
                className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim"
              >
                Damage ({effectiveDamage})
              </button>
            )}

            {/* Ritual Cast button */}
            {showRitual && (
              <button
                onClick={handleRitualCast}
                className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-gold hover:bg-ff12-border-dim"
              >
                Cast as Ritual
              </button>
            )}

            {/* Free Cast button */}
            {hasFreeCast && (
              <button
                onClick={handleFreeCast}
                disabled={freeCastUsed}
                className={`min-h-[44px] rounded px-3 py-2 text-xs transition ${
                  freeCastUsed
                    ? "bg-ff12-panel-light text-ff12-text-dim/30 line-through cursor-not-allowed"
                    : "bg-emerald-800/40 text-ff12-text hover:bg-emerald-800/60"
                }`}
              >
                Free Cast {freeCastUsed ? "✗" : "✓"}
              </button>
            )}

            {/* Contingency cast button: expends the 6th slot + the bound-spell slot */}
            {isContingency && (() => {
              const canCast =
                (characterData.currentSpellSlots["6th"] ?? 0) > 0 &&
                effectiveBoundLevel !== "" &&
                (characterData.currentSpellSlots[effectiveBoundLevel] ?? 0) > 0;
              return (
                <button
                  onClick={handleCastContingency}
                  disabled={!canCast}
                  className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cast (6th + {effectiveBoundLevel || "—"})
                </button>
              );
            })()}

            {/* Cast button (leveled spells only) */}
            {!isCantrip && !isContingency && (
              <button
                onClick={handleCast}
                disabled={remainingSlots === 0}
                className={`min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim ${
                  remainingSlots === 0 ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                Cast ({slotKey})
              </button>
            )}

            {/* Darkness SP Cast button (Task 4.2) */}
            {spellName === "Darkness" && isSorcerer && (
              <button
                onClick={handleDarknessSPCast}
                disabled={currentSP < 2}
                className={`min-h-[44px] rounded px-3 py-2 text-xs transition ${
                  currentSP < 2
                    ? "bg-ff12-panel-light text-ff12-text-dim/30 cursor-not-allowed opacity-50"
                    : "bg-purple-800/40 text-ff12-text hover:bg-purple-800/60"
                }`}
              >
                Cast with SP (2)
              </button>
            )}

            {/* Find Familiar Summon button (Task 4.3) */}
            {spellName === "Find Familiar" && (
              <button
                onClick={handleSummonFamiliar}
                className="min-h-[44px] rounded bg-emerald-800/40 px-3 py-2 text-xs text-ff12-text hover:bg-emerald-800/60"
              >
                Summon <span className="ml-1 text-[10px] text-emerald-400">Free</span>
              </button>
            )}

            {/* Hound of Ill Omen Summon button (Task 4.4) */}
            {spellName === "Hound of Ill Omen" && isSorcerer && (
              <button
                onClick={handleSummonHound}
                disabled={currentSP < 3}
                className={`min-h-[44px] rounded px-3 py-2 text-xs transition ${
                  currentSP < 3
                    ? "bg-ff12-panel-light text-ff12-text-dim/30 cursor-not-allowed opacity-50"
                    : "bg-purple-800/40 text-ff12-text hover:bg-purple-800/60"
                }`}
              >
                Summon (3 SP)
              </button>
            )}
          </div>

          {/* Darkness see-through indicator (Task 4.2) */}
          {spellName === "Darkness" && darknessSeeThrough && (
            <div className="mt-2 rounded bg-purple-900/30 px-3 py-2 text-xs text-purple-300">
              ✦ You can see through this darkness
            </div>
          )}

          {/* Metamagic row — Sorcerer only */}
          {isSorcerer && (
            <div className="mt-2 border-t border-ff12-border-dim/30 pt-2">
              <div className="mb-1 text-[10px] text-ff12-text-dim/60">
                Metamagic — SP: <span className="text-gold">{currentSP}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Empowered Spell — on damage spells */}
                {spellData.damageDice && (
                  <button
                    onClick={() => handleMetamagic("empowered")}
                    disabled={currentSP < METAMAGIC_OPTIONS.empowered.cost}
                    className={`min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim ${
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
                    className={`min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim ${
                      currentSP < METAMAGIC_OPTIONS.quickened.cost
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    Quickened Spell ({METAMAGIC_OPTIONS.quickened.cost} SP)
                  </button>
                )}

                {/* Heightened Spell — only for spells that force a saving throw */}
                {canHeighten(spellData) && (
                  <button
                    onClick={() => handleMetamagic("heightened")}
                    disabled={currentSP < METAMAGIC_OPTIONS.heightened.cost}
                    title="One target has disadvantage on its first save against the spell"
                    className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Heightened Spell ({METAMAGIC_OPTIONS.heightened.cost} SP)
                  </button>
                )}

                {/* Extended Spell — only for spells with a duration */}
                {canExtend(spellData) && (
                  <button
                    onClick={() => handleMetamagic("extended")}
                    disabled={currentSP < METAMAGIC_OPTIONS.extended.cost}
                    title="Double the spell's duration (max 24 hours)"
                    className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-border-dim disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Extended Spell ({METAMAGIC_OPTIONS.extended.cost} SP)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded but no spell data */}
      {isExpanded && !spellData && (
        <div className="border-t border-ff12-border-dim/30 px-3 py-2 text-xs text-ff12-text-dim/60">
          No spell data available in registry.
        </div>
      )}
    </div>
  );
}
