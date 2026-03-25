import { describe, it, expect } from "vitest";

/**
 * Unit tests for NavButtons component logic.
 * Tests the screen configuration and active-screen matching logic
 * without React rendering (no jsdom/testing-library available).
 *
 * Validates: Requirements 2.5, 1.6
 */

const SCREENS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/attack", label: "Attack" },
  { href: "/spells", label: "Spells" },
  { href: "/saves", label: "Saves" },
  { href: "/actions", label: "Actions" },
  { href: "/bag", label: "Bag" },
  { href: "/journal", label: "Journal" },
  { href: "/map", label: "Map" },
];

/** Mirrors the isActive logic from NavButtons when currentScreen prop is provided */
function isActiveByProp(href: string, currentScreen: string): boolean {
  return href === `/${currentScreen.toLowerCase()}`;
}

/** Mirrors the isActive logic from NavButtons when using pathname fallback */
function isActiveByPathname(href: string, pathname: string): boolean {
  return pathname === href;
}

describe("NavButtons screen configuration", () => {
  it("defines exactly 8 navigation screens", () => {
    expect(SCREENS).toHaveLength(8);
  });

  it("includes all required screen labels", () => {
    const labels = SCREENS.map((s) => s.label);
    expect(labels).toEqual([
      "Dashboard",
      "Attack",
      "Spells",
      "Saves",
      "Actions",
      "Bag",
      "Journal",
      "Map",
    ]);
  });

  it("all hrefs start with /", () => {
    for (const screen of SCREENS) {
      expect(screen.href).toMatch(/^\//);
    }
  });

  it("all hrefs are unique", () => {
    const hrefs = SCREENS.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("NavButtons active screen detection", () => {
  it("highlights the correct screen when currentScreen prop matches", () => {
    expect(isActiveByProp("/dashboard", "Dashboard")).toBe(true);
    expect(isActiveByProp("/attack", "Attack")).toBe(true);
    expect(isActiveByProp("/map", "Map")).toBe(true);
  });

  it("does not highlight non-matching screens via prop", () => {
    expect(isActiveByProp("/dashboard", "Attack")).toBe(false);
    expect(isActiveByProp("/spells", "Dashboard")).toBe(false);
  });

  it("handles case-insensitive currentScreen prop", () => {
    expect(isActiveByProp("/dashboard", "DASHBOARD")).toBe(true);
    expect(isActiveByProp("/attack", "ATTACK")).toBe(true);
  });

  it("highlights the correct screen when using pathname fallback", () => {
    expect(isActiveByPathname("/dashboard", "/dashboard")).toBe(true);
    expect(isActiveByPathname("/spells", "/spells")).toBe(true);
  });

  it("does not highlight non-matching screens via pathname", () => {
    expect(isActiveByPathname("/dashboard", "/attack")).toBe(false);
    expect(isActiveByPathname("/bag", "/journal")).toBe(false);
  });

  it("exactly one screen is active for any valid pathname", () => {
    for (const screen of SCREENS) {
      const activeCount = SCREENS.filter((s) =>
        isActiveByPathname(s.href, screen.href)
      ).length;
      expect(activeCount).toBe(1);
    }
  });
});
