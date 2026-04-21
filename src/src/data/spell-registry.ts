import type { SpellData } from "@/types/spell";

export const SPELL_REGISTRY: Record<string, SpellData> = {
  // ─── CANTRIPS (Level 0) ───────────────────────────────────────────

  "Poison Spray": {
    name: "Poison Spray",
    level: 0,
    school: "Necromancy",
    castingTime: "1 action",
    range: "30 feet",
    components: { verbal: true, somatic: true, material: false },
    duration: "Instantaneous",
    description:
      "You spray a puff of noxious gas at one creature within range. The target must succeed on a Constitution saving throw or take 1d12 Poison damage.",
    damageDice: "1d12",
    damageType: "poison",
    saveType: "CON",
    cantripScaling: true,
  },

  "Fire Bolt": {
    name: "Fire Bolt",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: { verbal: true, somatic: true, material: false },
    duration: "Instantaneous",
    description:
      "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 Fire damage. A flammable object hit by this spell catches fire if it isn't being worn or carried.",
    damageDice: "1d10",
    damageType: "fire",
    attackRoll: true,
    cantripScaling: true,
  },

  "Mage Hand": {
    name: "Mage Hand",
    level: 0,
    school: "Conjuration",
    castingTime: "1 action",
    range: "30 feet",
    components: { verbal: true, somatic: true, material: false },
    duration: "1 minute",
    description:
      "A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again. You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour out the contents of a vial. You can move the hand up to 30 feet each time you use it. The hand can't attack, activate magic items, or carry more than 10 pounds.",
  },

  "Infestation": {
    name: "Infestation",
    level: 0,
    school: "Conjuration",
    castingTime: "1 action",
    range: "30 feet",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a living flea" },
    duration: "Instantaneous",
    description:
      "You cause a cloud of mites, fleas, and other parasites to appear momentarily on one creature you can see within range. The target must succeed on a Constitution saving throw or take 1d6 Poison damage and move 5 feet in a random direction. Roll a d4 for the direction: 1 north, 2 south, 3 east, 4 west.",
    damageDice: "1d6",
    damageType: "poison",
    saveType: "CON",
    cantripScaling: true,
  },

  "Message": {
    name: "Message",
    level: 0,
    school: "Transmutation",
    castingTime: "1 action",
    range: "120 feet",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a short piece of copper wire" },
    duration: "1 round",
    description:
      "You point your finger toward a creature within range and whisper a message. The target (and only the target) hears the message and can reply in a whisper that only you can hear. You can cast this spell through solid objects if you are familiar with the target and know it is beyond the barrier. Magical silence, 1 foot of stone, 1 inch of common metal, a thin sheet of lead, or 3 feet of wood blocks the spell.",
  },

  "Guidance": {
    name: "Guidance",
    level: 0,
    school: "Divination",
    castingTime: "1 action",
    range: "Touch",
    components: { verbal: true, somatic: true, material: false },
    duration: "Concentration, up to 1 minute",
    description:
      "You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice. It can roll the die before or after making the ability check. The spell then ends.",
  },

  "Mending": {
    name: "Mending",
    level: 0,
    school: "Transmutation",
    castingTime: "1 minute",
    range: "Touch",
    components: { verbal: true, somatic: true, material: true, materialDescription: "two lodestones" },
    duration: "Instantaneous",
    description:
      "This spell repairs a single break or tear in an object you touch, such as a broken chain link, two halves of a broken key, a torn cloak, or a leaking wineskin. As long as the break or tear is no larger than 1 foot in any dimension, you mend it, leaving no trace of the former damage. This spell can physically repair a magic item or construct, but the spell can't restore magic to such an object.",
  },

  "Booming Blade": {
    name: "Booming Blade",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (5-foot radius)",
    components: { verbal: false, somatic: true, material: true, materialDescription: "a melee weapon worth at least 1 sp" },
    duration: "1 round",
    description:
      "You brandish the weapon used in the spell's casting and make a melee attack with it against one creature within 5 feet of you. On a hit, the target suffers the weapon attack's normal effects and then becomes sheathed in booming energy until the start of your next turn. If the target willingly moves 5 feet or more before then, the target takes 1d8 Thunder damage, and the spell ends.",
    damageDice: "1d8",
    damageType: "thunder",
    cantripScaling: true,
  },

  "Green Flame Blade": {
    name: "Green Flame Blade",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (5-foot radius)",
    components: { verbal: false, somatic: true, material: true, materialDescription: "a melee weapon worth at least 1 sp" },
    duration: "Instantaneous",
    description:
      "You brandish the weapon used in the spell's casting and make a melee attack with it against one creature within 5 feet of you. On a hit, the target suffers the weapon attack's normal effects, and you can cause green fire to leap from the target to a different creature of your choice that you can see within 5 feet of it. The second creature takes Fire damage equal to your spellcasting ability modifier. At higher levels, the melee attack deals an extra 1d8 Fire damage and the leap damage increases to 1d8 + your spellcasting ability modifier.",
    damageDice: "1d8",
    damageType: "fire",
    cantripScaling: true,
  },

  // ─── 1ST LEVEL SPELLS ─────────────────────────────────────────────

  "Mage Armor": {
    name: "Mage Armor",
    level: 1,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a piece of cured leather" },
    duration: "8 hours",
    description:
      "You touch a willing creature who isn't wearing armor, and a protective magical force surrounds it until the spell ends. The target's base AC becomes 13 + its Dexterity modifier. The spell ends if the target dons armor or if you dismiss the spell as an action.",
  },

  "Shield": {
    name: "Shield",
    level: 1,
    school: "Abjuration",
    castingTime: "1 reaction, which you take when you are hit by an attack or targeted by the Magic Missile spell",
    range: "Self",
    components: { verbal: true, somatic: true, material: false },
    duration: "1 round",
    description:
      "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from Magic Missile.",
  },

  "Silvery Barbs": {
    name: "Silvery Barbs",
    level: 1,
    school: "Enchantment",
    castingTime: "1 reaction, which you take when a creature you can see within 60 feet of you succeeds on an attack roll, an ability check, or a saving throw",
    range: "60 feet",
    components: { verbal: true, somatic: false, material: false },
    duration: "Instantaneous",
    description:
      "You magically distract the triggering creature and turn its moment of success into failure. The creature must reroll the d20 and use the lower roll. You can then choose a different creature you can see within range (you can choose yourself). The chosen creature has Advantage on the next attack roll, ability check, or saving throw it makes within 1 minute.",
  },

  "Chromatic Orb": {
    name: "Chromatic Orb",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "90 feet",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a diamond worth at least 50 gp" },
    duration: "Instantaneous",
    description:
      "You hurl an orb of energy at a creature you can see within range. You choose Acid, Cold, Fire, Lightning, Poison, or Thunder for the type of orb you create, and then make a ranged spell attack against the target. On a hit, the creature takes 3d8 damage of the type you chose. If you roll the same number on two or more of the d8s, the orb leaps to a different creature of your choice within 30 feet of the target. Make a new attack roll against the new target, and make a new damage roll. The orb can't leap again.",
    damageDice: "3d8",
    damageType: "acid",
    attackRoll: true,
    upcast: { perLevel: "1d8" },
    upcastDescription:
      "When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d8 for each slot level above 1st.",
  },

  "Bane": {
    name: "Bane",
    level: 1,
    school: "Enchantment",
    castingTime: "1 action",
    range: "30 feet",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a drop of blood" },
    duration: "Concentration, up to 1 minute",
    description:
      "Up to three creatures of your choice that you can see within range must make Charisma saving throws. Whenever a target that fails this saving throw makes an attack roll or a saving throw before the spell ends, the target must roll a d4 and subtract the number rolled from the attack roll or saving throw.",
    saveType: "CHA",
    upcast: { perLevel: "1 target" },
    upcastDescription:
      "When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.",
  },

  "Thunderwave": {
    name: "Thunderwave",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (15-foot cube)",
    components: { verbal: true, somatic: true, material: false },
    duration: "Instantaneous",
    description:
      "A wave of thunderous force sweeps out from you. Each creature in a 15-foot Cube originating from you must make a Constitution saving throw. On a failed save, a creature takes 2d8 Thunder damage and is pushed 10 feet away from you. On a successful save, the creature takes half as much damage and isn't pushed. In addition, unsecured objects that are completely within the area of effect are automatically pushed 10 feet away from you by the spell's effect, and the spell emits a thunderous boom audible out to 300 feet.",
    damageDice: "2d8",
    damageType: "thunder",
    saveType: "CON",
    upcast: { perLevel: "1d8" },
    upcastDescription:
      "When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d8 for each slot level above 1st.",
  },

  "Absorb Elements": {
    name: "Absorb Elements",
    level: 1,
    school: "Abjuration",
    castingTime: "1 reaction, which you take when you take acid, cold, fire, lightning, or thunder damage",
    range: "Self",
    components: { verbal: false, somatic: true, material: false },
    duration: "1 round",
    description:
      "The spell captures some of the incoming energy, lessening its effect on you and storing it for your next melee attack. You have Resistance to the triggering damage type until the start of your next turn. Also, the first time you hit with a melee attack on your next turn, the target takes an extra 1d6 damage of the triggering type, and the spell ends.",
    damageDice: "1d6",
    damageType: "acid",
    upcast: { perLevel: "1d6" },
    upcastDescription:
      "When you cast this spell using a spell slot of 2nd level or higher, the extra damage dealt by the melee attack increases by 1d6 for each slot level above 1st.",
  },

  "Prot E&G": {
    name: "Protection from Evil and Good",
    level: 1,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: { verbal: true, somatic: true, material: true, materialDescription: "holy water or powdered silver and iron, which the spell consumes" },
    duration: "Concentration, up to 10 minutes",
    description:
      "Until the spell ends, one willing creature you touch is protected against certain types of creatures: Aberrations, Celestials, Elementals, Fey, Fiends, and Undead. The protection grants several benefits. Creatures of those types have Disadvantage on attack rolls against the target. The target also can't be charmed, frightened, or possessed by them. If the target is already charmed, frightened, or possessed by such a creature, the target has Advantage on any new saving throw against the relevant effect.",
  },

  "Sleep": {
    name: "Sleep",
    level: 1,
    school: "Enchantment",
    castingTime: "1 action",
    range: "60 feet",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a pinch of fine sand, rose petals, or a cricket" },
    duration: "Concentration, up to 1 minute",
    description:
      "Each creature of your choice within 5 feet of a point you choose within range must succeed on a Wisdom saving throw or have the Unconscious condition until the spell ends. A creature awakens early if it takes damage or someone uses an action to shake or slap it awake.",
    saveType: "WIS",
    upcast: { perLevel: "1 target" },
    upcastDescription:
      "When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature within 5 feet of the point for each slot level above 1st.",
  },

  "Identify": {
    name: "Identify",
    level: 1,
    school: "Divination",
    castingTime: "1 minute",
    range: "Touch",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a pearl worth at least 100 gp and an owl feather" },
    duration: "Instantaneous",
    description:
      "You choose one object that you must touch throughout the casting of the spell. If it is a magic item or some other magic-imbued object, you learn its properties and how to use them, whether it requires attunement to use, and how many charges it has, if any. You learn whether any spells are affecting the item and what they are. If the item was created by a spell, you learn which spell created it. If you instead touch a creature throughout the casting, you learn what spells, if any, are currently affecting it.",
    ritual: true,
  },

  "Burning Hands": {
    name: "Burning Hands",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (15-foot cone)",
    components: { verbal: true, somatic: true, material: false },
    duration: "Instantaneous",
    description:
      "As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth from your outstretched fingertips. Each creature in a 15-foot Cone must make a Dexterity saving throw. A creature takes 3d6 Fire damage on a failed save, or half as much damage on a successful one. The fire ignites any flammable objects in the area that aren't being worn or carried.",
    damageDice: "3d6",
    damageType: "fire",
    saveType: "DEX",
    upcast: { perLevel: "1d6" },
    upcastDescription:
      "When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.",
  },

  "Ice Knife": {
    name: "Ice Knife",
    level: 1,
    school: "Conjuration",
    castingTime: "1 action",
    range: "60 feet",
    components: { verbal: false, somatic: true, material: false },
    duration: "Instantaneous",
    description:
      "You create a shard of ice and fling it at one creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 Piercing damage. Hit or miss, the shard then explodes. The target and each creature within 5 feet of it must succeed on a Dexterity saving throw or take 2d6 Cold damage.",
    damageDice: "1d10",
    damageType: "piercing",
    attackRoll: true,
    saveType: "DEX",
    upcast: { perLevel: "1d6" },
    upcastDescription:
      "When you cast this spell using a spell slot of 2nd level or higher, the Cold damage dealt by the explosion increases by 1d6 for each slot level above 1st.",
  },

  "Charm Person": {
    name: "Charm Person",
    level: 1,
    school: "Enchantment",
    castingTime: "1 action",
    range: "30 feet",
    components: { verbal: true, somatic: true, material: false },
    duration: "1 hour",
    description:
      "You attempt to charm a Humanoid you can see within range. It must make a Wisdom saving throw, and it does so with Advantage if you or your companions are fighting it. On a failed save, the creature is Charmed by you until the spell ends or until you or your companions do anything harmful to it. The Charmed creature regards you as a friendly acquaintance. When the spell ends, the creature knows it was Charmed by you.",
    saveType: "WIS",
    upcast: { perLevel: "1 target" },
    upcastDescription:
      "When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.",
  },

  "Detect Magic": {
    name: "Detect Magic",
    level: 1,
    school: "Divination",
    castingTime: "1 action",
    range: "Self (30-foot radius)",
    components: { verbal: true, somatic: true, material: false },
    duration: "Concentration, up to 10 minutes",
    description:
      "For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic, and you learn its school of magic, if any. The spell can penetrate most barriers, but it is blocked by 1 foot of stone, 1 inch of common metal, a thin sheet of lead, or 3 feet of wood or dirt.",
    ritual: true,
  },

  "Find Familiar": {
    name: "Find Familiar",
    level: 1,
    school: "Conjuration",
    castingTime: "1 bonus action",
    range: "10 feet",
    components: { verbal: true, somatic: true, material: false },
    duration: "Instantaneous",
    description:
      "You summon your bonded familiar to a point within range. The familiar appears in an unoccupied space and acts independently but obeys your commands.",
  },

  // ─── 2ND LEVEL SPELLS ─────────────────────────────────────────────

  "Misty Step": {
    name: "Misty Step",
    level: 2,
    school: "Conjuration",
    castingTime: "1 bonus action",
    range: "Self",
    components: { verbal: true, somatic: false, material: false },
    duration: "Instantaneous",
    description:
      "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.",
  },

  "Darkness": {
    name: "Darkness",
    level: 2,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: { verbal: true, somatic: true, material: true, materialDescription: "bat fur and a piece of coal" },
    duration: "Concentration, up to 10 minutes",
    description:
      "Magical Darkness spreads from a point you choose within range to fill a 15-foot-radius Sphere for the duration. Darkvision can't see through it, and nonmagical light can't illuminate it. If the point you choose is on an object you are holding or one that isn't being worn or carried, the Darkness emanates from the object and moves with it. Completely covering the source of the Darkness with an opaque object, such as a bowl or a helm, blocks the Darkness. If any of this spell's area overlaps with an area of light created by a spell of 2nd level or lower, the spell that created the light is dispelled.",
  },

  "Aganazzar's Scorcher": {
    name: "Aganazzar's Scorcher",
    level: 2,
    school: "Evocation",
    castingTime: "1 action",
    range: "30 feet",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a red dragon's scale" },
    duration: "Instantaneous",
    description:
      "A line of roaring flame 30 feet long and 5 feet wide emanates from you in a direction you choose. Each creature in the line must make a Dexterity saving throw. A creature takes 3d8 Fire damage on a failed save, or half as much damage on a successful one.",
    damageDice: "3d8",
    damageType: "fire",
    saveType: "DEX",
    upcast: { perLevel: "1d8" },
    upcastDescription:
      "When you cast this spell using a spell slot of 3rd level or higher, the damage increases by 1d8 for each slot level above 2nd.",
  },

  "Web": {
    name: "Web",
    level: 2,
    school: "Conjuration",
    castingTime: "1 action",
    range: "60 feet",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a bit of spiderweb" },
    duration: "Concentration, up to 1 hour",
    description:
      "You conjure a mass of thick, sticky webbing at a point of your choice within range. The webs fill a 20-foot Cube from that point for the duration. The webs are Difficult Terrain, and the area is Lightly Obscured. If the webs aren't anchored between two solid masses or layered across a floor, wall, or ceiling, the conjured web collapses on itself, and the spell ends at the start of your next turn. Each creature that starts its turn in the webs or that enters them during its turn must make a Dexterity saving throw. On a failed save, the creature is Restrained as long as it remains in the webs or until it breaks free. A creature Restrained by the webs can use its action to make a Strength check against your spell save DC. If it succeeds, it is no longer Restrained. The webs are flammable. Any 5-foot Cube of webs exposed to fire burns away in 1 round, dealing 2d4 Fire damage to any creature that starts its turn in the fire.",
    saveType: "DEX",
  },

  "Shadow Blade": {
    name: "Shadow Blade",
    level: 2,
    school: "Illusion",
    castingTime: "1 bonus action",
    range: "Self",
    components: { verbal: true, somatic: true, material: false },
    duration: "Concentration, up to 1 minute",
    description:
      "You weave together threads of shadow to create a sword of solidified gloom in your hand. This magic sword lasts until the spell ends. It counts as a simple melee weapon with which you are proficient. It deals 2d8 Psychic damage on a hit and has the Finesse, Light, and Thrown properties (range 20/60). In addition, when you use the sword to attack a target that is in dim light or darkness, you make the attack roll with Advantage. If you drop the weapon or throw it, it dissipates at the end of the turn. Thereafter, while the spell persists, you can use a Bonus Action to cause the sword to reappear in your hand.",
    damageDice: "2d8",
    damageType: "psychic",
    upcast: { perLevel: "1d8" },
    upcastDescription:
      "When you cast this spell using a 3rd- or 4th-level spell slot, the damage increases to 3d8 or 4d8 respectively. When you use a 5th- or 6th-level spell slot, the damage increases to 5d8. When you use a spell slot of 7th level or higher, the damage increases to 5d8.",
    createsWeapon: {
      name: "Shadow Blade",
      damageDice: "2d8",
      damageType: "psychic",
      attackStat: "DEX",
      properties: ["Finesse", "Light", "Thrown (20/60)"],
      upcastDice: "1d8",
    },
  },

  "Invisibility": {
    name: "Invisibility",
    level: 2,
    school: "Illusion",
    castingTime: "1 action",
    range: "Touch",
    components: { verbal: true, somatic: true, material: true, materialDescription: "an eyelash encased in gum arabic" },
    duration: "Concentration, up to 1 hour",
    description:
      "A creature you touch has the Invisible condition until the spell ends. Anything the target is wearing or carrying is also Invisible as long as it is on the target's person. The spell ends early for a target that makes an attack roll, casts a spell, or deals damage.",
    upcast: { perLevel: "1 target" },
    upcastDescription:
      "When you cast this spell using a spell slot of 3rd level or higher, you can target one additional creature for each slot level above 2nd.",
  },

  // ─── 3RD LEVEL SPELLS ─────────────────────────────────────────────

  "Fear": {
    name: "Fear",
    level: 3,
    school: "Illusion",
    castingTime: "1 action",
    range: "Self (30-foot cone)",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a white feather or the heart of a hen" },
    duration: "Concentration, up to 1 minute",
    description:
      "You project a phantasmal image of a creature's worst fears. Each creature in a 30-foot Cone must succeed on a Wisdom saving throw or drop whatever it is holding and have the Frightened condition for the duration. While Frightened by this spell, a creature must take the Dash action and move away from you by the safest available route on each of its turns, unless there is nowhere to move. If the creature ends its turn in a location where it doesn't have line of sight to you, the creature can make a Wisdom saving throw. On a successful save, the spell ends for that creature.",
    saveType: "WIS",
  },

  "Lightning Bolt": {
    name: "Lightning Bolt",
    level: 3,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (100-foot line)",
    components: { verbal: true, somatic: true, material: true, materialDescription: "a bit of fur and a crystal rod" },
    duration: "Instantaneous",
    description:
      "A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you in a direction you choose. Each creature in the line must make a Dexterity saving throw. A creature takes 8d6 Lightning damage on a failed save, or half as much damage on a successful one. The lightning ignites flammable objects in the area that aren't being worn or carried.",
    damageDice: "8d6",
    damageType: "lightning",
    saveType: "DEX",
    upcast: { perLevel: "1d6" },
    upcastDescription:
      "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.",
  },

  "Hound of Ill Omen": {
    name: "Hound of Ill Omen",
    level: 0,
    school: "Necromancy",
    castingTime: "1 bonus action",
    range: "30 feet of target",
    components: { verbal: false, somatic: false, material: false },
    duration: "Until dismissed or destroyed",
    description:
      "You spend 3 sorcery points to summon a hound of ill omen to target one creature you can see within 120 feet. The hound uses the dire wolf statistics with modifications.",
  },
};
