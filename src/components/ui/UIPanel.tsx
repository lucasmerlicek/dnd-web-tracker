"use client";

interface Props {
  variant?: "box" | "box1" | "box2" | "box4" | "dark" | "fancy";
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  box:   "bg-ff12-panel/70 border-ff12-border",
  box1:  "bg-ff12-panel/65 border-ff12-border",
  box2:  "bg-ff12-panel/60 border-ff12-border-dim",
  box4:  "bg-ff12-panel/75 border-ff12-border",
  dark:  "bg-ff12-panel-dark/80 border-ff12-border-dim",
  fancy: "bg-ff12-panel/70 border-ff12-border-bright border-t-ff12-border-bright",
};

export default function UIPanel({ variant = "box", children, className = "" }: Props) {
  return (
    <div
      className={`rounded border p-4 backdrop-blur-sm shadow-ff12-glow ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
