"use client";

import { useState } from "react";
import type { CharacterData, Action } from "@/types";

/** Maps className → number of dice to spend from that pool */
export type PoolSelections = Record<string, number>;

interface Props {
  type: "short" | "long";
  characterData: CharacterData;
  onConfirm: (hitDiceToSpend?: number, poolSelections?: PoolSelections, useSorcerousRestoration?: boolean) => void;
  onCancel: () => void;
}

function buildLongRestItems(cd: CharacterData): string[] {
  const items: string[] = [];
  const cr = cd.classResources;

  if (cd.currentHp < cd.maxHp) items.push("HP: " + cd.currentHp + " -> " + cd.maxHp);
  if (cd.hitDiceAvailable < cd.hitDiceTotal) {
    items.push("Hit dice: " + cd.hitDiceAvailable + " -> " + cd.hitDiceTotal);
  }

  const hasDepletedSlots = Object.keys(cd.spellSlots).some(
    (lvl) => (cd.currentSpellSlots[lvl] ?? 0) < (cd.spellSlots[lvl] ?? 0)
  );
  if (hasDepletedSlots) items.push("All spell slots restored to maximum");

  const hasCreated = Object.keys(cd.createdSpellSlots || {}).some(
    (k) => cd.createdSpellSlots[k] > 0
  );
  if (hasCreated) items.push("Created spell slots cleared");

  if (cr.sorceryPointsMax !== undefined) {
    if ((cr.currentSorceryPoints ?? 0) < cr.sorceryPointsMax) {
      items.push("Sorcery points: " + (cr.currentSorceryPoints ?? 0) + " -> " + cr.sorceryPointsMax);
    }
  }
  if (cr.bladesongMaxUses !== undefined) {
    if ((cr.bladesongUsesRemaining ?? 0) < cr.bladesongMaxUses) {
      items.push("Bladesong uses: " + (cr.bladesongUsesRemaining ?? 0) + " -> " + cr.bladesongMaxUses);
    }
  }
  if (cr.ravenFormMaxUses !== undefined) {
    if ((cr.ravenFormUsesRemaining ?? 0) < cr.ravenFormMaxUses) {
      items.push("Raven Form uses: " + (cr.ravenFormUsesRemaining ?? 0) + " -> " + cr.ravenFormMaxUses);
    }
  }
  if (cr.innateSorceryMaxUses !== undefined) {
    if ((cr.innateSorceryUsesRemaining ?? 0) < cr.innateSorceryMaxUses) {
      items.push("Innate Sorcery uses: " + (cr.innateSorceryUsesRemaining ?? 0) + " -> " + cr.innateSorceryMaxUses);
    }
  }

  if ((cr.familiars?.length ?? 0) > 0) items.push("All familiars dismissed");
  if (cr.strengthOfTheGraveUsed) items.push("Strength of the Grave reset");

  if (cd.shieldActive) items.push("Shield deactivated");
  if (cd.mageArmorActive) items.push("Mage Armor deactivated");
  if (cr.bladesongActive) items.push("Bladesong deactivated");
  if (cr.innateSorceryActive) items.push("Innate Sorcery deactivated");

  const flagsToReset: string[] = [];
  if (cr.feyBaneUsed) flagsToReset.push("Fey Bane");
  if (cr.feyMistyStepUsed) flagsToReset.push("Fey Misty Step");
  if (cr.druidCharmPersonUsed) flagsToReset.push("Druid Charm Person");
  if (cr.sorcerousRestorationUsed) flagsToReset.push("Sorcerous Restoration");
  if (flagsToReset.length > 0) {
    items.push("Free casts reset: " + flagsToReset.join(", "));
  }

  const exhaustedCount = Object.keys(cd.actions).filter((k) => {
    const a: Action = cd.actions[k];
    return a.uses < a.maxUses;
  }).length;
  if (exhaustedCount > 0) items.push(exhaustedCount + " action(s) recharged");

  if (cd.luckPoints !== 3) items.push("Luck points -> 3");
  if (cd.inspiration < 10) {
    items.push("Inspiration: " + cd.inspiration + " -> " + Math.min(10, cd.inspiration + 1));
  }

  if (items.length === 0) items.push("All resources are already at maximum");
  return items;
}

