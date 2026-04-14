export interface UniversalAction {
  name: string;
  description: string;
}

export const UNIVERSAL_ACTIONS: UniversalAction[] = [
  {
    name: "Dash",
    description:
      "When you take the Dash action, you gain extra movement for the current turn. The increase equals your Speed after applying any modifiers. With a Speed of 30 feet, for example, you can move up to 60 feet on your turn if you Dash. If your Speed of 30 feet is reduced to 15 feet, you can move up to 30 feet this turn if you Dash.",
  },
  {
    name: "Disengage",
    description:
      "If you take the Disengage action, your movement doesn't provoke Opportunity Attacks for the rest of the current turn.",
  },
  {
    name: "Dodge",
    description:
      "When you take the Dodge action, you focus entirely on avoiding attacks. Until the start of your next turn, any attack roll made against you has Disadvantage if you can see the attacker, and you make Dexterity saving throws with Advantage. You lose this benefit if you have the Incapacitated condition or if your Speed is 0.",
  },
  {
    name: "Grapple",
    description:
      "You can use your Attack action to grapple a creature. The target must be no more than one size larger than you and within your reach. Using at least one free hand, you try to seize the target by making a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics) check. You succeed automatically if the target has the Incapacitated condition. On a success, the target has the Grappled condition. You can release the target at any time (no action required).",
  },
  {
    name: "Help",
    description:
      "When you take the Help action, you assist another creature with a task. The creature you help gains Advantage on the next ability check it makes for the task you are helping with, provided it makes the check before the start of your next turn. Alternatively, you can help an ally attack a creature within 5 feet of you. The ally gains Advantage on the next attack roll against that creature before the start of your next turn.",
  },
  {
    name: "Hide",
    description:
      "When you take the Hide action, you make a Dexterity (Stealth) check in an attempt to hide, following the rules for hiding. If you succeed, you have the Invisible condition until you are discovered or you stop hiding.",
  },
  {
    name: "Ready",
    description:
      "You take the Ready action to wait for a particular circumstance before you act. You decide what perceivable circumstance will trigger your Reaction, then choose an action or movement in response. When the trigger occurs, you can either take your Reaction right after the trigger finishes or ignore the trigger. If you Ready a spell, you cast it as normal but hold its energy, which you release with your Reaction when the trigger occurs. The spell must have a casting time of one action, and holding the spell's magic requires Concentration.",
  },
  {
    name: "Search",
    description:
      "When you take the Search action, you devote your attention to finding something. Depending on the nature of your search, the DM might have you make a Wisdom (Perception) check or an Intelligence (Investigation) check.",
  },
  {
    name: "Shove",
    description:
      "Using your Attack action, you can make a special melee attack to shove a creature. The target must be no more than one size larger than you and within your reach. You make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics) check. You succeed automatically if the target has the Incapacitated condition. On a success, you either push the target 5 feet away from you or knock the target Prone.",
  },
  {
    name: "Use an Object",
    description:
      "You normally interact with an object while doing something else, such as when you draw a sword as part of the Attack action. When an object requires an action for its use, you take the Use an Object action. This action is also useful when you want to interact with more than one object on your turn.",
  },
];
