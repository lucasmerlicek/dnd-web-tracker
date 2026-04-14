"use client";

import type { InventoryItemBase } from "@/types";
import CursorIndicator from "@/components/ui/CursorIndicator";
import IconImage from "@/components/ui/IconImage";

interface BagItemCardProps {
  item: InventoryItemBase;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  isActive?: boolean;
  children?: React.ReactNode;
}

export default function BagItemCard({ item, isExpanded, onToggle, onRemove, isActive = false, children }: BagItemCardProps) {
  return (
    <li className={`rounded hover:bg-ff12-panel-light ${isActive ? "bg-white/10" : ""}`}>
      <div className="flex items-center justify-between px-2 py-1">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left text-sm text-ff12-text/80"
          aria-expanded={isExpanded}
          aria-label={`Toggle details for ${item.name}`}
        >
          <CursorIndicator visible={isActive} />
          <IconImage type="item" name={item.name} size={20} />
          {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}
        </button>
        <button
          onClick={onRemove}
          className="min-h-[44px] px-2 text-xs text-ff12-danger hover:text-ff12-danger/80"
          aria-label={`Remove ${item.name}`}
        >
          ✕
        </button>
      </div>
      {isExpanded && (
        <div className="px-4 pb-2 text-xs text-ff12-text-dim">
          {item.description && <p className="mb-1">{item.description}</p>}
          {children}
        </div>
      )}
    </li>
  );
}
