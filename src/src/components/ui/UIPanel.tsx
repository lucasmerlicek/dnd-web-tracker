"use client";

interface Props {
  variant?: "box" | "box1" | "box2" | "box4" | "dark" | "fancy";
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  box: "bg-dark-surface/70 border-parchment-dark/20",
  box1: "bg-dark-surface/60 border-parchment-dark/15",
  box2: "bg-dark-panel/60 border-parchment-dark/10",
  box4: "bg-dark-surface/75 border-parchment-dark/25",
  dark: "bg-dark-bg/80 border-dark-border/40",
  fancy: "bg-dark-surface/65 border-gold-dark/30",
};

export default function UIPanel({ variant = "box", children, className = "" }: Props) {
  return (
    <div
      className={`rounded-lg border p-4 backdrop-blur-sm ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
