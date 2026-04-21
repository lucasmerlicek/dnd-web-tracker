import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  snakeToCamel,
  convertKeys,
  transformCharacter,
  transformMarkers,
  migrateCharacterData,
  levelUpMadeaToLevel7,
} from "../migrate";

describe("snakeToCamel", () => {
  it("converts snake_case to camelCase", () => {
    expect(snakeToCamel("hello_world")).toBe("helloWorld");
    expect(snakeToCamel("current_hp")).toBe("currentHp");
    expect(snakeToCamel("fey_bane_used")).toBe("feyBaneUsed");
  });

  it("leaves already camelCase strings unchanged", () => {
    expect(snakeToCamel("helloWorld")).toBe("helloWorld");
    expect(snakeToCamel("STR")).toBe("STR");
  });

  it("handles single word", () => {
    expect(snakeToCamel("name")).toBe("name");
  });
});

describe("convertKeys", () => {
  it("converts all object keys recursively", () => {
    const input = {
      character_name: "Test",
      death_saves: { success_count: 1 },
    };
    const result = convertKeys(input) as Record<string, unknown>;
    expect(result).toHaveProperty("characterName", "Test");
    expect(result).toHaveProperty("deathSaves");
    expect((result.deathSaves as Record<string, unknown>).successCount).toBe(1);
  });

  it("converts keys inside arrays of objects", () => {
    const input = [{ magic_bonus: 2 }, { magic_bonus: 0 }];
    const result = convertKeys(input) as Array<Record<string, unknown>>;
    expect(result[0]).toHaveProperty("magicBonus", 2);
    expect(result[1]).toHaveProperty("magicBonus", 0);
  });

  it("leaves primitives unchanged", () => {
    expect(convertKeys(42)).toBe(42);
    expect(convertKeys("hello")).toBe("hello");
    expect(convertKeys(null)).toBe(null);
    expect(convertKeys(true)).toBe(true);
  });
});

