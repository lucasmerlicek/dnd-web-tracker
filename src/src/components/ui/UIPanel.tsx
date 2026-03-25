"use client";

import Image from "next/image";

interface Props {
  variant?: "box" | "box1" | "box2" | "box4" | "dark" | "fancy";
  children: React.ReactNode;
  className?: string;
}

const VARIANT_IMAGES: Record<string, string> = {
  box: "/images/shared/UI_box.png",
  box1: "/images/shared/UI_Box_1.png",
  box2: "/images/shared/UI_box_2.png",
  box4: "/images/shared/UI_box_4.png",
  dark: "/images/shared/UI_box_dark.png",
  fancy: "/images/shared/UI_box_fancy.png",
};

const VARIANT_STYLES: Record<string, string> = {
  box: "border-gold-dark/30",
  box1: "border-gold/20",
  box2: "border-dark-border",
  box4: "border-gold-dark/40",
  dark: "border-dark-border",
  fancy: "border-gold/40",
};

export default function UIPanel({ variant = "box", children, className = "" }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-4 ${VARIANT_STYLES[variant]} ${className}`}
    >
      <Image
        src={VARIANT_IMAGES[variant]}
        alt=""
        fill
        className="object-cover"
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
