"use client";

import { useState } from "react";
import type { CharacterData, Action } from "@/types";

interface Props {
  type: "short" | "long";
  characterData: CharacterData;
  onConfirm: (hitDiceToSpend?: number) => void;
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

  if (cd.shieldActive) items.push("Shield deactivated");
  if (cd.mageArmorActive) items.push("Mage Armor deactivated");
  if (cr.bladesongActive) items.push("Bladesong deactivated");

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
  const available = characterData.hitDiceAvailable;
  const [hitDice, setHitDice] = useState(Math.min(1, available));
  const longRestItems = type === "long" ? buildLongRestItems(characterData) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg border border-dark-border bg-dark-surface p-6">
        <h2 className="mb-4 font-serif text-xl text-gold">
          {type === "short" ? "Short Rest" : "Long Rest"}
        </h2>
        {type === "short" ? (
          <div className="space-y-4">
            <p className="text-sm text-parchment/70">
              Available hit dice: {available} (d{characterData.hitDiceSize})
            </p>
            {available > 0 ? (
              <div className="flex items-center gap-3">
                <label htmlFor="hitDiceCount" className="text-sm text-parchment">Spend:</label>
                <input
                  id="hitDiceCount"
                  type="number"
                  min={0}
                  max={available}
                  value={hitDice}
                  onChange={(e) => setHitDice(Math.min(available, Math.max(0, Number(e.target.value))))}
                  className="w-16 rounded border border-dark-border bg-dark-bg px-2 py-1 text-center text-parchment"
                />
                <span className="text-sm text-parchment/70">hit dice</span>
              </div>
            ) : (
              <p className="text-sm text-crimson">No hit dice available.</p>
            )}
            <p className="text-xs text-parchment/50">
              Short rest also recharges short-rest abilities.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-parchment/70 mb-2">A long rest will restore the following:</p>
            <ul className="space-y-1 text-sm text-parchment/80">
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
            className="rounded px-4 py-2 text-sm text-parchment/70 transition hover:bg-dark-border"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(type === "short" ? hitDice : undefined)}
            className="rounded bg-gold-dark px-4 py-2 text-sm text-parchment transition hover:bg-gold"
          >
            {type === "short" ? "Rest" : "Long Rest"}
          </button>
        </div>
      </div>
    </div>
  );
}