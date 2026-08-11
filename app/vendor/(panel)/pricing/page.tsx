"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, CalendarDays, ChevronDown, Sofa, Sparkles, TrendingUp, Users, PartyPopper, Trophy, Flame, X, Sun, Moon } from "lucide-react";
import { SectionCard } from "@/components/vendor/ui";
import { DailyPricingSheet } from "@/components/vendor/DailyPricingSheet";
import { createVendorBooking, getVendorBookings, getVendorListings, updateVendorListing } from "@/lib/api/vendor";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { Booking, Listing, TurfSlot } from "@/lib/types";
import { INDIAN_HOLIDAYS } from "@/lib/holidays";
import { categoryLabel } from "@/lib/taxonomy";

/** Vendor bookings carry more than the shared mock type models. */
type ApiBooking = Booking & { listingId?: string; sport?: string };

/** The sport tag that marks a multi-day corporate/tournament booking. */
const EVENT_SPORT = "Corporate/Tournament";

type BulkTarget = "weekdays" | "weekends" | "holidays";

const BULK_LABEL: Record<BulkTarget, string> = {
  weekdays: "Weekdays",
  weekends: "Weekends",
  holidays: "Holidays",
};

type BulkScope = "month" | "year";

/** Every date (as a local midnight Date) in the given month, or in the whole year. */
function datesInScope(scope: BulkScope, year: number, month: number): Date[] {
  const dates: Date[] = [];
  const months = scope === "month" ? [month] : Array.from({ length: 12 }, (_, i) => i);
  for (const m of months) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) dates.push(new Date(year, m, d));
  }
  return dates;
}

/** Matches the Morning/Noon (5 AM–3 PM) vs Evening/Night (3 PM–3 AM) split on the Vibe
 * Cycle clock — the 3–5 AM maintenance window never has slots in it, so it never
 * actually matches either block. */
type TimeBlock = "morningNoon" | "eveningNight";
const TIME_BLOCK_LABEL: Record<TimeBlock, string> = {
  morningNoon: "Morning/Noon",
  eveningNight: "Evening/Night",
};
function matchesTimeBlock(startTime: string, block: TimeBlock): boolean {
  const h = Number(startTime.split(":")[0]) || 0;
  return block === "morningNoon" ? h >= 5 && h < 15 : h >= 15 || h < 3;
}
/**
 * Every date carries a light day-type wash — weekday / weekend / holiday — so the three
 * Bulk Pricing targets are readable straight off the calendar. Bookings, long-weekend
 * stretches and custom rates layer *on top* of that wash rather than replacing it, so a
 * date never loses the one signal that says which bulk rule applies to it.
 */
const DAY_TONE = {
  weekday: {
    cell: "border-blue-200 bg-blue-50/70 hover:border-blue-300 hover:bg-blue-100/70",
    num: "bg-blue-100/70 text-blue-800",
    price: "border border-blue-200/70 bg-blue-100/60 text-blue-800",
    swatch: "bg-blue-500",
  },
  weekend: {
    cell: "border-pink-200 bg-pink-50/70 hover:border-pink-300 hover:bg-pink-100/70",
    num: "bg-pink-100/70 text-pink-800",
    price: "border border-pink-200/70 bg-pink-100/60 text-pink-800",
    swatch: "bg-pink-500",
  },
  holiday: {
    cell: "border-amber-300 bg-amber-50/80 hover:border-amber-400 hover:bg-amber-100/80",
    num: "bg-amber-100/70 text-amber-900",
    price: "border border-amber-300/70 bg-amber-100/60 text-amber-900",
    swatch: "bg-amber-500",
  },
} as const;

/** Bulk Pricing target → the same wash its dates wear on the calendar. */
const BULK_TINT: Record<BulkTarget, string> = {
  weekdays: "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300 hover:bg-blue-100/70",
  weekends: "border-pink-200 bg-pink-50 text-pink-800 hover:border-pink-300 hover:bg-pink-100/70",
  holidays: "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100/70",
};

/** Icon for each Bulk Pricing target — a quick visual cue on the button. */
const BULK_ICON: Record<BulkTarget, typeof CalendarDays> = {
  weekdays: CalendarDays,
  weekends: Sofa,
  holidays: PartyPopper,
};

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Resolve the effective slot list for a given date: its override if one exists, else the listing's default slots. */
function resolveSlotsForDate(listing: Listing, dateIso: string): TurfSlot[] {
  const override = listing.dateOverrides?.find((o) => o.date === dateIso);
  if (override) return override.slots ?? [];
  return listing.slotsList ?? [];
}