describe("transformCharacter", () => {
  it("transforms Madea legacy data correctly", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    const result = transformCharacter(raw, "madea");

    // Identity
    expect(result.characterName).toBe("Madea Blackthorn");
    expect(result.charClass).toBe("Sorcerer 5");
    expect(result.level).toBe(5);

    // Health
    expect(result.currentHp).toBe(42);
    expect(result.maxHp).toBe(42);
    expect(result.defaultBaseAc).toBe(10);

    // Class resources consolidated
    expect(result.classResources.sorceryPointsMax).toBe(5);
    expect(result.classResources.currentSorceryPoints).toBe(5);
    expect(result.classResources.ravenFormActive).toBe(false);
    expect(result.classResources.ravenFormUsesRemaining).toBe(1);
    expect(result.classResources.ravenFormMaxUses).toBe(1);
    expect(result.classResources.sorcerousRestorationUsed).toBe(false);
    expect(result.classResources.innateSorceryActive).toBe(false);
    expect(result.classResources.innateSorceryUsesRemaining).toBe(2);
    expect(result.classResources.innateSorceryMaxUses).toBe(2);
    expect(result.classResources.feyBaneUsed).toBe(false);
    expect(result.classResources.feyMistyStepUsed).toBe(false);

    // Flat flags should NOT exist on root
    expect("sorceryPointsMax" in result).toBe(false);
    expect("ravenFormActive" in result).toBe(false);

    // UI-only keys removed
    expect("currentCharacter" in result).toBe(false);
    expect("characterPage" in result).toBe(false);

    // Weapons camelCase
    expect(result.weapons[0].damageDice).toBe("1d4");
    expect(result.weapons[0].attackStat).toBe("DEX");
    expect(result.weapons[0].magicBonus).toBe(0);

    // Journal preserved
    expect(Object.keys(result.journal.sessions).length).toBeGreaterThan(0);
    expect(result.journal.currentSession).toBe("Session 2");

    // Skills, feats, spells preserved
    expect(result.skills.length).toBe(18);
    expect(result.featsTraits.length).toBeGreaterThan(0);
    expect(result.cantrips.length).toBe(5);
    expect(result.spells["1st"].length).toBe(6);

    // Inventory and coins
    expect(result.inventory.gear).toContain("Dagger");
    expect(result.coins.gp).toBe(10);

    // Characters and places
    expect(result.characters).toHaveProperty("Tom Dike");
    expect(result.places).toHaveProperty("Kel Daron");
  });

  it("transforms Ramil legacy data and adds defaultBaseAc", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Ramil/character_data.json"),
        "utf-8"
      )
    );
    const result = transformCharacter(raw, "ramil");

    // Identity
    expect(result.characterName).toBe("Ramil al-Sayif");
    expect(result.charClass).toBe("Fighter 1 / Wizard 4 (Bladesinger)");

    // defaultBaseAc should be added as 13
    expect(result.defaultBaseAc).toBe(13);

    // Class resources consolidated
    expect(result.classResources.bladesongActive).toBe(false);
    expect(result.classResources.bladesongUsesRemaining).toBe(4);
    expect(result.classResources.bladesongMaxUses).toBe(4);
    expect(result.classResources.preparedSpells).toContain("Shield");
    expect(result.classResources.autoPreparedSpells).toContain("Charm Person");
    expect(result.classResources.druidCharmPersonUsed).toBe(false);

    // Flat flags should NOT exist on root
    expect("bladesongActive" in result).toBe(false);
    expect("preparedSpells" in result).toBe(false);

    // fightingStyles cleaned (only booleans, camelCase)
    expect(result.fightingStyles.twoWeaponFighting).toBe(true);
    expect(result.fightingStyles.dueling).toBe(false);
    expect("duelingBonus" in result.fightingStyles).toBe(false);

    // Weapons
    expect(result.weapons.length).toBe(3);
    expect(result.weapons[0].damageDice).toBe("1d6");

    // Journal sessions
    expect(Object.keys(result.journal.sessions).length).toBeGreaterThan(5);

    // createdSpellSlots defaults to empty
    expect(result.createdSpellSlots).toEqual({});
  });
});

describe("transformMarkers", () => {
  it("transforms Ramil markers with map field and camelCase timestamps", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Ramil/map_markers.json"),
        "utf-8"
      )
    );
    const result = transformMarkers(raw);

    expect(result.length).toBe(5);

    // All markers should have map: 'valerion'
    for (const marker of result) {
      expect(marker.map).toBe("valerion");
      expect(marker.id).toBeTruthy();
      expect(marker.createdAt).toBeTruthy();
      expect(marker.updatedAt).toBeTruthy();
      expect(marker.position).toHaveProperty("x");
      expect(marker.position).toHaveProperty("y");
    }

    // Check specific marker
    const atherion = result.find((m) => m.title === "Atherion");
    expect(atherion).toBeDefined();
    expect(atherion!.category).toBe("note");
    expect(atherion!.description).toBe("Somewhere here the school is located");
  });

  it("handles empty markers array", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/map_markers.json"),
        "utf-8"
      )
    );
    const result = transformMarkers(raw);
    expect(result).toEqual([]);
  });
});


