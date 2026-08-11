"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { CUISINE_PRESETS } from "@/lib/foodTaxonomy";

/**
 * Multi-select cuisine tags. Chosen cuisines stay pinned in a "Selected" strip
 * (with remove buttons); below is the preset grid plus an "Others" free-text
 * input for cuisines not in the list.
 */
export function CuisineMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (cuisines: string[]) => void;
}) {
  const [custom, setCustom] = useState("");

  const has = (label: string) => value.some((s) => s.toLowerCase() === label.toLowerCase());

  function toggle(label: string) {
    onChange(has(label) ? value.filter((s) => s.toLowerCase() !== label.toLowerCase()) : [...value, label]);
  }

  function addCustom() {
    const label = custom.trim();
    if (!label) return;
    if (!has(label)) onChange([...value, label]);
    setCustom("");
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-surface-border bg-cream-200/50 p-2.5">
          {value.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-3 py-1.5 text-sm font-semibold text-white"
            >
              {label}
              <button type="button" onClick={() => toggle(label)} aria-label={`Remove ${label}`}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {CUISINE_PRESETS.map((label) => {
          const on = has(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                on
                  ? "border border-vibe-violet bg-vibe-violet/10 text-vibe-violet"
                  : "border border-surface-border text-ink-soft hover:bg-cream-200"
              }`}
            >
              {on ? <Check size={13} /> : <Plus size={13} />}
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2">
        <Plus size={15} className="shrink-0 text-ink-faint" />
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          placeholder="Others — add another cuisine and press Enter"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 rounded-md bg-vibe-violet px-3 py-1 text-xs font-semibold text-white hover:bg-vibe-violetSoft"
        >
          Add
        </button>
      </div>
    </div>
  );
}
