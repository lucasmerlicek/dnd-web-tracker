"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useDiceRoll } from "@/hooks/useDiceRoll";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import AmbientEffects from "@/components/ui/AmbientEffects";
import DiceResultOverlay from "@/components/ui/DiceResultOverlay";
import FamiliarCard from "@/components/familiars/FamiliarCard";
import { FAMILIAR_STAT_BLOCKS } from "@/data/familiar-registry";
import { applyFamiliarDamage, dismissFamiliar, removeDead } from "@/lib/familiar-logic";

export default function FamiliarsPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const { currentRoll, result, rollDice, dismiss } = useDiceRoll();
  const characterId =
    (session?.user as { characterId?: string })?.characterId ?? "madea";

  if (loading || !data)
    return (
      <div className="flex min-h-screen items-center justify-center text-ff12-text-dim">
        Loading...
      </div>
    );

  const familiars = data.classResources.familiars ?? [];

  const handleDamage = (familiarId: string, damage: number) => {
    const updated = familiars.map((f) =>
      f.id === familiarId ? applyFamiliarDamage(f, damage) : f
    );
    const alive = removeDead(updated);
    mutate({
      classResources: { ...data.classResources, familiars: alive },
    });
  };

  const handleDismiss = (familiarId: string) => {
    const updated = dismissFamiliar(familiars, familiarId);
    mutate({
      classResources: { ...data.classResources, familiars: updated },
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ScreenBackground screen="familiars" characterId={characterId} />
      <AmbientEffects screen="familiars" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons hasFamiliars={true} />

        {familiars.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-ff12-text-dim">
              No familiars are currently summoned. Use Find Familiar or Hound of
              Ill Omen from the Spells page to summon one.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {familiars.map((familiar) => {
              const statBlock = FAMILIAR_STAT_BLOCKS[familiar.familiarType];
              if (!statBlock) return null;
              return (
                <FamiliarCard
                  key={familiar.id}
                  familiar={familiar}
                  statBlock={statBlock}
                  onRollDice={rollDice}
                  onDamage={handleDamage}
                  onDismiss={handleDismiss}
                />
              );
            })}
          </div>
        )}
      </div>
      {currentRoll && (
        <DiceResultOverlay
          roll={currentRoll}
          result={result}
          onDismiss={dismiss}
          characterData={data}
          onMutate={mutate}
        />
      )}
    </div>
  );
}
