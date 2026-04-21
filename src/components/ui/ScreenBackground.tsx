"use client";

import Image from "next/image";

const SCREEN_BACKGROUNDS: Record<string, string> = {
  dashboard: "background.png",
  attack: "attack_background.png",
  spells: "spells_background.png",
  saves: "save_background.png",
  actions: "action_backround.png",
  bag: "bag_background.png",
  journal: "journal_background.png",
  familiars: "spells_background.png",
};

interface Props {
  screen: string;
  characterId: string;
}

export default function ScreenBackground({ screen, characterId }: Props) {
  const file = SCREEN_BACKGROUNDS[screen] ?? "background.png";
  return (
    <div className="fixed inset-0" aria-hidden="true">
      <Image
        src={`/images/${characterId}/${file}`}
        alt=""
        fill={false}
        width={1920}
        height={1080}
        className="w-screen h-screen object-cover opacity-35 blur-[6px]"
        priority={screen === "dashboard"}
      />
    </div>
  );
}
