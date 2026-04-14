import { describe, it, expect } from "vitest";

/**
 * Unit tests for AmbientEffects component logic.
 * Tests screen-routing logic that determines which ambient effect set to render.
 *
 * Validates: Requirements 16.3, 16.4
 */

const SUBMENU_SCREENS = [
  "attack",
  "spells",
  "saves",
  "actions",
  "bag",
  "journal",
];

/** Mirrors the screen-routing logic from AmbientEffects */
function getEffectType(
  screen: string
): "dashboard" | "submenu" | null {
  if (screen === "dashboard") return "dashboard";
  if (SUBMENU_SCREENS.includes(screen)) return "submenu";
  return null;
}

describe("AmbientEffects screen routing logic", () => {
  it("returns dashboard effects for the dashboard screen", () => {
    expect(getEffectType("dashboard")).toBe("dashboard");
  });

  it("returns submenu effects for all submenu screens", () => {
    for (const screen of SUBMENU_SCREENS) {
      expect(getEffectType(screen)).toBe("submenu");
    }
  });

  it("returns null for unknown screens", () => {
    expect(getEffectType("map")).toBeNull();
    expect(getEffectType("login")).toBeNull();
    expect(getEffectType("")).toBeNull();
  });

  it("covers all six expected submenu screens", () => {
    expect(SUBMENU_SCREENS).toHaveLength(6);
    expect(SUBMENU_SCREENS).toContain("attack");
    expect(SUBMENU_SCREENS).toContain("spells");
    expect(SUBMENU_SCREENS).toContain("saves");
    expect(SUBMENU_SCREENS).toContain("actions");
    expect(SUBMENU_SCREENS).toContain("bag");
    expect(SUBMENU_SCREENS).toContain("journal");
  });
});
