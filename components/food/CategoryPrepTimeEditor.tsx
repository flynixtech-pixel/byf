"use client";

import { useMemo, useState } from "react";
import { Clock, LoaderCircle, Save } from "lucide-react";
import { SectionCard } from "@/components/vendor/ui";
import { suggestedPrepMins, ORDER_TYPE_OPTIONS } from "@/lib/foodTaxonomy";
import { setOutletPrepTimes } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { CategoryPrepTime, FoodOutlet, OutletFulfilment } from "@/lib/api/types";

const ALL_MODES: OutletFulfilment = { preOrder: true, inVenue: true, postMatch: true, dineIn: true };

/**
 * Per-category prep-time defaults, plus the fulfilment modes the outlet accepts.
 *
 * Whatever the owner sets here is exactly what the player sees as their ETA at
 * checkout — before they pay — which is the point of the whole screen.
 *
 * State holds only the owner's unsaved edits; everything shown is derived from
 * those edits layered over what's saved on the outlet, so switching restaurants
 * or saving needs no re-seeding.
 */
export function CategoryPrepTimeEditor({
  outlet,
  categories,
  onSaved,
  onToast,
}: {
  outlet: FoodOutlet;
  /** Categories actually present on this outlet's menu. */
  categories: string[];
  onSaved: (outlet: FoodOutlet) => void;
  onToast: (message: string) => void;
}) {
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [bufferEdit, setBufferEdit] = useState<number | null>(null);
  const [modeEdits, setModeEdits] = useState<Partial<OutletFulfilment>>({});
  const [saving, setSaving] = useState(false);

  const saved = useMemo(
    () => new Map((outlet.categoryPrepTimes ?? []).map((c) => [c.category.trim().toLowerCase(), c.prepTimeMins])),
    [outlet.categoryPrepTimes]
  );

  // Edit wins, then what the owner saved, then the preset suggestion for that category.
  const times = useMemo(
    () =>
      Object.fromEntries(
        categories.map((cat) => [cat, edits[cat] ?? saved.get(cat.trim().toLowerCase()) ?? suggestedPrepMins(cat)])
      ) as Record<string, number>,
    [categories, edits, saved]
  );

  const buffer = bufferEdit ?? outlet.serviceBufferMins ?? 5;
  const fulfilment: OutletFulfilment = { ...ALL_MODES, ...outlet.fulfilment, ...modeEdits };

  const values = Object.values(times);
  const slowest = values.length ? Math.max(...values) : 0;
  const fastest = values.length ? Math.min(...values) : 0;

  async function handleSave() {
    const categoryPrepTimes: CategoryPrepTime[] = Object.entries(times).map(([category, prepTimeMins]) => ({
      category,
      prepTimeMins: Math.max(0, Math.min(240, Math.round(prepTimeMins || 0))),
    }));
    setSaving(true);
    try {
      const updated = await setOutletPrepTimes(outlet._id, {
        categoryPrepTimes,
        serviceBufferMins: buffer,
        fulfilment,
      });
      // Saved values now live on the outlet, so the pending edits can go.
      setEdits({});
      setBufferEdit(null);
      setModeEdits({});
      onSaved(updated);
      onToast("Prep times saved — players now see this ETA at checkout");
    } catch (err) {
      onToast(err instanceof ApiError ? err.describe() : "Failed to save prep times");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Prep Time & Fulfilment"
      description="Set how long each category takes. This is the ETA players see at checkout, before they pay."
    >
      {categories.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">Add some dishes first — categories show up here.</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between gap-3 rounded-xl border border-surface-border px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-sm font-semibold text-ink">{cat}</span>
                <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1.5">
                  <Clock size={13} className="text-vibe-violet" />
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={times[cat] ?? ""}
                    onChange={(e) => setEdits((t) => ({ ...t, [cat]: Number(e.target.value) }))}
                    aria-label={`${cat} prep time in minutes`}
                    className="w-12 bg-transparent text-sm font-semibold outline-none"
                  />
                  <span className="text-xs text-ink-faint">min</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            Players see the slowest item in their basket — right now that&apos;s{" "}
            <span className="font-semibold text-ink">~{slowest} min</span> for a full meal and{" "}
            <span className="font-semibold text-ink">~{fastest} min</span> for the quickest item.
          </p>
        </>
      )}

      <div className="mt-5 border-t border-surface-border pt-4">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Courtside / table service buffer
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2">
            <input
              type="number"
              min={0}
              max={60}
              value={buffer}
              onChange={(e) => setBufferEdit(Number(e.target.value))}
              aria-label="Service buffer in minutes"
              className="w-14 bg-transparent text-sm font-semibold outline-none"
            />
            <span className="text-xs text-ink-faint">min</span>
          </div>
          <p className="text-xs text-ink-faint">
            Added on top of prep time when food is carried out to a court or table — not for counter pickup.
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-surface-border pt-4">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Order types you accept
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {ORDER_TYPE_OPTIONS.map((opt) => {
            const on = fulfilment[opt.flag];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setModeEdits((m) => ({ ...m, [opt.flag]: !on }))}
                aria-pressed={on}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  on ? "border-vibe-violet bg-vibe-violet/5" : "border-surface-border opacity-60 hover:opacity-100"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{opt.label}</span>
                  <span className="block truncate text-[11px] text-ink-faint">{opt.tagline}</span>
                </span>
                <span className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition ${on ? "bg-vibe-violet" : "bg-cream-300"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
      >
        {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? "Saving…" : "Save Prep Times"}
      </button>
    </SectionCard>
  );
}
