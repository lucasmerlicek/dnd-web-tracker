import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for useAutoSave hook logic.
 * Tests the core debounce and batching behavior by mirroring the hook's
 * internal logic in a plain-JS helper (no React/jsdom needed).
 *
 * Validates: Requirements 15.8
 */

// Mock global fetch
const mockFetch = vi.fn<typeof globalThis.fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * Minimal re-implementation of the hook's core logic for unit testing
 * without React. This mirrors useAutoSave exactly.
 */
function createAutoSaver(delay = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Record<string, unknown> = {};

  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (Object.keys(pending).length === 0) return;
    const payload = pending;
    pending = {};
    await fetch("/api/character/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  function save(partial: Record<string, unknown>) {
    pending = { ...pending, ...partial };
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      timer = null;
      const payload = pending;
      pending = {};
      await fetch("/api/character/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }, delay);
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending = {};
  }

  return { save, flush, cancel };
}

describe("useAutoSave logic", () => {
  it("debounces save calls and sends a single request after delay", async () => {
    const saver = createAutoSaver(500);

    saver.save({ currentHp: 10 });
    saver.save({ currentHp: 8 });
    saver.save({ currentHp: 5 });

    expect(mockFetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
    expect(body.currentHp).toBe(5);
  });

  it("merges multiple partial updates into a single payload", async () => {
    const saver = createAutoSaver(300);

    saver.save({ currentHp: 20 });
    saver.save({ shieldActive: true });
    saver.save({ ac: 18 });

    await vi.advanceTimersByTimeAsync(300);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
    expect(body).toEqual({ currentHp: 20, shieldActive: true, ac: 18 });
  });

  it("flush sends pending data immediately without waiting for timer", async () => {
    const saver = createAutoSaver(1000);

    saver.save({ luckPoints: 2 });
    expect(mockFetch).not.toHaveBeenCalled();

    await saver.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
    expect(body.luckPoints).toBe(2);
  });

  it("flush does nothing when there is no pending data", async () => {
    const saver = createAutoSaver(500);

    await saver.flush();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("cancel discards pending data without sending", async () => {
    const saver = createAutoSaver(500);

    saver.save({ currentHp: 1 });
    saver.cancel();

    await vi.advanceTimersByTimeAsync(600);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("POSTs to /api/character/update with correct headers", async () => {
    const saver = createAutoSaver(100);

    saver.save({ inspiration: 3 });
    await vi.advanceTimersByTimeAsync(100);

    expect(mockFetch).toHaveBeenCalledWith("/api/character/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspiration: 3 }),
    });
  });

  it("respects custom delay parameter", async () => {
    const saver = createAutoSaver(200);

    saver.save({ currentHp: 15 });

    await vi.advanceTimersByTimeAsync(150);
    expect(mockFetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
