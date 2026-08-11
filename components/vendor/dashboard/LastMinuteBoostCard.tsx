"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap, ChevronDown, Clock, Check, X } from "lucide-react";
import { getVendorBookings, updateVendorListing } from "@/lib/api/vendor";
import type { Listing, Booking, TurfSlot } from "@/lib/api/types";

/** Bookings carry an "HH:mm" slot end that the shared api type doesn't declare yet. */
type BookingWithEnd = Booking & { endTime?: string };

const IST = "Asia/Kolkata";
/** Only slots starting this soon are worth boosting — matches "as they fill up in the final minutes". */
const BOOST_WINDOW_MIN = 90;
const DISCOUNT_OPTIONS = [10, 15, 20, 25, 30];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  const aE = aEnd <= aStart ? aEnd + 1440 : aEnd;
  const bE = bEnd <= bStart ? bEnd + 1440 : bEnd;
  return aStart < bE && bStart < aE;
}

function nowMinutesIST(): number {
  return timeToMinutes(new Date().toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false }));
}

function todayIsoIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

function countdownLabel(minutesUntil: number): string {
  if (minutesUntil < 60) return `Starts in ${minutesUntil} min`;
  const hrs = Math.round(minutesUntil / 60);
  return `Starts in ${hrs} hr`;
}

function to12h(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr) % 24;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ap}`;
}

interface BoostSlot extends TurfSlot {
  minutesUntil: number;
  isBoosted: boolean;
  discountPercent: number;
}

export function LastMinuteBoostCard({
  listings,
  onListingUpdated,
}: {
  listings: Listing[];
  onListingUpdated: (updated: Listing) => void;
}) {
  const turfListings = useMemo(() => listings.filter((l) => l.type === "Turf" && l.status === "Active"), [listings]);
  const [listingId, setListingId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bookings, setBookings] = useState<BookingWithEnd[]>([]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ticks once a minute so "Starts in X min" counts down without a page refresh.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!listingId && turfListings.length > 0) setListingId(turfListings[0]._id);
  }, [turfListings, listingId]);

  useEffect(() => {
    getVendorBookings({ limit: 500 })
      .then((res) => setBookings(res.items as BookingWithEnd[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const listing = turfListings.find((l) => l._id === listingId);

  const boostSlots = useMemo<BoostSlot[]>(() => {
    if (!listing) return [];
    const today = todayIsoIST();
    const override = listing.dateOverrides?.find((o) => o.date === today);
    if (override?.isHoliday) return [];
    const baseSlots = override?.slots?.length ? override.slots : listing.slotsList ?? [];
    const nowMin = nowMinutesIST();

    const bookedRanges = bookings
      .filter((b) => b.listingId === listing._id && b.status !== "Cancelled")
      .filter((b) => new Date(b.dateTime).toLocaleDateString("en-CA", { timeZone: IST }) === today)
      .map((b) => {
        const start = new Date(b.dateTime).toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });
        const end =
          b.endTime || new Date(new Date(b.dateTime).getTime() + 60 * 60_000).toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });
        return { start: timeToMinutes(start), end: timeToMinutes(end) };
      });

    return baseSlots
      .filter((s) => !s.blocked)
      .map((s) => {
        const defaultSlot = listing.slotsList?.find((d) => d.startTime === s.startTime);
        const isBoosted = !!defaultSlot && s.price < defaultSlot.price;
        return {
          ...s,
          minutesUntil: timeToMinutes(s.startTime) - nowMin,
          isBoosted,
          discountPercent: isBoosted && defaultSlot ? Math.round((1 - s.price / defaultSlot.price) * 100) : 0,
        };
      })
      .filter((s) => s.minutesUntil > 0)
      .filter((s) => !bookedRanges.some((r) => rangesOverlap(timeToMinutes(s.startTime), timeToMinutes(s.endTime), r.start, r.end)))
      .sort((a, b) => a.minutesUntil - b.minutesUntil);
  }, [listing, bookings]);

  async function applyBoost(slot: BoostSlot, percent: number) {
    if (!listing) return;
    setSaving(true);
    setError(null);
    try {
      const today = todayIsoIST();
      const override = listing.dateOverrides?.find((o) => o.date === today);
      const baseSlots = override?.slots?.length ? override.slots : listing.slotsList ?? [];
      const defaultSlot = listing.slotsList?.find((d) => d.startTime === slot.startTime) ?? slot;
      const nextSlots = baseSlots.map((s) =>
        s.startTime === slot.startTime ? { ...s, price: Math.max(1, Math.round(defaultSlot.price * (1 - percent / 100))) } : s
      );
      const overrides = [...(listing.dateOverrides ?? [])];
      const idx = overrides.findIndex((o) => o.date === today);
      const nextOverride = { date: today, isHoliday: override?.isHoliday ?? false, holidayName: override?.holidayName ?? "", slots: nextSlots };
      if (idx > -1) overrides[idx] = nextOverride;
      else overrides.push(nextOverride);

      const updated = await updateVendorListing(listing._id, { dateOverrides: overrides });
      onListingUpdated(updated);
      setPickerFor(null);
    } catch {
      setError("Couldn't apply the boost — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (turfListings.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
          <Zap size={15} />
        </span>
        <h2 className="text-sm font-extrabold text-slate-900">Last Min Boost</h2>
      </div>
      <p className="text-xs text-slate-500 font-medium mb-4">
        Drop the price on today&apos;s unbooked slots as they fill up in the final minutes.
      </p>

      {turfListings.length > 1 && (
        <div className="relative mb-3">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            {listing?.title ?? "Select a turf"}
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-xl z-20 overflow-hidden">
              {turfListings.map((l) => (
                <button
                  key={l._id}
                  onClick={() => {
                    setListingId(l._id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-xs font-bold transition ${
                    l._id === listingId ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {l.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600">{error}</p>}

      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Today&apos;s Unbooked Slots</p>

      {boostSlots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-6 text-center text-xs font-semibold text-slate-400">
          No unbooked slots left for today.
        </p>
      ) : (
        <div className="space-y-2">
          {boostSlots.map((slot) => {
            const urgent = slot.minutesUntil <= BOOST_WINDOW_MIN && !slot.isBoosted;
            return (
              <div
                key={slot.startTime}
                className={`rounded-2xl border px-3.5 py-3 transition ${
                  urgent ? "border-amber-300 bg-amber-50/50" : slot.isBoosted ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800">
                      {to12h(slot.startTime)} – {to12h(slot.endTime)}
                    </p>
                    <p className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-0.5">
                      <Clock size={10} /> {countdownLabel(slot.minutesUntil)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {slot.isBoosted ? (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                        <Check size={11} /> -{slot.discountPercent}% applied
                      </span>
                    ) : urgent && pickerFor !== slot.startTime ? (
                      <button
                        type="button"
                        onClick={() => setPickerFor(slot.startTime)}
                        className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm hover:bg-amber-600 transition"
                      >
                        Boost it now
                      </button>
                    ) : null}
                    <span className="text-xs font-black text-slate-700">₹{slot.price.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {pickerFor === slot.startTime && (
                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-amber-200/60 pt-2.5">
                    <span className="text-[10px] font-bold text-slate-500 mr-1">Drop by:</span>
                    {DISCOUNT_OPTIONS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        disabled={saving}
                        onClick={() => applyBoost(slot, pct)}
                        className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-[10px] font-black text-amber-700 hover:bg-amber-100 transition disabled:opacity-50"
                      >
                        {pct}%
                      </button>
                    ))}
                    <button type="button" onClick={() => setPickerFor(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
