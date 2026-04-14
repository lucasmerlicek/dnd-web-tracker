export const CATEGORIES = ["artifact", "treasure", "enemy", "person", "note"] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  artifact: "Artifacts",
  treasure: "Treasure",
  enemy: "Enemy Encounters",
  person: "Notable People",
  note: "Notes & Rumors",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  artifact: "bg-purple-500",
  treasure: "bg-yellow-500",
  enemy: "bg-red-500",
  person: "bg-blue-500",
  note: "bg-green-500",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  artifact: "/images/icons/icon_artifact.png",
  treasure: "/images/icons/icon_treasure.png",
  enemy: "/images/icons/icon_enemy.png",
  person: "/images/icons/icon_friend.png",
  note: "/images/icons/icon_rumor.png",
};

export const FLOOR_LABELS = ["GF", "1", "2", "3", "4", "5", "6"];

export const AETHERION_FLOOR_IMAGES: Record<number, string> = {
  0: "/images/maps/aetherion/GF.png",
  1: "/images/maps/aetherion/1.png",
  2: "/images/maps/aetherion/2.png",
  3: "/images/maps/aetherion/3.png",
  4: "/images/maps/aetherion/4.png",
  5: "/images/maps/aetherion/5.png",
  6: "/images/maps/aetherion/6.png",
};
