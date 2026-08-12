"use client";


/* ------------------------------------------------------------------ */
/*  BOOKING FLOW                                                       */
/*                                                                     */
/*  Real booking journey against the live backend:                     */
/*    0. auth      -> log in / sign up if not already a player         */
/*    1. review    -> date + start time + contact + price              */
/*    2. confirmed -> real order id + booking pass                     */
/*                                                                     */
/*  Price shown is exactly listing.price — the backend has no slot-    */
/*  quantity or markup concept yet, so we don't pretend it does.       */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { CalendarDays, Check, ChevronRight, ChevronLeft, Clock, Download, MapPin, Maximize2, Minimize2, Minus, Share2, ShieldCheck, Users, X, AlertTriangle, Plus, ArrowLeft, ArrowRight, Image as ImageIcon, Layers, Zap } from "lucide-react";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { LoginModal } from "@/components/home/modals/LoginModal";
import { SignupModal } from "@/components/home/modals/SignupModal";
import { cancelMyBooking, confirmMyBookingPayment, createMyBooking } from "@/lib/api/customerBookings";
import { getVenueAvailability, type BookedRange } from "@/lib/api/venues";
import { ApiError } from "@/lib/api/client";
import { categoryLabel, matchesCourtSport } from "@/lib/taxonomy";
// `nowMinutes` is aliased: the slot generator already has a local of that name.
import { activeBoostPct, boostedPrice, nowMinutes as minutesOfDay } from "@/lib/lastMinBoost";
import { downloadBookingTicket } from "@/lib/ticket";
import { BookingQrCode } from "@/components/BookingQrCode";
import { trackEvent } from "@/lib/analytics";
import type { AddOn, Booking, Court, Listing, PaymentMethod } from "@/lib/api/types";

type Step = "review" | "confirmed";

const PAYMENT_METHODS: PaymentMethod[] = ["Cashfree (Online)", "Cash (Offline)"];

/** Events are fixed by the organizer. Resolve the first scheduled batch and never
 * expose it as a player-selectable slot. */