export default function RestModal({ type, characterData, onConfirm, onCancel }: Props) {
  const pools = characterData.hitDicePools;
  const hasMulticlassPools = pools && pools.length > 0;

  // Legacy single-pool state
  const legacyAvailable = characterData.hitDiceAvailable;
  const [hitDice, setHitDice] = useState(Math.min(1, legacyAvailable));

  // Multiclass pool selections: className → count to spend
  const [poolSelections, setPoolSelections] = useState<PoolSelections>(() => {
    if (!hasMulticlassPools) return {};
    const init: PoolSelections = {};
    for (const p of pools) {
      init[p.className] = 0;
    }
    return init;
  });

  // Sorcerous Restoration opt-in state
  const [useSorcerousRestoration, setUseSorcerousRestoration] = useState(false);

  const totalPoolAvailable = hasMulticlassPools
    ? pools.reduce((sum, p) => sum + p.available, 0)
    : 0;

  const totalPoolSelected = Object.values(poolSelections).reduce((s, v) => s + v, 0);

  const updatePoolSelection = (className: string, value: number) => {
    const pool = pools!.find((p) => p.className === className);
    if (!pool) return;
    const clamped = Math.min(pool.available, Math.max(0, value));
    setPoolSelections((prev) => ({ ...prev, [className]: clamped }));
  };

  const handleConfirm = () => {
    if (type === "long") {
      onConfirm(undefined, undefined);
    } else if (hasMulticlassPools) {
      onConfirm(totalPoolSelected, poolSelections, useSorcerousRestoration);
    } else {
      onConfirm(hitDice, undefined, useSorcerousRestoration);
    }
  };

  const longRestItems = type === "long" ? buildLongRestItems(characterData) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg border bg-ff12-panel/70 border-ff12-border p-6">
        <h2 className="mb-4 text-xl text-gold">
          {type === "short" ? "Short Rest" : "Long Rest"}
        </h2>
        {type === "short" ? (
          <div className="space-y-4">
            {hasMulticlassPools ? (
              <>
                <p className="text-sm text-ff12-text-dim">Hit dice pools:</p>
                {totalPoolAvailable > 0 ? (
                  <div className="space-y-2">
                    {pools.map((pool) => (
                      <div key={pool.className} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-ff12-text">
                          d{pool.dieSize} {pool.className}: {pool.available}/{pool.total}
                        </span>
                        <div className="flex items-center gap-2">
                          <label htmlFor={`pool-${pool.className}`} className="text-xs text-ff12-text-dim">Spend:</label>
                          <input
                            id={`pool-${pool.className}`}
                            type="number"
                            min={0}
                            max={pool.available}
                            value={poolSelections[pool.className] ?? 0}
                            onChange={(e) => updatePoolSelection(pool.className, Number(e.target.value))}
                            disabled={pool.available === 0}
                            className="w-14 rounded border border-ff12-border bg-dark-bg px-2 py-1 text-center text-sm text-ff12-text disabled:opacity-40"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ff12-danger">No hit dice available.</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-ff12-text-dim">
                  Available hit dice: {legacyAvailable} (d{characterData.hitDiceSize})
                </p>
                {legacyAvailable > 0 ? (
                  <div className="flex items-center gap-3">
                    <label htmlFor="hitDiceCount" className="text-sm text-ff12-text">Spend:</label>
                    <input
                      id="hitDiceCount"
                      type="number"
                      min={0}
                      max={legacyAvailable}
                      value={hitDice}
                      onChange={(e) => setHitDice(Math.min(legacyAvailable, Math.max(0, Number(e.target.value))))}
                      className="w-16 rounded border border-ff12-border bg-dark-bg px-2 py-1 text-center text-ff12-text"
                    />
                    <span className="text-sm text-ff12-text-dim">hit dice</span>
                  </div>
                ) : (
                  <p className="text-sm text-ff12-danger">No hit dice available.</p>
                )}
              </>
            )}
            <p className="text-xs text-ff12-text-dim">
              Short rest also recharges short-rest abilities.
            </p>
            {/* Sorcerous Restoration checkbox */}
            {characterData.classResources.sorceryPointsMax !== undefined && (
              <div className="flex items-center gap-2">
                <input
                  id="sorcerousRestoration"
                  type="checkbox"
                  checked={useSorcerousRestoration}
                  onChange={(e) => setUseSorcerousRestoration(e.target.checked)}
                  disabled={characterData.classResources.sorcerousRestorationUsed === true}
                  className="h-4 w-4 rounded border-ff12-border accent-gold disabled:opacity-40"
                />
                <label htmlFor="sorcerousRestoration" className={`text-sm ${characterData.classResources.sorcerousRestorationUsed ? "text-ff12-text-dim" : "text-ff12-text"}`}>
                  {characterData.classResources.sorcerousRestorationUsed
                    ? "Sorcerous Restoration (already used)"
                    : `Sorcerous Restoration (+${Math.floor(characterData.level / 2)} SP)`}
                </label>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ff12-text-dim mb-2">A long rest will restore the following:</p>
            <ul className="space-y-1 text-sm text-ff12-text">
              {longRestItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-gold">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm text-ff12-text-dim transition hover:bg-ff12-panel-light"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text transition hover:bg-ff12-border"
          >
            {type === "short" ? "Rest" : "Long Rest"}
          </button>
        </div>
      </div>
    </div>
  );
}