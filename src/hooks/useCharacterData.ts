"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { CharacterData } from "@/types";
import { useAutoSave } from "./useAutoSave";
import { applyGearAbilityScores } from "@/lib/gear-stats";

export function useCharacterData() {
  const [data, setData] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { save, flush } = useAutoSave(500);

  useEffect(() => {
    fetch("/api/character/get")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load character data");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  /**
   * Optimistically update local state and schedule a debounced persist.
   * Accepts a Partial<CharacterData> that is shallow-merged into current state.
   */
  const mutate = useCallback(
    (partial: Partial<CharacterData>) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, ...partial };
      });
      save(partial);
    },
    [save]
  );

  // Pages see ability scores/skills adjusted by active gear (e.g. Bracers of
  // Dexterity). Only `partial` updates are persisted, so derived values never
  // get written back to KV unless a page explicitly sends them.
  const effectiveData = useMemo(() => (data ? applyGearAbilityScores(data) : null), [data]);

  return { data: effectiveData, loading, error, mutate };
}
