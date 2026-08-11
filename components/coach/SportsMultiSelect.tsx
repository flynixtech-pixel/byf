"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { SPORT_CATEGORIES } from "@/lib/taxonomy";

const PRESET_LABELS = SPORT_CATEGORIES.map((c) => c.label);

/**
 * Multi-select sports. Chosen sports always stay pinned in a "Selected" strip at
 * the top (each with a remove button) so a selection never disappears. Below is
 * the preset grid plus an "Others" free-text field for sports not in the list.
 * Stores plain label strings — the first selected sport is the primary category.
 */
export function SportsMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (sports: string[]) => void;
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
      {/* Selected strip — always visible so a choice never disappears. */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-surface-border bg-cream-200/50 p-2.5">
          {value.map((label, i) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5c3a21] px-3 py-1.5 text-sm font-semibold text-white"
            >
              {i === 0 && (
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Primary</span>
              )}
              {label}
              <button type="button" onClick={() => toggle(label)} aria-label={`Remove ${label}`}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Preset grid — tap to add/remove. Selected ones show a check. */}
      <div className="flex flex-wrap gap-2">
        {PRESET_LABELS.map((label) => {
          const on = has(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                on
                  ? "border border-[#5c3a21] bg-[#5c3a21]/10 text-[#5c3a21]"
                  : "border border-surface-border text-ink-soft hover:bg-cream-200"
              }`}
            >
              {on ? <Check size={13} /> : <Plus size={13} />}
              {label}
            </button>
          );
        })}
      </div>

      {/* Others — add a sport not in the list. */}
      <div className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2">
        <Plus size={15} className="shrink-0 text-ink-faint" />
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          placeholder="Others — add another sport and press Enter"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 rounded-md bg-[#5c3a21] px-3 py-1 text-xs font-semibold text-white hover:bg-[#7b4f2e]"
        >
          Add
        </button>
      </div>
    </div>
  );
}