describe("migrateCharacterData", () => {
  it("converts Madea inventory strings to structured inventoryItems", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "madea");
    const migrated = migrateCharacterData(base);

    // inventoryItems should exist
    const items = (migrated as Record<string, unknown>).inventoryItems as {
      gear: Array<{ id: string; name: string; description: string; quantity: number; equipped: boolean; requiresAttunement: boolean; attuned: boolean; statModifiers: unknown[] }>;
      utility: Array<{ id: string; name: string; description: string; quantity: number }>;
      treasure: Array<{ id: string; name: string; description: string; quantity: number; estimatedValue: number }>;
    };
    expect(items).toBeDefined();

    // Gear items match original inventory.gear
    expect(items.gear.length).toBe(base.inventory.gear.length);
    expect(items.gear[0].name).toBe("Dagger");
    expect(items.gear[0].quantity).toBe(1);
    expect(items.gear[0].equipped).toBe(false);
    expect(items.gear[0].requiresAttunement).toBe(false);
    expect(items.gear[0].attuned).toBe(false);
    expect(items.gear[0].statModifiers).toEqual([]);
    expect(items.gear[0].id).toBeTruthy();
    expect(items.gear[0].description).toBe("");

    // Utility items
    expect(items.utility.length).toBe(base.inventory.utility.length);
    expect(items.utility[0].name).toBe("Herbalism Kit");
    expect(items.utility[0].quantity).toBe(1);

    // Treasure items (Madea has empty treasure)
    expect(items.treasure.length).toBe(0);

    // Legacy inventory should still exist
    expect(migrated.inventory.gear).toContain("Dagger");
  });

  it("converts Ramil inventory strings to structured inventoryItems", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Ramil/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "ramil");
    const migrated = migrateCharacterData(base);

    const items = (migrated as Record<string, unknown>).inventoryItems as {
      gear: Array<{ name: string; quantity: number }>;
      utility: Array<{ name: string; quantity: number }>;
      treasure: Array<{ name: string; quantity: number; estimatedValue: number }>;
    };

    expect(items.gear.length).toBe(4);
    expect(items.utility.length).toBe(5);
    expect(items.treasure.length).toBe(1);
    expect(items.treasure[0].name).toBe("Malekirs Neclace (86GP, 7SP)");
    expect(items.treasure[0].estimatedValue).toBe(0);
  });

  it("creates Madea hitDicePools as single Sorcerer pool", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "madea");
    const migrated = migrateCharacterData(base);

    const pools = (migrated as Record<string, unknown>).hitDicePools as Array<{
      className: string; dieSize: number; total: number; available: number;
    }>;
    expect(pools).toHaveLength(1);
    expect(pools[0].className).toBe("Sorcerer");
    expect(pools[0].dieSize).toBe(6);
    expect(pools[0].total).toBe(5);
    expect(pools[0].available).toBe(5);
  });

  it("creates Ramil hitDicePools as Fighter d10 + Wizard d6", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Ramil/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "ramil");
    const migrated = migrateCharacterData(base);

    const pools = (migrated as Record<string, unknown>).hitDicePools as Array<{
      className: string; dieSize: number; total: number; available: number;
    }>;
    expect(pools).toHaveLength(2);
    expect(pools[0]).toEqual({ className: "Fighter", dieSize: 10, total: 1, available: 1 });
    expect(pools[1]).toEqual({ className: "Wizard", dieSize: 6, total: 4, available: 4 });
  });

  it("defaults spellCreatedWeapons to empty array", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "madea");
    const migrated = migrateCharacterData(base);

    expect((migrated as Record<string, unknown>).spellCreatedWeapons).toEqual([]);
  });

  it("does not overwrite existing inventoryItems", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "madea");

    // Pre-set inventoryItems
    const existing = { gear: [], utility: [], treasure: [] };
    (base as Record<string, unknown>).inventoryItems = existing;

    const migrated = migrateCharacterData(base);
    expect((migrated as Record<string, unknown>).inventoryItems).toBe(existing);
  });

  it("does not overwrite existing hitDicePools", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "madea");

    const existingPools = [{ className: "Custom", dieSize: 8, total: 3, available: 2 }];
    (base as Record<string, unknown>).hitDicePools = existingPools;

    const migrated = migrateCharacterData(base);
    expect((migrated as Record<string, unknown>).hitDicePools).toBe(existingPools);
  });

  it("does not overwrite existing spellCreatedWeapons", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "madea");

    const existingWeapons = [{ id: "test", name: "Shadow Blade" }];
    (base as Record<string, unknown>).spellCreatedWeapons = existingWeapons;

    const migrated = migrateCharacterData(base);
    expect((migrated as Record<string, unknown>).spellCreatedWeapons).toBe(existingWeapons);
  });

  it("does not mutate the input object", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    const base = transformCharacter(raw, "madea");
    const baseCopy = JSON.parse(JSON.stringify(base));

    migrateCharacterData(base);

    // Original should be unchanged
    expect(base).toEqual(baseCopy);
  });
});


