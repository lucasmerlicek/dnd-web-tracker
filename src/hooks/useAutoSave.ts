"use client";

import { useRef, useCallback } from "react";
import type { CharacterData } from "@/types";

/**
 * Generic debounced auto-save hook that POSTs partial CharacterData updates
 * to /api/character/update after a configurable delay.
 */
export function useAutoSave(delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<CharacterData>>({});

  /** Flush any pending save immediately (e.g. before unmount). */
  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingRef.current = {};
    try {
      await fetch("/api/character/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      });
    } catch (err) {
      console.error("Auto-save flush failed:", err);
    }
  }, []);

  /**
   * Schedule a debounced save. Successive calls within `delay` ms are merged
   * into a single request containing all partial fields.
   */
  const save = useCallback(
    (partial: Partial<CharacterData>) => {
      // Merge into pending payload so rapid successive updates are batched
      pendingRef.current = { ...pendingRef.current, ...partial };

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        const payload = pendingRef.current;
        pendingRef.current = {};
        try {
          await fetch("/api/character/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      }, delay);
    },
    [delay]
  );

  /** Cancel any pending debounced save without flushing. */
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = {};
  }, []);

  return { save, flush, cancel };
}