function eventTimingFor(listing: Listing) {
  const scheduledDay = [...(listing.dateOverrides ?? [])]
    .filter((override) => !override.isHoliday && override.slots.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const scheduledSlot = scheduledDay?.slots[0];
  const date = scheduledDay?.date ?? listing.availableFrom.slice(0, 10);

  return {
    date,
    startTime: scheduledSlot?.startTime ?? "00:00",
    endTime: scheduledSlot?.endTime ?? "00:00",
  };
}

/**
 * A booked range, plus the vendor-blocked windows we synthesise client-side.
 * A booking only takes out the one court it sits on; a blocked window (maintenance,
 * a holiday) closes the whole venue, so it takes out every court at once.
 */
type UnavailableRange = BookedRange & { blocksAllCourts?: boolean };

/** A slot is Booked when it overlaps any real booked range for the selected date. */
function slotStatusFor(slotStart: number, slotEnd: number, booked: UnavailableRange[]): "Available" | "Booked" {
  const sStart = slotStart % 1440;
  const sEnd = sStart + (slotEnd - slotStart);
  for (const r of booked) {
    const bStart = time24ToMinutes(r.startTime);
    let bEnd = time24ToMinutes(r.endTime);
    if (bEnd <= bStart) bEnd += 1440; // range crosses midnight
    if (sStart < bEnd && bStart < sEnd) return "Booked";
  }
  return "Available";
}

function formatDurationText(min: number) {
  const hrs = Math.floor(min / 60);
  const mins = min % 60;
  if (mins === 0) return `${hrs} hrs.`;
  return `${hrs}h ${mins}m`;
}

/** Courts still free for one slot window — drives both the slot's status and the court picker. */
function freeCourtsFor(
  slotStart: number,
  slotEnd: number,
  courts: Court[],
  unavailable: UnavailableRange[]
): Court[] {
  if (courts.length === 0) return [];
  const sStart = slotStart % 1440;
  const sEnd = sStart + (slotEnd - slotStart);
  const takenIds = new Set<string>();
  for (const r of unavailable) {
    const bStart = time24ToMinutes(r.startTime);
    let bEnd = time24ToMinutes(r.endTime);
    if (bEnd <= bStart) bEnd += 1440;
    if (sStart >= bEnd || bStart >= sEnd) continue;
    if (r.blocksAllCourts) return [];
    // Mirrors the backend: a booking with no courtId predates courts and sits on court 1.
    takenIds.add(r.courtId || courts[0]!.id);
  }
  return courts.filter((c) => !takenIds.has(c.id));
}

/** True when every range occupying a slot window is a soft "Pending" hold (someone else's
 * checkout in progress) rather than a firm booking — lets a fully-taken slot read as
 * "Pending" instead of "Booked", since it may free back up if that hold expires unpaid. */
function isSlotHeldOnly(slotStart: number, slotEnd: number, unavailable: UnavailableRange[]): boolean {
  const sStart = slotStart % 1440;
  const sEnd = sStart + (slotEnd - slotStart);
  let sawAny = false;
  for (const r of unavailable) {
    const bStart = time24ToMinutes(r.startTime);
    let bEnd = time24ToMinutes(r.endTime);
    if (bEnd <= bStart) bEnd += 1440;
    if (sStart >= bEnd || bStart >= sEnd) continue;
    if (r.blocksAllCourts) return false;
    sawAny = true;
    if (r.status !== "Pending") return false;
  }
  return sawAny;
}

/**
 * What one hour costs — the price the vendor set on that time slot, straight from the
 * listing API. Every court in a slot costs the same base rate; Last Min Boost is the only
 * thing applied on top, and it's scoped to one exact court (see courtBoostPct on the
 * slot) — courtSlotPrice below is what actually prices a specific court's button, so a
 * boost on Court 4 never bleeds into Court 6's price. finalSlotPrice is the slot-level
 * fallback (best available discount across free courts) for contexts with no specific
 * court in hand yet.
 */
function finalSlotPrice(slot: { price: number; boostPct?: number }): number {
  return slot.boostPct ? boostedPrice(slot.price, slot.boostPct) : slot.price;
}

function courtSlotPrice(slot: { price: number; courtBoostPct?: Record<string, number>; candidates?: any[] }, courtId: string | undefined, matchSport: string | undefined): number {
  let basePrice = slot.price;
  if (slot.candidates && courtId) {
    let best = null;
    if (matchSport) best = slot.candidates.find(c => c.sport?.toLowerCase() === matchSport && c.courtId === courtId);
    if (!best) best = slot.candidates.find(c => !c.sport && c.courtId === courtId);
    if (!best && matchSport) best = slot.candidates.find(c => c.sport?.toLowerCase() === matchSport && !c.courtId);
    if (!best) best = slot.candidates.find(c => !c.sport && !c.courtId);
    if (best && typeof best.price === "number" && best.price > 0) basePrice = best.price;
  }
  const pct = (courtId && slot.courtBoostPct?.[courtId]) || 0;
  return pct > 0 ? boostedPrice(basePrice, pct) : basePrice;
}

function courtSlotBasePrice(slot: { price: number; candidates?: any[] }, courtId: string | undefined, matchSport: string | undefined): number {
  let basePrice = slot.price;
  if (slot.candidates && courtId) {
    let best = null;
    if (matchSport) best = slot.candidates.find(c => c.sport?.toLowerCase() === matchSport && c.courtId === courtId);
    if (!best) best = slot.candidates.find(c => !c.sport && c.courtId === courtId);
    if (!best && matchSport) best = slot.candidates.find(c => c.sport?.toLowerCase() === matchSport && !c.courtId);
    if (!best) best = slot.candidates.find(c => !c.sport && !c.courtId);
    if (best && typeof best.price === "number" && best.price > 0) basePrice = best.price;
  }
  return basePrice;
}

/* Start times a venue can be booked from. */
const START_TIMES = [
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM",
  "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
  "09:00 PM", "10:00 PM",
];

function todayISO() {
  // Local date, NOT toISOString(): UTC lags IST by 5.5 hrs, which kept
  // yesterday visible in the date strip every morning.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Game-specific Add-ons & Equipment filtering.
 * Ensures users only see add-ons relevant to their selected sport (e.g. Cricket kit for Cricket,
 * Football/Bibs for Football, Badminton rackets for Badminton, Swimming goggles for Swimming).
 */
export function isAddOnForSport(addOn: AddOn, selectedSport?: string): boolean {
  if (!selectedSport) return true;
  const s = selectedSport.toLowerCase().trim();

  // 1. Explicit sport mapping if vendor configured sports on this add-on
  if (addOn.sports && addOn.sports.length > 0) {
    return addOn.sports.some((sp: string) => {
      const spLower = sp.toLowerCase().trim();
      return (
        spLower === s ||
        categoryLabel(spLower).toLowerCase() === categoryLabel(s).toLowerCase() ||
        categoryLabel(spLower).toLowerCase().includes(s) ||
        s.includes(categoryLabel(spLower).toLowerCase())
      );
    });
  }

  // 2. Smart text keyword matching for add-ons (including default/legacy ones)
  const label = addOn.label.toLowerCase();

  // Keyword dictionary per sport
  const sportKeywords: Record<string, string[]> = {
    cricket: ["cricket", "bat", "stump", "pad", "glove", "helmet", "umpire", "leather ball", "season ball", "cric"],
    football: ["football", "futsal", "bib", "cone", "goalkeeper", "shin guard", "shin-guard", "goalie"],
    badminton: ["badminton", "racket", "racquet", "shuttle", "shuttlecock", "feather", "stringing"],
    pickleball: ["pickleball", "paddle"],
    tennis: ["tennis", "racket", "racquet", "tennis ball"],
    swimming: ["swimming", "swim", "goggles", "goggle", "cap", "kickboard", "float", "fin", "trunks", "suit"],
    basketball: ["basketball", "hoop"],
    volleyball: ["volleyball"],
    "table-tennis": ["table tennis", "ping pong", "tt ball"],
    "snooker-pool": ["cue", "snooker", "pool", "chalk"],
    skating: ["skate", "skating", "knee pad", "elbow pad"],
  };

  // Find if label matches the selected sport's keywords
  const selectedSportKey = Object.keys(sportKeywords).find(
    (k) => s.includes(k) || categoryLabel(s).toLowerCase().includes(k)
  );

  if (selectedSportKey) {
    const currentSportKeywords = sportKeywords[selectedSportKey];
    const isExplicitForCurrentSport = currentSportKeywords.some((kw) => label.includes(kw));

    // Check if label explicitly matches keywords of OTHER sports
    for (const [sportKey, keywords] of Object.entries(sportKeywords)) {
      if (sportKey !== selectedSportKey) {
        if (keywords.some((kw) => label.includes(kw))) {
          // If it matches another sport's exclusive keyword, exclude it unless it also matched this sport
          if (!isExplicitForCurrentSport) return false;
        }
      }
    }
  }

  // General add-ons (e.g. "Chilled water crate", "Coaching trial session", "Towel") or items for this sport
  return true;
}

/** Emoji per sport — mirrors the venue page's grid so both surfaces match. */
function sportEmoji(sportName: string): string {
  const l = sportName.toLowerCase();
  if (l.includes("badminton")) return "🏸";
  if (l.includes("cricket")) return "🏏";
  if (l.includes("turf") || l.includes("football")) return "⚽";
  if (l.includes("pickleball")) return "🏓";
  // Before the generic "tennis" test, which would otherwise claim table tennis.
  if (l.includes("table tennis")) return "🏓";
  if (l.includes("tennis")) return "🎾";
  if (l.includes("basketball")) return "🏀";
  if (l.includes("swim")) return "🏊";
  if (l.includes("volleyball")) return "🏐";
  if (l.includes("skating")) return "⛸️";
  if (l.includes("snooker") || l.includes("pool")) return "🎱";
  return "🎯";
}

/** Horizontally scrollable game selector — the player always sees (and can change) what they're booking. */
function SportChips({
  listing,
  sport,
  onSelect,
  className = "",
}: {
  listing: Listing;
  sport?: string;
  onSelect: (s: string) => void;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const raw = listing.categories ?? [];
    if (!sport || raw.length <= 1) return raw;

    const activeCatId = raw.find((catId) => categoryLabel(catId).toLowerCase() === sport.toLowerCase());
    if (!activeCatId) return raw;

    const rest = raw.filter((catId) => catId !== activeCatId);
    return [activeCatId, ...rest];
  }, [listing.categories, sport]);

  const handleSelect = (name: string) => {
    onSelect(name);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  if (!categories || categories.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className={`flex items-center gap-2 overflow-x-auto py-1.5 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {categories.map((catId) => {
        const name = categoryLabel(catId);
        const active = sport?.toLowerCase() === name.toLowerCase();
        return (
          <button
            key={catId}
            type="button"
            onClick={() => handleSelect(name)}
            className={`group relative flex h-10 shrink-0 items-center gap-2 rounded-2xl border px-3.5 text-center text-xs font-extrabold transition-all duration-200 cursor-pointer ${active
              ? "border-[#0b9c65] bg-emerald-50/80 text-[#0b9c65] ring-2 ring-[#0b9c65]/30 shadow-xs"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
          >
            <span className="text-base leading-none">
              {sportEmoji(name)}
            </span>
            <span className="capitalize">{name}</span>
            {active && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function to24Hour(time12: string) {
  const [time, meridiem] = time12.split(" ");
  const [hourStr, minute] = time.split(":");
  let hour = Number(hourStr) % 12;
  if (meridiem === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function minutesToTime12(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${meridiem}`;
}

function time24ToMinutes(time24: string) {
  const [h, m] = time24.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime24(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */

/** Deep-links checkout straight into one boosted Last Minute Deal — see LastMinuteDealCard's
 * `dealHref` (query params) and venues/[id]/page.tsx (where these get parsed and passed in). */
export interface DealContext {
  date: string;
  slotStart: string;
  sport: string;
  courtId?: string;
}

export default function BookingFlow({
  listing,
  onClose,
  embedded = false,
  onStateChange,
  payTriggerRef,
  selectedSport,
  dealContext,
}: {
  listing: Listing;
  onClose: () => void;
  /** Render inline (no modal chrome, no duplicate submit button) so a parent page can embed this flow directly. */
  embedded?: boolean;
  onStateChange?: (state: { canPay: boolean; submitting: boolean; confirmed: boolean }) => void;
  /** Lets an embedding parent trigger the actual booking submit from its own button. */
  payTriggerRef?: MutableRefObject<(() => void) | null>;
  selectedSport?: string;
  /** Preselects the exact boosted slot/court a player tapped from a Last Minute Deal card. */
  dealContext?: DealContext;
}) {
  const { status, customer } = useCustomerAuth();
  const today = new Date();
  const eventTiming = useMemo(() => eventTimingFor(listing), [listing]);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<Step>("review");
  const [date, setDate] = useState(() => listing.type === "Event" ? eventTiming.date : dealContext?.date ?? todayISO());
  const [dateSelected, setDateSelected] = useState(true);
  const [visibleMonth, setVisibleMonth] = useState<number>(today.getMonth());
  const [visibleYear, setVisibleYear] = useState<number>(today.getFullYear());
  const [selectedSlotIndices, setSelectedSlotIndices] = useState<number[]>([]);
  // "All" by default so every time slot shows up before the player narrows down.
  const [activeDaypart, setActiveDaypart] = useState<string>("All");
  const [time, setTime] = useState(() => listing.type === "Event" ? minutesToTime12(time24ToMinutes(eventTiming.startTime)) : START_TIMES[6]);
  const [endTime, setEndTime] = useState(() => listing.type === "Event" ? minutesToTime12(time24ToMinutes(eventTiming.endTime)) : START_TIMES[8]);
  const [selectedPriceTierId, setSelectedPriceTierId] = useState<string>("");

  function toggleSlotSelection(index: number) {
    setCourtPicks(null);
    const targetSlot = generatedSlots[index];
    if (!targetSlot || targetSlot.status !== "Available") return;

    setSelectedSlotIndices((prev) => {
      if (prev.length === 0) return [index];

      // Tapping an already-selected slot removes it if it's an endpoint or single selection
      if (prev.includes(index)) {
        const next = prev.filter((i) => i !== index);
        return next;
      }

      // Check if targetSlot is adjacent/consecutive to the currently selected slots range
      const currentSlots = prev.map((i) => generatedSlots[i]).filter(Boolean);
      const minStartMins = Math.min(...currentSlots.map((s) => time24ToMinutes(s.startTime)));
      const maxEndMins = Math.max(...currentSlots.map((s) => time24ToMinutes(s.endTime)));

      const targetStartMins = time24ToMinutes(targetSlot.startTime);
      const targetEndMins = time24ToMinutes(targetSlot.endTime);

      const isConsecutive = targetStartMins === maxEndMins || targetEndMins === minStartMins;

      if (isConsecutive) {
        return [...prev, index].sort((a, b) => a - b);
      }

      // Non-consecutive tap -> switch selection to new slot
      return [index];
    });
  }

  const selectedSlotIndex = selectedSlotIndices[0] ?? -1;
  const [payment, setPayment] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [paymentOption, setPaymentOption] = useState<"partial" | "full">("full");
  const [playProtect, setPlayProtect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  // The game being booked — seeded from whatever the player picked outside,
  // but changeable from the chips inside the flow.
  const [sport, setSport] = useState(dealContext?.sport ?? selectedSport ?? "");
  // Google/OTP signups may have no phone on file — bookings need one, so collect it inline.
  const needsPhone = !customer?.phone;
  const [phone, setPhone] = useState("");
  // Add-ons the player picked — only ones actually configured on the listing.
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const toggleAddOn = (id: string) =>
    setSelectedAddOnIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  // Real booked ranges for the selected date — slots overlapping these are shown as Booked.
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  // Ticks every 30s so a Last Min Boost deal appears the moment its trigger window opens.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  // Courts the player picked. `null` means "hasn't chosen yet", which is what lets the
  // first free court be pre-selected while an explicit empty pick still stays empty.
  // Several courts can be taken for the same slot — a group booking 2 of 3 courts.
  const [courtPicks, setCourtPicks] = useState<string[] | null>(null);

  // Courts that can host the selected sport. A court with no sports listed hosts everything.
  const courtsForSport = useMemo(() => {
    const all = (listing.courts ?? []).filter((c) => c.active !== false);
    if (!sport) return all;
    return all.filter((c) => matchesCourtSport(c.sports, sport));
  }, [listing.courts, sport]);

  useEffect(() => {
    if (listing.type !== "Turf" || !date) {
      setBookedRanges([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      getVenueAvailability(listing._id, date)
        .then((ranges) => { if (!cancelled) setBookedRanges(ranges); })
        .catch(() => { if (!cancelled) setBookedRanges([]); });
    };
    load();
    // Poll while the player is still picking a slot — someone else's hold opening (or
    // expiring) is otherwise invisible until a manual reload, since this only re-fetches
    // on date/listing change. Not worth polling once they've moved past review.
    const interval = step === "review" ? setInterval(load, 15_000) : undefined;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [listing._id, listing.type, date, step]);

  useEffect(() => {
    const firstTier = listing.priceTiers[0];
    if (selectedPriceTierId) {
      const stillExists = listing.priceTiers.some((tier) => tier.id === selectedPriceTierId);
      if (stillExists) return;
    }
    setSelectedPriceTierId(firstTier?.id ?? "");
  }, [listing.priceTiers, selectedPriceTierId]);

  // Helper to format a Date to ISO (yyyy-mm-dd)
  function localDateISO(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Generate all upcoming dates for continuous scrolling across months and years (365 days into future)
  const dateOptions = useMemo(() => {
    const list: { iso: string; dayNum: number; weekday: string; monthLabel: string; monthShort: string; isFirstOfMonth: boolean; month: number; year: number }[] = [];
    const minIso = todayISO();
    const startDate = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const iso = localDateISO(d);
      if (iso < minIso) continue;
      const dayNum = d.getDate();
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const monthShort = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      const isFirstOfMonth = dayNum === 1 || list.length === 0;
      list.push({ iso, dayNum, weekday, monthLabel, monthShort, isFirstOfMonth, month: d.getMonth(), year: d.getFullYear() });
    }
    return list;
  }, []);

  const activeMonthLabel = useMemo(() => {
    return `${new Date(visibleYear, visibleMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  }, [visibleMonth, visibleYear]);

  // Resolve turf slots vs daily defaults
  const { startMin, endMin, baseHourlyRate, isDateHoliday, holidayReason } = useMemo(() => {
    if (listing.type === "Event" || !date) {
      return { startMin: 360, endMin: 1320, baseHourlyRate: listing.price || 1000, isDateHoliday: false, holidayReason: "" };
    }
    const override = listing.dateOverrides?.find((o) => o.date === date);
    if (override) {
      if (override.isHoliday) {
        return { startMin: 360, endMin: 1320, baseHourlyRate: listing.price || 1000, isDateHoliday: true, holidayReason: override.holidayName || "Holiday" };
      }
      const slotsConfig = override.slots || [];
      if (slotsConfig.length === 0) {
        return { startMin: 360, endMin: 1320, baseHourlyRate: listing.price || 1000, isDateHoliday: false, holidayReason: "" };
      }
      let minVal = 1440;
      let maxVal = 0;
      let sum = 0;
      slotsConfig.forEach((s) => {
        const start = time24ToMinutes(s.startTime);
        const end = time24ToMinutes(s.endTime);
        if (start < minVal) minVal = start;
        const adjustedEnd = end <= start ? end + 1440 : end;
        if (adjustedEnd > maxVal) maxVal = adjustedEnd;
        sum += s.price;
      });
      return { startMin: minVal, endMin: maxVal, baseHourlyRate: Math.round(sum / slotsConfig.length), isDateHoliday: false, holidayReason: "" };
    }

    const slotsConfig = listing.slotsList || [];
    if (slotsConfig.length === 0) {
      return { startMin: 360, endMin: 1320, baseHourlyRate: listing.price || 1000, isDateHoliday: false, holidayReason: "" };
    }
    let minVal = 1440;
    let maxVal = 0;
    let sum = 0;
    slotsConfig.forEach((s) => {
      const start = time24ToMinutes(s.startTime);
      const end = time24ToMinutes(s.endTime);
      if (start < minVal) minVal = start;
      const adjustedEnd = end <= start ? end + 1440 : end;
      if (adjustedEnd > maxVal) maxVal = adjustedEnd;
      sum += s.price;
    });
    return { startMin: minVal, endMin: maxVal, baseHourlyRate: Math.round(sum / slotsConfig.length), isDateHoliday: false, holidayReason: "" };
  }, [listing, date]);

  const maxDurationMin = Math.max(60, Math.min(1440, Math.floor((endMin - startMin) / 60) * 60));

  // Generate 1-hour slots
  const generatedSlots = useMemo(() => {
    if (listing.type !== "Turf" || !date || isDateHoliday) return [];

    const isToday = date === todayISO();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const slots: any[] = [];
    const override = listing.dateOverrides?.find((o) => o.date === date && !o.isHoliday);
    const slotsConfig = override?.slots && override.slots.length > 0 ? override.slots : (listing.slotsList || []);

    const matchSport = sport?.toLowerCase();
    const matchCourt = courtPicks && courtPicks.length > 0 ? courtPicks[0] : null;

    // Group candidates by start/end time
    const timeGroups: Record<string, typeof slotsConfig> = {};
    slotsConfig.forEach((s) => {
      const key = `${s.startTime}-${s.endTime}`;
      if (!timeGroups[key]) timeGroups[key] = [];
      timeGroups[key].push(s);
    });

    const activeSlotsConfig: typeof slotsConfig = [];
    for (const [key, candidates] of Object.entries(timeGroups)) {
      let best = null;
      if (matchSport && matchCourt) {
        best = candidates.find(c => c.sport?.toLowerCase() === matchSport && c.courtId === matchCourt);
      }
      if (!best && matchSport) {
        best = candidates.find(c => c.sport?.toLowerCase() === matchSport && !c.courtId);
      }
      if (!best && matchCourt) {
        best = candidates.find(c => c.courtId === matchCourt && !c.sport);
      }
      if (!best) {
        best = candidates.find(c => !c.sport && !c.courtId);
      }
      if (!best) {
        best = candidates[0];
      }
      if (best) {
        activeSlotsConfig.push({ ...best, _allCandidates: candidates } as any);
      }
    }

    const unavailableRanges: UnavailableRange[] = [
      ...bookedRanges,
      ...activeSlotsConfig
        .filter((c) => c.blocked)
        .map((c) => ({
          startTime: c.startTime,
          endTime: c.endTime,
          status: "Confirmed" as const,
          blocksAllCourts: true,
        })),
    ];

    const boostNow = isToday ? minutesOfDay(new Date(nowTick)) : -1;
    const statusFor = (slotStart: number, slotEnd: number) => {
      if (courtsForSport.length === 0) {
        const base = slotStatusFor(slotStart, slotEnd, unavailableRanges);
        if (base === "Booked" && isSlotHeldOnly(slotStart, slotEnd, unavailableRanges)) return "Pending" as const;
        return base;
      }
      if (freeCourtsFor(slotStart, slotEnd, courtsForSport, unavailableRanges).length > 0) return "Available" as const;
      return isSlotHeldOnly(slotStart, slotEnd, unavailableRanges) ? ("Pending" as const) : ("Booked" as const);
    };
    const freeIdsFor = (slotStart: number, slotEnd: number) =>
      freeCourtsFor(slotStart, slotEnd, courtsForSport, unavailableRanges).map((c) => c.id);

    // A boost is scoped to one exact court — this is the per-court source of truth the
    // court picker prices off of, so Court 6 never inherits Court 4's discount just
    // because they're both free for the same slot.
    const boostPctForCourt = (startTime24: string, status: string, courtId: string | undefined) =>
      status === "Available" && isToday
        ? activeBoostPct(listing.lastMinBoosts, startTime24, boostNow, sport || undefined, courtId)
        : 0;
    const courtBoostPctFor = (startTime24: string, status: string, slotStart: number, slotEnd: number) => {
      const map: Record<string, number> = {};
      for (const id of freeIdsFor(slotStart, slotEnd)) {
        map[id] = boostPctForCourt(startTime24, status, id);
      }
      return map;
    };

    // Slot-card-level badge only — "does *some* court on this slot have a deal right
    // now", shown before a court is picked. The map above is what actually prices
    // each individual court button.
    const boostFor = (startTime24: string, status: string, slotStart: number, slotEnd: number) => {
      const ids = freeIdsFor(slotStart, slotEnd);
      if (ids.length === 0) return boostPctForCourt(startTime24, status, undefined);
      return Math.max(...ids.map((id) => boostPctForCourt(startTime24, status, id)));
    };

    const slotDuration = 60; // 1-hour duration per slot

    if (!activeSlotsConfig || activeSlotsConfig.length === 0) {
      let current = startMin;
      let idx = 0;
      while (current + slotDuration <= endMin) {
        const slotStart = current;
        const slotEnd = current + slotDuration;
        const startTime24 = minutesToTime24(slotStart);
        const endTime24 = minutesToTime24(slotEnd);
        const startTime12 = minutesToTime12(slotStart);
        const endTime12 = minutesToTime12(slotEnd);
        const startHour = Math.floor(slotStart / 60) % 24;
        let label = "Morning";
        if (startHour >= 12 && startHour < 17) label = "Afternoon";
        else if (startHour >= 17 && startHour < 22) label = "Evening";
        else if (startHour >= 22 || startHour < 5) label = "Night";
        const price = baseHourlyRate;
        const slotStatus = isToday && slotStart <= nowMinutes ? "Past" : statusFor(slotStart, slotEnd);
        slots.push({
          startTime: startTime24,
          endTime: endTime24,
          startTime12,
          endTime12,
          label,
          price,
          status: slotStatus,
          boostPct: boostFor(startTime24, slotStatus, slotStart, slotEnd),
          courtBoostPct: courtBoostPctFor(startTime24, slotStatus, slotStart, slotEnd),
          freeCourtIds: freeIdsFor(slotStart, slotEnd),
          originalIndex: idx,
        });
        current += slotDuration;
        idx++;
      }
      return slots;
    }

    const clubConfigs = activeSlotsConfig.filter((c) => c.isClubSlot || (time24ToMinutes(c.endTime) - time24ToMinutes(c.startTime) > 60));
    const clubWindows = clubConfigs.map((c) => ({
      start: time24ToMinutes(c.startTime),
      end: time24ToMinutes(c.endTime),
      config: c,
    }));

    let idx = 0;

    // First push all explicit Club Slots as merged bookable units
    for (const cw of clubWindows) {
      const slotStart = cw.start;
      const slotEnd = cw.end;
      const startTime24 = minutesToTime24(slotStart % 1440);
      const endTime24 = minutesToTime24(slotEnd % 1440);
      const startTime12 = minutesToTime12(slotStart);
      const endTime12 = minutesToTime12(slotEnd);
      const slotStatus = isToday && slotStart < 1440 && slotStart <= nowMinutes ? "Past" : statusFor(slotStart, slotEnd);

      slots.push({
        startTime: startTime24,
        endTime: endTime24,
        startTime12,
        endTime12,
        label: "🏷 Club Booking",
        price: cw.config.price,
        status: slotStatus,
        boostPct: boostFor(startTime24, slotStatus, slotStart, slotEnd),
        courtBoostPct: courtBoostPctFor(startTime24, slotStatus, slotStart, slotEnd),
        freeCourtIds: freeIdsFor(slotStart, slotEnd),
        originalIndex: idx++,
        isClubSlot: true,
        clubId: cw.config.clubId || `club_${startTime24}_${endTime24}`,
        durationMinutes: slotEnd - slotStart,
        candidates: (cw.config as any)._allCandidates,
      });
    }

    const windows = activeSlotsConfig
      .filter((cfg) => !cfg.isClubSlot && (time24ToMinutes(cfg.endTime) - time24ToMinutes(cfg.startTime) <= 60))
      .map((cfg) => {
        const start = time24ToMinutes(cfg.startTime);
        let end = time24ToMinutes(cfg.endTime);
        if (end <= start) end += 1440;
        const hourly = typeof cfg.price === "number" && cfg.price > 0 ? cfg.price : baseHourlyRate;
        return { start, end, hourly, candidates: (cfg as any)._allCandidates };
      })
      .sort((a, b) => a.start - b.start);

    const ranges: { start: number; end: number; segments: { start: number; end: number; hourly: number; candidates?: any[] }[] }[] = [];
    for (const w of windows) {
      const last = ranges[ranges.length - 1];
      if (last && w.start <= last.end) {
        last.end = Math.max(last.end, w.end);
        last.segments.push(w);
      } else {
        ranges.push({ start: w.start, end: w.end, segments: [w] });
      }
    }

    for (const range of ranges) {
      let current = range.start;
      while (current + slotDuration <= range.end) {
        const slotStart = current;
        const slotEnd = current + slotDuration;

        // Skip any 1-hour sub-slot that falls inside an active Club Slot window!
        const isClubbed = clubWindows.some((cw) => slotStart < cw.end && slotEnd > cw.start);
        if (isClubbed) {
          current += slotDuration;
          continue;
        }

        const startTime24 = minutesToTime24(slotStart % 1440);
        const endTime24 = minutesToTime24(slotEnd % 1440);
        const startTime12 = minutesToTime12(slotStart);
        const endTime12 = minutesToTime12(slotEnd);
        const startHour = Math.floor(slotStart / 60) % 24;
        let label = "Morning";
        if (startHour >= 12 && startHour < 17) label = "Afternoon";
        else if (startHour >= 17 && startHour < 22) label = "Evening";
        else if (startHour >= 22 || startHour < 5) label = "Night";

        let priceRaw = 0;
        let segmentCandidates: any[] | undefined = undefined;
        for (const seg of range.segments) {
          const overlap = Math.min(seg.end, slotEnd) - Math.max(seg.start, slotStart);
          if (overlap > 0) {
            priceRaw += (overlap / 60) * seg.hourly;
            segmentCandidates = seg.candidates; // Use candidates from the matching segment
          }
        }
        const price = Math.round(priceRaw) || baseHourlyRate;

        const slotStatus =
          isToday && slotStart < 1440 && slotStart <= nowMinutes ? "Past" : statusFor(slotStart, slotEnd);

        slots.push({
          startTime: startTime24,
          endTime: endTime24,
          startTime12,
          endTime12,
          label,
          price,
          status: slotStatus,
          boostPct: boostFor(startTime24, slotStatus, slotStart, slotEnd),
          courtBoostPct: courtBoostPctFor(startTime24, slotStatus, slotStart, slotEnd),
          freeCourtIds: freeIdsFor(slotStart, slotEnd),
          originalIndex: idx++,
          candidates: segmentCandidates,
        });

        current += slotDuration;
      }
    }

    // Sort slots by start time and assign final array indices to originalIndex
    slots.sort((a, b) => time24ToMinutes(a.startTime) - time24ToMinutes(b.startTime));
    return slots.map((s, index) => ({ ...s, originalIndex: index }));
  }, [listing, date, startMin, endMin, baseHourlyRate, isDateHoliday, bookedRanges, courtsForSport, sport, courtPicks, nowTick]);

  // Once the deal's slot shows up as Available in the generated grid, select it (and its
  // court) automatically so a player tapping a Last Minute Deal card lands directly on
  // their boosted slot instead of an empty picker. Deliberately keeps retrying on every
  // generatedSlots change rather than giving up after one failed check — the very first
  // render(s) can transiently show a slot as unavailable before the async availability
  // fetch (bookedRanges) has actually resolved, and giving up there permanently would
  // strand the player on a default slot/court instead of the boosted one. Only a genuine
  // user pick (toggleSlotSelection/toggleCourt) should stop this from trying again.
  const dealPreselectedRef = useRef(false);

  const durationMin = useMemo(() => {
    if (selectedSlotIndices.length === 0) return 0;
    return selectedSlotIndices.reduce((sum, idx) => {
      const slot = generatedSlots[idx];
      if (!slot) return sum;
      return sum + (slot.durationMinutes || 60);
    }, 0);
  }, [selectedSlotIndices, generatedSlots]);

  // Filter generated slots by activeDaypart select filter — "All" shows every time of day.
  // Excludes slots that have already passed ("Past") so players only see active & upcoming slots.
  const filteredGeneratedSlots = useMemo(() => {
    const activeSlots = generatedSlots.filter((s) => s.status !== "Past");
    if (activeDaypart === "All") return activeSlots;
    return activeSlots.filter((s) => s.label === activeDaypart);
  }, [generatedSlots, activeDaypart]);

  useEffect(() => {
    // A Last Minute Deal owns the very first slot selection once its boosted slot shows
    // up as Available. This and the generic "keep/pick a slot" fallback below both react
    // to the same bookedRanges/generatedSlots change, so they're merged into one effect —
    // running them as two separate effects let the fallback read selectedSlotIndices from
    // before the deal branch's setState had applied, so it clobbered the deal's chosen
    // slot with some unrelated "first available" slot in the very same commit (most visibly
    // under React Strict Mode's dev-only double-invoke, where this effect body runs twice
    // back-to-back with no render in between: the ref guard correctly skips re-claiming the
    // deal on the second pass, but a plain state read there would still see the pre-effect
    // closure, not the first pass's just-queued selection).
    if (dealContext && !dealPreselectedRef.current) {
      const match = generatedSlots.find((s) => s.startTime === dealContext.slotStart);
      if (match && match.status === "Available") {
        dealPreselectedRef.current = true;
        setActiveDaypart("All");
        setSelectedSlotIndices([match.originalIndex]);
        if (dealContext.courtId && (match.freeCourtIds ?? []).includes(dealContext.courtId)) {
          setCourtPicks([dealContext.courtId]);
        }
        setTimeout(() => {
          const el = document.getElementById(`slot-button-${dealContext.slotStart}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          }
        }, 150);
      }
      // Either just claimed the deal slot, or it's not resolvable yet (still waiting on
      // bookedRanges) — don't fall through to the generic fallback below, which would
      // otherwise silently swap the player onto some other slot instead of retrying the
      // deal slot on the next generatedSlots update.
      return;
    }
    if (listing.type === "Turf" && date) {
      // Functional form so this always resolves against the latest *queued* selection —
      // not a possibly-stale closure — even when this effect body runs twice with no
      // render in between (see comment above).
      setSelectedSlotIndices((prevIndices) => {
        const validIndices = prevIndices.filter(
          (idx) => generatedSlots[idx] && generatedSlots[idx].status === "Available"
        );
        if (validIndices.length > 0) return validIndices;
        const firstAvail = generatedSlots.find((s) => s.status === "Available");
        return firstAvail ? [firstAvail.originalIndex] : [];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealContext, generatedSlots, date, listing.type, bookedRanges]);

  // Courts actually bookable for all selected slots.
  const freeCourts = useMemo(() => {
    if (selectedSlotIndices.length === 0) return courtsForSport;
    return courtsForSport.filter((c) =>
      selectedSlotIndices.every((idx) => (generatedSlots[idx]?.freeCourtIds ?? []).includes(c.id))
    );
  }, [courtsForSport, generatedSlots, selectedSlotIndices]);

  // Taken courts whose only clash is someone else's payment in progress (a short-lived
  // hold, not a firm booking) — shown as "Reserved" rather than "Booked" so a player
  // understands why an apparently-open court can't be picked right now.
  const heldOnlyCourtIds = useMemo(() => {
    const windows = selectedSlotIndices
      .map((idx) => generatedSlots[idx])
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => {
        const start = time24ToMinutes(s.startTime);
        let end = time24ToMinutes(s.endTime);
        if (end <= start) end += 1440;
        return { start, end };
      });
    if (windows.length === 0) return new Set<string>();

    const held = new Set<string>();
    const firm = new Set<string>();
    for (const r of bookedRanges) {
      if (!r.courtId) continue;
      const rStart = time24ToMinutes(r.startTime);
      let rEnd = time24ToMinutes(r.endTime);
      if (rEnd <= rStart) rEnd += 1440;
      const overlaps = windows.some((w) => rStart < w.end && w.start < rEnd);
      if (!overlaps) continue;
      (r.status === "Pending" ? held : firm).add(r.courtId);
    }
    for (const id of firm) held.delete(id);
    return held;
  }, [bookedRanges, generatedSlots, selectedSlotIndices]);

  // Until the player picks, the first free court stands in — the same one they'd tap
  // anyway. Anything taken while they were deciding drops out instead of failing at
  // payment, so what's shown as selected is always still bookable.
  const effectiveCourtIds = useMemo(() => {
    const base = courtPicks ?? (freeCourts[0] ? [freeCourts[0].id] : []);
    return base.filter((id) => freeCourts.some((c) => c.id === id));
  }, [courtPicks, freeCourts]);

  const toggleCourt = (id: string) => {
    setCourtPicks((prev) => {
      const base = prev ?? (freeCourts[0] ? [freeCourts[0].id] : []);
      return base.includes(id) ? base.filter((c) => c !== id) : [...base, id];
    });
  };

  const selectedCourts = useMemo(
    () => courtsForSport.filter((c) => effectiveCourtIds.includes(c.id)),
    [courtsForSport, effectiveCourtIds]
  );

  const activePrice = useMemo(() => {
    const addOnsTotal = (listing.addOns ?? [])
      .filter((a) => selectedAddOnIds.includes(a.id))
      .reduce((sum, a) => sum + a.price, 0);
    const playProtectFee = playProtect ? 19 : 0;
    if (listing.type === "Turf") {
      if (selectedSlotIndices.length === 0) return addOnsTotal;
      const matchSport = sport?.toLowerCase();
      const slotsTotal = selectedSlotIndices.reduce((sum, idx) => {
        const slot = generatedSlots[idx];
        if (!slot) return sum;
        if (courtsForSport.length === 0) {
          const pct = slot.boostPct || 0;
          return sum + (pct > 0 ? boostedPrice(slot.price, pct) : slot.price);
        }
        const courtsTotal = selectedCourts.reduce((courtSum, court) => {
          return courtSum + courtSlotPrice(slot, court.id, matchSport);
        }, 0);
        return sum + courtsTotal;
      }, 0);
      return slotsTotal + addOnsTotal + playProtectFee;
    }
    // An event's ticket price is fixed by the organizer; players do not choose a package.
    if (listing.type === "Event") return listing.price + addOnsTotal + playProtectFee;
    const selectedTier = listing.priceTiers.find((tier) => tier.id === selectedPriceTierId);
    if (selectedTier) {
      return selectedTier.amount + addOnsTotal + playProtectFee;
    }
    return listing.price + addOnsTotal + playProtectFee;
  }, [listing, generatedSlots, selectedSlotIndices, selectedAddOnIds, selectedPriceTierId, selectedCourts, courtsForSport, playProtect, sport]);

  /** Whether the selected slot(s) are currently Last Minute Boost-discounted, and by how
   * much — so checkout can show "original price / discounted price / you saved X" instead
   * of silently charging the lower number. Mirrors activePrice's court-specific logic. */
  const dealSavings = useMemo(() => {
    if (listing.type !== "Turf" || selectedSlotIndices.length === 0) return null;
    const matchSport = sport?.toLowerCase();
    let original = 0;
    let discounted = 0;
    let boosted = false;
    for (const idx of selectedSlotIndices) {
      const slot = generatedSlots[idx];
      if (!slot) continue;
      if (courtsForSport.length === 0) {
        const base = slot.price;
        const pct = slot.boostPct || 0;
        original += base;
        discounted += pct > 0 ? boostedPrice(base, pct) : base;
        if (pct > 0) boosted = true;
      } else {
        for (const court of selectedCourts) {
          const base = courtSlotBasePrice(slot, court.id, matchSport);
          const pct = slot.courtBoostPct?.[court.id] || 0;
          original += base;
          discounted += pct > 0 ? boostedPrice(base, pct) : base;
          if (pct > 0) boosted = true;
        }
      }
    }
    if (!boosted || original <= discounted) return null;
    return { originalPrice: original, discountedPrice: discounted, savings: original - discounted };
  }, [listing, generatedSlots, selectedSlotIndices, selectedCourts, courtsForSport, sport]);

  const phoneValid = !needsPhone || /^[6-9]\d{9}$/.test(phone);
  const canPay =
    phoneValid &&
    !!date &&
    (listing.type !== "Turf"
      ? !!time
      : selectedSlotIndices.length > 0 &&
      !isDateHoliday &&
      selectedSlotIndices.every((idx) => generatedSlots[idx]?.status === "Available") &&
      (courtsForSport.length === 0 || effectiveCourtIds.length > 0));

  const partialConfig = listing.partialPayment ?? { enabled: true, type: "percentage", value: 25 };
  const canPartial = false;
  const effectivePaymentOption: "partial" | "full" = "full";

  const payNowAmount = useMemo(() => {
    return activePrice;
    if (partialConfig.type === "fixed") {
      return Math.min(activePrice, Math.max(1, Math.round(partialConfig.value)));
    }
    const pct = Math.min(100, Math.max(1, partialConfig.value));
    return Math.min(activePrice, Math.max(1, Math.round((activePrice * pct) / 100)));
  }, [activePrice]);

  const payAtVenueAmount = Math.max(0, activePrice - payNowAmount);

  const [paymentGatewayOpen, setPaymentGatewayOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<"UPI" | "Card" | "NetBanking">("UPI");

  useEffect(() => {
    onStateChange?.({ canPay, submitting, confirmed: step === "confirmed" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPay, submitting, step]);

  useEffect(() => {
    if (payTriggerRef) payTriggerRef.current = handlePay;
  });

  if (status === "loading") {
    return embedded ? (
      <p className="py-6 text-center text-sm font-semibold text-slate-500">Loading...</p>
    ) : (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-slate-600">Loading...</div>
      </div>
    );
  }

  if (status === "guest") {
    return authView === "login" ? (
      <LoginModal onClose={onClose} onLoggedIn={() => { }} onSwitchToSignup={() => setAuthView("signup")} />
    ) : (
      <SignupModal onClose={onClose} onSignedUp={() => { }} onSwitchToLogin={() => setAuthView("login")} />
    );
  }

  async function handlePay() {
    if (!canPay) return;
    setSubmitting(true);
    setError("");
    try {
      let dateTime = "";
      let durationMinutes = undefined;
      if (listing.type === "Turf") {
        const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
        const earliestSlot = generatedSlots[sortedIndices[0]];
        dateTime = new Date(`${date}T${earliestSlot.startTime}:00`).toISOString();
        if (sortedIndices.length === 1 && earliestSlot?.isClubSlot) {
          durationMinutes = earliestSlot.durationMinutes || 120;
        } else {
          durationMinutes = sortedIndices.length * 60;
        }
      } else {
        dateTime = new Date(`${date}T${to24Hour(time)}:00`).toISOString();
      }
      const created = await createMyBooking({
        listingId: listing._id,
        dateTime,
        payment,
        paymentType: effectivePaymentOption,
        sport: sport || undefined,
        courtId: effectiveCourtIds[0] || undefined,
        courtIds: effectiveCourtIds.length > 0 ? effectiveCourtIds : undefined,
        priceTierId: listing.type === "Event" ? undefined : selectedPriceTierId || undefined,
        phone: needsPhone ? phone : undefined,
        addOnIds: selectedAddOnIds.length > 0 ? selectedAddOnIds : undefined,
        playProtect,
        durationMinutes,
      });

      trackEvent("booking_started", {
        listingId: listing._id,
        listingTitle: listing.title,
        date,
        totalAmount: activePrice,
        slotCount: selectedSlotIndices.length,
      });

      setPendingBooking(created);
      setPaymentGatewayOpen(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPayment() {
    if (!pendingBooking) return;
    setConfirmingPayment(true);
    setError("");
    try {
      const confirmed = await confirmMyBookingPayment(pendingBooking.orderId, selectedPayMethod);

      trackEvent("booking_completed", {
        bookingId: confirmed._id,
        listingId: listing._id,
        totalAmount: activePrice,
        paymentMethod: selectedPayMethod,
      });

      setBooking(confirmed);
      setPaymentGatewayOpen(false);
      setStep("confirmed");
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Payment confirmation failed. Please try again.");
    } finally {
      setConfirmingPayment(false);
    }
  }

  const content = (
    <>
      {step === "review" && (
        <ReviewStep
          embedded={embedded}
          listing={listing}
          date={date}
          setDate={(v) => {
            // Another day has its own free courts, so the pick resets with the date.
            setCourtPicks(null);
            setDate(v);
          }}
          time={time}
          setTime={setTime}
          endTime={endTime}
          setEndTime={setEndTime}
          payment={payment}
          setPayment={setPayment}
          playProtect={playProtect}
          setPlayProtect={setPlayProtect}
          canPay={canPay}
          submitting={submitting}
          error={error}
          needsPhone={needsPhone}
          phone={phone}
          setPhone={setPhone}
          selectedAddOnIds={selectedAddOnIds}
          onToggleAddOn={toggleAddOn}
          selectedPriceTierId={selectedPriceTierId}
          setSelectedPriceTierId={setSelectedPriceTierId}
          onClose={onClose}
          onPay={handlePay}
          dateOptions={dateOptions}
          activeMonthLabel={activeMonthLabel}
          dateSelected={dateSelected}
          setDateSelected={setDateSelected}
          durationMin={durationMin}
          maxDurationMin={maxDurationMin}
          activeDaypart={activeDaypart}
          setActiveDaypart={setActiveDaypart}
          generatedSlots={generatedSlots}
          filteredGeneratedSlots={filteredGeneratedSlots}
          isDateHoliday={isDateHoliday}
          holidayReason={holidayReason}
          selectedSlotIndices={selectedSlotIndices}
          onToggleSlotSelection={toggleSlotSelection}
          activePrice={activePrice}
          dealSavings={dealSavings}
          payNowAmount={payNowAmount}
          payAtVenueAmount={payAtVenueAmount}
          partialConfig={partialConfig}
          paymentOption={effectivePaymentOption}
          setPaymentOption={setPaymentOption}
          canPartial={canPartial}
          visibleMonth={visibleMonth}
          visibleYear={visibleYear}
          setVisibleMonth={setVisibleMonth}
          setVisibleYear={setVisibleYear}
          selectedSport={sport}
          onSelectSport={(s) => {
            // Each game has its own courts — a badminton pick can't carry into cricket.
            setCourtPicks(null);
            setSport(s);
            if (!date) setDate(todayISO());
            setDateSelected(true);
          }}
          freeCourts={freeCourts}
          heldOnlyCourtIds={heldOnlyCourtIds}
          courtsForSport={courtsForSport}
          selectedCourts={selectedCourts}
          selectedCourtIds={effectiveCourtIds}
          onToggleCourt={toggleCourt}
        />
      )}

      {step === "confirmed" && booking && (
        <ConfirmedStep listing={listing} booking={booking} onClose={onClose} embedded={embedded} />
      )}

      {/* Mandatory Partial Payment Gateway Modal */}
      {paymentGatewayOpen && pendingBooking && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Gateway Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wide uppercase">BYV Secure Checkout</h3>
                    <p className="text-[10px] text-emerald-100 font-medium">Powered by BYV Payment Gateway</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentGatewayOpen(false);
                    setError("Payment cancelled. Booking remains unconfirmed and slot is not reserved.");
                  }}
                  className="rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-white/10 backdrop-blur-xs p-3 flex items-center justify-between border border-white/20">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Order Reference</p>
                  <p className="text-xs font-mono font-bold text-white">{pendingBooking.orderId}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Venue</p>
                  <p className="text-xs font-extrabold text-white truncate max-w-[140px]">{listing.title}</p>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-5 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span>Total Booking Price</span>
                  <span className="font-bold text-slate-800">₹{pendingBooking.totalAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    {pendingBooking.paymentType === "full" || (pendingBooking.paidAmount ?? payNowAmount) >= pendingBooking.totalAmount
                      ? "Full Online Payment (Paying Now)"
                      : "Partial Payment Deposit (Paying Now)"}
                  </span>
                  <span className="text-base font-black">₹{(pendingBooking.paidAmount ?? payNowAmount).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between text-amber-800 font-semibold bg-amber-50/70 p-2 rounded-xl border border-amber-100/60">
                  <span>Balance Due at Venue</span>
                  <span className="font-extrabold">₹{(pendingBooking.totalAmount - (pendingBooking.paidAmount ?? payNowAmount)).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod("UPI")}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 transition ${selectedPayMethod === "UPI"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    <span className="text-lg">⚡</span>
                    <span className="text-[11px] mt-1">UPI / QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod("Card")}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 transition ${selectedPayMethod === "Card"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    <span className="text-lg">💳</span>
                    <span className="text-[11px] mt-1">Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod("NetBanking")}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 transition ${selectedPayMethod === "NetBanking"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    <span className="text-lg">🏦</span>
                    <span className="text-[11px] mt-1">NetBanking</span>
                  </button>
                </div>
              </div>

              {error && <p className="rounded-xl bg-rose-50 p-2.5 text-center text-xs font-semibold text-rose-600">{error}</p>}

              {/* Complete Payment Button */}
              <button
                type="button"
                disabled={confirmingPayment}
                onClick={handleConfirmPayment}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {confirmingPayment
                  ? "Processing Payment..."
                  : `PAY ₹${(pendingBooking.paidAmount ?? payNowAmount).toLocaleString("en-IN")} TO LOCK SLOT`}
              </button>

              <p className="text-center text-[10px] text-slate-400">
                🔒 128-bit SSL Encrypted • 100% Secure Transaction
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      {content}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP — REVIEW & CONFIRM                                            */
/* ------------------------------------------------------------------ */

function ReviewStep(props: {
  embedded: boolean;
  listing: Listing;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  payment: PaymentMethod;
  setPayment: (v: PaymentMethod) => void;
  playProtect: boolean;
  setPlayProtect: (v: boolean) => void;
  canPay: boolean;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onPay: () => void;
  dateOptions: { iso: string; dayNum: number; weekday: string; monthLabel: string; monthShort?: string; isFirstOfMonth?: boolean; month: number; year: number }[];
  activeMonthLabel: string;
  dateSelected: boolean;
  setDateSelected: (v: boolean) => void;
  durationMin: number;
  maxDurationMin: number;
  activeDaypart: string;
  setActiveDaypart: (v: string) => void;
  generatedSlots: any[];
  filteredGeneratedSlots: any[];
  isDateHoliday: boolean;
  holidayReason: string;
  selectedSlotIndices: number[];
  onToggleSlotSelection: (index: number) => void;
  activePrice: number;
  dealSavings: { originalPrice: number; discountedPrice: number; savings: number } | null;
  payNowAmount: number;
  payAtVenueAmount: number;
  partialConfig: { enabled: boolean; type: "percentage" | "fixed"; value: number };
  paymentOption: "partial" | "full";
  setPaymentOption: (option: "partial" | "full") => void;
  canPartial: boolean;
  visibleMonth: number;
  visibleYear: number;
  setVisibleMonth: (v: number | ((n: number) => number)) => void;
  setVisibleYear: (v: number | ((n: number) => number)) => void;
  selectedSport?: string;
  onSelectSport: (s: string) => void;
  /** Courts still open for the selected slots. */
  freeCourts: Court[];
  /** Taken courts blocked only by someone else's in-progress checkout, not a firm booking. */
  heldOnlyCourtIds: Set<string>;
  /** Every court that hosts the selected sport — taken ones render disabled. */
  courtsForSport: Court[];
  /** Courts currently selected for the booking. */
  selectedCourts: Court[];
  /** Courts the player has taken for the selected slots — several are allowed. */
  selectedCourtIds: string[];
  onToggleCourt: (id: string) => void;
  needsPhone: boolean;
  phone: string;
  setPhone: (v: string) => void;
  selectedAddOnIds: string[];
  onToggleAddOn: (id: string) => void;
  selectedPriceTierId: string;
  setSelectedPriceTierId: (id: string) => void;
}) {
  const {
    embedded,
    listing,
    date,
    setDate,
    time,
    setTime,
    endTime,
    setEndTime,
    payment,
    setPayment,
    playProtect,
    setPlayProtect,
    canPay,
    submitting,
    error,
    onClose,
    onPay,
    dateOptions,
    activeMonthLabel,
    dateSelected,
    setDateSelected,
    durationMin,
    maxDurationMin,
    activeDaypart,
    setActiveDaypart,
    generatedSlots,
    filteredGeneratedSlots,
    isDateHoliday,
    holidayReason,
    selectedSlotIndices,
    onToggleSlotSelection,
    freeCourts,
    heldOnlyCourtIds,
    courtsForSport,
    selectedCourts,
    selectedCourtIds,
    onToggleCourt,
    activePrice,
    dealSavings,
    payNowAmount,
    payAtVenueAmount,
    partialConfig,
    paymentOption,
    setPaymentOption,
    canPartial,
    visibleMonth,
    visibleYear,
    setVisibleMonth,
    setVisibleYear,
    selectedSport,
    onSelectSport,
    needsPhone,
    phone,
    setPhone,
    selectedAddOnIds,
    onToggleAddOn,
    selectedPriceTierId,
    setSelectedPriceTierId,
  } = props;

  const today = new Date();
  // Events have a fixed organizer schedule, so players land directly on checkout.
  const [mobileStep, setMobileStep] = useState<"slots" | "checkout">(
    listing.type === "Event" ? "checkout" : "slots"
  );

  const dateStripRef = useRef<HTMLDivElement>(null);

  // Track horizontal scrolling of date strip to dynamically update Month Header
  const handleDateStripScroll = () => {
    if (!dateStripRef.current || dateOptions.length === 0) return;
    const container = dateStripRef.current;
    const children = Array.from(container.children) as HTMLElement[];
    const containerLeft = container.getBoundingClientRect().left;

    for (const child of children) {
      const rect = child.getBoundingClientRect();
      if (rect.left >= containerLeft - 20 && rect.left <= containerLeft + 80) {
        const iso = child.getAttribute("data-iso");
        const opt = dateOptions.find((d) => d.iso === iso);
        if (opt && (opt.month !== visibleMonth || opt.year !== visibleYear)) {
          setVisibleMonth(opt.month);
          setVisibleYear(opt.year);
        }
        break;
      }
    }
  };

  const navigateMonth = (direction: "next" | "prev") => {
    if (!dateStripRef.current || dateOptions.length === 0) return;
    const currentOpt = dateOptions.find((d) => d.monthLabel.toUpperCase() === activeMonthLabel.toUpperCase()) || dateOptions[0];
    let targetIdx = -1;

    if (direction === "next") {
      targetIdx = dateOptions.findIndex(
        (d) => d.year > currentOpt.year || (d.year === currentOpt.year && d.month > currentOpt.month)
      );
    } else {
      const startOfCurrentIdx = dateOptions.findIndex(
        (d) => d.month === currentOpt.month && d.year === currentOpt.year
      );
      const scrollLeft = dateStripRef.current.scrollLeft;
      if (startOfCurrentIdx >= 0 && scrollLeft > startOfCurrentIdx * 60 + 20) {
        targetIdx = startOfCurrentIdx;
      } else {
        const prevMonth = currentOpt.month === 0 ? 11 : currentOpt.month - 1;
        const prevYear = currentOpt.month === 0 ? currentOpt.year - 1 : currentOpt.year;
        targetIdx = dateOptions.findIndex((d) => d.month === prevMonth && d.year === prevYear);
      }
    }

    if (targetIdx >= 0) {
      dateStripRef.current.scrollTo({ left: targetIdx * 60, behavior: "smooth" });
    }
  };

  const selectedCourtDisplay = useMemo(() => {
    if (selectedCourts.length === 1) {
      return selectedCourts[0].name;
    }
    if (selectedCourts.length > 1) {
      return `${selectedCourts.length} Courts`;
    }
    return freeCourts[0]?.name || courtsForSport[0]?.name || "";
  }, [selectedCourts, freeCourts, courtsForSport]);

  /**
   * Bookable slots first, everything already taken (or in the past) after them —
   * a player scrolling a busy evening shouldn't wade through sold-out cards to
   * reach the ones they can actually book. Time order is kept inside each group.
   */
  const orderedSlots = useMemo(() => {
    return [...filteredGeneratedSlots].sort((a, b) => a.originalIndex - b.originalIndex);
  }, [filteredGeneratedSlots]);

  /* The slot strip is a 2-row carousel rather than a full grid — a venue open 06:00–24:00
     otherwise renders 18 cards and buries the courts and the price under a wall of slots.
     Arrows page it sideways; booked slots stay in the same strip, just after the free ones. */
  const slotStripRef = useRef<HTMLDivElement>(null);
  const [slotEdges, setSlotEdges] = useState({ atStart: true, atEnd: false });

  function onSlotStripScroll() {
    const el = slotStripRef.current;
    if (!el) return;
    setSlotEdges({
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }

  function pageSlots(direction: -1 | 1) {
    const el = slotStripRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(220, el.clientWidth * 0.85), behavior: "smooth" });
  }

  /** Same rule for courts: free ones first, already-booked ones greyed out at the end. */
  const orderedCourts = useMemo(() => {
    const free = new Set(freeCourts.map((c) => c.id));
    return [...courtsForSport].sort((a, b) => Number(free.has(b.id)) - Number(free.has(a.id)));
  }, [courtsForSport, freeCourts]);

  /** Per-court price + boost % for the currently selected slots, computed once instead
   * of re-running the reduce/map for every court on every render of the court list. */
  const courtPricingById = useMemo(() => {
    const map = new Map<string, { totalPrice: number; boostPct: number }>();
    for (const court of orderedCourts) {
      const totalPrice = selectedSlotIndices.reduce((sum, idx) => {
        const slot = generatedSlots[idx];
        return sum + (slot ? courtSlotPrice(slot, court.id, selectedSport?.toLowerCase()) : 0);
      }, 0);
      const boostPct = selectedSlotIndices.length > 0
        ? Math.max(0, ...selectedSlotIndices.map((idx) => generatedSlots[idx]?.courtBoostPct?.[court.id] || 0))
        : 0;
      map.set(court.id, { totalPrice, boostPct });
    }
    return map;
  }, [orderedCourts, selectedSlotIndices, generatedSlots]);
  const displaySlotPricing = (slot: { price: number; boostPct?: number; courtBoostPct?: Record<string, number>; candidates?: any[] }) => {
    const matchSport = selectedSport?.toLowerCase();
    const candidateCourtIds = selectedCourtIds.length > 0 ? selectedCourtIds : freeCourts.map((c) => c.id);
    if (candidateCourtIds.length === 0) {
      return { price: finalSlotPrice(slot), boostPct: slot.boostPct ?? 0, originalPrice: slot.price };
    }
    let bestPrice = Number.POSITIVE_INFINITY;
    let bestBoostPct = 0;
    let bestOriginalPrice = 0;
    for (const courtId of candidateCourtIds) {
      const price = courtSlotPrice(slot, courtId, matchSport);
      if (price < bestPrice) {
        bestPrice = price;
        bestBoostPct = slot.courtBoostPct?.[courtId] ?? 0;
        bestOriginalPrice = courtSlotBasePrice(slot, courtId, matchSport);
      }
    }
    return { price: bestPrice, boostPct: bestBoostPct, originalPrice: bestOriginalPrice };
  };
  /** Playo-style toggle between the compact date strip and the full month grid. */
  const [calendarExpanded, setCalendarExpanded] = useState(false);

  const selectedTier = listing.priceTiers.find((tier) => tier.id === selectedPriceTierId);

  const selectedSlotSummaryText = useMemo(() => {
    if (selectedSlotIndices.length === 0) return "Tap available slots below";
    const sorted = [...selectedSlotIndices].sort((a, b) => a - b);
    const first = generatedSlots[sorted[0]];
    const last = generatedSlots[sorted[sorted.length - 1]];
    if (!first || !last) return "Selected";

    if (sorted.length === 1 && first.isClubSlot) {
      return `🏷️ Club Slot | ${first.startTime12} – ${first.endTime12} (${formatDurationText(first.durationMinutes || 120)})`;
    }
    return `${first.startTime12} – ${last.endTime12}`;
  }, [selectedSlotIndices, generatedSlots]);

  // Full month grid (Monday start)
  const monthGrid = useMemo(() => {
    const firstDayIndex = (new Date(visibleYear, visibleMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();
    const prevDaysInMonth = new Date(visibleYear, visibleMonth, 0).getDate();
    const minIso = todayISO();
    const cells: {
      iso: string;
      dayNum: number;
      isPast: boolean;
      isWeekend: boolean;
      isHoliday: boolean;
      holidayName?: string;
      price: string;
      isOtherMonth?: boolean;
    }[] = [];

    // Leading days from previous month to eliminate empty gap above month dates
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevDaysInMonth - i;
      const prevMonth = visibleMonth === 0 ? 11 : visibleMonth - 1;
      const prevYear = visibleMonth === 0 ? visibleYear - 1 : visibleYear;
      const iso = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        iso,
        dayNum: d,
        isPast: true,
        isWeekend: false,
        isHoliday: false,
        price: "",
        isOtherMonth: true,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(visibleYear, visibleMonth, d);
      const iso = `${visibleYear}-${String(visibleMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const override = listing.dateOverrides?.find((o) => o.date === iso);
      const isHoliday = Boolean(override?.isHoliday);
      const holidayName = override?.holidayName;

      const baseRate = props.listing?.price || 1000;
      let slotPrice = baseRate;
      if (override?.slots?.length) {
        slotPrice = Math.round(override.slots.reduce((a, b) => a + b.price, 0) / override.slots.length);
      } else if (isWeekend) {
        slotPrice = Math.round(baseRate * 1.2);
      }
      const price = slotPrice >= 1000 ? `₹${(slotPrice / 1000).toFixed(1).replace(/\.0$/, "")}K` : `₹${slotPrice}`;

      cells.push({
        iso,
        dayNum: d,
        isPast: iso < minIso,
        isWeekend,
        isHoliday,
        holidayName,
        price,
        isOtherMonth: false,
      });
    }
    return cells;
  }, [visibleMonth, visibleYear, props.listing]);

  return (
    <div
      className={
        embedded
          ? "w-full"
          : // Full screen on mobile ("page poora khule"); modal-sized on desktop.
          "relative flex h-full w-full max-w-4xl flex-col bg-slate-50 shadow-2xl sm:max-h-[90vh] sm:rounded-3xl"
      }
    >
      {!embedded && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="hidden lg:flex absolute right-3 top-3 z-10 h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Mobile Header */}
      {!embedded && (
        <div className="px-4 pt-3.5 pb-2 lg:hidden border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (mobileStep === "checkout" && listing.type !== "Event" ? setMobileStep("slots") : onClose())}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              {mobileStep === "slots" ? listing.title : "Checkout"}
            </h3>
          </div>
          {/* Game selector in the header — the player picks the sport they're booking. */}
          {mobileStep === "slots" && (
            <SportChips listing={listing} sport={selectedSport} onSelect={onSelectSport} className="mt-2" />
          )}
        </div>
      )}

      <div className={embedded ? "" : "overflow-y-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-4 pt-3 pb-28 sm:p-6 lg:p-8"}>
        {!embedded && <h2 className="hidden lg:block text-xl font-extrabold text-slate-900 mb-2">Review &amp; Confirm Your Booking</h2>}

        <div className="mt-2 lg:mt-4 flex flex-col gap-4 lg:gap-6 lg:flex-row">
          {/* LEFT COLUMN */}
          <div className={`flex flex-col gap-5 flex-1 min-w-0 ${listing.type === "Event" ? "hidden" : mobileStep === "checkout" ? "hidden lg:flex" : "flex"}`}>
            {/* Venue info (Desktop only — mobile already displays venue in header) */}
            <div className="hidden lg:flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 text-xl ring-1 ring-slate-100">
                {sportEmoji(listing.categories[0] ? categoryLabel(listing.categories[0]) : listing.type)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-900">{listing.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <MapPin className="h-3 w-3 shrink-0" /> {listing.city}
                  <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                  <span className="truncate">{listing.categories.map(categoryLabel).join(", ") || listing.type}</span>
                </p>
              </div>
            </div>



            {/* Date & Time section */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 lg:p-6">
              <p className={selectedSport ? "text-xl font-extrabold text-slate-900" : "text-base font-extrabold text-slate-900"}>
                {selectedSport ? "Select Slots" : "Select Date & Time"}
              </p>
              {/* Mobile shows the game chips in the page header; desktop/embedded show them here. */}
              <div className={embedded ? "mt-2" : "mt-2 hidden lg:block"}>
                <SportChips listing={listing} sport={selectedSport} onSelect={onSelectSport} />
              </div>

              {/* Month header — continuous month navigation & dynamic scroll tracking */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={dateOptions.length > 0 && activeMonthLabel === dateOptions[0].monthLabel}
                    onClick={() => navigateMonth("prev")}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-lg font-extrabold uppercase tracking-wide text-slate-900">
                    {activeMonthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateMonth("next")}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarExpanded((v) => !v)}
                  aria-label={calendarExpanded ? "Collapse calendar" : "Expand calendar"}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50"
                >
                  {calendarExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>

              {calendarExpanded ? (
                /* Full month calendar */
                <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-lg">
                  {/* Month Pills Strip */}
                  <div className="flex gap-1.5 overflow-x-auto pb-2.5 scrollbar-none border-b border-slate-100 mb-3">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((mName, mIdx) => {
                      const isCurrentMonth = visibleMonth === mIdx;
                      return (
                        <button
                          key={mName}
                          type="button"
                          onClick={() => setVisibleMonth(mIdx)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition shrink-0 ${isCurrentMonth
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                          {mName}
                        </button>
                      );
                    })}
                  </div>

                  {/* Day Headers */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d, i) => (
                      <span key={`${d}-${i}`}>{d}</span>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {monthGrid.map((cell) => {
                      const isSelected = date === cell.iso;

                      let bgClass = "bg-white border-slate-200 text-slate-700 hover:border-slate-400";
                      let textClass = "text-slate-900";
                      let priceClass = "text-slate-500 font-semibold";

                      if (cell.isOtherMonth) {
                        bgClass = "bg-slate-50/20 border-transparent text-slate-300 pointer-events-none opacity-20";
                        textClass = "text-slate-300";
                        priceClass = "text-transparent";
                      } else if (cell.isPast) {
                        bgClass = "bg-slate-50/50 border-slate-100 text-slate-300 cursor-not-allowed opacity-30";
                        textClass = "text-slate-300";
                        priceClass = "text-slate-300";
                      } else if (isSelected) {
                        bgClass = "bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40";
                        textClass = "text-white font-black";
                        priceClass = "text-emerald-100 font-bold";
                      } else if (cell.isHoliday) {
                        bgClass = "bg-amber-50/80 border-amber-200 text-amber-900 hover:border-amber-300";
                        textClass = "text-amber-900 font-black";
                        priceClass = "text-amber-700 font-bold";
                      } else if (cell.isWeekend) {
                        bgClass = "bg-rose-50/60 border-rose-200 text-rose-600 hover:border-rose-300";
                        textClass = "text-rose-600 font-black";
                        priceClass = "text-rose-600 font-semibold";
                      } else {
                        bgClass = "bg-sky-50/40 border-sky-100 text-sky-900 hover:border-sky-300";
                        textClass = "text-sky-900 font-bold";
                        priceClass = "text-sky-700 font-semibold";
                      }

                      return (
                        <button
                          key={cell.iso}
                          type="button"
                          disabled={cell.isPast || cell.isOtherMonth}
                          onClick={() => {
                            setDate(cell.iso);
                            setDateSelected(true);
                          }}
                          className={`relative flex flex-col items-center justify-center rounded-xl border py-1.5 px-0.5 sm:py-2 min-h-[46px] sm:min-h-[52px] transition ${bgClass}`}
                        >
                          <span className={`text-xs sm:text-sm font-black leading-none ${textClass}`}>{cell.dayNum}</span>
                          {!cell.isOtherMonth && (
                            <span className={`mt-1 text-[9px] sm:text-[10px] leading-none ${priceClass}`}>
                              {cell.price}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend Bar — matching Image 2 */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[9px] font-extrabold text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" /> Weekday</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Weekend</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Holiday</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> 3+ day holiday stretch</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Corporate booking</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Custom price</span>
                  </div>
                </div>
              ) : (
                /* Compact date strip — continuous scrolling stream with automatic month tracking */
                <div
                  ref={dateStripRef}
                  onScroll={handleDateStripScroll}
                  className="mt-2 flex gap-3 overflow-x-auto pb-1 scroll-smooth scrollbar-none items-end"
                >
                  {dateOptions.map((opt) => {
                    const isSelected = date === opt.iso;
                    return (
                      <button
                        key={opt.iso}
                        data-iso={opt.iso}
                        type="button"
                        onClick={() => {
                          setDate(opt.iso);
                          setDateSelected(true);
                          setVisibleMonth(opt.month);
                          setVisibleYear(opt.year);
                        }}
                        className="relative flex w-12 shrink-0 flex-col items-center gap-1 group"
                      >
                        {opt.isFirstOfMonth && (
                          <span className="absolute -top-3 rounded bg-slate-900 px-1 py-0.2 text-[8px] font-black uppercase text-white tracking-widest shadow-xs">
                            {opt.monthShort}
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                          {opt.weekday}
                        </span>
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-extrabold transition ${isSelected ? "bg-brand-600 text-white shadow-md" : "text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                          {opt.dayNum}
                        </span>
                        <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-brand-600" : "bg-transparent"}`} />
                      </button>
                    );
                  })}
                </div>
              )}

              {!dateSelected ? (
                <div className="mt-4 text-center py-4 bg-slate-50 border border-dashed rounded-2xl">
                  <CalendarDays className="h-6 w-6 mx-auto text-slate-300" />
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Please select a date above to see time slots.</p>
                </div>
              ) : listing.type === "Turf" ? (
                <>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Time Slots</span>
                    <select
                      value={activeDaypart}
                      onChange={(e) => setActiveDaypart(e.target.value)}
                      className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="All">All Times</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>

                  {isDateHoliday ? (
                    <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <span>Venue Closed: {holidayReason || "Holiday"}</span>
                    </div>
                  ) : (
                    <>
                      {/* Time Slot Selection Grid Section */}
                      {filteredGeneratedSlots.length === 0 ? (
                        <p className="mt-3 py-4 text-center text-xs italic text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          {activeDaypart === "All"
                            ? "No slots available on this date."
                            : `No slots available for ${activeDaypart}.`}
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {/* Selected Time Summary Box */}
                          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white p-3.5 shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-200">
                                <Clock className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  {selectedSlotIndices.length === 1 && generatedSlots[selectedSlotIndices[0]]?.isClubSlot
                                    ? "⭐ Club Slot Selected"
                                    : selectedSlotIndices.length > 1
                                      ? `${selectedSlotIndices.length} Slots Selected`
                                      : selectedSlotIndices.length === 1
                                        ? "Selected Slot"
                                        : "No Slot Selected"}
                                </p>
                                <p className="text-[13px] font-extrabold text-slate-900 truncate">
                                  {selectedSlotSummaryText}
                                </p>
                              </div>
                            </div>

                            {/* Interactive Plus / Minus Hour Selector */}
                            <div className="flex items-center gap-1 rounded-full bg-emerald-100/90 border border-emerald-300/80 px-1.5 py-1 text-emerald-900 shrink-0 shadow-2xs">
                              <button
                                type="button"
                                disabled={selectedSlotIndices.length <= 1 || (selectedSlotIndices.length === 1 && generatedSlots[selectedSlotIndices[0]]?.isClubSlot)}
                                onClick={() => {
                                  if (selectedSlotIndices.length > 1 && !generatedSlots[selectedSlotIndices[0]]?.isClubSlot) {
                                    const maxIdx = Math.max(...selectedSlotIndices);
                                    onToggleSlotSelection(maxIdx);
                                  }
                                }}
                                aria-label="Decrease hour selection"
                                title="Decrease duration"
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-emerald-700 shadow-2xs border border-emerald-200 transition hover:bg-emerald-50 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
                              >
                                <Minus className="h-3 w-3 stroke-[3]" />
                              </button>
                              <span className="px-1.5 text-xs font-black text-emerald-950 select-none min-w-[52px] text-center">
                                {durationMin} min
                              </span>
                              <button
                                type="button"
                                disabled={selectedSlotIndices.length === 1 && generatedSlots[selectedSlotIndices[0]]?.isClubSlot}
                                onClick={() => {
                                  if (selectedSlotIndices.length === 1 && generatedSlots[selectedSlotIndices[0]]?.isClubSlot) return;
                                  if (selectedSlotIndices.length === 0) {
                                    const firstAvail = orderedSlots.find((s) => s.status === "Available");
                                    if (firstAvail) onToggleSlotSelection(firstAvail.originalIndex);
                                  } else {
                                    const maxIdx = Math.max(...selectedSlotIndices);
                                    const nextSlot = generatedSlots.find(
                                      (s) => s.originalIndex > maxIdx && s.status === "Available"
                                    );
                                    if (nextSlot) onToggleSlotSelection(nextSlot.originalIndex);
                                  }
                                }}
                                aria-label="Increase hour selection"
                                title="Increase duration"
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-emerald-700 shadow-2xs border border-emerald-200 transition hover:bg-emerald-50 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
                              >
                                <Plus className="h-3 w-3 stroke-[3]" />
                              </button>
                            </div>
                          </div>

                          {/* Time slots — compact, ultra-sleek, single-line pills grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto pr-2 text-center">
                            {orderedSlots.map((slot) => {
                              const isSelected = selectedSlotIndices.includes(slot.originalIndex);
                              const available = slot.status === "Available";
                              const isPending = slot.status === "Pending";
                              const { price: finalPrice, boostPct: displayBoostPct, originalPrice: finalOriginalPrice } = displaySlotPricing(slot);
                              const timeRangeText = `${slot.startTime12.replace(/^0/, "")} - ${slot.endTime12.replace(/^0/, "")}`;

                              if (slot.isClubSlot) {
                                return (
                                  <button
                                    key={slot.originalIndex}
                                    id={`slot-button-${slot.startTime}`}
                                    type="button"
                                    disabled={!available}
                                    onClick={() => {
                                      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
                                      onToggleSlotSelection(slot.originalIndex);
                                    }}
                                    className={`relative flex flex-col items-center justify-center rounded-2xl px-2.5 py-2 transition-all duration-200 cursor-pointer border min-h-[54px] col-span-2 sm:col-span-2 ${isSelected
                                        ? "bg-[#0b9c65] text-white border-[#0b9c65] shadow-md shadow-[#0b9c65]/30 ring-2 ring-[#0b9c65]/30 scale-[1.02]"
                                        : available
                                          ? "bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-white text-slate-900 border-emerald-300 hover:border-[#0b9c65] hover:bg-emerald-100/70 shadow-2xs"
                                          : "bg-slate-100/80 text-slate-400 border-slate-200/60 cursor-not-allowed opacity-50"
                                      }`}
                                  >
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider mb-1 ${isSelected
                                          ? "bg-white text-[#0b9c65]"
                                          : "bg-emerald-100 text-emerald-900 border border-emerald-300/80 shadow-2xs"
                                        }`}
                                    >
                                      🏷️ CLUB SLOT ({formatDurationText(slot.durationMinutes || 120)})
                                    </span>

                                    <span
                                      className={`text-[11px] font-black whitespace-pre-wrap break-words text-center tracking-tight leading-tight ${isSelected ? "text-white" : available ? "text-slate-900" : "text-slate-400 line-through"
                                        }`}
                                    >
                                      {timeRangeText}
                                    </span>

                                    <div className="mt-0.5 flex items-center justify-center gap-1">
                                      {available ? (
                                        <span className={`text-[10.5px] font-black ${isSelected ? "text-white/90" : "text-emerald-800"}`}>
                                          ₹{finalPrice.toLocaleString("en-IN")}
                                        </span>
                                      ) : isPending ? (
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600">
                                          Pending
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                          Booked
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              }

                              return (
                                <button
                                  key={slot.originalIndex}
                                  id={`slot-button-${slot.startTime}`}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => {
                                    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
                                    onToggleSlotSelection(slot.originalIndex);
                                  }}
                                  className={`relative flex flex-col items-center justify-center rounded-xl px-2 py-2 transition-all duration-200 cursor-pointer active:scale-95 border min-h-[54px] ${isSelected
                                    ? "bg-[#0b9c65] text-white border-[#0b9c65] shadow-md shadow-[#0b9c65]/30 ring-2 ring-[#0b9c65]/30 scale-[1.02]"
                                    : available
                                      ? "bg-white text-slate-900 border-slate-200 hover:border-[#0b9c65] hover:bg-emerald-50/30 shadow-2xs"
                                      : "bg-slate-100/80 text-slate-400 border-slate-200/60 cursor-not-allowed opacity-50"
                                    }`}
                                >
                                  {/* Last Minute Deal Badge */}
                                  {available && displayBoostPct > 0 && (
                                    <span
                                      className={`absolute -top-1.5 -right-1 rounded-full px-1.5 py-0.2 text-[7.5px] font-black uppercase tracking-wider ${isSelected ? "bg-white text-[#0b9c65] shadow-xs" : "bg-red-500 text-white shadow-xs"
                                        }`}
                                    >
                                      {displayBoostPct}% OFF
                                    </span>
                                  )}

                                  <span
                                    className={`text-[10.5px] font-extrabold whitespace-pre-wrap break-words text-center tracking-tight leading-tight ${isSelected ? "text-white" : available ? "text-slate-900" : "text-slate-400 line-through"
                                      }`}
                                  >
                                    {timeRangeText}
                                  </span>

                                  <div className="mt-0.5 flex items-center justify-center gap-1">
                                    {available ? (
                                      <div className="flex items-baseline gap-1">
                                        <span
                                          className={`text-[10px] font-black ${isSelected ? "text-white/90" : "text-slate-600"
                                            }`}
                                        >
                                          ₹{finalPrice.toLocaleString("en-IN")}
                                        </span>
                                        {displayBoostPct > 0 && (
                                          <span className={`text-[8.5px] line-through ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                                            ₹{finalOriginalPrice}
                                          </span>
                                        )}
                                      </div>
                                    ) : isPending ? (
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600">
                                        Pending
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                        Booked
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Court picker — only for venues that actually have courts.
                          Free courts sit above booked ones, and more than one can be taken
                          for the same slot (a group renting 2 of 3 courts is one booking). */}
                      {courtsForSport.length > 0 && selectedSlotIndices.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-baseline justify-between">
                            <p className="text-base font-black text-slate-900">
                              {freeCourts.length} {freeCourts.length === 1 ? "court" : "courts"} available
                            </p>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              {selectedCourtIds.length} selected
                            </span>
                          </div>

                          <div className="mt-2.5 space-y-2.5">
                            {orderedCourts.map((court) => {
                              const isFree = freeCourts.some((c) => c.id === court.id);
                              const isHeldOnly = !isFree && heldOnlyCourtIds.has(court.id);
                              const active = isFree && selectedCourtIds.includes(court.id);
                              // Priced per this exact court — a boost on Court 4 must not
                              // show up on Court 6's button just because they share a slot.
                              const { totalPrice: totalCourtPrice, boostPct: courtBoostPct } =
                                courtPricingById.get(court.id) ?? { totalPrice: 0, boostPct: 0 };
                              const meta = [court.surface, ...(court.sports ?? [])].filter(Boolean).join(" | ");
                              const photo = court.image || listing.coverImage || listing.images?.[0]?.url;

                              return (
                                <button
                                  key={court.id}
                                  type="button"
                                  disabled={!isFree}
                                  onClick={() => {
                                    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
                                    onToggleCourt(court.id);
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition ${active
                                    ? "border-[#0b9c65] bg-[#0b9c65]/5 shadow-sm"
                                    : isFree
                                      ? "border-slate-200 bg-white hover:border-[#0b9c65]/60"
                                      : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                                    }`}
                                >
                                  <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                    {photo ? (
                                      <img src={photo} alt={court.name} className="h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    ) : (
                                      <span className="flex h-full w-full items-center justify-center text-slate-300">
                                        <ImageIcon className="h-5 w-5" />
                                      </span>
                                    )}
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-extrabold text-slate-900">
                                      {court.name}
                                    </span>
                                    {meta && (
                                      <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">
                                        {meta}
                                      </span>
                                    )}
                                    {isFree ? (
                                      <span className="mt-1 flex items-center gap-1.5">
                                        <span className="text-[13px] font-black text-slate-900">
                                          ₹{totalCourtPrice.toLocaleString("en-IN")}
                                        </span>
                                        {courtBoostPct > 0 && (
                                          <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.2 text-[9.5px] font-black uppercase text-red-600">
                                            ⚡ {courtBoostPct}% OFF
                                          </span>
                                        )}
                                      </span>
                                    ) : isHeldOnly ? (
                                      <span className="mt-1 block text-[13px] font-black text-amber-600">
                                        Pending
                                      </span>
                                    ) : (
                                      <span className="mt-1 block text-[13px] font-black text-slate-400">
                                        Booked
                                      </span>
                                    )}
                                  </span>

                                  <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${active
                                      ? "border-[#0b9c65] bg-[#0b9c65] text-white"
                                      : isFree
                                        ? "border-slate-300 bg-white text-transparent"
                                        : "border-slate-200 bg-slate-100 text-transparent"
                                      }`}
                                  >
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {freeCourts.length === 0 && (
                            <p className="mt-2 text-[11px] font-semibold text-amber-600">
                              Every court is booked for one or more selected slots. Pick another slot.
                            </p>
                          )}
                          {freeCourts.length > 0 && selectedCourtIds.length === 0 && (
                            <p className="mt-2 text-[11px] font-semibold text-amber-600">
                              Pick at least one court to continue.
                            </p>
                          )}
                          {selectedCourtIds.length > 1 && (
                            <p className="mt-2 text-[11px] font-semibold text-slate-500">
                              {selectedCourtIds.length} courts booked together for {selectedSlotSummaryText}.
                            </p>
                          )}
                        </div>
                      )}


                    </>
                  )}
                </>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Start Time *</label>
                    <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <Clock className="h-4 w-4 text-brand-500 shrink-0" />
                      <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none">
                        {START_TIMES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">End Time *</label>
                    <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <Clock className="h-4 w-4 text-brand-500 shrink-0" />
                      <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none">
                        {START_TIMES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div
            className={`flex flex-col gap-5 shrink-0 ${listing.type === "Event" ? "w-full max-w-2xl mx-auto lg:w-full" : "w-full lg:w-80 lg:max-w-xs xl:max-w-sm"
              } ${mobileStep === "slots" ? "hidden lg:flex" : "flex"}`}
          >
            {/* Checkout Header Card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{listing.title}</h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 truncate max-w-[220px] sm:max-w-none">
                    {selectedSport ? `${selectedSport} • ` : ""}{listing.type}
                    {selectedCourtDisplay ? ` • ${selectedCourtDisplay}` : ""}
                  </p>
                </div>
                {selectedSport && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-lg">
                    {sportEmoji(selectedSport)}
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-4 w-4 text-brand-500 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Date</p>
                    <p className="text-xs font-bold text-slate-800">
                      {date
                        ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit", month: "short" })
                        : "Select Date"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-brand-500 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Time</p>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {listing.type === "Event"
                        ? time
                        : listing.type === "Turf" && selectedSlotIndices.length > 0
                          ? selectedSlotSummaryText
                          : "Select Time"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Apply Coupon Code */}
            <button type="button" className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-5 lg:p-6 transition hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="text-brand-500 text-lg">🏷️</div>
                <span className="text-sm font-bold text-slate-800">Apply Coupon Code</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            {/* Game Reminders */}
            <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-5 lg:p-6">
              <div>
                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">Game Reminders <span className="text-orange-500 text-sm">🔔</span></p>
                <p className="text-xs text-slate-500 mt-1">Get an SMS/Push notification 1 hr before your slot.</p>
              </div>
              <div className="relative inline-block w-10 h-6">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </div>
            </div>

            {/* Play Protect */}
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 lg:p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={playProtect} onChange={(e) => setPlayProtect(e.target.checked)} className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 accent-indigo-600" />
                <div>
                  <p className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">Add Play Protect <ShieldCheck className="h-4 w-4 text-indigo-700" /></p>
                  <p className="text-[11px] text-indigo-700/80 mt-1 font-medium leading-relaxed">Get 100% refund on cancellation &amp; accidental injury cover up to ₹10K.</p>
                  <p className="text-[11px] font-bold text-indigo-900 mt-1.5">+ ₹19 added to total</p>
                </div>
              </label>
            </div>

            {/* Add-ons — filtered specifically to the currently selected game. */}
            {listing.type !== "Event" && (() => {
              const allAddOns = listing.addOns ?? [];
              if (allAddOns.length === 0) return null;
              const filteredAddOns = allAddOns.filter((addOn) => isAddOnForSport(addOn, selectedSport));
              return (
                <div className="rounded-3xl border border-slate-100 bg-white p-5 lg:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-slate-800">Add-ons &amp; Equipment</p>
                    {selectedSport && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {categoryLabel(selectedSport) || selectedSport}
                      </span>
                    )}
                  </div>

                  {filteredAddOns.length === 0 ? (
                    <p className="py-4 text-center text-xs font-semibold text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No add-ons available for this sport.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredAddOns.map((addOn) => {
                        const added = selectedAddOnIds.includes(addOn.id);
                        return (
                          <div key={addOn.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {addOn.image ? (
                                <img
                                  src={addOn.image.url}
                                  alt={addOn.label}
                                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                                  <ImageIcon className="h-5 w-5" />
                                </span>
                              )}
                              <div>
                                <p className="text-xs font-bold text-slate-800">{addOn.label}</p>
                                <p className="text-[10px] font-semibold text-slate-500">₹{addOn.price.toLocaleString("en-IN")}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleAddOn(addOn.id)}
                              className={`rounded-md border px-3 py-1 text-[10px] font-bold transition ${added
                                ? "border-brand-500 bg-brand-500 text-white"
                                : "border-brand-400/60 bg-white text-brand-500 hover:bg-brand-50"
                                }`}
                            >
                              {added ? "ADDED" : "ADD"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Payment Option Selection & Breakdown */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs">
                    💳
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Select Payment Option
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {canPartial ? "Partial or Full" : "Full Payment"}
                </span>
              </div>

              {canPartial && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                  {/* Partial Payment Card */}
                  <button
                    type="button"
                    onClick={() => setPaymentOption("partial")}
                    className={`relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${paymentOption === "partial"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900">Partial Payment</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${paymentOption === "partial" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"
                        }`}>
                        {partialConfig.type === "fixed" ? `₹${partialConfig.value} Deposit` : `${partialConfig.value}% Deposit`}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-emerald-700">
                      Pay Advance Now
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      Lock slot with deposit, pay balance at venue
                    </p>
                  </button>

                  {/* Full Payment Card */}
                  <button
                    type="button"
                    onClick={() => setPaymentOption("full")}
                    className={`relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${paymentOption === "full"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900">Full Payment</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${paymentOption === "full" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"
                        }`}>
                        100% Online
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-emerald-700">
                      Pay ₹{activePrice.toLocaleString("en-IN")} Now
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      Pay total amount online, zero balance at venue
                    </p>
                  </button>
                </div>
              )}

              {dealSavings && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-orange-600">
                    <Zap className="h-3.5 w-3.5 fill-orange-500 text-orange-500" /> Last Minute Deal Applied
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-slate-500">Original Price</span>
                    <span className="font-bold text-slate-400 line-through">
                      ₹{dealSavings.originalPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-slate-500">Discounted Price</span>
                    <span className="font-bold text-orange-700">
                      ₹{dealSavings.discountedPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-slate-500">You Save</span>
                    <span className="font-black text-emerald-600">₹{dealSavings.savings.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}

              {/* Payment Breakdown Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Total Booking Amount</span>
                  <span className="font-bold text-slate-900">₹{activePrice.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-emerald-100/90 px-3 py-2 text-emerald-950 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                    Pay Now ({paymentOption === "full" || !canPartial ? "Full Payment" : "Advance Deposit"})
                  </span>
                  <span className="text-sm font-black text-emerald-800">₹{payNowAmount.toLocaleString("en-IN")}</span>
                </div>

                {payAtVenueAmount > 0 ? (
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-amber-900 font-semibold">
                    <span>Remaining Balance (Pay at Venue)</span>
                    <span className="font-bold text-amber-800">₹{payAtVenueAmount.toLocaleString("en-IN")}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-emerald-900 font-semibold">
                    <span>Remaining Balance (Pay at Venue)</span>
                    <span className="font-bold text-emerald-700">₹0 (Fully Paid)</span>
                  </div>
                )}
              </div>

              <p className="text-[10px] font-medium leading-relaxed text-slate-500 flex items-start gap-1.5 pt-0.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {paymentOption === "full" || !canPartial
                    ? `Full online payment of ₹${payNowAmount.toLocaleString("en-IN")} will confirm your booking with no balance due at the venue.`
                    : `Partial payment of ₹${payNowAmount.toLocaleString("en-IN")} locks your slot now. Remaining balance ₹${payAtVenueAmount.toLocaleString("en-IN")} is payable at check-in.`}
                </span>
              </p>
            </div>

            {/* Shown on both mobile and desktop checkout — collecting a phone number
                can't be desktop-only, mobile is the primary surface. */}
            <div className="mt-3">
              {needsPhone && (
                <div className="mb-3">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Needed for your booking confirmation — we&apos;ll save it to your profile.
                  </p>
                </div>
              )}
              {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] text-rose-600">{error}</p>}
              {!embedded && (
                <button
                  type="button"
                  disabled={!canPay || submitting}
                  onClick={onPay}
                  className={`hidden w-full rounded-xl py-3 text-xs font-bold uppercase tracking-wide transition lg:block ${canPay && !submitting
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 hover:scale-[1.01]"
                    : "cursor-not-allowed bg-slate-300 text-white"
                    }`}
                >
                  {submitting
                    ? "Booking..."
                    : selectedTier
                      ? `Confirm ${selectedTier.label}`
                      : `PAY ₹${payNowAmount.toLocaleString("en-IN")} TO CONFIRM`}
                </button>
              )}
            </div>
            {embedded && (
              <p className="text-center text-[11px] font-semibold text-slate-500 hidden lg:block">
                {canPay ? "All set — tap Book Now above to confirm." : "Complete the steps above, then Book Now activates."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footers */}
      {!embedded && mobileStep === "slots" && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex items-center justify-between z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] rounded-t-3xl">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[#0b9c65] uppercase">Pay Now: ₹{payNowAmount.toLocaleString("en-IN")} • Total: ₹{activePrice.toLocaleString("en-IN")}</p>
            <p className="text-2xl font-black text-slate-900">₹{payNowAmount.toLocaleString("en-IN")}</p>
            {listing.type === "Turf" && courtsForSport.length > 0 && selectedSlotIndices.length > 0 && (
              <p className="truncate text-[11px] font-semibold text-slate-500">
                {selectedCourtIds.length} {selectedCourtIds.length === 1 ? "court" : "courts"} selected ·{" "}
                {selectedSlotSummaryText}
              </p>
            )}
          </div>
          <button
            onClick={() => setMobileStep("checkout")}
            disabled={
              !date ||
              (listing.type === "Turf" &&
                (selectedSlotIndices.length === 0 ||
                  (courtsForSport.length > 0 && selectedCourtIds.length === 0)))
            }
            className="rounded-2xl bg-brand-600 hover:bg-brand-700 px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-brand-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CONTINUE
          </button>
        </div>
      )}

      {!embedded && mobileStep === "checkout" && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex items-center justify-between z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] rounded-t-3xl">
          <button
            onClick={onPay}
            disabled={!canPay || submitting}
            className="w-full rounded-2xl bg-[#0b9c65] py-4 text-base font-bold tracking-wide text-white shadow-lg shadow-[#0b9c65]/30 flex items-center justify-between px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              PAY ₹{payNowAmount.toLocaleString("en-IN")} TO CONFIRM
            </span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP — CONFIRMATION                                                */
/* ------------------------------------------------------------------ */

function ConfirmedStep({ listing, booking, onClose, embedded = false }: { listing: Listing; booking: Booking; onClose: () => void; embedded?: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const paidAmount = booking.paidAmount ?? booking.totalAmount;
  const isGenuinePartial = booking.status === "Part Paid" && paidAmount > 0 && paidAmount < booking.totalAmount;
  const remaining = booking.totalAmount - paidAmount;

  function shareNow() {
    const message = [
      "My booking is confirmed on Book Your Vibe!",
      `${listing.title} — ${new Date(booking.dateTime).toLocaleString("en-GB")}`,
      `Order ID: ${booking.orderId}`,
    ].join("\n");
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "My BYV Booking", text: message }).catch(() => { });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
  }

  async function downloadTicket() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadBookingTicket({
        ...booking,
        listingTitle: booking.listingTitle || listing.title,
      });
    } finally {
      setDownloading(false);
    }
  }

  const innerCard = (
    <div className="w-full max-w-md mx-auto rounded-[2rem] bg-white p-4 sm:p-6 text-center shadow-2xl border border-slate-100/80 animate-in zoom-in-95 duration-200">
      <div className="mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={3} />
      </div>
      <h2 className="mt-2.5 sm:mt-3 text-lg sm:text-xl font-extrabold text-slate-900">Booking Confirmed!</h2>
      <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Your slot at {listing.title} is locked in.</p>

      <div className="mt-3.5 sm:mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4 text-left text-xs sm:text-sm">
        <Row label="Order ID" value={<span className="font-mono font-bold break-all text-slate-900">{booking.orderId}</span>} />
        <Row label="Venue" value={`${listing.title} · ${listing.categories.map(categoryLabel).join(", ") || listing.type}`} />
        <Row label="Date & Time" value={new Date(booking.dateTime).toLocaleString("en-GB")} />
        {(booking.courtNames?.length || booking.courtName) && (
          <Row
            label={booking.courtNames && booking.courtNames.length > 1 ? "Courts" : "Court"}
            value={booking.courtNames?.length ? booking.courtNames.join(", ") : booking.courtName}
          />
        )}
        {booking.lastMinuteBoost && (
          <div className="mt-2 rounded-xl border border-orange-200 bg-orange-50/80 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-orange-600">
              <Zap className="h-3.5 w-3.5 fill-orange-500 text-orange-500" /> Last Minute Deal
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Original Price</span>
              <span className="font-bold text-slate-400 line-through">
                ₹{booking.lastMinuteBoost.originalAmount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">You Saved</span>
              <span className="font-black text-emerald-600">
                ₹{booking.lastMinuteBoost.discountAmount.toLocaleString("en-IN")} ({booking.lastMinuteBoost.discountPct}%)
              </span>
            </div>
          </div>
        )}
        {isGenuinePartial ? (
          <>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-900">Total Price</span>
              <span className="font-extrabold text-slate-800">₹{booking.totalAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-bold text-slate-900">Paid Now</span>
              <span className="font-extrabold text-emerald-600">₹{paidAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-bold text-slate-900">Remaining (pay at venue)</span>
              <span className="font-black text-rose-600">₹{remaining.toLocaleString("en-IN")}</span>
            </div>
          </>
        ) : (
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-bold text-slate-900">{booking.paymentStatus === "paid" ? "Paid" : "Payment"}</span>
            <span className="font-extrabold text-emerald-600">₹{booking.totalAmount.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>
      {isGenuinePartial ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-left text-[11px] text-amber-800">
          <span>
            <span className="font-black">Partial Payment Confirmed</span> — <span className="font-black">₹{remaining.toLocaleString("en-IN")} balance</span> is payable at the venue upon check-in.
          </span>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-xl border-l-4 border-emerald-400 bg-emerald-50 px-3 py-2 text-left text-[11px] text-emerald-800">
          <span>
            <span className="font-black">Fully Paid Online</span> — zero balance due at venue.
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-xl border-l-4 border-brand-400 bg-brand-50 px-3 py-2 text-left text-[11px] text-slate-600">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" />
        <span>
          Show Order ID at venue — owner scans it to check you in as <span className="font-bold">{booking.orderId}</span>.
        </span>
      </div>

      <BookingQrCode booking={booking} />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={shareNow}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5" /> Share Now
        </button>
        <button
          type="button"
          onClick={downloadTicket}
          disabled={downloading}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" /> {downloading ? "Saving..." : "Download"}
        </button>
      </div>

      {!embedded && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-500/30 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          Done
        </button>
      )}
    </div>
  );

  if (!embedded) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in duration-200">
        <div className="w-full max-w-md my-auto">
          {innerCard}
        </div>
      </div>
    );
  }

  return innerCard;
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}










