"use client";

import type { InventoryItemBase } from "@/types";

interface BagItemCardProps {
  item: InventoryItemBase;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  children?: React.ReactNode;
}

export default function BagItemCard({ item, isExpanded, onToggle, onRemove, children }: BagItemCardProps) {
  return (
    <li className="rounded hover:bg-dark-border">
      <div className="flex items-center justify-between px-2 py-1">
        <button
          onClick={onToggle}
          className="flex-1 text-left text-sm text-parchment/80"
          aria-expanded={isExpanded}
          aria-label={`Toggle details for ${item.name}`}
        >
          {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}
        </button>
        <button
          onClick={onRemove}
          className="min-h-[44px] px-2 text-xs text-crimson hover:text-crimson/80"
          aria-label={`Remove ${item.name}`}
        >
          ✕
        </button>
      </div>
      {isExpanded && (
        <div className="px-4 pb-2 text-xs text-parchment/60">
          {item.description && <p className="mb-1">{item.description}</p>}
          {children}
        </div>
      )}
    </li>
  );
}
