import { describe, it, expect, vi } from "vitest";
import {
  pushSnapshot,
  popSnapshot,
  captureSnapshot,
  UndoSnapshot,
} from "../undo-stack";
import type { CharacterData } from "../../types/character";

const makeCharData = (overrides: Partial<CharacterData> = {}): CharacterData =>
  ({
    characterName: "Test",
    currentHp: 30,
    maxHp: 40,
    ac: 15,
    baseAc: 13,
    defaultBaseAc: 10,
    inspiration: 1,
    luckPoints: 2,
    level: 5,
    ...overrides,
  } as CharacterData);

const makeSnapshot = (
  fields: Partial<CharacterData> = {},
  timestamp = Date.now()
): UndoSnapshot => ({ timestamp, fields });

describe("pushSnapshot", () => {
  it("adds a snapshot to an empty stack", () => {
    const snap = makeSnapshot({ currentHp: 25 });
    const result = pushSnapshot([], snap);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(snap);
  });

  it("appends to the end of the stack", () => {
    const snap1 = makeSnapshot({ currentHp: 25 }, 1);
    const snap2 = makeSnapshot({ currentHp: 20 }, 2);
    const result = pushSnapshot([snap1], snap2);
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(snap2);
  });

  it("enforces default max size of 20", () => {
    const stack: UndoSnapshot[] = Array.from({ length: 20 }, (_, i) =>
      makeSnapshot({ currentHp: i }, i)
    );
    const newSnap = makeSnapshot({ currentHp: 99 }, 100);
    const result = pushSnapshot(stack, newSnap);
    expect(result).toHaveLength(20);
    expect(result[0].timestamp).toBe(1);
    expect(result[19]).toBe(newSnap);
  });

  it("enforces custom max size", () => {
    const stack: UndoSnapshot[] = Array.from({ length: 5 }, (_, i) =>
      makeSnapshot({}, i)
    );
    const newSnap = makeSnapshot({}, 10);
    const result = pushSnapshot(stack, newSnap, 3);
    expect(result).toHaveLength(3);
    expect(result[2]).toBe(newSnap);
  });

  it("does not mutate the original stack", () => {
    const stack = [makeSnapshot({ currentHp: 10 })];
    const original = [...stack];
    pushSnapshot(stack, makeSnapshot({ currentHp: 20 }));
    expect(stack).toEqual(original);
  });
});

describe("popSnapshot", () => {
  it("returns null snapshot for empty stack", () => {
    const { snapshot, remaining } = popSnapshot([]);
    expect(snapshot).toBeNull();
    expect(remaining).toEqual([]);
  });

  it("returns the last snapshot and remaining stack", () => {
    const snap1 = makeSnapshot({ currentHp: 10 }, 1);
    const snap2 = makeSnapshot({ currentHp: 20 }, 2);
    const { snapshot, remaining } = popSnapshot([snap1, snap2]);
    expect(snapshot).toBe(snap2);
    expect(remaining).toEqual([snap1]);
  });

  it("returns empty remaining for single-element stack", () => {
    const snap = makeSnapshot({ currentHp: 10 });
    const { snapshot, remaining } = popSnapshot([snap]);
    expect(snapshot).toBe(snap);
    expect(remaining).toEqual([]);
  });

  it("does not mutate the original stack", () => {
    const stack = [makeSnapshot({}, 1), makeSnapshot({}, 2)];
    const original = [...stack];
    popSnapshot(stack);
    expect(stack).toEqual(original);
  });
});

describe("captureSnapshot", () => {
  it("captures specified keys from CharacterData", () => {
    const data = makeCharData({ currentHp: 30, inspiration: 1 });
    const snap = captureSnapshot(data, ["currentHp", "inspiration"]);
    expect(snap.fields.currentHp).toBe(30);
    expect(snap.fields.inspiration).toBe(1);
    expect(snap.fields).not.toHaveProperty("ac");
  });

  it("sets a timestamp", () => {
    const before = Date.now();
    const snap = captureSnapshot(makeCharData(), ["currentHp"]);
    const after = Date.now();
    expect(snap.timestamp).toBeGreaterThanOrEqual(before);
    expect(snap.timestamp).toBeLessThanOrEqual(after);
  });

  it("returns empty fields when no keys specified", () => {
    const snap = captureSnapshot(makeCharData(), []);
    expect(Object.keys(snap.fields)).toHaveLength(0);
  });

  it("only includes keys that exist on the data", () => {
    const data = makeCharData();
    const snap = captureSnapshot(data, ["currentHp", "hitDicePools"]);
    expect(snap.fields.currentHp).toBe(30);
    expect(snap.fields).not.toHaveProperty("hitDicePools");
  });
});
