import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  snakeToCamel,
  convertKeys,
  transformCharacter,
  transformMarkers,
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