describe("levelUpMadeaToLevel7", () => {
  function getMadeaBase() {
    const raw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../legacy/Tracker_Madea/character_data.json"),
        "utf-8"
      )
    );
    return migrateCharacterData(transformCharacter(raw, "madea"));
  }

  it("sets level to 7 and proficiencyBonus to 3", () => {
    const base = getMadeaBase();
    const result = levelUpMadeaToLevel7(base);

    expect(result.level).toBe(7);
    expect(result.proficiencyBonus).toBe(3);
  });

  it("increases maxHp and currentHp by 16", () => {
    const base = getMadeaBase();
    const result = levelUpMadeaToLevel7(base);

    expect(result.maxHp).toBe(base.maxHp + 16);
    expect(result.currentHp).toBe(base.currentHp + 16);
  });

  it("adds 3rd-level and 4th-level spell slots", () => {
    const base = getMadeaBase();
    const result = levelUpMadeaToLevel7(base);

    expect(result.spellSlots["3rd"]).toBe((base.spellSlots["3rd"] ?? 0) + 1);
    expect(result.currentSpellSlots["3rd"]).toBe((base.currentSpellSlots["3rd"] ?? 0) + 1);
    expect(result.spellSlots["4th"]).toBe((base.spellSlots["4th"] ?? 0) + 1);
    expect(result.currentSpellSlots["4th"]).toBe((base.currentSpellSlots["4th"] ?? 0) + 1);
  });

  it("adds Counterspell to 3rd-level spells", () => {
    const base = getMadeaBase();
    const result = levelUpMadeaToLevel7(base);

    expect(result.spells["3rd"]).toContain("Counterspell");
  });

  it("adds Banishment to 4th-level spells", () => {
    const base = getMadeaBase();
    const result = levelUpMadeaToLevel7(base);

    expect(result.spells["4th"]).toContain("Banishment");
  });

  it("sets sorcery points max to 7 and current to 7", () => {
    const base = getMadeaBase();
    const result = levelUpMadeaToLevel7(base);

    const cr = result.classResources as Record<string, unknown>;
    expect(cr.sorceryPointsMax).toBe(7);
    expect(cr.currentSorceryPoints).toBe(7);
  });

  it("sets innate sorcery max uses to 2 and uses remaining to 2", () => {
    const base = getMadeaBase();
    const result = levelUpMadeaToLevel7(base);

    const cr = result.classResources as Record<string, unknown>;
    expect(cr.innateSorceryMaxUses).toBe(2);
    expect(cr.innateSorceryUsesRemaining).toBe(2);
  });

  it("verifies Hound of Ill Omen is present in spell data", () => {
    const base = getMadeaBase();
    const result = levelUpMadeaToLevel7(base);

    const allSpells = Object.values(result.spells).flat();
    expect(allSpells).toContain("Hound of Ill Omen");
  });

  it("does not mutate the input object", () => {
    const base = getMadeaBase();
    const baseCopy = JSON.parse(JSON.stringify(base));

    levelUpMadeaToLevel7(base);

    expect(base).toEqual(baseCopy);
  });

  it("throws if Hound of Ill Omen is missing from spell data", () => {
    const base = getMadeaBase();
    // Remove Hound of Ill Omen from all spell levels
    for (const level of Object.keys(base.spells)) {
      base.spells[level] = base.spells[level].filter(
        (s: string) => s !== "Hound of Ill Omen"
      );
    }

    expect(() => levelUpMadeaToLevel7(base)).toThrow("Hound of Ill Omen");
  });
});
