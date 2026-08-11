"use client";

import { Plus, Trash2 } from "lucide-react";
import type { PriceVariant } from "@/lib/api/types";

/**
 * Row-array editor for size/portion pricing tiers on a dish, e.g.
 * Standard ₹80 / Medium ₹120 / Large ₹150. Empty array = flat single price.
 */
export function VariantPricingEditor({
  value,
  onChange,
}: {
  value: PriceVariant[];
  onChange: (variants: PriceVariant[]) => void;
}) {
  function update(i: number, patch: Partial<PriceVariant>) {
    onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={v.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder={i === 0 ? "Standard" : i === 1 ? "Medium" : "Large"}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
          />
          <div className="flex items-center gap-1 rounded-lg border border-surface-border px-3 py-2">
            <span className="text-sm text-ink-faint">₹</span>
            <input
              type="number"
              min={0}
              value={v.price || ""}
              onChange={(e) => update(i, { price: Number(e.target.value) || 0 })}
              placeholder="0"
              className="w-20 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            aria-label="Remove size"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {value.length < 10 && (
        <button
          type="button"
          onClick={() => onChange([...value, { label: "", price: 0 }])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-border px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-vibe-violet hover:text-vibe-violet"
        >
          <Plus size={14} /> {value.length === 0 ? "Add sizes / portion pricing (optional)" : "Add another size"}
        </button>
      )}
      {value.length > 0 && (
        <p className="text-[11px] text-ink-faint">Customers will pick one of these when ordering. Card shows the lowest price as “starts from”.</p>
      )}
    </div>
  );
}
