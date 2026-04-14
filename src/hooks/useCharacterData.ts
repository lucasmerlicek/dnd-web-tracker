"use client";

import { useState, useEffect, useCallback } from "react";
import type { CharacterData } from "@/types";
import { useAutoSave } from "./useAutoSave";

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

  return { data, loading, error, mutate };
}
