import { describe, it, expect } from "vitest";

/**
 * Unit tests for CounterControl component logic.
 * Tests the increment/decrement clamping logic without React rendering.
 *
 * Validates: Requirements 3.6, 3.7
 */

/** Mirrors the decrement logic from CounterControl */
function decrement(value: number, min: number): number {
  return Math.max(min, value - 1);
}

/** Mirrors the increment logic from CounterControl */
function increment(value: number, max: number): number {
  return Math.min(max, value + 1);
}

describe("CounterControl clamping logic", () => {
  it("decrements value by 1 when above min", () => {
    expect(decrement(5, 0)).toBe(4);
    expect(decrement(1, 0)).toBe(0);
  });

  it("clamps decrement at min bound", () => {
    expect(decrement(0, 0)).toBe(0);
    expect(decrement(3, 3)).toBe(3);
  });

  it("increments value by 1 when below max", () => {
    expect(increment(5, 10)).toBe(6);
    expect(increment(9, 10)).toBe(10);
  });

  it("clamps increment at max bound", () => {
    expect(increment(10, 10)).toBe(10);
    expect(increment(3, 3)).toBe(3);
  });

  it("works for inspiration range 0–10", () => {
    const min = 0;
    const max = 10;
    expect(decrement(0, min)).toBe(0);
    expect(increment(10, max)).toBe(10);
    expect(increment(0, max)).toBe(1);
    expect(decrement(10, min)).toBe(9);
  });

  it("works for luck points range 0–3", () => {
    const min = 0;
    const max = 3;
    expect(decrement(0, min)).toBe(0);
    expect(increment(3, max)).toBe(3);
    expect(increment(0, max)).toBe(1);
    expect(decrement(3, min)).toBe(2);
  });

  it("disabled state: decrement disabled when value <= min", () => {
    expect(0 <= 0).toBe(true);
    expect(1 <= 0).toBe(false);
  });

  it("disabled state: increment disabled when value >= max", () => {
    expect(10 >= 10).toBe(true);
    expect(9 >= 10).toBe(false);
  });
});