function minPrice(slots: TurfSlot[]): number | null {
  if (!slots.length) return null;
  return Math.min(...slots.map((s) => s.price));
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `₹${(price / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `₹${price}`;
}

export default function PriceSettingPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedTurfId, setSelectedTurfId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [applyingPeak, setApplyingPeak] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const todayIso = useMemo(() => toIso(new Date()), []);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  const [bulkTarget, setBulkTarget] = useState<BulkTarget | null>(null);
  // Held as a string so the field can be cleared. Number state coerced ""→0, which
  // snapped the box back to 0 and forced values like "0300".
  const [bulkPriceInput, setBulkPriceInput] = useState("1000");
  const bulkPrice = Number(bulkPriceInput) || 0;
  // Bulk/peak pricing changes only ever touch the month or year currently on screen —
  // never a silent 6-months-from-today window a vendor can't see or reason about.
  const [bulkScope, setBulkScope] = useState<BulkScope>("month");

  // Time-of-day pricing — e.g. "charge ₹800 for every Evening/Night Cricket slot on
  // Court 1" — shares the same month/year scope toggle as the day-type bulk pricing
  // above. Always sets an exact rate (no +/- adjust) and, like My Listing's Pricing
  // Studio, is scoped to one game + court at a time — "All games"/"All courts" repeats
  // the venue-wide default behaviour.
  const [blockTarget, setBlockTarget] = useState<TimeBlock | null>(null);
  const [blockGame, setBlockGame] = useState<string>("all");
  const [blockCourtId, setBlockCourtId] = useState<string>("all");
  const [blockAmountInput, setBlockAmountInput] = useState("100");
  const blockAmount = Number(blockAmountInput) || 0;
  const [applyingBlock, setApplyingBlock] = useState(false);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [holidayPopover, setHolidayPopover] = useState<string | null>(null);
  const [holidayHovered, setHolidayHovered] = useState<string | null>(null);

  // Click anywhere on web hides the holiday info popover box
  useEffect(() => {
    if (!holidayPopover) return;
    const handleGlobalClick = () => setHolidayPopover(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [holidayPopover]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);

  /** Vendor opted in to BYV managing this turf's dynamic pricing (local until a backend field exists). */
  const [byvManaged, setByvManaged] = useState(false);
  useEffect(() => {
    if (!selectedTurfId) return;
    setByvManaged(localStorage.getItem(`byv_dynamic_pricing_${selectedTurfId}`) === "1");
  }, [selectedTurfId]);
  function toggleByvManaged() {
    const next = !byvManaged;
    setByvManaged(next);
    localStorage.setItem(`byv_dynamic_pricing_${selectedTurfId}`, next ? "1" : "0");
    // Manual pricing controls get locked the instant BYV takes over — don't leave
    // a bulk-price entry half-open behind the now-disabled buttons.
    if (next) setBulkTarget(null);
    setToast(
      next
        ? "BYV will now manage dynamic pricing for this turf — demand-based rates on weekends, holidays and peak hours."
        : "You're back to managing this turf's pricing yourself."
    );
  }

  useEffect(() => {
    getVendorListings()
      .then((l) => {
        const mapped = l.map(apiListingToMock).filter((x) => x.type === "Turf");
        setListings(mapped);
        const withSlots = mapped.find((t) => (t.slotsList?.length ?? 0) > 0);
        setSelectedTurfId((withSlots ?? mapped[0])?.id ?? "");
      })
      .catch((e) => setError(e instanceof ApiError ? e.describe() : "Failed to load"))
      .finally(() => setLoading(false));
    refreshBookings();
  }, []);

  function refreshBookings() {
    getVendorBookings({ limit: 500 })
      .then((b) => setBookings(b.items as unknown as ApiBooking[]))
      .catch(() => {});
  }

  /** Dates (ISO) on which the selected turf has a corporate/tournament booking, with the organiser's name. */
  const eventDates = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of bookings) {
      if (b.status === "Cancelled") continue;
      if (b.sport !== EVENT_SPORT) continue;
      if ((b.listingId ?? b.listing) !== selectedTurfId) continue;
      m.set(toIso(new Date(b.dateTime)), b.customer ?? "Event");
    }
    return m;
  }, [bookings, selectedTurfId]);

  const selectedTurf = useMemo(() => listings.find((l) => l.id === selectedTurfId), [listings, selectedTurfId]);

  // A court left selected from a previous game that this one doesn't host would
  // silently reprice the wrong court — fall back to "All courts" instead.
  useEffect(() => {
    if (blockCourtId === "all" || !selectedTurf) return;
    const court = selectedTurf.courts?.find((c) => c.id === blockCourtId);
    const stillHosts = court && (blockGame === "all" || court.sports.length === 0 || court.sports.includes(blockGame));
    if (!stillHosts) setBlockCourtId("all");
  }, [blockGame, blockCourtId, selectedTurf]);

  // Auto-dismiss the toast after a few seconds.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  /** Keep the horizontal month strip showing the month the grid is actually on —
   * it used to open parked on January while the grid showed July. */
  const monthStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    monthStripRef.current
      ?.querySelector<HTMLElement>(`[data-month="${calMonth}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [calMonth]);

  const calendarDays = useMemo(() => {
    // Week starts Monday so Sat & Sun sit next to each other at the end of the row.
    const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const days: ({ dayNumber: number; dateStr: string; isWeekend: boolean; isPast: boolean; isHoliday: boolean } | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= lastDay; i++) {
      const date = new Date(calYear, calMonth, i);
      const dateStr = toIso(date);
      const dow = date.getDay();
      days.push({
        dayNumber: i,
        dateStr,
        isWeekend: dow === 0 || dow === 6,
        isPast: dateStr < todayIso,
        isHoliday: Boolean(INDIAN_HOLIDAYS[dateStr]),
      });
    }
    return days;
  }, [calYear, calMonth, todayIso]);

  /** Dates that are part of a run of 3+ consecutive calendar-day holidays (e.g. a long weekend
   * stretch) — flagged so those cells can be visually called out beyond a single-day holiday. */
  const holidayStreakDates = useMemo(() => {
    const set = new Set<string>();
    let run: string[] = [];
    const flushRun = () => {
      if (run.length >= 3) run.forEach((d) => set.add(d));
      run = [];
    };
    for (const day of calendarDays) {
      if (day && day.isHoliday) run.push(day.dateStr);
      else flushRun();
    }
    flushRun();
    return set;
  }, [calendarDays]);

  /**
   * Insights for the month the calendar is actually showing — real public
   * holidays, long-weekend stretches and a demand hint derived from
   * INDIAN_HOLIDAYS, not a hardcoded month. (The panel used to always print
   * "May …" no matter which month was on screen.)
   */
  const monthInsights = useMemo(() => {
    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-`;
    const holidays = Object.entries(INDIAN_HOLIDAYS)
      .filter(([date]) => date.startsWith(monthPrefix))
      .map(([date, name]) => ({ date, name }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // A "long weekend" = 3+ consecutive off-days (Sat/Sun or a holiday) that
    // include at least one public holiday. Scan a padded window so a stretch
    // straddling the month edge is still caught, then keep only the ones that
    // actually touch the visible month.
    const isOff = (d: Date) => {
      const dow = d.getDay();
      return dow === 0 || dow === 6 || Boolean(INDIAN_HOLIDAYS[toIso(d)]);
    };
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const streaks: { start: string; end: string; name: string; days: number }[] = [];
    let run: Date[] = [];
    const flush = () => {
      const touchesMonth = run.some((d) => d.getMonth() === calMonth && d.getFullYear() === calYear);
      const holiday = run.map((d) => INDIAN_HOLIDAYS[toIso(d)]).find(Boolean);
      if (run.length >= 3 && holiday && touchesMonth) {
        streaks.push({ start: toIso(run[0]), end: toIso(run[run.length - 1]), name: holiday, days: run.length });
      }
      run = [];
    };
    for (let i = -3; i <= daysInMonth + 3; i++) {
      const d = new Date(calYear, calMonth, i + 1);
      if (isOff(d)) run.push(d);
      else flush();
    }
    flush();
    const seen = new Set<string>();
    const uniqueStreaks = streaks.filter((s) => (seen.has(s.start) ? false : (seen.add(s.start), true)));

    const demand = uniqueStreaks.length ? 60 + Math.min(30, (Math.max(...uniqueStreaks.map((s) => s.days)) - 3) * 12 + 10) : holidays.length ? 40 : 25;
    return { holidays, streaks: uniqueStreaks, demand };
  }, [calYear, calMonth]);

  /** "2026-08-28" → "28 Aug". */
  function fmtDayShort(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1);
  }

  /** Writes a dateOverride (all slots at `price`) for a single date, preserving that date's existing slot times. */
  function buildOverrideEntry(listing: Listing, dateIso: string, price: number) {
    const slots = resolveSlotsForDate(listing, dateIso).map((s) => ({ ...s, price }));
    const existing = listing.dateOverrides?.find((o) => o.date === dateIso);
    return { date: dateIso, isHoliday: existing?.isHoliday ?? false, holidayName: existing?.holidayName ?? "", slots };
  }

  async function applyBulkPrice() {
    if (!selectedTurf || !bulkTarget || applyingBulk) return;
    const turf = selectedTurf;
    const target = bulkTarget;
    const scopeLabel = bulkScope === "month" ? `${monthNames[calMonth]} ${calYear}` : `${calYear}`;
    setApplyingBulk(true);
    try {
      const overrides = [...(turf.dateOverrides ?? [])];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let matched = 0;
      for (const d of datesInScope(bulkScope, calYear, calMonth)) {
        if (d < todayStart) continue;
        const dateStr = toIso(d);
        const dow = d.getDay();
        const isHolidayDay = Boolean(INDIAN_HOLIDAYS[dateStr]);
        const matches =
          target === "weekdays" ? dow >= 1 && dow <= 5 :
          target === "weekends" ? dow === 0 || dow === 6 :
          isHolidayDay;
        if (!matches) continue;
        matched++;
        const entry = buildOverrideEntry(turf, dateStr, bulkPrice);
        entry.isHoliday = target === "holidays" ? true : entry.isHoliday;
        if (target === "holidays" && !entry.holidayName) entry.holidayName = INDIAN_HOLIDAYS[dateStr] ?? "";
        const idx = overrides.findIndex((o) => o.date === dateStr);
        if (idx > -1) overrides[idx] = entry; else overrides.push(entry);
      }

      // Nothing matched — tell the vendor instead of silently doing nothing.
      if (matched === 0) {
        setToast(
          target === "holidays"
            ? `No holidays fall in ${scopeLabel}, so there was nothing to update.`
            : `No ${BULK_LABEL[target].toLowerCase()} fall in ${scopeLabel}.`
        );
        setApplyingBulk(false);
        return;
      }

      const updated = { ...turf, dateOverrides: overrides };
      // Optimistic update so the calendar reflects the change instantly.
      setListings((ls) => ls.map((x) => (x.id === turf.id ? updated : x)));
      setBulkTarget(null);
      setToast(`Applied ${formatPrice(bulkPrice)} to ${matched} ${BULK_LABEL[target].toLowerCase()} in ${scopeLabel}.`);

      const saved = await updateVendorListing(turf.id, mockListingToApiInput(updated));
      setListings((ls) => ls.map((x) => (x.id === turf.id ? apiListingToMock(saved) : x)));
    } catch {
      // Roll the optimistic change back to the last known-good listing.
      setListings((ls) => ls.map((x) => (x.id === turf.id ? turf : x)));
      setToast("Couldn't save that rate. Please check your connection and try again.");
    }
    setApplyingBulk(false);
  }

  /** Writes a dateOverride for one date, setting an exact price on just the slots
   * inside the chosen time block (Morning/Noon or Evening/Night) for one game + court
   * — every other slot, sport or court on that date keeps its existing price untouched,
   * unlike buildOverrideEntry which repriced the whole day. Mirrors My Listing's
   * Pricing Studio: an exact-match row is updated in place, otherwise a new row tagged
   * with that game/court is added rather than touching the venue-wide default. */
  function buildBlockOverrideEntry(
    listing: Listing,
    dateIso: string,
    block: TimeBlock,
    amount: number,
    sport: string | undefined,
    courtId: string | undefined
  ) {
    const existingSlots = resolveSlotsForDate(listing, dateIso);
    const targets = new Map<string, TurfSlot>();
    for (const s of existingSlots) {
      if (!matchesTimeBlock(s.startTime, block)) continue;
      const key = `${s.startTime}-${s.endTime}`;
      if (!targets.has(key)) targets.set(key, s);
    }

    let slots = [...existingSlots];
    for (const { startTime, endTime, label } of targets.values()) {
      const idx = slots.findIndex(
        (s) => s.startTime === startTime && s.endTime === endTime && s.sport === sport && s.courtId === courtId
      );
      if (idx > -1) {
        slots[idx] = { ...slots[idx], price: amount };
      } else {
        slots.push({ startTime, endTime, label, price: amount, blocked: false, sport, courtId });
      }
    }

    const existing = listing.dateOverrides?.find((o) => o.date === dateIso);
    return { date: dateIso, isHoliday: existing?.isHoliday ?? false, holidayName: existing?.holidayName ?? "", slots };
  }

  async function applyBlockPrice() {
    if (!selectedTurf || !blockTarget || applyingBlock) return;
    const turf = selectedTurf;
    const target = blockTarget;
    const amount = blockAmount;
    const sport = blockGame === "all" ? undefined : blockGame;
    const courtId = blockCourtId === "all" ? undefined : blockCourtId;
    const scopeLabel = bulkScope === "month" ? `${monthNames[calMonth]} ${calYear}` : `${calYear}`;
    setApplyingBlock(true);
    try {
      const overrides = [...(turf.dateOverrides ?? [])];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let matchedDates = 0;
      let matchedSlots = 0;
      for (const d of datesInScope(bulkScope, calYear, calMonth)) {
        if (d < todayStart) continue;
        const dateStr = toIso(d);
        const uniqueTimes = new Set(
          resolveSlotsForDate(turf, dateStr)
            .filter((s) => matchesTimeBlock(s.startTime, target))
            .map((s) => `${s.startTime}-${s.endTime}`)
        );
        if (uniqueTimes.size === 0) continue;
        matchedDates++;
        matchedSlots += uniqueTimes.size;
        const entry = buildBlockOverrideEntry(turf, dateStr, target, amount, sport, courtId);
        const idx = overrides.findIndex((o) => o.date === dateStr);
        if (idx > -1) overrides[idx] = entry; else overrides.push(entry);
      }

      if (matchedDates === 0) {
        setToast(`No ${TIME_BLOCK_LABEL[target].toLowerCase()} slots found in ${scopeLabel}.`);
        setApplyingBlock(false);
        return;
      }

      const updated = { ...turf, dateOverrides: overrides };
      // Optimistic update so the calendar reflects the change instantly.
      setListings((ls) => ls.map((x) => (x.id === turf.id ? updated : x)));
      setBlockTarget(null);
      const scopeName = [sport ? categoryLabel(sport) : null, courtId ? turf.courts?.find((c) => c.id === courtId)?.name : null]
        .filter(Boolean)
        .join(" · ");
      setToast(
        `Set ${TIME_BLOCK_LABEL[target]}${scopeName ? ` (${scopeName})` : ""} slots to ${formatPrice(amount)} across ${matchedSlots} slot${matchedSlots === 1 ? "" : "s"} in ${scopeLabel}.`
      );

      const saved = await updateVendorListing(turf.id, mockListingToApiInput(updated));
      setListings((ls) => ls.map((x) => (x.id === turf.id ? apiListingToMock(saved) : x)));
    } catch {
      // Roll the optimistic change back to the last known-good listing.
      setListings((ls) => ls.map((x) => (x.id === turf.id ? turf : x)));
      setToast("Couldn't save that time-of-day rate. Please check your connection and try again.");
    }
    setApplyingBlock(false);
  }

  async function saveDailyPricing(nextSlots: TurfSlot[]) {
    if (!selectedTurf || !activeDate) return;
    try {
      const overrides = [...(selectedTurf.dateOverrides ?? [])];
      const existing = overrides.find((o) => o.date === activeDate);
      const entry = { date: activeDate, isHoliday: existing?.isHoliday ?? false, holidayName: existing?.holidayName ?? "", slots: nextSlots };
      const idx = overrides.findIndex((o) => o.date === activeDate);
      if (idx > -1) overrides[idx] = entry; else overrides.push(entry);
      const updated = { ...selectedTurf, dateOverrides: overrides };
      const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setListings((ls) => ls.map((x) => (x.id === selectedTurf.id ? apiListingToMock(saved) : x)));
      setActiveDate(null);
    } catch {
      alert("Failed to save pricing");
    }
  }

  async function applyPeakPricingTemplate() {
    if (!selectedTurf || applyingPeak) return;
    const turf = selectedTurf;
    const scopeLabel = bulkScope === "month" ? `${monthNames[calMonth]} ${calYear}` : `${calYear}`;
    setApplyingPeak(true);
    try {
      const overrides = [...(turf.dateOverrides ?? [])];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let matched = 0;
      for (const d of datesInScope(bulkScope, calYear, calMonth)) {
        if (d < todayStart) continue;
        const dateStr = toIso(d);
        const dow = d.getDay();
        const isPeak = dow === 0 || dow === 6 || Boolean(INDIAN_HOLIDAYS[dateStr]);
        if (!isPeak) continue;
        matched++;
        const entry = buildOverrideEntry(turf, dateStr, 1200);
        const idx = overrides.findIndex((o) => o.date === dateStr);
        if (idx > -1) overrides[idx] = entry; else overrides.push(entry);
      }
      const updated = { ...turf, dateOverrides: overrides };
      // Optimistic update so the calendar reflects the change instantly.
      setListings((ls) => ls.map((x) => (x.id === turf.id ? updated : x)));
      setToast(`Peak Pricing applied to ${matched} weekend & holiday dates in ${scopeLabel}.`);
      const saved = await updateVendorListing(turf.id, mockListingToApiInput(updated));
      setListings((ls) => ls.map((x) => (x.id === turf.id ? apiListingToMock(saved) : x)));
    } catch {
      setListings((ls) => ls.map((x) => (x.id === turf.id ? turf : x)));
      setToast("Couldn't apply the Peak Pricing template. Please try again.");
    }
    setApplyingPeak(false);
  }

  if (error) return <div className="p-10 text-center text-vibe-coral text-sm">{error}</div>;
  if (loading) return <div className="p-10 text-center text-ink-faint text-sm">Loading pricing…</div>;

  const activeDateSlots = activeDate && selectedTurf ? resolveSlotsForDate(selectedTurf, activeDate) : [];
  const activeDateLabel = activeDate
    ? new Date(activeDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : "";

  return (
    <div className="space-y-6">
      {/* Toast / feedback banner */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md rounded-2xl bg-ink text-white text-xs font-bold px-4 py-3 shadow-xl">
            {toast}
          </div>
        </div>
      )}

      {/* Turf selector header */}
      {listings.length > 1 && (
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-slate-700">Turf:</p>
          <div className="relative">
            <select
              value={selectedTurfId}
              onChange={(e) => setSelectedTurfId(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold px-4 py-2.5 pr-8 outline-none shadow-sm"
            >
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {!selectedTurf ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white">
          <p className="text-sm font-semibold text-slate-500">No Turf listings found. Add a Turf listing to set pricing.</p>
        </div>
      ) : (
        <>
          {/* Bulk Pricing — pared back to just the three targets (heading + rolling-rule
              subtext removed per request); each button is iconed and carries its day-type wash.
              Locked out entirely once BYV is managing this turf's pricing — the vendor
              shouldn't be able to set weekday/weekend/holiday rates behind BYV's back. */}
          <div className="relative rounded-xl2 border border-surface-border bg-surface-card shadow-panel p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Set prices in bulk</p>
              {byvManaged && (
                <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-indigo-600">
                  <Sparkles size={10} /> BYV managed
                </span>
              )}
            </div>
            <div className={`grid grid-cols-3 gap-2 ${byvManaged ? "pointer-events-none opacity-40" : ""}`}>
              {(["weekdays", "weekends", "holidays"] as BulkTarget[]).map((t) => {
                const Icon = BULK_ICON[t];
                return (
                  <button
                    key={t}
                    disabled={byvManaged}
                    onClick={() => setBulkTarget(bulkTarget === t ? null : t)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-3.5 text-sm font-bold transition ${
                      bulkTarget === t ? "border-ink bg-ink text-white" : BULK_TINT[t]
                    }`}
                  >
                    <Icon size={18} />
                    {BULK_LABEL[t]}
                  </button>
                );
              })}
            </div>
            {bulkTarget && !byvManaged && (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Apply to</span>
                  <div className="flex overflow-hidden rounded-lg border border-surface-border">
                    <button
                      onClick={() => setBulkScope("month")}
                      className={`px-3 py-1.5 text-[10.5px] font-black transition ${
                        bulkScope === "month" ? "bg-ink text-white" : "bg-white text-ink-faint hover:bg-cream-200/40"
                      }`}
                    >
                      {monthNames[calMonth]} {calYear} only
                    </button>
                    <button
                      onClick={() => setBulkScope("year")}
                      className={`px-3 py-1.5 text-[10.5px] font-black transition ${
                        bulkScope === "year" ? "bg-ink text-white" : "bg-white text-ink-faint hover:bg-cream-200/40"
                      }`}
                    >
                      Whole {calYear}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bulkPriceInput}
                    onChange={(e) => setBulkPriceInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter price"
                    className="flex-1 rounded-xl border border-surface-border bg-cream-200/40 px-4 py-2.5 text-sm font-bold outline-none focus:border-vibe-violet"
                  />
                  <button
                    onClick={applyBulkPrice}
                    disabled={applyingBulk || bulkPrice <= 0}
                    className="rounded-xl bg-vibe-violet text-white text-sm font-bold px-5 py-2.5 hover:bg-vibe-violetSoft transition disabled:opacity-60"
                  >
                    {applyingBulk ? "Applying…" : `Apply to all ${BULK_LABEL[bulkTarget]}`}
                  </button>
                </div>
              </div>
            )}
            {byvManaged && (
              <p className="mt-3 text-[10px] font-bold leading-relaxed text-ink-faint">
                BYV is setting your weekday, weekend and holiday rates automatically. Turn off "Dynamic Pricing by BYV" below to set these yourself.
              </p>
            )}
          </div>

          {/* Time-of-day Pricing — a separate axis from the day-type bulk pricing above:
              this reprices only the slots that fall inside Morning/Noon (5 AM–3 PM) or
              Evening/Night (3 PM–3 AM), leaving every other slot on those dates untouched.
              Individual per-slot pricing (tap a date on the calendar below) still exists
              for one-off exceptions — this is for "night is always ₹X more" as a rule. */}
          <div className="relative rounded-xl2 border border-surface-border bg-surface-card shadow-panel p-5 sm:p-6">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Set prices by time of day</p>
              {byvManaged && (
                <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-indigo-600">
                  <Sparkles size={10} /> BYV managed
                </span>
              )}
            </div>
            <p className="mb-3 text-[10.5px] font-semibold leading-relaxed text-ink-faint">
              Pick a game and court, then charge Morning/Noon and Evening/Night differently for that exact combination — leaving every other game, court and slot untouched.
            </p>

            {(selectedTurf?.categories?.length ?? 0) > 0 && (
              <div className={`mb-3 ${byvManaged ? "pointer-events-none opacity-40" : ""}`}>
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ink-faint">Game</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setBlockGame("all")}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                      blockGame === "all" ? "border-ink bg-ink text-white" : "border-surface-border bg-white text-ink-soft hover:bg-cream-200/40"
                    }`}
                  >
                    All games
                  </button>
                  {selectedTurf!.categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBlockGame(c)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                        blockGame === c ? "border-ink bg-ink text-white" : "border-surface-border bg-white text-ink-soft hover:bg-cream-200/40"
                      }`}
                    >
                      {categoryLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(selectedTurf?.courts?.length ?? 0) > 0 && (
              <div className={`mb-3 ${byvManaged ? "pointer-events-none opacity-40" : ""}`}>
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ink-faint">Court</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setBlockCourtId("all")}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                      blockCourtId === "all" ? "border-ink bg-ink text-white" : "border-surface-border bg-white text-ink-soft hover:bg-cream-200/40"
                    }`}
                  >
                    All courts
                  </button>
                  {selectedTurf!.courts!
                    .filter((c) => blockGame === "all" || c.sports.length === 0 || c.sports.includes(blockGame))
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setBlockCourtId(c.id)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                          blockCourtId === c.id ? "border-ink bg-ink text-white" : "border-surface-border bg-white text-ink-soft hover:bg-cream-200/40"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className={`grid grid-cols-2 gap-2 ${byvManaged ? "pointer-events-none opacity-40" : ""}`}>
              {(["morningNoon", "eveningNight"] as TimeBlock[]).map((t) => {
                const Icon = t === "morningNoon" ? Sun : Moon;
                return (
                  <button
                    key={t}
                    disabled={byvManaged}
                    onClick={() => setBlockTarget(blockTarget === t ? null : t)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-3.5 text-sm font-bold transition ${
                      blockTarget === t
                        ? "border-ink bg-ink text-white"
                        : "border-surface-border bg-white text-ink-soft hover:bg-cream-200/40"
                    }`}
                  >
                    <Icon size={18} />
                    {TIME_BLOCK_LABEL[t]}
                  </button>
                );
              })}
            </div>
            {blockTarget && !byvManaged && (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Apply to</span>
                  <div className="flex overflow-hidden rounded-lg border border-surface-border">
                    <button
                      onClick={() => setBulkScope("month")}
                      className={`px-3 py-1.5 text-[10.5px] font-black transition ${
                        bulkScope === "month" ? "bg-ink text-white" : "bg-white text-ink-faint hover:bg-cream-200/40"
                      }`}
                    >
                      {monthNames[calMonth]} {calYear} only
                    </button>
                    <button
                      onClick={() => setBulkScope("year")}
                      className={`px-3 py-1.5 text-[10.5px] font-black transition ${
                        bulkScope === "year" ? "bg-ink text-white" : "bg-white text-ink-faint hover:bg-cream-200/40"
                      }`}
                    >
                      Whole {calYear}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={blockAmountInput}
                    onChange={(e) => setBlockAmountInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter price"
                    className="flex-1 rounded-xl border border-surface-border bg-cream-200/40 px-4 py-2.5 text-sm font-bold outline-none focus:border-vibe-violet"
                  />
                  <button
                    onClick={applyBlockPrice}
                    disabled={applyingBlock || blockAmount <= 0}
                    className="rounded-xl bg-vibe-violet text-white text-sm font-bold px-5 py-2.5 hover:bg-vibe-violetSoft transition disabled:opacity-60"
                  >
                    {applyingBlock ? "Applying…" : `Set ${TIME_BLOCK_LABEL[blockTarget]} price`}
                  </button>
                </div>
              </div>
            )}
            {byvManaged && (
              <p className="mt-3 text-[10px] font-bold leading-relaxed text-ink-faint">
                BYV is setting your time-of-day rates automatically. Turn off "Dynamic Pricing by BYV" below to set these yourself.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-surface-border bg-white p-4 shadow-panel">
            <div className="mb-4">
              <h3 className="text-[17px] font-black text-slate-800">{monthNames[calMonth]} {calYear}</h3>
            </div>

            <div ref={monthStripRef} className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
              {monthNames.map((name, idx) => (
                <button
                  key={name}
                  data-month={idx}
                  onClick={() => setCalMonth(idx)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all duration-200 ${
                    idx === calMonth
                      ? "bg-[#f5e6d3] text-slate-800 border-b-2 border-[#9a7b56]"
                      : "bg-[#fcf8f2] text-slate-500 hover:bg-[#f5e6d3]/20"
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
              <button onClick={prevMonth} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold bg-[#fcf8f2] text-slate-500 hover:bg-[#f5e6d3]/20">‹</button>
              <button onClick={nextMonth} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold bg-[#fcf8f2] text-slate-500 hover:bg-[#f5e6d3]/20">›</button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={idx} className="aspect-square bg-transparent border-0" />;
                const slots = resolveSlotsForDate(selectedTurf, day.dateStr);
                const price = minPrice(slots);
                const isSelected = activeDate === day.dateStr;
                const isEvent = eventDates.has(day.dateStr);
                const inStreak = holidayStreakDates.has(day.dateStr);
                const isHolidayOnly = day.isHoliday;
                const hasOverride = selectedTurf?.dateOverrides?.some((o) => o.date === day.dateStr);
                const holidayName = INDIAN_HOLIDAYS[day.dateStr];
                const showTooltip = holidayName && (holidayPopover === day.dateStr || holidayHovered === day.dateStr);

                // Styling logic with exact color mapping
                let borderBgCls = "";
                let numCls = "text-slate-700";
                let priceCls = "bg-slate-100 text-slate-600";

                if (day.isPast) {
                  borderBgCls = "border-slate-100 bg-slate-50/50 opacity-30 cursor-not-allowed";
                  numCls = "text-slate-400";
                  priceCls = "bg-slate-100/50 text-slate-400";
                } else if (isSelected) {
                  borderBgCls = "border-2 border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/30 scale-105 z-20 rounded-2xl shadow-md";
                  numCls = "text-blue-900 font-black";
                  priceCls = "bg-blue-600 text-white font-extrabold shadow-2xs";
                } else if (isEvent) {
                  borderBgCls = "border-2 border-purple-300 bg-purple-50/80 hover:bg-purple-100/90 rounded-2xl shadow-2xs";
                  numCls = "text-purple-900 font-black";
                  priceCls = "bg-purple-100 text-purple-900 border border-purple-200 font-extrabold";
                } else if (inStreak) {
                  borderBgCls = "border-2 border-orange-300 bg-orange-50/90 hover:bg-orange-100/90 rounded-2xl shadow-2xs";
                  numCls = "text-orange-950 font-black";
                  priceCls = "bg-orange-100 text-orange-900 border border-orange-200 font-extrabold";
                } else if (isHolidayOnly) {
                  borderBgCls = "border-2 border-amber-300 bg-amber-50/90 hover:bg-amber-100/90 rounded-2xl shadow-2xs";
                  numCls = "text-amber-950 font-black";
                  priceCls = "bg-amber-100 text-amber-900 border border-amber-200/80 font-extrabold";
                } else if (day.isWeekend) {
                  borderBgCls = "border-2 border-pink-200 bg-pink-50/80 hover:bg-pink-100/80 rounded-2xl shadow-2xs";
                  numCls = "text-pink-900 font-black";
                  priceCls = "bg-pink-100 text-pink-900 border border-pink-200/80 font-extrabold";
                } else if (hasOverride) {
                  borderBgCls = "border-2 border-teal-300 bg-teal-50/80 hover:bg-teal-100/90 rounded-2xl shadow-2xs";
                  numCls = "text-teal-900 font-black";
                  priceCls = "bg-teal-600 text-white font-extrabold px-1.5 py-0.5 rounded-full shadow-2xs";
                } else {
                  borderBgCls = "border-2 border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 rounded-2xl shadow-2xs";
                  numCls = "text-blue-900 font-black";
                  priceCls = "bg-blue-100 text-blue-900 border border-blue-200/70 font-extrabold";
                }

                return (
                  <div key={idx} className="relative aspect-square w-full">
                    <button
                      disabled={day.isPast}
                      onClick={() => {
                        if (byvManaged) {
                          setToast("BYV is managing this turf's pricing. Turn off dynamic pricing below to edit rates yourself.");
                          return;
                        }
                        setActiveDate(day.dateStr);
                      }}
                      className={`relative flex flex-col items-center justify-between p-1.5 h-full w-full transition-all duration-200 cursor-pointer ${borderBgCls}`}
                    >
                      <span className={`text-[12px] font-extrabold ${numCls}`}>
                        {day.dayNumber}
                      </span>

                      {price !== null && (
                        <span className={`text-[8.5px] font-black uppercase tracking-wider px-1 py-0.5 rounded-md ${priceCls}`}>
                          {formatPrice(price)}
                        </span>
                      )}

                      {/* Custom Price indicator dot when date has override */}
                      {hasOverride && !isHolidayOnly && !inStreak && !day.isWeekend && (
                        <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-teal-500 shadow-2xs" title="Custom Price Set" />
                      )}

                      {/* Small dot indicators for non-holiday events */}
                      {isEvent && (
                        <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-500" />
                      )}
                    </button>

                    {/* Holiday Info ⓘ Icon & Tooltip */}
                    {day.isHoliday && (
                      <>
                        <button
                          type="button"
                          aria-label={`Holiday details for ${holidayName || "Public Holiday"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHolidayPopover(holidayPopover === day.dateStr ? null : day.dateStr);
                          }}
                          onMouseEnter={() => setHolidayHovered(day.dateStr)}
                          onMouseLeave={() => setHolidayHovered(null)}
                          className="absolute top-1 right-1 z-30 flex h-4 w-4 items-center justify-center rounded-full bg-amber-200 text-[9px] font-black text-amber-950 shadow-xs hover:bg-amber-300 hover:scale-110 transition cursor-pointer"
                        >
                          ⓘ
                        </button>

                        {showTooltip && (
                          <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-2xl border border-amber-300 bg-white p-3 shadow-2xl z-50 text-left pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between border-b border-amber-100 pb-1.5 mb-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                                <PartyPopper size={11} className="text-amber-600" /> Public Holiday
                              </span>
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                                {fmtDayShort(day.dateStr)}
                              </span>
                            </div>
                            <p className="text-xs font-black text-slate-900">{holidayName}</p>
                            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{day.dateStr}</p>
                            {inStreak && (
                              <div className="mt-2 rounded-xl bg-orange-50 p-1.5 border border-orange-200 text-[9px] font-black text-orange-900">
                                🔥 3+ Day Holiday Stretch (+{monthInsights.demand}% Demand Surge)
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3">
              {[
                { swatch: "bg-blue-500", label: "Weekday" },
                { swatch: "bg-pink-500", label: "Weekend" },
                { swatch: "bg-amber-500", label: "Holiday" },
                { swatch: "bg-orange-500", label: "3+ day holiday stretch" },
                { swatch: "bg-purple-500", label: "Corporate booking" },
                { swatch: "bg-teal-500", label: "Custom price" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${l.swatch} shadow-xs`} /> {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── CORPORATE / TOURNAMENT BOOKING ── */}
          <div className="relative overflow-hidden rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-purple-100/70 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-md shadow-purple-600/30">
                <Trophy size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-black text-slate-900">Corporate / Tournament</p>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-purple-800">
                    Multi-day
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                  Block a 2–3 day (or longer) booking in one go — it reserves those dates and shows as an event on the calendar above.
                </p>
                <button
                  onClick={() => setEventSheetOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-[11px] font-black text-white transition hover:bg-purple-700 active:scale-[0.97]"
                >
                  <CalendarRange size={13} /> Take a Booking
                </button>
              </div>
            </div>
          </div>

          {/* ── INSIGHTS & OPPORTUNITIES ── */}
          <div className="bg-gradient-to-br from-slate-50/50 via-white to-slate-50 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-500" size={18} />
              <h2 className="text-sm font-extrabold text-slate-900">Insights & Opportunities</h2>
            </div>

            <div className="space-y-3">
              {/* Alert 1 — long-weekend stretch (Orange Theme matching 3+ day stretch) */}
              {monthInsights.streaks.length > 0 && (
                <div className="border-l-4 border-orange-500 bg-orange-50/30 rounded-r-2xl p-4 flex gap-3.5 border border-orange-200/80">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0 text-orange-600 border border-orange-200">
                    <TrendingUp size={16} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-black text-orange-950">Long Weekend Alert!</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                      <strong className="text-orange-700">{fmtDayShort(monthInsights.streaks[0].start)} – {fmtDayShort(monthInsights.streaks[0].end)}</strong> is a continuous {monthInsights.streaks[0].days}-day holiday stretch ({monthInsights.streaks[0].name} + Weekend). Demand will surge.
                    </p>
                    <span className="inline-block bg-orange-100/90 border border-orange-200 text-orange-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                      Expected Demand: +{monthInsights.demand}%
                    </span>
                  </div>
                </div>
              )}

              {/* Alert 2 — peak-demand nudge for weekends (Pink Theme matching Weekend) */}
              <div className="border-l-4 border-pink-500 bg-pink-50/30 rounded-r-2xl p-4 flex gap-3.5 border border-pink-200/80">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center shrink-0 text-pink-600 border border-pink-200">
                  <Users size={16} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-pink-950">Peak Demand in {monthNames[calMonth]}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                    {monthInsights.holidays.length > 0 ? (
                      <>Weekends and <strong className="text-pink-700">{monthInsights.holidays.length} holiday{monthInsights.holidays.length === 1 ? "" : "s"}</strong> this month draw peak bookings. Maximise revenue on your remaining slots.</>
                    ) : (
                      <>Weekends draw peak bookings this month. Set weekend rates above weekdays to maximise revenue.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Alert 3 — public holidays list (Amber/Yellow Theme matching Holiday) */}
              <div className="border-l-4 border-amber-500 bg-amber-50/30 rounded-r-2xl p-4 flex gap-3.5 border border-amber-200/80">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 text-amber-600 border border-amber-200">
                  <PartyPopper size={16} />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-black text-amber-950">Holidays in {monthNames[calMonth]}</p>
                  {monthInsights.holidays.length === 0 ? (
                    <p className="text-[11px] text-slate-500 leading-relaxed font-bold">No public holidays this month.</p>
                  ) : (
                    <div className="space-y-1 mt-1">
                      {monthInsights.holidays.map((h) => (
                        <button
                          key={h.date}
                          type="button"
                          onClick={() => setActiveDate(h.date)}
                          className="w-full text-left text-[11px] text-slate-700 hover:text-amber-900 leading-relaxed font-bold flex items-center gap-1.5 transition hover:bg-amber-100/50 px-1.5 py-0.5 rounded-lg cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="font-extrabold text-amber-900">{fmtDayShort(h.date)}</span>
                          <span>-</span>
                          <span>{h.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!byvManaged && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[9.5px] font-black uppercase tracking-widest text-ink-faint">Applies to</span>
                <div className="flex overflow-hidden rounded-lg border border-surface-border">
                  <button
                    onClick={() => setBulkScope("month")}
                    className={`px-2.5 py-1 text-[9.5px] font-black transition ${
                      bulkScope === "month" ? "bg-ink text-white" : "bg-white text-ink-faint hover:bg-cream-200/40"
                    }`}
                  >
                    {monthNames[calMonth]} {calYear}
                  </button>
                  <button
                    onClick={() => setBulkScope("year")}
                    className={`px-2.5 py-1 text-[9.5px] font-black transition ${
                      bulkScope === "year" ? "bg-ink text-white" : "bg-white text-ink-faint hover:bg-cream-200/40"
                    }`}
                  >
                    Whole {calYear}
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={applyPeakPricingTemplate}
              disabled={applyingPeak || byvManaged}
              className="w-full bg-[#3f3ebd] hover:bg-[#3433a3] text-white rounded-2xl py-3.5 text-xs font-black shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            >
              {byvManaged ? "BYV is handling peak pricing" : applyingPeak ? "Applying peak pricing..." : "Apply \"Peak Pricing\" Template"}
            </button>
          </div>

          {/* ── DYNAMIC PRICING BY BYV — hand pricing over to the BYV team ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 shadow-lg">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-fuchsia-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
                  <Sparkles size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-black text-white">Dynamic Pricing by BYV</p>
                  <p className="text-[11px] font-medium text-indigo-100">
                    {byvManaged
                      ? "BYV is managing this turf's rates — weekends, holidays and peak hours adjust automatically."
                      : "Let the BYV team adjust your rates for demand, weekends and holidays."}
                  </p>
                </div>
                {/* On/off switch — replaces the old "tap to take back control" button */}
                <button
                  role="switch"
                  aria-checked={byvManaged}
                  aria-label="Toggle BYV dynamic pricing"
                  onClick={toggleByvManaged}
                  className={`relative flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                    byvManaged ? "bg-emerald-400" : "bg-white/25"
                  }`}
                >
                  <span
                    className={`absolute h-5 w-5 rounded-full bg-white shadow transition-all ${byvManaged ? "left-6" : "left-1"}`}
                  />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {["Demand surges", "Weekends", "Holidays"].map((chip) => (
                  <span key={chip} className="rounded-xl bg-white/10 px-2 py-2 text-[9px] font-bold uppercase tracking-wide text-indigo-100">
                    {chip}
                  </span>
                ))}
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-[11px] font-black text-white">
                <span className={`h-2 w-2 rounded-full ${byvManaged ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" : "bg-white/40"}`} />
                {byvManaged ? "ON — BYV is handling your pricing" : "OFF — you're managing pricing yourself"}
              </p>
            </div>
          </div>
        </>
      )}

      {eventSheetOpen && selectedTurf && (
        <EventBookingSheet
          turf={selectedTurf}
          onClose={() => setEventSheetOpen(false)}
          onCreated={(days, firstDate) => {
            setEventSheetOpen(false);
            refreshBookings();
            const d = new Date(firstDate + "T00:00:00");
            setCalYear(d.getFullYear());
            setCalMonth(d.getMonth());
            setToast(`Booked ${days} day${days === 1 ? "" : "s"} — marked as "Event" on the calendar.`);
          }}
        />
      )}

      {activeDate && selectedTurf && (
        <DailyPricingSheet
          dateLabel={activeDateLabel}
          slots={activeDateSlots}
          onClose={() => setActiveDate(null)}
          onSave={saveDailyPricing}
          onBookSlot={(slot) => {
            const q = new URLSearchParams({
              date: activeDate,
              start: slot.startTime,
              end: slot.endTime,
              price: String(slot.price),
            });
            window.location.href = `/vendor/bookings?${q.toString()}`;
          }}
        />
      )}
    </div>
  );
}

/** Longest event we'll book in one go — guards against a mistyped year-long range. */
const MAX_EVENT_DAYS = 14;

/**
 * Multi-day corporate/tournament booking. Creates one confirmed offline booking
 * per day spanning the turf's full operating hours, tagged so the calendar can
 * mark those dates as "Event".
 */
function EventBookingSheet({
  turf,
  onClose,
  onCreated,
}: {
  turf: Listing;
  onClose: () => void;
  onCreated: (days: number, firstDate: string) => void;
}) {
  const todayIso = toIso(new Date());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [amountInput, setAmountInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayList = useMemo(() => {
    const days: string[] = [];
    if (!startDate || !endDate || endDate < startDate) return days;
    const d = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (d <= end && days.length <= MAX_EVENT_DAYS) {
      days.push(toIso(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  const amountPerDay = Number(amountInput) || 0;

  async function handleSubmit() {
    if (name.trim().length < 2) return setError("Enter the organisation or customer name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit phone number.");
    if (dayList.length === 0) return setError("The end date must be on or after the start date.");
    if (dayList.length > MAX_EVENT_DAYS) return setError(`Bookings can span at most ${MAX_EVENT_DAYS} days.`);
    if (amountPerDay <= 0) return setError("Enter the amount per day.");

    setSaving(true);
    setError(null);
    try {
      for (const dateIso of dayList) {
        const daySlots = [...resolveSlotsForDate(turf, dateIso)].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const dayStart = daySlots[0]?.startTime ?? "06:00";
        const dayEnd = daySlots[daySlots.length - 1]?.endTime ?? "22:00";
        await createVendorBooking({
          listingId: turf.id,
          customerName: name.trim(),
          phone,
          sport: EVENT_SPORT,
          dateTime: new Date(`${dateIso}T${dayStart}:00`).toISOString(),
          endTime: dayEnd,
          totalAmount: amountPerDay,
          payment: "Cash (Offline)",
          status: "Confirmed",
        });
      }
      onCreated(dayList.length, dayList[0]);
    } catch (e) {
      setError(e instanceof ApiError ? e.describe() : "Couldn't create the booking. Please try again.");
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
              <Trophy size={18} />
            </span>
            <div>
              <h3 className="text-[14px] font-black text-slate-900">Corporate / Tournament Booking</h3>
              <p className="text-[10px] font-medium text-slate-400">{turf.title} — books the full day for each selected date.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-600">{error}</p>}
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-400">Organisation / Customer Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corporate League" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-400">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="9812345670"
              className={field}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-400">From</label>
              <input type="date" value={startDate} min={todayIso} onChange={(e) => setStartDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-400">To</label>
              <input type="date" value={endDate} min={startDate || todayIso} onChange={(e) => setEndDate(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-400">Amount per day (₹)</label>
            <input
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="15000"
              className={field}
            />
          </div>

          {dayList.length > 0 && (
            <p className="rounded-xl bg-violet-50 px-3 py-2.5 text-[11px] font-bold text-violet-700">
              {dayList.length} day{dayList.length === 1 ? "" : "s"}
              {amountPerDay > 0 ? ` · Total ₹${(amountPerDay * dayList.length).toLocaleString("en-IN")}` : ""}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-violet-600 py-3 text-[11px] font-black text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-60"
          >
            <CalendarRange size={13} /> {saving ? "Booking…" : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
