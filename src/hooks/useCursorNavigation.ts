"use client";

import { useState, useCallback, useId } from "react";

export interface CursorNavigationOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Number of columns for grid layouts (default: 1) */
  columns?: number;
  /** Callback when Enter/Space is pressed on the active item */
  onActivate?: (index: number) => void;
  /** Whether this list is currently the active focus target */
  enabled?: boolean;
}

export interface CursorNavigationResult {
  /** Currently selected index (-1 = none) */
  activeIndex: number;
  /** Set active index (for mouse hover) */
  setActiveIndex: (index: number) => void;
  /** Props to spread on the list container */
  containerProps: {
    tabIndex: number;
    role: string;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onMouseLeave: () => void;
    "aria-activedescendant": string | undefined;
  };
  /** Generate props for each list item */
  getItemProps: (index: number) => {
    id: string;
    role: string;
    "aria-selected": boolean;
    onMouseEnter: () => void;
    onClick: () => void;
  };
  /** Whether the given index is the active one */
  isActive: (index: number) => boolean;
}

/**
 * Compute the next activeIndex after an arrow key press.
 *
 * Movement formulas (C = columns, N = itemCount, i = current index):
 *   ArrowDown  → min(i + C, N - 1)
 *   ArrowUp    → max(i - C, 0)
 *   ArrowRight → i + 1  if (i + 1) % C ≠ 0 and i + 1 < N, else i
 *   ArrowLeft  → i - 1  if i % C ≠ 0, else i
 */
export function computeNextIndex(
  key: string,
  current: number,
  itemCount: number,
  columns: number
): number {
  if (itemCount <= 0) return -1;

  // If nothing is selected yet, start at 0 for any arrow key
  const i = current < 0 ? 0 : current;

  switch (key) {
    case "ArrowDown":
      return Math.min(i + columns, itemCount - 1);
    case "ArrowUp":
      return Math.max(i - columns, 0);
    case "ArrowRight": {
      const next = i + 1;
      if (next < itemCount && next % columns !== 0) return next;
      return i;
    }
    case "ArrowLeft": {
      if (i % columns !== 0) return i - 1;
      return i;
    }
    default:
      return i;
  }
}

export function useCursorNavigation(
  options: CursorNavigationOptions
): CursorNavigationResult {
  const { itemCount, columns = 1, onActivate, enabled = true } = options;
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled || itemCount <= 0) return;

      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (arrowKeys.includes(e.key)) {
        e.preventDefault();
        setActiveIndex((prev) => computeNextIndex(e.key, prev, itemCount, columns));
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (prev >= 0 && prev < itemCount && onActivate) {
            onActivate(prev);
          }
          return prev;
        });
      }
    },
    [enabled, itemCount, columns, onActivate]
  );

  const handleMouseLeave = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  const itemId = useCallback(
    (index: number) => `${listId}-item-${index}`,
    [listId]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      id: itemId(index),
      role: "option" as const,
      "aria-selected": activeIndex === index,
      onMouseEnter: () => setActiveIndex(index),
      onClick: () => {
        if (onActivate) onActivate(index);
      },
    }),
    [activeIndex, itemId, onActivate]
  );

  const isActive = useCallback(
    (index: number) => activeIndex === index,
    [activeIndex]
  );

  const containerProps = {
    tabIndex: enabled ? 0 : -1,
    role: "listbox" as const,
    onKeyDown: handleKeyDown,
    onMouseLeave: handleMouseLeave,
    "aria-activedescendant":
      activeIndex >= 0 ? itemId(activeIndex) : undefined,
  };

  return {
    activeIndex: itemCount <= 0 ? -1 : activeIndex,
    setActiveIndex,
    containerProps,
    getItemProps,
    isActive,
  };
}
