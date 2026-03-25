import { describe, it, expect } from "vitest";
import { deepMerge } from "../kv";

describe("deepMerge", () => {
  it("merges flat properties", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("deep-merges nested objects", () => {
    const target = { nested: { x: 1, y: 2 } };
    const source = { nested: { y: 3, z: 4 } };
    const result = deepMerge(target, source);
    expect(result).toEqual({ nested: { x: 1, y: 3, z: 4 } });
  });

  it("replaces arrays instead of merging them", () => {
    const target = { items: ["a", "b"] };
    const source = { items: ["c"] };
    const result = deepMerge(target, source);
    expect(result).toEqual({ items: ["c"] });
  });

  it("does not mutate the target object", () => {
    const target = { a: 1, nested: { x: 10 } };
    const source = { a: 2, nested: { y: 20 } };
    deepMerge(target, source);
    expect(target).toEqual({ a: 1, nested: { x: 10 } });
  });

  it("handles partial CharacterData-like updates", () => {
    const target = {
      characterName: "Madea",
      currentHp: 30,
      maxHp: 35,
      coins: { cp: 0, sp: 10, ep: 0, gp: 50, pp: 0 },
      classResources: { currentSorceryPoints: 5, sorceryPointsMax: 5 },
    };
    const source = {
      currentHp: 25,
      coins: { gp: 45 },
      classResources: { currentSorceryPoints: 3 },
    };
    const result = deepMerge(target, source);
    expect(result).toEqual({
      characterName: "Madea",
      currentHp: 25,
      maxHp: 35,
      coins: { cp: 0, sp: 10, ep: 0, gp: 45, pp: 0 },
      classResources: { currentSorceryPoints: 3, sorceryPointsMax: 5 },
    });
  });

  it("overwrites primitives with source values", () => {
    const target = { flag: true, count: 5 };
    const source = { flag: false, count: 0 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ flag: false, count: 0 });
  });
});
