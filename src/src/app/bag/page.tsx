"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import { useState } from "react";

const CATEGORIES = ["gear", "utility", "treasure"] as const;
const COINS = ["cp", "sp", "ep", "gp", "pp"] as const;

export default function BagPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const [newItem, setNewItem] = useState<Record<string, string>>({ gear: "", utility: "", treasure: "" });
  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-parchment/50">Loading...</div>;

  const addItem = (cat: typeof CATEGORIES[number]) => {
    const item = newItem[cat].trim();
    if (!item) return;
    const updated = { ...data.inventory, [cat]: [...data.inventory[cat], item] };
    mutate({ inventory: updated });
    setNewItem({ ...newItem, [cat]: "" });
  };

  const removeItem = (cat: typeof CATEGORIES[number], idx: number) => {
    const updated = { ...data.inventory, [cat]: data.inventory[cat].filter((_, i) => i !== idx) };
    mutate({ inventory: updated });
  };

  const updateCoin = (coin: typeof COINS[number], value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    mutate({ coins: { ...data.coins, [coin]: num } });
  };

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="bag" characterId={characterId} />
      <AmbientEffects screen="bag" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons />

        {/* Coins */}
        <UIPanel variant="fancy">
          <h2 className="mb-3 font-serif text-sm text-gold/70">Coins</h2>
          <div className="flex flex-wrap gap-4">
            {COINS.map((coin) => (
              <div key={coin} className="text-center">
                <label htmlFor={`coin-${coin}`} className="text-xs uppercase text-parchment/50">{coin}</label>
                <input
                  id={`coin-${coin}`}
                  type="number"
                  min={0}
                  value={data.coins[coin]}
                  onChange={(e) => updateCoin(coin, e.target.value)}
                  className="mt-1 w-20 rounded border border-dark-border bg-dark-bg px-2 py-1 text-center font-serif text-gold"
                />
              </div>
            ))}
          </div>
        </UIPanel>

        {/* Inventory Categories */}
        {CATEGORIES.map((cat) => (
          <UIPanel key={cat} variant="box1">
            <h2 className="mb-3 font-serif text-sm capitalize text-gold/70">{cat}</h2>
            <ul className="mb-3 space-y-1">
              {data.inventory[cat].map((item, i) => (
                <li key={i} className="flex items-center justify-between rounded px-2 py-1 hover:bg-dark-border">
                  <span className="text-sm text-parchment/80">{item}</span>
                  <button onClick={() => removeItem(cat, i)} className="min-h-[44px] px-2 text-xs text-crimson hover:text-crimson/80" aria-label={`Remove ${item}`}>✕</button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItem[cat]}
                onChange={(e) => setNewItem({ ...newItem, [cat]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addItem(cat)}
                placeholder={`Add ${cat} item...`}
                className="flex-1 rounded border border-dark-border bg-dark-bg px-3 py-2 text-sm text-parchment"
                aria-label={`New ${cat} item`}
              />
              <button onClick={() => addItem(cat)} className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment hover:bg-gold">Add</button>
            </div>
          </UIPanel>
        ))}
      </div>
    </div>
  );
}
