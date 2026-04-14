"use client";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}

export default function CounterControl({ label, value, min, max, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-ff12-text-dim">{label}</span>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-11 w-11 items-center justify-center rounded bg-ff12-panel-light text-ff12-text transition hover:bg-dark-surface disabled:opacity-30 md:h-9 md:w-9"
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className="w-6 text-center text-gold">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-11 w-11 items-center justify-center rounded bg-ff12-panel-light text-ff12-text transition hover:bg-dark-surface disabled:opacity-30 md:h-9 md:w-9"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
