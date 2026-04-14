"use client";

import Image from "next/image";

interface CursorIndicatorProps {
  visible: boolean;
  className?: string;
}

export default function CursorIndicator({ visible, className = "" }: CursorIndicatorProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center ${
        visible ? `animate-cursor-pulse ${className}` : "invisible"
      }`}
      style={{ width: 20, height: 10 }}
      aria-hidden="true"
    >
      <Image
        src="/images/gauntlet_indicator.png"
        alt=""
        width={20}
        height={10}
        className="object-contain"
        unoptimized
      />
    </span>
  );
}
