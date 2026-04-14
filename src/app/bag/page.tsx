"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useCursorNavigation } from "@/hooks/useCursorNavigation";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import CursorIndicator from "@/components/ui/CursorIndicator";
import IconImage from "@/components/ui/IconImage";
import { useState } from "react";
import type { GearItem, UtilityItem, TreasureItem, StatModifier } from "@/types";
import { totalTreasureValue } from "@/lib/treasure-calc";
import { useUndoStack } from "@/hooks/useUndoStack";

const CATEGORIES = ["gear", "utility", "treasure"] as const;
const COINS = ["cp", "sp", "ep", "gp", "pp"] as const;

type StructuredItem = GearItem | UtilityItem | TreasureItem;

export default function BagPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const { undoableMutate } = useUndoStack(data, mutate);
  const [newItem, setNewItem] = useState<Record<string, string>>({ gear: "", utility: "", treasure: "" });
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";

  const hasStructuredInventory = !!data?.inventoryItems;

  const gearItems = hasStructuredInventory ? (data!.inventoryItems!.gear as GearItem[]) : [];
  const utilityItems = hasStructuredInventory ? (data!.inventoryItems!.utility as UtilityItem[]) : [];
  const treasureItems = hasStructuredInventory ? (data!.inventoryItems!.treasure as TreasureItem[]) : [];

  const gearCursor = useCursorNavigation({
    itemCount: hasStructuredInventory ? gearItems.length : (data?.inventory?.gear?.length ?? 0),
  });

  const utilityCursor = useCursorNavigation({
    itemCount: hasStructuredInventory ? utilityItems.length : (data?.inventory?.utility?.length ?? 0),
  });

  const treasureCursor = useCursorNavigation({
    itemCount: hasStructuredInventory ? treasureItems.length : (data?.inventory?.treasure?.length ?? 0),
  });

  const cursorMap = { gear: gearCursor, utility: utilityCursor, treasure: treasureCursor } as const;

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-ff12-text-dim">Loading...</div>;

  // --- Legacy string-based inventory handlers ---
  const addItemLegacy = (cat: typeof CATEGORIES[number]) => {
    const item = newItem[cat].trim();
    if (!item) return;
    const updated = { ...data.inventory, [cat]: [...data.inventory[cat], item] };
    mutate({ inventory: updated });
    setNewItem({ ...newItem, [cat]: "" });
  };

  const removeItemLegacy = (cat: typeof CATEGORIES[number], idx: number) => {
    const updated = { ...data.inventory, [cat]: data.inventory[cat].filter((_, i) => i !== idx) };
    undoableMutate({ inventory: updated });
  };

  // --- Structured inventory handlers ---
  const addItemStructured = (cat: typeof CATEGORIES[number]) => {
    const name = newItem[cat].trim();
    if (!name || !data.inventoryItems) return;

    const items = data.inventoryItems[cat] as StructuredItem[];
    const existingIdx = items.findIndex((item) => item.name.toLowerCase() === name.toLowerCase());

    if (existingIdx >= 0) {
      const updatedItems = items.map((item, i) =>
        i === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
      );
      mutate({ inventoryItems: { ...data.inventoryItems, [cat]: updatedItems } });
    } else {
      const baseItem = {
        id: crypto.randomUUID(),
        name,
        description: "",
        quantity: 1,
      };

      let newEntry: StructuredItem;
      if (cat === "gear") {
        newEntry = { ...baseItem, equipped: false, requiresAttunement: false, attuned: false, statModifiers: [] } as GearItem;
      } else if (cat === "treasure") {
        newEntry = { ...baseItem, estimatedValue: 0 } as TreasureItem;
      } else {
        newEntry = baseItem as UtilityItem;
      }

      mutate({ inventoryItems: { ...data.inventoryItems, [cat]: [...items, newEntry] } });
    }
    setNewItem({ ...newItem, [cat]: "" });
  };

  const removeItemStructured = (cat: typeof CATEGORIES[number], id: string) => {
    if (!data.inventoryItems) return;
    const items = (data.inventoryItems[cat] as StructuredItem[]).filter((item) => item.id !== id);
    undoableMutate({ inventoryItems: { ...data.inventoryItems, [cat]: items } });
  };

  const toggleGearEquipped = (id: string) => {
    if (!data.inventoryItems) return;
    const items = data.inventoryItems.gear.map((item) =>
      item.id === id ? { ...item, equipped: !item.equipped, attuned: !item.equipped ? item.attuned : false } : item
    );
    undoableMutate({ inventoryItems: { ...data.inventoryItems, gear: items } });
  };

  const toggleGearAttuned = (id: string) => {
    if (!data.inventoryItems) return;
    const items = data.inventoryItems.gear.map((item) =>
      item.id === id ? { ...item, attuned: !item.attuned } : item
    );
    undoableMutate({ inventoryItems: { ...data.inventoryItems, gear: items } });
  };

  const updateItemDescription = (cat: typeof CATEGORIES[number], id: string, description: string) => {
    if (!data.inventoryItems) return;
    const items = (data.inventoryItems[cat] as StructuredItem[]).map((item) =>
      item.id === id ? { ...item, description } : item
    );
    mutate({ inventoryItems: { ...data.inventoryItems, [cat]: items } });
  };

  const updateItemQuantity = (cat: typeof CATEGORIES[number], id: string, value: string) => {
    if (!data.inventoryItems) return;
    const num = Math.max(1, parseInt(value) || 1);
    const items = (data.inventoryItems[cat] as StructuredItem[]).map((item) =>
      item.id === id ? { ...item, quantity: num } : item
    );
    mutate({ inventoryItems: { ...data.inventoryItems, [cat]: items } });
  };

  const updateTreasureValue = (id: string, value: string) => {
    if (!data.inventoryItems) return;
    const num = Math.max(0, parseFloat(value) || 0);
    const items = data.inventoryItems.treasure.map((item) =>
      item.id === id ? { ...item, estimatedValue: num } : item
    );
    undoableMutate({ inventoryItems: { ...data.inventoryItems, treasure: items } });
  };

  const toggleExpand = (id: string) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  const addItem = (cat: typeof CATEGORIES[number]) => {
    if (hasStructuredInventory) {
      addItemStructured(cat);
    } else {
      addItemLegacy(cat);
    }
  };

  const updateCoin = (coin: typeof COINS[number], value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    undoableMutate({ coins: { ...data.coins, [coin]: num } });
  };

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="bag" characterId={characterId} />
      <AmbientEffects screen="bag" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons />

        {/* Coins */}
        <UIPanel variant="fancy">
          <h2 className="mb-3 text-sm text-gold/70">Coins</h2>
          <div className="flex flex-wrap gap-4">
            {COINS.map((coin) => (
              <div key={coin} className="text-center">
                <label htmlFor={`coin-${coin}`} className="text-xs uppercase text-ff12-text-dim">{coin}</label>
                <input
                  id={`coin-${coin}`}
                  type="number"
                  min={0}
                  value={data.coins[coin]}
                  onChange={(e) => updateCoin(coin, e.target.value)}
                  className="mt-1 w-20 rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-center text-gold"
                />
              </div>
            ))}
          </div>
        </UIPanel>

        {/* Inventory Categories */}
        {CATEGORIES.map((cat) => {
          const cursor = cursorMap[cat];
          return (
            <UIPanel key={cat} variant="box1">
              <h2 className="mb-3 text-sm capitalize text-gold/70">{cat}</h2>
              <ul {...cursor.containerProps} className="mb-3 space-y-1">
                {hasStructuredInventory
                  ? (data.inventoryItems![cat] as StructuredItem[]).map((item, index) => (
                      <li
                        key={item.id}
                        {...cursor.getItemProps(index)}
                        className={`rounded hover:bg-ff12-panel-light ${cursor.isActive(index) ? "bg-white/10" : ""}`}
                      >
                        <div
                          className="flex cursor-pointer items-center justify-between px-2 py-1"
                          onClick={() => toggleExpand(item.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleExpand(item.id); }}
                          aria-expanded={expandedItemId === item.id}
                          aria-label={`${item.name}, click to ${expandedItemId === item.id ? "collapse" : "expand"}`}
                        >
                          <span className="flex items-center gap-2 text-sm text-ff12-text/80">
                            <CursorIndicator visible={cursor.isActive(index)} />
                            <IconImage type="item" name={item.name} size={20} />
                            {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}
                            {cat === "gear" && (item as GearItem).equipped && (
                              <span className="rounded bg-ff12-select/20 px-1.5 py-0.5 text-[10px] text-ff12-select">Equipped</span>
                            )}
                            {cat === "gear" && (item as GearItem).attuned && (
                              <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">Attuned</span>
                            )}
                            {cat === "treasure" && (item as TreasureItem).estimatedValue > 0 && (
                              <span className="text-xs text-gold/60">— {(item as TreasureItem).estimatedValue} gp</span>
                            )}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeItemStructured(cat, item.id); }}
                            className="min-h-[44px] px-2 text-xs text-ff12-danger hover:text-ff12-danger/80"
                            aria-label={`Remove ${item.name}`}
                          >
                            ✕
                          </button>
                        </div>
                        {expandedItemId === item.id && (
                          <div className="px-4 pb-2 text-xs text-ff12-text-dim">
                            <textarea
                              value={item.description}
                              onChange={(e) => updateItemDescription(cat, item.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Add a description..."
                              className="w-full rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-xs text-ff12-text"
                              rows={2}
                            />
                            {(cat === "utility" || cat === "treasure") && (
                              <div className="mt-2">
                                <label className="flex items-center gap-2 text-xs text-ff12-text-dim">
                                  Quantity:
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(cat, item.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-16 rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-center text-sm text-ff12-text"
                                  />
                                </label>
                              </div>
                            )}
                            {cat === "gear" && (() => {
                              const gear = item as GearItem;
                              return (
                                <div className="mt-2 space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleGearEquipped(gear.id); }}
                                      className={`min-h-[36px] rounded px-3 py-1 text-xs font-medium transition-colors ${
                                        gear.equipped
                                          ? "bg-ff12-select/20 text-ff12-select hover:bg-ff12-select/30"
                                          : "bg-ff12-panel-light text-ff12-text-dim hover:bg-ff12-panel-light/80"
                                      }`}
                                      aria-pressed={gear.equipped}
                                      aria-label={`${gear.equipped ? "Unequip" : "Equip"} ${gear.name}`}
                                    >
                                      {gear.equipped ? "⚔ Equipped" : "Equip"}
                                    </button>
                                    {gear.requiresAttunement && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleGearAttuned(gear.id); }}
                                        className={`min-h-[36px] rounded px-3 py-1 text-xs font-medium transition-colors ${
                                          gear.attuned
                                            ? "bg-gold/20 text-gold hover:bg-gold/30"
                                            : "bg-ff12-panel-light text-ff12-text-dim hover:bg-ff12-panel-light/80"
                                        }`}
                                        aria-pressed={gear.attuned}
                                        aria-label={`${gear.attuned ? "Unattune" : "Attune"} ${gear.name}`}
                                      >
                                        {gear.attuned ? "✦ Attuned" : "Attune"}
                                      </button>
                                    )}
                                  </div>
                                  {gear.statModifiers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {gear.statModifiers.map((mod: StatModifier, idx: number) => (
                                        <span
                                          key={idx}
                                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                                            gear.equipped
                                              ? "bg-gold/20 text-gold"
                                              : "bg-ff12-panel-light text-ff12-text-dim"
                                          }`}
                                        >
                                          {mod.value >= 0 ? "+" : ""}{mod.value} {mod.stat.toUpperCase()}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {cat === "treasure" && (() => {
                              const treasure = item as TreasureItem;
                              return (
                                <div className="mt-2">
                                  <label className="flex items-center gap-2 text-xs text-ff12-text-dim">
                                    Estimated Value (gp):
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={treasure.estimatedValue}
                                      onChange={(e) => updateTreasureValue(treasure.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-24 rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-center text-gold"
                                      aria-label={`Estimated value for ${treasure.name}`}
                                    />
                                  </label>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </li>
                    ))
                  : data.inventory[cat].map((item, i) => (
                      <li
                        key={i}
                        {...cursor.getItemProps(i)}
                        className={`flex items-center justify-between rounded px-2 py-1 hover:bg-ff12-panel-light ${cursor.isActive(i) ? "bg-white/10" : ""}`}
                      >
                        <span className="flex items-center gap-2 text-sm text-ff12-text/80">
                          <CursorIndicator visible={cursor.isActive(i)} />
                          <IconImage type="item" name={item} size={20} />
                          {item}
                        </span>
                        <button onClick={() => removeItemLegacy(cat, i)} className="min-h-[44px] px-2 text-xs text-ff12-danger hover:text-ff12-danger/80" aria-label={`Remove ${item}`}>✕</button>
                      </li>
                    ))
                }
              </ul>
              {cat === "treasure" && hasStructuredInventory && data.inventoryItems!.treasure.length > 0 && (
                <div className="mb-3 flex items-center justify-end px-2 text-sm text-gold">
                  Total: {totalTreasureValue(data.inventoryItems!.treasure)} gp
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItem[cat]}
                  onChange={(e) => setNewItem({ ...newItem, [cat]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addItem(cat)}
                  placeholder={`Add ${cat} item...`}
                  className="flex-1 rounded border border-ff12-border-dim bg-dark-bg px-3 py-2 text-sm text-ff12-text"
                  aria-label={`New ${cat} item`}
                />
                <button onClick={() => addItem(cat)} className="min-h-[44px] rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text hover:bg-ff12-panel-light/80">Add</button>
              </div>
            </UIPanel>
          );
        })}
      </div>
    </div>
  );
}
