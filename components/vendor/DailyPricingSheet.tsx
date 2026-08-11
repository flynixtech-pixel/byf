"use client";

import { useMemo, useState } from "react";
import { X, Lightbulb, ChevronDown, ChevronUp, Check, Sunrise, Sun, Sunset, Moon } from "lucide-react";
import type { TurfSlot } from "@/lib/types";
import { useBackDismiss } from "@/lib/useBackDismiss";

function t24m(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function to12h(t: string) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr) % 24; // "24:00" (midnight close) → 12:00 AM
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ap}`;
}
function roundTo50(n: number) {
  return Math.max(0, Math.round(n / 50) * 50);
}

/* ─── Day-part sections — grouping is purely a function of each slot's start time,
   so it automatically regroups whenever slot timings/duration change (nothing here
   is keyed on a fixed slot count or duration). ── */
type SectionKey = "morning" | "afternoon" | "evening" | "night";

const SECTIONS: { key: SectionKey; label: string; icon: typeof Sunrise; emoji: string }[] = [
  { key: "morning", label: "Morning", icon: Sunrise, emoji: "🌅" },
  { key: "afternoon", label: "Afternoon", icon: Sun, emoji: "☀️" },
  { key: "evening", label: "Evening", icon: Sunset, emoji: "🌇" },
  { key: "night", label: "Night", icon: Moon, emoji: "🌙" },
];

/** Morning 5:00–11:59, Afternoon 12:00–16:59, Evening 17:00–20:59, Night 21:00–4:59
 * (wraps past midnight — anything before 5 AM is still "last night"). */
function sectionForStart(startMin: number): SectionKey {
  if (startMin >= 300 && startMin < 720) return "morning";
  if (startMin >= 720 && startMin < 1020) return "afternoon";
  if (startMin >= 1020 && startMin < 1260) return "evening";
  return "night";
}

// The evening demand-dip offer — scoped to fall entirely inside the Evening section
// (5 PM–7 PM) so it can render as that section's smart suggestion rather than a
// separate top-of-sheet card that talks about slots the vendor hasn't scrolled to yet.
const TWILIGHT_START = 17 * 60;
const TWILIGHT_END = 19 * 60;

export function DailyPricingSheet({
  dateLabel,
  slots,
  onClose,
  onSave,
  onBookSlot,
}: {
  dateLabel: string;
  slots: TurfSlot[];
  onClose: () => void;
  onSave: (nextSlots: TurfSlot[]) => Promise<void> | void;
  /** When provided, each slot row gets a "Book" shortcut that jumps to the booking flow for that slot. */
  onBookSlot?: (slot: TurfSlot) => void;
}) {
  // Device Back closes this sheet instead of leaving the pricing page.
  useBackDismiss(true, onClose);
  const basePrice = useMemo(
    () => (slots.length ? Math.min(...slots.map((s) => s.price)) : 0),
    [slots]
  );

  const presets = useMemo(
    () => ({
      offPeak: roundTo50(basePrice * 0.8),
      standard: basePrice,
      peak: roundTo50(basePrice * 1.5),
    }),
    [basePrice]
  );

  /*
   * Prices are held as strings, not numbers. With a number state, clearing the
   * field ran Number("") → 0, so it snapped back to 0 and you could never empty
   * it to type your own price. Strings let the box go genuinely empty; the value
   * is only coerced on save.
   */
  const [bulkPrice, setBulkPrice] = useState(() => String(basePrice));
  const [selectedPreset, setSelectedPreset] = useState<"offPeak" | "standard" | "peak" | "custom">("standard");
  const [slotOverrides, setSlotOverrides] = useState<Record<string, string>>({});
  const [blockedOverrides, setBlockedOverrides] = useState<Record<string, boolean>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [twilightApplied, setTwilightApplied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Each section's own bulk-price box, and its expand/collapse state — expanded by default.
  const [sectionBulkPrice, setSectionBulkPrice] = useState<Record<SectionKey, string>>({
    morning: "",
    afternoon: "",
    evening: "",
    night: "",
  });
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    morning: true,
    afternoon: true,
    evening: true,
    night: true,
  });

  /** Digits only — keeps out "e", "+", "-" that a number input would otherwise accept. */
  const onlyDigits = (v: string) => v.replace(/\D/g, "");

  /** Effective price for a slot, falling back to its existing price when left blank. */
  function priceFor(slot: TurfSlot): number {
    const raw = slotOverrides[slot.startTime] ?? bulkPrice;
    if (raw === "") return slot.price;
    const n = Number(raw);
    return Number.isFinite(n) ? n : slot.price;
  }

  function blockedFor(slot: TurfSlot): boolean {
    return blockedOverrides[slot.startTime] ?? slot.blocked ?? false;
  }

  function pickPreset(key: "offPeak" | "standard" | "peak") {
    setSelectedPreset(key);
    setBulkPrice(String(presets[key]));
  }

  /** Grouped by day-part — recomputed whenever the slot list itself changes, so a
   * different duration or a new Opens/Closes range regroups automatically. */
  const grouped = useMemo(() => {
    const map: Record<SectionKey, TurfSlot[]> = { morning: [], afternoon: [], evening: [], night: [] };
    for (const slot of slots) map[sectionForStart(t24m(slot.startTime))].push(slot);
    return map;
  }, [slots]);

  const eveningTwilightSlots = grouped.evening.filter((s) => {
    const startMin = t24m(s.startTime);
    return startMin >= TWILIGHT_START && startMin < TWILIGHT_END;
  });
  const suggestedTwilightPrice = roundTo50(basePrice * 0.8);

  function activateTwilightOffer() {
    const next: Record<string, string> = { ...slotOverrides };
    for (const slot of eveningTwilightSlots) {
      next[slot.startTime] = String(suggestedTwilightPrice);
    }
    setSlotOverrides(next);
    setTwilightApplied(eveningTwilightSlots.length > 0);
  }

  function applySectionPrice(key: SectionKey) {
    const raw = onlyDigits(sectionBulkPrice[key]);
    if (raw === "") return;
    setSlotOverrides((prev) => {
      const next = { ...prev };
      for (const slot of grouped[key]) next[slot.startTime] = raw;
      return next;
    });
  }

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const next = slots.map((s) => ({ ...s, price: priceFor(s), blocked: blockedFor(s) }));
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg p-6 shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">{dateLabel}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Daily Pricing &amp; Offers</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Base price presets */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Set Daily Base Price</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <PresetTile label="Off-Peak" price={presets.offPeak} active={selectedPreset === "offPeak"} onClick={() => pickPreset("offPeak")} />
          <PresetTile label="Standard" price={presets.standard} active={selectedPreset === "standard"} onClick={() => pickPreset("standard")} />
          <PresetTile label="Peak / Event" price={presets.peak} active={selectedPreset === "peak"} onClick={() => pickPreset("peak")} />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Or Set My Price (₹)</p>
        <input
          type="text"
          inputMode="numeric"
          value={bulkPrice}
          placeholder="Enter price"
          onChange={(e) => {
            setSelectedPreset("custom");
            setBulkPrice(onlyDigits(e.target.value));
          }}
          className="w-full rounded-xl border border-surface-border bg-cream-200/40 px-4 py-3 text-sm font-bold outline-none focus:border-vibe-violet mb-4"
        />

        {/* Advanced: per-slot pricing, grouped into Morning / Afternoon / Evening / Night */}
        <button
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-600 py-2 border-t border-slate-100"
        >
          Edit individual slots ({slots.length})
          {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {advancedOpen && (
          <div className="mt-2 mb-2 max-h-[440px] overflow-y-auto overscroll-contain -mx-1 px-1">
            {SECTIONS.map(({ key, label, icon: Icon, emoji }) => {
              const sectionSlots = grouped[key];
              if (sectionSlots.length === 0) return null;
              const open = openSections[key];

              return (
                <div key={key} className="mb-3 rounded-2xl border border-slate-100 bg-white overflow-hidden last:mb-0">
                  {/* Sticky section header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(key)}
                    className="sticky top-0 z-10 flex w-full items-center justify-between gap-2 bg-slate-50/95 backdrop-blur px-3.5 py-2.5 border-b border-slate-100"
                  >
                    <span className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                      <Icon size={14} className="text-vibe-violet" aria-hidden />
                      <span aria-hidden>{emoji}</span> {label}
                      <span className="font-semibold text-slate-400">
                        ({sectionSlots.length} {sectionSlots.length === 1 ? "Slot" : "Slots"})
                      </span>
                    </span>
                    <ChevronDown
                      size={15}
                      className={`text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Smooth collapse via grid-template-rows — no JS height measurement needed */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="p-3 space-y-2">
                        {/* Smart suggestion — only the Evening section has one right now */}
                        {key === "evening" && eveningTwilightSlots.length > 0 && (
                          <div className="rounded-xl bg-vibe-violet/10 border border-vibe-violet/20 p-3">
                            <div className="flex items-start gap-2">
                              <Lightbulb size={15} className="text-vibe-violet shrink-0 mt-0.5" />
                              <p className="text-xs text-slate-600">
                                Demand typically dips between 5 PM – 7 PM. Suggested Price:{" "}
                                <span className="font-extrabold text-vibe-violet">₹{suggestedTwilightPrice}</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={activateTwilightOffer}
                              className="mt-2 w-full rounded-lg bg-vibe-violet text-white text-xs font-bold py-2 hover:bg-vibe-violetSoft transition"
                            >
                              {twilightApplied ? "Suggested Price Applied ✓" : "Apply Suggested Price"}
                            </button>
                          </div>
                        )}

                        {/* Bulk-apply for this section */}
                        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2">
                          <span className="text-xs text-slate-400 shrink-0">₹</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={sectionBulkPrice[key]}
                            placeholder="Price"
                            onChange={(e) =>
                              setSectionBulkPrice((prev) => ({ ...prev, [key]: onlyDigits(e.target.value) }))
                            }
                            className="w-20 shrink-0 rounded-lg border border-surface-border bg-white px-2 py-1.5 text-xs font-bold outline-none focus:border-vibe-violet"
                          />
                          <button
                            type="button"
                            onClick={() => applySectionPrice(key)}
                            disabled={!sectionBulkPrice[key]}
                            className="flex-1 rounded-lg bg-ink text-white text-[11px] font-bold py-1.5 px-2 hover:bg-ink/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Apply to all {label} slots
                          </button>
                        </div>

                        {/* Individual slot rows */}
                        {sectionSlots.map((slot) => {
                          const isBlocked = blockedFor(slot);
                          return (
                            <div
                              key={slot.startTime}
                              className={`rounded-xl border px-3 py-2 transition ${
                                isBlocked ? "border-slate-100 bg-slate-50" : "border-slate-100"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-semibold ${isBlocked ? "text-slate-400 line-through" : "text-slate-600"}`}>
                                  {to12h(slot.startTime)} – {to12h(slot.endTime)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBlockedOverrides((prev) => ({ ...prev, [slot.startTime]: !isBlocked }))
                                  }
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition ${
                                    isBlocked ? "bg-slate-200 text-slate-500" : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {isBlocked ? "Disabled" : "Active"}
                                </button>
                              </div>
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className="text-xs text-slate-400">₹</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={isBlocked}
                                  value={slotOverrides[slot.startTime] ?? bulkPrice}
                                  placeholder={String(slot.price)}
                                  onChange={(e) =>
                                    setSlotOverrides((prev) => ({ ...prev, [slot.startTime]: onlyDigits(e.target.value) }))
                                  }
                                  className="w-20 rounded-lg border border-surface-border bg-cream-200/40 px-2 py-1.5 text-xs font-bold outline-none focus:border-vibe-violet disabled:opacity-50"
                                />
                                {onBookSlot && !isBlocked && (
                                  <button
                                    onClick={() => onBookSlot(slot)}
                                    className="rounded-lg bg-vibe-navy px-2.5 py-1.5 text-[10px] font-black text-white transition hover:opacity-90 active:scale-95"
                                  >
                                    Book
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-3 rounded-xl bg-ink text-white py-3.5 text-sm font-bold hover:bg-ink/90 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Pricing Updates"}
        </button>
      </div>
    </div>
  );
}

function PresetTile({ label, price, active, onClick }: { label: string; price: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-center transition ${
        active ? "border-emerald-400 ring-1 ring-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center justify-center gap-1">
        {label}
        {active && <Check size={11} className="text-emerald-600" />}
      </p>
      <p className="text-base font-extrabold text-slate-800 mt-1">₹{price}</p>
    </button>
  );
}
