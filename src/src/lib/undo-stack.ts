import type { CharacterData } from "../types/character";

export interface UndoSnapshot {
  timestamp: number;
  fields: Partial<CharacterData>;
}

const DEFAULT_MAX_SIZE = 20;

/**
 * Push a snapshot onto the undo stack, enforcing a maximum stack size.
 * When the stack exceeds maxSize, the oldest entries are discarded.
 * Returns a new array (does not mutate the input).
 */
export function pushSnapshot(
  stack: UndoSnapshot[],
  snapshot: UndoSnapshot,
  maxSize: number = DEFAULT_MAX_SIZE
): UndoSnapshot[] {
  const newStack = [...stack, snapshot];
  if (newStack.length > maxSize) {
    return newStack.slice(newStack.length - maxSize);
  }
  return newStack;
}

/**
 * Pop the most recent snapshot from the stack.
 * Returns the top snapshot and the remaining stack, or null if the stack is empty.
 */
export function popSnapshot(
  stack: UndoSnapshot[]
): { snapshot: UndoSnapshot | null; remaining: UndoSnapshot[] } {
  if (stack.length === 0) {
    return { snapshot: null, remaining: [] };
  }
  const snapshot = stack[stack.length - 1];
  const remaining = stack.slice(0, -1);
  return { snapshot, remaining };
}

/**
 * Capture a snapshot of the specified keys from CharacterData.
 * Only the listed keys are included in the snapshot's fields.
 */
export function captureSnapshot(
  data: CharacterData,
  changedKeys: (keyof CharacterData)[]
): UndoSnapshot {
  const fields: Partial<CharacterData> = {};
  for (const key of changedKeys) {
    if (key in data) {
      (fields as Record<string, unknown>)[key] = data[key];
    }
  }
  return {
    timestamp: Date.now(),
    fields,
  };
}
