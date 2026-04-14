"use client";

import { useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { CharacterData } from "../types/character";
import {
  pushSnapshot,
  popSnapshot,
  captureSnapshot,
  type UndoSnapshot,
} from "../lib/undo-stack";

export function useUndoStack(
  data: CharacterData | null,
  mutate: (partial: Partial<CharacterData>) => void
) {
  const stackRef = useRef<UndoSnapshot[]>([]);
  const pathname = usePathname();

  // Clear the undo stack on route change
  useEffect(() => {
    stackRef.current = [];
  }, [pathname]);

  const undoableMutate = useCallback(
    (partial: Partial<CharacterData>) => {
      if (data) {
        const changedKeys = Object.keys(partial) as (keyof CharacterData)[];
        const snapshot = captureSnapshot(data, changedKeys);
        stackRef.current = pushSnapshot(stackRef.current, snapshot);
      }
      mutate(partial);
    },
    [data, mutate]
  );

  const undo = useCallback(() => {
    const { snapshot, remaining } = popSnapshot(stackRef.current);
    if (snapshot) {
      stackRef.current = remaining;
      mutate(snapshot.fields);
    }
  }, [mutate]);

  const canUndo = stackRef.current.length > 0;

  // Listen for Ctrl+Z / Cmd+Z keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo]);

  return { undoableMutate, undo, canUndo };
}
