"use client";

import { useState } from "react";
import Image from "next/image";
import { deriveIconFilename } from "@/lib/icon-utils";

interface IconImageProps {
  type: "spell" | "weapon" | "item";
  name: string;
  size?: number;
  className?: string;
}

export default function IconImage({
  type,
  name,
  size = 24,
  className = "",
}: IconImageProps) {
  const [usePlaceholder, setUsePlaceholder] = useState(false);
  const [hidden, setHidden] = useState(false);

  const filename = deriveIconFilename(name);

  if (!filename || hidden) return null;

  const iconPath = `/images/icons/${type}s/${filename}`;
  const placeholderPath = `/images/icons/placeholder-${type}.png`;
  const src = usePlaceholder ? placeholderPath : iconPath;

  return (
    <Image
      src={src}
      alt={`${name} icon`}
      width={size}
      height={size}
      className={className}
      onError={() => {
        if (usePlaceholder) {
          setHidden(true);
        } else {
          setUsePlaceholder(true);
        }
      }}
    />
  );
}
