import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CharacterData } from "@/types";

/**
 * Unit tests for character data API routes
 * Validates: Requirements 15.7, 15.8
 */

const mockGetAuthenticatedCharacterId = vi.fn<() => Promise<string | null>>();
const mockGetCharacterData = vi.fn<() => Promise<CharacterData | null>>();
const mockUpdateCharacterData = vi.fn<() => Promise<CharacterData>>();

vi.mock("@/lib/session", () => ({
  getAuthenticatedCharacterId: () => mockGetAuthenticatedCharacterId(),
}));

vi.mock("@/lib/kv", () => ({
  getCharacterData: (...args: unknown[]) => mockGetCharacterData(...(args as [])),
  updateCharacterData: (...args: unknown[]) => mockUpdateCharacterData(...(args as [])),
}));

const sampleCharacter: CharacterData = {
  characterName: "Madea Blackthorn",
  race: "Half-Elf",
  charClass: "Sorcerer 5",
  level: 5,
  currentHp: 30,
  maxHp: 38,
  ac: 13,
  baseAc: 13,
  defaultBaseAc: 10,
  inspiration: 2,
  luckPoints: 3,
  shieldActive: false,
  mageArmorActive: false,
  hitDiceTotal: 5,
  hitDiceAvailable: 5,
  hitDiceSize: 6,
  proficiencyBonus: 3,
  stats: {
    STR: { value: 8, modifier: -1 },
    DEX: { value: 14, modifier: 2 },
    CON: { value: 14, modifier: 2 },
    INT: { value: 10, modifier: 0 },
    WIS: { value: 12, modifier: 1 },
    CHA: { value: 18, modifier: 4 },
  },
  skills: [],
  featsTraits: ["Shadow Walk"],
  spellSlots: { "1": 4, "2": 3, "3": 2 },
  currentSpellSlots: { "1": 3, "2": 2, "3": 1 },
  createdSpellSlots: {},
  cantrips: ["Fire Bolt"],
  spells: { "1": ["Shield"] },
  weapons: [],
  fightingStyles: {},
  saveProficiencies: ["CON", "CHA"],
  deathSaves: { successes: 0, failures: 0 },
  actions: {},
  inventory: { gear: [], utility: [], treasure: [] },
  coins: { cp: 0, sp: 0, ep: 0, gp: 50, pp: 0 },
  journal: { sessions: {}, currentSession: "" },
  characters: {},
  places: {},
  classResources: {
    sorceryPointsMax: 5,
    currentSorceryPoints: 5,
  },
};

describe("GET /api/character/get", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue(null);
    const { GET } = await import("../../character/get/route");
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns correct character data for authenticated user", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockGetCharacterData.mockResolvedValue(sampleCharacter);
    const { GET } = await import("../../character/get/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.characterName).toBe("Madea Blackthorn");
    expect(data.level).toBe(5);
    expect(data.currentHp).toBe(30);
    expect(data.maxHp).toBe(38);
    expect(data.classResources.sorceryPointsMax).toBe(5);
  });

  it("returns 404 when character data not found", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("unknown");
    mockGetCharacterData.mockResolvedValue(null);
    const { GET } = await import("../../character/get/route");
    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Character not found");
  });
});

describe("POST /api/character/update", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue(null);
    const { POST } = await import("../../character/update/route");
    const req = new Request("http://localhost/api/character/update", {
      method: "POST",
      body: JSON.stringify({ currentHp: 25 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("merges partial updates correctly and returns updated data", async () => {
    const updatedCharacter = { ...sampleCharacter, currentHp: 25 };
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockUpdateCharacterData.mockResolvedValue(updatedCharacter);
    const { POST } = await import("../../character/update/route");
    const req = new Request("http://localhost/api/character/update", {
      method: "POST",
      body: JSON.stringify({ currentHp: 25 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentHp).toBe(25);
    expect(data.characterName).toBe("Madea Blackthorn");
    expect(mockUpdateCharacterData).toHaveBeenCalledWith("madea", { currentHp: 25 });
  });

  it("merges nested partial updates (classResources)", async () => {
    const updatedCharacter = {
      ...sampleCharacter,
      classResources: { ...sampleCharacter.classResources, currentSorceryPoints: 2 },
    };
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockUpdateCharacterData.mockResolvedValue(updatedCharacter);
    const { POST } = await import("../../character/update/route");
    const req = new Request("http://localhost/api/character/update", {
      method: "POST",
      body: JSON.stringify({ classResources: { currentSorceryPoints: 2 } }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.classResources.currentSorceryPoints).toBe(2);
    expect(data.classResources.sorceryPointsMax).toBe(5);
    expect(mockUpdateCharacterData).toHaveBeenCalledWith("madea", {
      classResources: { currentSorceryPoints: 2 },
    });
  });

  it("returns 500 when updateCharacterData throws", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockUpdateCharacterData.mockRejectedValue(new Error("No character data for madea"));
    const { POST } = await import("../../character/update/route");
    const req = new Request("http://localhost/api/character/update", {
      method: "POST",
      body: JSON.stringify({ currentHp: 10 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("No character data for madea");
  });
});
