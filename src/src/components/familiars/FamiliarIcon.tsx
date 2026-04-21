"use client";

import { useState } from "react";
import Image from "next/image";

interface FamiliarIconProps {
  familiarType: "falcon" | "fox" | "hound";
  size?: number;
}

const FAMILIAR_LABELS: Record<string, string> = {
  falcon: "Falcon",
  fox: "Fox",
  hound: "Hound",
};

export default function FamiliarIcon({ familiarType, size = 24 }: FamiliarIconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded bg-ff12-panel-light text-xs text-ff12-text-dim"
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
        aria-label={`${FAMILIAR_LABELS[familiarType]} icon`}
      >
        {FAMILIAR_LABELS[familiarType]?.[0] ?? "?"}
      </span>
    );
  }

  return (
    <Image
      src={`/images/icons/familiars/${familiarType}.png`}
      alt={`${FAMILIAR_LABELS[familiarType]} icon`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  );
}
