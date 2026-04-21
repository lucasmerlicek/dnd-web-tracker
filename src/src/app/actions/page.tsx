"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useDiceRoll } from "@/hooks/useDiceRoll";
import { UNIVERSAL_ACTIONS } from "@/data/universal-actions";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import DiceResultOverlay from "@/components/ui/DiceResultOverlay";

export default function ActionsPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const { currentRoll, result, rollDice, dismiss } = useDiceRoll();
  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";
  const [expandedUniversal, setExpandedUniversal] = useState<string | null>(null);

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-parchment/50">Loading...</div>;

  const cr = data.classResources;
  const hasBladesong = cr.bladesongMaxUses !== undefined;
  const hasRavenForm = cr.ravenFormMaxUses !== undefined;
  const isMadea = characterId === "madea";
  const isRamil = characterId === "ramil";
  const intMod = data.stats.INT.modifier;

  // --- Action card: decrement uses, mark unavailable at 0 ---
  const activateAction = (key: string) => {
    const action = data.actions[key];
    if (!action || action.uses <= 0) return;
    const newUses = action.uses - 1;
    const updated = {
      ...data.actions,
      [key]: { ...action, uses: newUses, available: newUses > 0 },
    };
    mutate({ actions: updated });

    if (action.dice) {
      const match = action.dice.match(/(\d+)d(\d+)/);
      if (match) {
        rollDice({
          dice: [{ sides: parseInt(match[2]) as 4 | 6 | 8 | 10 | 12 | 20, count: parseInt(match[1]) }],
          modifier: action.bonus ?? 0,
          label: action.name,
        });
      }
    }
  };

  // --- Bladesong toggle (Ramil only): AC bonus = INT modifier ---
  const toggleBladesong = () => {
    const active = !cr.bladesongActive;
    if (active && (cr.bladesongUsesRemaining ?? 0) <= 0) return;
    mutate({
      classResources: {
        ...cr,
        bladesongActive: active,
        bladesongUsesRemaining: active
          ? (cr.bladesongUsesRemaining ?? 0) - 1
          : cr.bladesongUsesRemaining,
      },
      ac: active ? data.ac + intMod : data.ac - intMod,
    });
  };

  // --- Raven Form toggle (Madea only) ---
  const toggleRavenForm = () => {
    const active = !cr.ravenFormActive;
    if (active && (cr.ravenFormUsesRemaining ?? 0) <= 0) return;
    mutate({
      classResources: {
        ...cr,
        ravenFormActive: active,
        ravenFormUsesRemaining: active
          ? (cr.ravenFormUsesRemaining ?? 0) - 1
          : cr.ravenFormUsesRemaining,
      },
    });
  };

  // --- Second Wind (Ramil only): heal 1d10 + Fighter level (1) ---
  const useSecondWind = () => {
    const action = data.actions["second_wind"];
    if (!action || action.uses <= 0) return;
    const newUses = action.uses - 1;
    mutate({
      actions: {
        ...data.actions,
        second_wind: { ...action, uses: newUses, available: newUses > 0 },
      },
    });
    // Fighter level is 1 for Ramil (Fighter 1 / Wizard 4)
    rollDice({
      dice: [{ sides: 10, count: 1 }],
      modifier: action.bonus ?? 1,
      label: "Second Wind (heal)",
    });
  };

  // --- Free-cast flag toggles ---
  const toggleFeyBane = () => {
    mutate({ classResources: { ...cr, feyBaneUsed: !cr.feyBaneUsed } });
  };
  const toggleFeyMistyStep = () => {
    mutate({ classResources: { ...cr, feyMistyStepUsed: !cr.feyMistyStepUsed } });
  };
  const toggleDruidCharmPerson = () => {
    mutate({ classResources: { ...cr, druidCharmPersonUsed: !cr.druidCharmPersonUsed } });
  };

  // Filter out second_wind and bladesong from generic actions (they have dedicated UI)
  const genericActions = Object.entries(data.actions).filter(
    ([key]) => key !== "second_wind" && key !== "bladesong" && key !== "raven_form"
  );

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="actions" characterId={characterId} />
      <AmbientEffects screen="actions" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons hasFamiliars={(data?.classResources.familiars?.length ?? 0) > 0} />

        {/* Bladesong Tracker (Ramil only) */}
        {hasBladesong && (
          <UIPanel variant="fancy">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-gold">Bladesong</h3>
                <p className="text-xs text-parchment/50">
                  Uses: {cr.bladesongUsesRemaining}/{cr.bladesongMaxUses}
                </p>
                {cr.bladesongActive && (
                  <p className="text-xs text-emerald-400">
                    AC +{intMod} (INT modifier)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${cr.bladesongActive ? "text-emerald-400" : "text-parchment/40"}`}>
                  {cr.bladesongActive ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={toggleBladesong}
                  disabled={!cr.bladesongActive && (cr.bladesongUsesRemaining ?? 0) <= 0}
                  className={`min-h-[44px] rounded px-4 py-2 text-sm transition ${
                    cr.bladesongActive
                      ? "bg-gold text-dark-bg"
                      : "bg-dark-border text-parchment hover:bg-gold-dark disabled:opacity-30"
                  }`}
                >
                  {cr.bladesongActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </UIPanel>
        )}

        {/* Second Wind (Ramil only) */}
        {isRamil && data.actions["second_wind"] && (
          <UIPanel variant="box1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-gold">Second Wind</h3>
                <p className="text-xs text-parchment/50">
                  Heal 1d10 + {data.actions["second_wind"].bonus ?? 1} HP · Short rest recharge
                </p>
                <p className="text-xs text-parchment/50">
                  Uses: {data.actions["second_wind"].uses}/{data.actions["second_wind"].maxUses ?? 1}
                </p>
              </div>
              <button
                onClick={useSecondWind}
                disabled={(data.actions["second_wind"].uses ?? 0) <= 0}
                className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment transition hover:bg-gold disabled:opacity-30"
              >
                Use
              </button>
            </div>
          </UIPanel>
        )}

        {/* Raven Form Tracker (Madea only) */}
        {hasRavenForm && (
          <UIPanel variant="fancy">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-gold">Raven Form</h3>
                <p className="text-xs text-parchment/50">
                  Uses: {cr.ravenFormUsesRemaining}/{cr.ravenFormMaxUses}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${cr.ravenFormActive ? "text-emerald-400" : "text-parchment/40"}`}>
                  {cr.ravenFormActive ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={toggleRavenForm}
                  disabled={!cr.ravenFormActive && (cr.ravenFormUsesRemaining ?? 0) <= 0}
                  className={`min-h-[44px] rounded px-4 py-2 text-sm transition ${
                    cr.ravenFormActive
                      ? "bg-gold text-dark-bg"
                      : "bg-dark-border text-parchment hover:bg-gold-dark disabled:opacity-30"
                  }`}
                >
                  {cr.ravenFormActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </UIPanel>
        )}

        {/* Free-Cast Flags */}
        {(isMadea || isRamil) && (
          <UIPanel variant="box2">
            <h2 className="mb-3 font-serif text-sm text-gold/70">Free Casts (1/long rest)</h2>
            <div className="flex flex-wrap gap-3">
              {isMadea && (
                <>
                  <button
                    onClick={toggleFeyBane}
                    className={`min-h-[44px] rounded px-4 py-2 text-sm transition ${
                      cr.feyBaneUsed
                        ? "bg-dark-border text-parchment/30 line-through"
                        : "bg-dark-border text-parchment hover:bg-gold-dark"
                    }`}
                  >
                    Bane (Fey Touched) {cr.feyBaneUsed ? "✗" : "✓"}
                  </button>
                  <button
                    onClick={toggleFeyMistyStep}
                    className={`min-h-[44px] rounded px-4 py-2 text-sm transition ${
                      cr.feyMistyStepUsed
                        ? "bg-dark-border text-parchment/30 line-through"
                        : "bg-dark-border text-parchment hover:bg-gold-dark"
                    }`}
                  >
                    Misty Step (Fey Touched) {cr.feyMistyStepUsed ? "✗" : "✓"}
                  </button>
                </>
              )}
              {isRamil && (
                <button
                  onClick={toggleDruidCharmPerson}
                  className={`min-h-[44px] rounded px-4 py-2 text-sm transition ${
                    cr.druidCharmPersonUsed
                      ? "bg-dark-border text-parchment/30 line-through"
                      : "bg-dark-border text-parchment hover:bg-gold-dark"
                  }`}
                >
                  Charm Person (Druid Initiate) {cr.druidCharmPersonUsed ? "✗" : "✓"}
                </button>
              )}
            </div>
          </UIPanel>
        )}

        {/* Generic Actions */}
        {genericActions.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {genericActions.map(([key, action]) => (
              <UIPanel key={key} variant="box1">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-serif text-gold">{action.name}</h3>
                  <span className="text-xs text-parchment/50">
                    {action.uses}/{action.maxUses} · {action.recharge.replace("_", " ")}
                  </span>
                </div>
                <p className="mb-3 text-sm text-parchment/70">{action.description}</p>
                <button
                  onClick={() => activateAction(key)}
                  disabled={action.uses <= 0}
                  className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment transition hover:bg-gold disabled:opacity-30"
                >
                  Use
                </button>
              </UIPanel>
            ))}
          </div>
        )}

        {/* Universal Actions */}
        <div>
          <h2 className="mb-3 font-serif text-lg text-gold/80">Universal Actions</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {UNIVERSAL_ACTIONS.map((action) => (
              <UIPanel key={action.name} variant="box1">
                <button
                  onClick={() =>
                    setExpandedUniversal(
                      expandedUniversal === action.name ? null : action.name
                    )
                  }
                  className="flex w-full items-center justify-between text-left"
                >
                  <h3 className="font-serif text-gold">{action.name}</h3>
                  <span className="text-xs text-parchment/40">
                    {expandedUniversal === action.name ? "▲" : "▼"}
                  </span>
                </button>
                {expandedUniversal === action.name && (
                  <p className="mt-2 text-sm leading-relaxed text-parchment/70">
                    {action.description}
                  </p>
                )}
              </UIPanel>
            ))}
          </div>
        </div>
      </div>
      {currentRoll && <DiceResultOverlay roll={currentRoll} result={result} onDismiss={dismiss} />}
    </div>
  );
}
