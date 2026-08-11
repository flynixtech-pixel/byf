"use client";

import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import {
  Clock as ClockIcon,
  List as ListIcon,
  SlidersHorizontal,
  X,
  Ban,
  BookOpen,
  Pause,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Scissors,
  Check,
  CheckSquare,
  Layers,
  Copy,
} from "lucide-react";
import {
  getVendorListings,
  getVendorBookings,
  createVendorBooking,
  updateVendorBookingStatus,
  updateVendorListing,
  checkInVendorBooking,
  checkInVendorChallenge,
} from "@/lib/api/vendor";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { Listing, Booking, BookingStatus } from "@/lib/types";
import { ClockSlotsWidget } from "@/components/vendor/ClockSlotsWidget";
import { TimeField } from "@/components/vendor/TimeField";
import { BlockReasonModal, ConfirmCountdownModal, ManageBookedSlotModal } from "@/components/vendor/SlotActionModals";
import { BookingsHeader } from "@/components/vendor/bookings/BookingsHeader";
import { AcademyBookingsPanel } from "@/components/vendor/bookings/AcademyBookingsPanel";
import { PageBack } from "@/components/vendor/PageBack";
import { BookingsTimeline, TimelineLegend, type SlotAction } from "@/components/vendor/bookings/BookingsTimeline";
import { AddBookingSheet, type AddBookingValues } from "@/components/vendor/bookings/AddBookingSheet";
import { QrScannerModal } from "@/components/vendor/bookings/QrScannerModal";
import { ClubSlotDetailsModal } from "@/components/vendor/bookings/ClubSlotDetailsModal";
import { SportCourtSelectionModal } from "@/components/vendor/bookings/SportCourtSelectionModal";
import {
  SlotFilterSheet,
  DEFAULT_FILTERS,
  activeFilterCount,
  filterSummary,
  hourMatchesTimeOfDay,
  type SlotFilters,
} from "@/components/vendor/bookings/SlotFilterSheet";

/* ─── helpers ─────────────────────────────────────────────────── */
function to12h(t: string) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr) % 24; // "24:00" (midnight close) → 12:00 AM
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ap}`;
}
function t24m(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
/**
 * Minute-of-day sort key anchored at the venue's regular opening time. A slot that
 * starts before opening (e.g. a 12–2 AM late-night slot on a turf that opens at 6 AM)
 * belongs at the *end* of that day's list, not the top.
 */
function dayOrderKey(time: string, dayStartMins: number) {
  const m = t24m(time);
  return m < dayStartMins ? m + 1440 : m;
}
/** Local-date ISO (yyyy-mm-dd). toISOString() would shift the day for IST users. */
function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function durHrs(start: string, end: string) {
  return +(slotDurMins(start, end) / 60).toFixed(1);
}

function getVendorSportEmoji(sport: string) {
  const l = (sport || "").toLowerCase();
  if (l.includes("cricket")) return "🏏";
  if (l.includes("foot") || l.includes("socc")) return "⚽";
  if (l.includes("badm")) return "🏸";
  if (l.includes("tenn") || l.includes("padel") || l.includes("squash")) return "🎾";
  if (l.includes("basket")) return "🏀";
  if (l.includes("volley")) return "🏐";
  if (l.includes("swim")) return "🏊‍♂️";
  if (l.includes("table") || l.includes("tt")) return "🏓";
  if (l.includes("snooker") || l.includes("pool") || l.includes("billiards")) return "🎱";
  if (l.includes("golf")) return "⛳";
  if (l.includes("box")) return "🥊";
  return "🏆";
}

function VendorSportDropdown({
  sports,
  selectedSport,
  onSelect,
}: {
  sports: string[];
  selectedSport: string;
  onSelect: (sport: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [open]);

  const currentSport = selectedSport || sports[0] || "Sports";

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition-all hover:border-vibe-violet focus:border-vibe-violet focus:ring-2 focus:ring-vibe-violet/20 cursor-pointer shadow-2xs"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-sm">
            {getVendorSportEmoji(currentSport)}
          </span>
          <span className="truncate font-extrabold capitalize text-slate-900">{currentSport}</span>
        </span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180 text-vibe-violet" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-[120] mt-1.5 w-full min-w-[200px] rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-slate-100 mb-1">
            Select Sport / Court
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-none">
            {sports.map((cat) => {
              const isSelected = cat.toLowerCase() === currentSport.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    onSelect(cat);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? "bg-vibe-violet/10 text-vibe-violet font-extrabold border border-vibe-violet/20"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-base">{getVendorSportEmoji(cat)}</span>
                    <span className="capitalize">{cat}</span>
                  </span>
                  {isSelected && <Check size={14} className="text-vibe-violet shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
/** Slot length in minutes, tolerating an end time that wraps past midnight ("23:00"→"00:00"). */
function slotDurMins(start: string, end: string) {
  const d = t24m(end) - t24m(start);
  return d > 0 ? d : d + 1440;
}
/** Day-part label for a newly-added slot, from its start hour. */
function slotLabel(start: string) {
  const h = Number(start.split(":")[0]);
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}
type SlotStatus = "Available" | "Booked" | "Part Paid" | "Offline Booked" | "Blocked" | "On Hold" | "Empty";

/**
 * The vendor bookings API returns more than the shared mock `Booking` type models
 * (it carries listingId/customerName/phone/checkedIn). Naming that here keeps the
 * slot resolver free of `as any` casts.
 */
type ApiBooking = Booking & {
  listingId?: string;
  customerName?: string;
  phone?: string;
  checkedIn?: boolean;
  endTime?: string;
  /** Set only for bookings made by a registered customer through the app — manual/walk-in
   * bookings the vendor typed in themselves never get one. This, not payment method, is
   * what actually distinguishes "Booked via BYV" from "Walk-in" (a BYV customer can still
   * choose to pay cash at the venue and should still show as an online booking). */
  customerId?: string | null;
};

interface AgendaSlot {
  startTime: string;
  endTime: string;
  label: string;
  price: number;
  status: SlotStatus;
  bookingId?: string;
  customerName?: string;
  phone?: string;
  blockedReason?: string;
  /** True once the player's ticket QR has been scanned in. */
  arrived?: boolean;
  sport?: string;
  numberOfPlayers?: number;
  /** Amount actually collected so far — only meaningfully less than `price` on a "Part Paid" slot. */
  paidAmount?: number;
  /** Court the shown booking sits on — only set on venues that have courts. */
  courtName?: string;
  /** How many of the venue's courts are still sellable in this slot (0 when it has none). */
  courtsFree?: number;
  courtsTotal?: number;
  bookedCourtIds?: string[];
  isClubSlot?: boolean;
  clubId?: string;
  slotIds?: string[];
  durationMinutes?: number;
}

/* ────────────────────────────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────────────────────────────── */
export default function BookingsPage() {
  // "Academy Bookings" is a completely different data shape (coach subscriptions,
  // not turf slots) — kept as an early return so it can't disturb the agenda state below.
  const [pageTab, setPageTab] = useState<"turf" | "academy">("turf");
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Agenda state
  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedTurfId, setSelectedTurfId] = useState("");
  // "All Slots" filter — status / time of day / source / quick filters.
  const [selectedGameFilter, setSelectedGameFilter] = useState("All");
  const [filters, setFilters] = useState<SlotFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  // Add Booking sheet (name, number, court, price, timing, sport)
  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [addBookingInitial, setAddBookingInitial] = useState<Partial<AddBookingValues>>({});
  const [addBookingSaving, setAddBookingSaving] = useState(false);
  const [sportCourtModalOpen, setSportCourtModalOpen] = useState(false);
  const [sportCourtModalSlot, setSportCourtModalSlot] = useState<AgendaSlot | null>(null);
  /** Start of the visible 7-day strip in the header. */
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  // Live clock tick — drives "running now" / "already passed" slot styling
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const isToday = selectedDate === todayIso;
  const [viewMode, setViewMode] = useState<"timeline" | "clock">("timeline");
  // Active slot action modal
  const [activeSlot, setActiveSlot] = useState<AgendaSlot | null>(null);
  const [activeClubSlot, setActiveClubSlot] = useState<AgendaSlot | null>(null);
  // Long-press quick sheet (press & hold a slot → "Offline Booking" / "Block Slot")
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  // Grouped-list filter (for "See Booking" bottom button)
  const [groupedFilter, setGroupedFilter] = useState<SlotStatus | null>(null);

  // Multi-slot selection: tap several available slots, then club them into one booking
  // or book them as separate bookings for the same customer.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // "Club together" can also rewrite the venue's default daily schedule, so this
  // 2-hr (or N-hr) block becomes the standing slot every day, not just for today.
  const [applyClubDaily, setApplyClubDaily] = useState(false);
  const [clubbing, setClubbing] = useState(false);
  // How the offline modal submits: one combined booking ("single") or one per slot ("multiple").
  const [offlineMode, setOfflineMode] = useState<"single" | "multiple">("single");
  const [multiSlots, setMultiSlots] = useState<AgendaSlot[]>([]);

  // Offline booking modal
  const [offlineModal, setOfflineModal] = useState(false);
  const [offlineName, setOfflineName] = useState("");
  const [offlinePhone, setOfflinePhone] = useState("");
  const [offlineSport, setOfflineSport] = useState("");
  const [offlineCourtId, setOfflineCourtId] = useState("");
  const [offlineAmount, setOfflineAmount] = useState("");
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);
  // How many consecutive slots the single-slot offline booking actually spans —
  // lets the vendor extend a booking past the one slot they tapped (e.g. book
  // 6–9 PM in one go) without needing the separate multi-select "club" flow first.
  const [offlineSpanCount, setOfflineSpanCount] = useState(1);
  const [setupSportsOpen, setSetupSportsOpen] = useState(false);
  const [setupSportsSelected, setSetupSportsSelected] = useState<string[]>([]);
  const [setupSportsSaving, setSetupSportsSaving] = useState(false);

  const ALL_SPORTS = ["Football", "Cricket", "Tennis", "Badminton", "Basketball", "Volleyball", "Hockey", "Rugby", "Kabaddi", "Handball", "Futsal", "Box Cricket", "Pickleball", "Squash", "Padel"];

  // "Add a time slot" modal (e.g. an extra late-night slot for this date)
  const [addSlotOpen, setAddSlotOpen] = useState(false);

  // Block-reason picker (available slot → "Block Slot")
  const [blockReasonOpen, setBlockReasonOpen] = useState(false);
  // Generic "are you sure, finalizing in Ns" step before any action actually runs
  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; seconds: number; run: () => void | Promise<void> } | null>(null);

  // Load
  useEffect(() => {
    Promise.all([getVendorListings(), getVendorBookings({ limit: 500 })])
      .then(([l, b]) => {
        const mapped = l.map(apiListingToMock);
        setListings(mapped);
        const turfs = mapped.filter((x) => x.type === "Turf");
        // Prefer a turf that actually has slots configured, so the agenda isn't empty by default.
        const withSlots = turfs.find((t) => (t.slotsList?.length ?? 0) > 0);
        if (withSlots) setSelectedTurfId(withSlots.id);
        else if (turfs.length > 0) setSelectedTurfId(turfs[0].id);
        setBookings(b.items as unknown as ApiBooking[]);
      })
      .catch((e) => setError(e instanceof ApiError ? e.describe() : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const selectedTurf = useMemo(
    () => listings.find((l) => l.id === selectedTurfId),
    [listings, selectedTurfId]
  );
  const turfListings = useMemo(() => listings.filter((l) => l.type === "Turf"), [listings]);

  // Default the Game Filters strip to this turf's first game rather than "All",
  // so the agenda opens already scoped to a sport. Re-fires only when the turf
  // itself changes, so it won't stomp on a filter the vendor picked manually.
  useEffect(() => {
    if (selectedTurf?.categories && selectedTurf.categories.length > 0) {
      setSelectedGameFilter(selectedTurf.categories[0]);
    }
  }, [selectedTurf?.id]);

  /**
   * The venue's regular opening minute, taken from the listing's default slot list
   * (never from a date override — an override may already contain the late-night slot
   * we're trying to place). Everything that orders or compares times uses this anchor.
   */
  const dayStartMins = useMemo(() => {
    const base = selectedTurf?.slotsList ?? [];
    if (base.length === 0) return 0;
    return Math.min(...base.map((s) => t24m(s.startTime)));
  }, [selectedTurf]);

  /** "Now" projected onto the same anchored timeline as the slots. */
  const nowOrder = useMemo(() => {
    const m = now.getHours() * 60 + now.getMinutes();
    return m < dayStartMins ? m + 1440 : m;
  }, [now, dayStartMins]);

  /* ── Deep link from Price Setting: ?date&start&end&price opens Add Booking prefilled ── */
  const bookingLinkHandled = useRef(false);
  useEffect(() => {
    if (bookingLinkHandled.current || turfListings.length === 0) return;
    bookingLinkHandled.current = true;
    const sp = new URLSearchParams(window.location.search);
    const date = sp.get("date");
    const start = sp.get("start");
    if (!date || !start) return;
    jumpToDate(date);
    setAddBookingInitial({ startTime: start, endTime: sp.get("end") ?? "", price: sp.get("price") ?? "" });
    setAddBookingOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turfListings]);

  /* ── Resolve slots for selected date ── */
  const resolvedSlots = useMemo<AgendaSlot[]>(() => {
    if (!selectedTurf) return [];
    const override = selectedTurf.dateOverrides?.find((o) => o.date === selectedDate);
    const base = override
      ? override.isHoliday ? [] : (override.slots || [])
      : (selectedTurf.slotsList || []);

    // Pricing Studio can save more than one row for the same time range (a base row
    // plus per-court / per-sport price-override rows) — collapse to one row per
    // startTime+endTime so the Timeline doesn't render duplicate slots.
    const dedupedBase = (() => {
      const priority = (row: (typeof base)[number]) => {
        if (selectedGameFilter !== "All" && row.sport && row.sport.toLowerCase() === selectedGameFilter.toLowerCase()) return 2;
        if (!row.sport && !row.courtId) return 1;
        return 0;
      };
      const byKey = new Map<string, (typeof base)[number]>();
      for (const row of base) {
        const key = `${row.startTime}|${row.endTime}`;
        const existing = byKey.get(key);
        if (!existing || priority(row) > priority(existing)) byKey.set(key, row);
      }
      return Array.from(byKey.values());
    })();

    const mapped = dedupedBase.map((slot) => {
      if (slot.blocked) {
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          label: slot.label,
          price: slot.price,
          status: "Blocked" as SlotStatus,
          blockedReason: slot.blockedReason,
        };
      }

      // Bookings on this date + turf that overlap this slot, of any sport — a court
      // shared across sports (e.g. Cricket|Football) is physically occupied no matter
      // which sport its booking was tagged with, so this set must not be sport-filtered.
      const overlappingBookings = bookings.filter((bk) => {
        const d = new Date(bk.dateTime);
        const bkDate = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const bkTime = d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

        const bkListingId = String(bk.listingId ?? bk.listing ?? "");
        const targetId = String(selectedTurfId || selectedTurf?.id || "");

        const bkStartMins = t24m(bkTime);
        const bkEndMins = bk.endTime ? t24m(bk.endTime) : bkStartMins + 60;
        const slotStartMins = t24m(slot.startTime);
        const slotEndMins = t24m(slot.endTime);

        const isMatchTurf = bkListingId === targetId || (selectedTurf?.id && bkListingId === String(selectedTurf.id));
        const isMatchDate = bkDate === selectedDate;
        const isTimeOverlap = slotStartMins < bkEndMins && bkStartMins < slotEndMins;

        return isMatchTurf && bk.status !== "Cancelled" && isMatchDate && (bkTime === slot.startTime || isTimeOverlap);
      });

      // Narrowed to the sport currently being viewed — drives which booking's details
      // (customer name, phone) the row displays.
      const matches = overlappingBookings.filter((bk) => {
        const isSportMatch = selectedGameFilter === "All" || !bk.sport || bk.sport.trim().toLowerCase() === selectedGameFilter.trim().toLowerCase();
        return isSportMatch;
      });

      const activeCourts = (selectedTurf?.courts ?? []).filter((c) => c.active);
      const gameCourts = activeCourts.filter(c =>
         selectedGameFilter === "All" || !c.sports || c.sports.length === 0 || c.sports.some(s => s.toLowerCase() === selectedGameFilter.toLowerCase())
      );

      const takenCourtIds = new Set(
        activeCourts.length > 0
          ? overlappingBookings.flatMap((m) => (m.courtIds?.length ? m.courtIds : [m.courtId || activeCourts[0]!.id]))
          : []
      );

      // A court whose only claim is a still-"Pending" booking (payment in progress,
      // not yet confirmed) is a soft hold, not a firm sale — tagged separately so the
      // vendor doesn't mistake an open checkout for a real booking.
      const pendingOnlyCourtIds = new Set<string>();
      if (activeCourts.length > 0) {
        const firmCourtIds = new Set<string>();
        for (const bk of overlappingBookings) {
          const courtIds = bk.courtIds?.length ? bk.courtIds : [bk.courtId || activeCourts[0]!.id];
          const set = bk.status === "Pending" ? pendingOnlyCourtIds : firmCourtIds;
          for (const id of courtIds) set.add(id);
        }
        for (const id of firmCourtIds) pendingOnlyCourtIds.delete(id);
      }

      const courtsTotal = activeCourts.length > 0 ? gameCourts.length : 0;
      const courtsFree = courtsTotal > 0 ? gameCourts.filter(c => !takenCourtIds.has(c.id)).length : 0;

      const relevantMatches = matches.filter(m => {
          if (activeCourts.length === 0) return true;
          const mCourts = m.courtIds?.length ? m.courtIds : [m.courtId || activeCourts[0]!.id];
          return mCourts.some(id => gameCourts.some(gc => gc.id === id));
      });
      const sportMatched = relevantMatches[0] || matches[0];
      // Falls back to a cross-sport booking's details so a slot that's fully taken by
      // e.g. a Cricket booking on the shared court doesn't read as "Available" while
      // browsing the Football tab. Flagged separately so the row never displays that
      // other sport's booking as if it were one for the sport currently being viewed.
      const match = sportMatched || overlappingBookings[0];
      const otherSportBooking = Boolean(match) && !sportMatched;

      const isFullyBooked = activeCourts.length > 0 ? (courtsTotal > 0 && courtsFree === 0) : matches.length > 0;
      let status: SlotStatus = "Available";
      let bookingId: string | undefined;
      let customerName: string | undefined;
      let phone: string | undefined;
      let arrived = false;

      if (match && isFullyBooked) {
        bookingId = match.orderId;
        customerName = otherSportBooking
          ? `Court in use — ${match.sport || "other sport"}`
          : match.customerName ?? match.customer;
        phone = match.phone;
        arrived = Boolean(match.checkedIn);
        const isWalkIn = !match.customerId;
        const isHold = match.customerName === "Hold";
        if (isHold && match.status === "Pending") status = "On Hold";
        else if (match.status === "Pending" || match.status === "Part Paid") status = "Part Paid";
        else status = isWalkIn ? "Offline Booked" : "Booked";
      }

      let displayLabel = slot.label || slotLabel(slot.startTime);
      if (courtsTotal > 0 && (selectedGameFilter !== "All" || takenCourtIds.size > 0)) {
         displayLabel += ` • ${courtsFree}/${courtsTotal} Free`;
      }

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: displayLabel,
        price: (slot.price && slot.price > 0) ? slot.price : (selectedTurf?.price || 1000),
        status,
        bookingId: isFullyBooked ? bookingId : undefined,
        customerName: isFullyBooked ? customerName : undefined,
        phone: isFullyBooked ? phone : undefined,
        arrived,
        sport: match?.sport,
        numberOfPlayers: match?.numberOfPlayers,
        paidAmount: match?.paidAmount,
        courtName: match?.courtNames?.length ? match.courtNames.join(", ") : match?.courtName,
        courtsFree,
        courtsTotal,
        bookedCourtIds: Array.from(takenCourtIds),
        courtsInfo: activeCourts.length > 0 ? gameCourts.map(c => ({
          id: c.id,
          name: c.name,
          isBooked: takenCourtIds.has(c.id),
          isPending: pendingOnlyCourtIds.has(c.id)
        })) : undefined,
        isClubSlot: Boolean(slot.isClubSlot || (t24m(slot.endTime) - t24m(slot.startTime) > 60)),
        clubId: slot.clubId,
        slotIds: slot.slotIds,
        durationMinutes: slot.durationMinutes || (t24m(slot.endTime) - t24m(slot.startTime)),
      };
    })
      .sort((a, b) => dayOrderKey(a.startTime, dayStartMins) - dayOrderKey(b.startTime, dayStartMins));

    // Combine consecutive slots that belong to the exact same booking into one continuous block (e.g. 11:00 AM – 01:00 PM)
    const merged: AgendaSlot[] = [];
    for (let i = 0; i < mapped.length; i++) {
      const current = mapped[i];
      if (merged.length > 0) {
        const last = merged[merged.length - 1];
        if (
          current.bookingId &&
          last.bookingId &&
          current.bookingId === last.bookingId &&
          last.endTime === current.startTime
        ) {
          last.endTime = current.endTime;
          last.price += current.price;
          last.label = `${last.startTime} - ${current.endTime}`;
          continue;
        }
      }
      merged.push({ ...current });
    }
    return merged;
  }, [selectedTurf, selectedDate, bookings, selectedTurfId, dayStartMins, selectedGameFilter]);

  /* ── "All Slots" filter: status + time of day + source + quick ── */
  const visibleSlots = useMemo(() => {
    let nextBookedStart: string | null = null;
    if (filters.quick === "Next Booking") {
      const upcoming = resolvedSlots
        .filter((s) => s.status !== "Available" && s.status !== "Blocked")
        .filter((s) => !isToday || dayOrderKey(s.startTime, dayStartMins) >= nowOrder)
        .sort((a, b) => dayOrderKey(a.startTime, dayStartMins) - dayOrderKey(b.startTime, dayStartMins));
      nextBookedStart = upcoming[0]?.startTime ?? null;
    }

    return resolvedSlots
      .map((s) => {
        if (isToday && s.status === "Available" && dayOrderKey(s.endTime, dayStartMins) <= nowOrder) {
          return { ...s, status: "Empty" as SlotStatus };
        }
        return s;
      })
      .filter((s) => {
        if (s.status === "Empty") return false;

        const hour = Number(s.startTime.split(":")[0]);
        if (!hourMatchesTimeOfDay(hour, filters.timeOfDay)) return false;

        if (filters.status === "Available" && s.status !== "Available") return false;
        if (filters.status === "Confirmed" && !(s.status === "Booked" || s.status === "Offline Booked")) return false;
        if (filters.status === "Pending" && !(s.status === "Part Paid" || s.status === "On Hold")) return false;
        if (filters.status === "Blocked" && s.status !== "Blocked") return false;

        if (filters.source === "Walk-in" && s.status !== "Offline Booked") return false;
        if (filters.source === "Online" && s.status !== "Booked") return false;

        if (filters.sport && filters.sport !== "All") {
          if (s.sport && s.sport.trim().toLowerCase() !== filters.sport.trim().toLowerCase()) return false;
        }

        if (filters.quick === "Empty Slots" && s.status !== "Available") return false;
        if (filters.quick === "Next Booking" && s.startTime !== nextBookedStart) return false;

      return true;
    });
  }, [resolvedSlots, filters, isToday, nowOrder, dayStartMins]);

  /* ── Header-derived data ── */
  const weekDates = useMemo(
    () => Array.from({ length: 365 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - 3 + i); // 3 days in past + 362 days in future
      return d;
    }),
    []
  );

  /** Slots taken by any kind of booking — drives the "x/y Slots Booked" ring. */
  const bookedSlotCount = useMemo(
    () => resolvedSlots.filter((s) => ["Booked", "Offline Booked", "Part Paid", "On Hold"].includes(s.status)).length,
    [resolvedSlots]
  );

  /** Next upcoming booking on the selected day (from now, when the day is today). */
  const nextBooking = useMemo(() => {
    return resolvedSlots
      .filter((s) => s.status !== "Available" && s.status !== "Blocked")
      .filter((s) => !isToday || dayOrderKey(s.startTime, dayStartMins) >= nowOrder)
      .sort((a, b) => dayOrderKey(a.startTime, dayStartMins) - dayOrderKey(b.startTime, dayStartMins))[0];
  }, [resolvedSlots, isToday, nowOrder, dayStartMins]);

  /**
   * How far off the next booking is, measured from the current clock —
   * e.g. "in 45 min", "in 2 hr 10 min", or "now" while it's running.
   */
  const nextBookingIn = useMemo(() => {
    if (!nextBooking) return undefined;
    if (!isToday) return undefined;
    const start = dayOrderKey(nextBooking.startTime, dayStartMins);
    const diff = start - nowOrder;
    if (diff <= 0) return start + slotDurMins(nextBooking.startTime, nextBooking.endTime) > nowOrder ? "now" : undefined;
    if (diff < 60) return `in ${diff} min`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m === 0 ? `in ${h} hr` : `in ${h} hr ${m} min`;
  }, [nextBooking, isToday, nowOrder, dayStartMins]);

  /** Open when the current time falls inside the day's configured slot window. */
  const isOpenNow = useMemo(() => {
    if (!isToday || resolvedSlots.length === 0) return false;
    const open = Math.min(...resolvedSlots.map((s) => dayOrderKey(s.startTime, dayStartMins)));
    const close = Math.max(
      ...resolvedSlots.map((s) => dayOrderKey(s.startTime, dayStartMins) + slotDurMins(s.startTime, s.endTime))
    );
    return nowOrder >= open && nowOrder < close;
  }, [resolvedSlots, isToday, nowOrder, dayStartMins]);

  /** Keep the visible week strip in sync when the date jumps (e.g. quick filters). */
  function jumpToDate(iso: string) {
    setSelectedDate(iso);
    const d = new Date(iso + "T00:00:00");
    const inStrip = weekDates.some((w) => toIsoDate(w) === iso);
    if (!inStrip) setWeekStart(d);
  }

  /* ── Grouped list (for "See Booking" panel) ── */
  const groupedSlots = useMemo(() => {
    if (!groupedFilter) return [];
    if (groupedFilter === "Booked") {
      return resolvedSlots.filter(s => s.status === "Booked" || s.status === "Offline Booked");
    }
    return resolvedSlots.filter(s => s.status === groupedFilter);
  }, [resolvedSlots, groupedFilter]);

  /* ── Multi-slot selection ── */
  /** The picked available slots for this date, ordered open→close. */
  const selectedSlots = useMemo(
    () =>
      resolvedSlots
        .filter((s) => s.status === "Available" && selectedKeys.includes(s.startTime))
        .sort((a, b) => dayOrderKey(a.startTime, dayStartMins) - dayOrderKey(b.startTime, dayStartMins)),
    [resolvedSlots, selectedKeys, dayStartMins]
  );
  const selectionTotal = useMemo(() => selectedSlots.reduce((sum, s) => sum + s.price, 0), [selectedSlots]);
  /** Club-together only makes sense for back-to-back slots (each end == next start). */
  const selectionContiguous = useMemo(() => {
    for (let i = 0; i < selectedSlots.length - 1; i++) {
      if (selectedSlots[i].endTime !== selectedSlots[i + 1].startTime) return false;
    }
    return true;
  }, [selectedSlots]);

  function toggleSelectSlot(slot: { startTime: string }) {
    setSelectedKeys((prev) =>
      prev.includes(slot.startTime) ? prev.filter((k) => k !== slot.startTime) : [...prev, slot.startTime]
    );
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelectedKeys([]);
    setApplyClubDaily(false);
  }

  /** Merge selected consecutive slots into a single Available Club Slot in the listing configuration! */
  async function startClubBooking() {
    if (selectedSlots.length === 0 || !selectedTurf) {
      alert("Please select at least 1 slot to club together.");
      return;
    }
    if (selectedSlots.some((s) => s.status !== "Available")) {
      alert("Selected slots must be available to club together.");
      return;
    }
    if (!selectionContiguous) {
      alert("Please select consecutive slots to club together.");
      return;
    }

    setClubbing(true);
    try {
      const first = selectedSlots[0];
      const last = selectedSlots[selectedSlots.length - 1];
      const totalDur = t24m(last.endTime) - t24m(first.startTime);
      const clubId = "club_" + Math.random().toString(36).substring(2, 9);
      const clubbedKeys = new Set(selectedSlots.map((s) => s.startTime));

      const clubSlot = {
        startTime: first.startTime,
        endTime: last.endTime,
        label: first.label,
        price: selectionTotal,
        isClubSlot: true,
        clubId,
        slotIds: selectedSlots.map((s) => `${s.startTime}-${s.endTime}`),
        durationMinutes: totalDur,
      };

      const mergeInto = (list?: typeof selectedTurf.slotsList) =>
        [...(list || []).filter((s) => !clubbedKeys.has(s.startTime)), clubSlot].sort(
          (a, b) => dayOrderKey(a.startTime, dayStartMins) - dayOrderKey(b.startTime, dayStartMins)
        );

      if (applyClubDaily) {
        const newSlotsList = mergeInto(selectedTurf.slotsList);
        const overrides = (selectedTurf.dateOverrides || []).map((o) =>
          !o.isHoliday ? { ...o, slots: mergeInto(o.slots) } : o
        );
        const updated = { ...selectedTurf, slotsList: newSlotsList, dateOverrides: overrides };
        const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
        setListings((l) => l.map((x) => (x.id === selectedTurf.id ? apiListingToMock(saved) : x)));
      } else {
        const overrides = [...(selectedTurf.dateOverrides || [])];
        const idx = overrides.findIndex((o) => o.date === selectedDate);
        const currentSlots = idx > -1 ? (overrides[idx].slots || []) : (selectedTurf.slotsList || []);
        const next = mergeInto(currentSlots);
        const newOverride = { date: selectedDate, isHoliday: false, holidayName: "", slots: next };
        if (idx > -1) overrides[idx] = newOverride;
        else overrides.push(newOverride);
        const updated = { ...selectedTurf, dateOverrides: overrides };
        const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
        setListings((l) => l.map((x) => (x.id === selectedTurf.id ? apiListingToMock(saved) : x)));
      }

      exitSelectMode();
      alert(`⭐ Club Slot (${to12h(first.startTime)} – ${to12h(last.endTime)}) created successfully as an Available merged slot.`);
    } catch (err) {
      alert(err instanceof ApiError ? err.describe() : "Failed to create club slot");
    } finally {
      setClubbing(false);
    }
  }

  /** Book each selected slot as its own booking, sharing one customer's details. */
  function startMultipleBooking() {
    if (selectedSlots.length === 0 || !selectedTurf) {
      alert("Please select at least 1 slot.");
      return;
    }
    if (selectedSlots.some((s) => s.status !== "Available")) {
      alert("Selected slots must be available.");
      return;
    }
    if (!selectedTurf.categories || selectedTurf.categories.length === 0) {
      setSetupSportsSelected([]);
      setSetupSportsOpen(true);
      return;
    }
    const first = selectedSlots[0];
    const last = selectedSlots[selectedSlots.length - 1];
    const display: AgendaSlot = {
      startTime: first.startTime,
      endTime: last.endTime,
      price: selectionTotal,
      status: "Available",
      label: `${selectedSlots.length} Bookings`,
    };
    setOfflineMode("multiple");
    setMultiSlots(selectedSlots);
    setOfflineSport(selectedTurf.categories[0] || "");
    setOfflineAmount("");
    setActiveSlot(display);
    setOfflineModal(true);
  }

  /* ── Actions on available slot ── */
  async function setSlotBlocked(slot: AgendaSlot, blocked: boolean, reason?: string) {
    if (!selectedTurf) return;
    try {
      const overrides = [...(selectedTurf.dateOverrides || [])];
      const idx = overrides.findIndex(o => o.date === selectedDate);
      const currentSlots = idx > -1
        ? [...(overrides[idx].slots || [])]
        : [...(selectedTurf.slotsList || [])];
      const next = currentSlots.map(s => s.startTime === slot.startTime
        ? { ...s, blocked, blockedReason: blocked ? reason : undefined }
        : s);
      const newOverride = { date: selectedDate, isHoliday: false, holidayName: "", slots: next };
      if (idx > -1) overrides[idx] = newOverride; else overrides.push(newOverride);
      const updated = { ...selectedTurf, dateOverrides: overrides };
      const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setListings(l => l.map(x => x.id === selectedTurf.id ? apiListingToMock(saved) : x));
      setActiveSlot(null);
    } catch { alert(`Failed to ${blocked ? "block" : "unblock"} slot`); }
  }

  /** Append a custom slot (e.g. late-night 1–2 AM) to the selected date's slot list. */
  async function addCustomSlot(start: string, end: string, price: number) {
    if (!selectedTurf) return;
    try {
      const overrides = [...(selectedTurf.dateOverrides || [])];
      const idx = overrides.findIndex((o) => o.date === selectedDate);
      const currentSlots = idx > -1 ? [...(overrides[idx].slots || [])] : [...(selectedTurf.slotsList || [])];
      if (currentSlots.some((s) => s.startTime === start)) {
        alert("A slot already starts at that time.");
        return;
      }
      const next = [...currentSlots, { startTime: start, endTime: end, label: slotLabel(start), price }].sort(
        (a, b) => dayOrderKey(a.startTime, dayStartMins) - dayOrderKey(b.startTime, dayStartMins)
      );
      const newOverride = { date: selectedDate, isHoliday: false, holidayName: "", slots: next };
      if (idx > -1) overrides[idx] = newOverride;
      else overrides.push(newOverride);
      const updated = { ...selectedTurf, dateOverrides: overrides };
      const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setListings((l) => l.map((x) => (x.id === selectedTurf.id ? apiListingToMock(saved) : x)));
      setAddSlotOpen(false);
    } catch {
      alert("Failed to add the slot");
    }
  }

  /** Every slot, starting at the one the offline modal was opened for, that's still
   * contiguous and Available — the ceiling for how far the duration stepper can
   * extend. Recomputed from `resolvedSlots`, not the (possibly already-merged)
   * `activeSlot`, so it always reflects real remaining availability. */
  const offlineExtendableSlots = useMemo(() => {
    if (!activeSlot || offlineMode === "multiple") return activeSlot ? [activeSlot] : [];
    const ordered = [...resolvedSlots].sort(
      (a, b) => dayOrderKey(a.startTime, dayStartMins) - dayOrderKey(b.startTime, dayStartMins)
    );
    const startIdx = ordered.findIndex((s) => s.startTime === activeSlot.startTime);
    if (startIdx === -1) return [activeSlot];
    const chain: AgendaSlot[] = [ordered[startIdx]];
    for (let i = startIdx + 1; i < ordered.length; i++) {
      const s = ordered[i];
      const prevEnd = chain[chain.length - 1].endTime;
      if (s.startTime !== prevEnd || s.status !== "Available") break;
      chain.push(s);
    }
    return chain;
  }, [activeSlot, offlineMode, resolvedSlots, dayStartMins]);

  const offlineSpanSlots = offlineExtendableSlots.slice(0, offlineSpanCount);
  const offlineEffectiveEnd = offlineSpanSlots[offlineSpanSlots.length - 1]?.endTime ?? activeSlot?.endTime ?? "";
  const offlineEffectiveTotal = offlineSpanSlots.reduce((sum, s) => sum + s.price, 0);

  async function startOfflineBooking(slot: AgendaSlot) {
    if (!selectedTurf) return;
    const sports = selectedTurf.categories || [];
    const activeCourts = (selectedTurf.courts || []).filter((c) => c.active);

    // If venue has 1 or 0 sports AND 1 or 0 courts, skip sport & court selection modal:
    if (sports.length <= 1 && activeCourts.length <= 1) {
      setAddBookingInitial({
        courtId: selectedTurf.id,
        price: String(slot.price),
        startTime: slot.startTime,
        endTime: slot.endTime,
        sport: sports[0] || "",
        venueCourtId: activeCourts[0]?.id || "",
      });
      setAddBookingOpen(true);
    } else {
      setSportCourtModalSlot(slot);
      setSportCourtModalOpen(true);
    }
  }

  function handleSportCourtConfirm(selectedSport: string, selectedCourtId: string) {
    setSportCourtModalOpen(false);
    if (!sportCourtModalSlot || !selectedTurf) return;
    setAddBookingInitial({
      courtId: selectedTurf.id,
      price: String(sportCourtModalSlot.price),
      startTime: sportCourtModalSlot.startTime,
      endTime: sportCourtModalSlot.endTime,
      sport: selectedSport,
      venueCourtId: selectedCourtId,
    });
    setAddBookingOpen(true);
  }

  async function startOfflineBookingTwoSlots(slot1: AgendaSlot, slot2: AgendaSlot) {
    if (!selectedTurf) return;
    const combinedSlot: AgendaSlot = {
      startTime: slot1.startTime,
      endTime: slot2.endTime,
      price: slot1.price + slot2.price,
      status: "Available",
      label: `${slot1.label} (2 Slots)`,
    };
    if (!selectedTurf.categories || selectedTurf.categories.length === 0) {
      setSetupSportsSelected([]);
      setSetupSportsOpen(true);
      return;
    }
    setOfflineMode("single");
    setMultiSlots([]);
    setOfflineSport(selectedTurf.categories[0] || "");
    setOfflineAmount("");
    setOfflineSpanCount(2);
    setActiveSlot(combinedSlot);
    setOfflineModal(true);
  }

  async function saveSetupSports() {
    if (!selectedTurf || setupSportsSelected.length === 0) return;
    setSetupSportsSaving(true);
    try {
      const updated = { ...selectedTurf, categories: setupSportsSelected };
      const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setListings(l => l.map(x => x.id === selectedTurf.id ? apiListingToMock(saved) : x));
      setSetupSportsOpen(false);
      // Wait for React to apply state if we wanted to auto-open offline modal, 
      // but easier to just let user click again or open it directly:
      alert("Sports saved! You can now create the offline booking.");
    } catch {
      alert("Failed to save sports");
    } finally {
      setSetupSportsSaving(false);
    }
  }

  /** Cancelling the offline-booking modal closes the whole slot-action stack —
   * it must never fall back to the "Available Segment" sheet underneath. Reopening
   * it is only ever a fresh, explicit tap on the slot. */
  function closeOfflineModal() {
    setOfflineModal(false);
    setOfflineMode("single");
    setMultiSlots([]);
    setOfflineSpanCount(1);
    setActiveSlot(null);
  }

  /** Validates the offline-booking form, then hands off to the confirm-with-undo step. */
  function confirmOfflineBooking() {
    if (!offlineName || !offlinePhone) { alert("Please fill name and phone"); return; }
    setOfflineModal(false);
    const title =
      offlineMode === "multiple" && multiSlots.length > 0
        ? `Create ${multiSlots.length} bookings`
        : "Mark as Booked";
    setPendingConfirm({ title, seconds: 6, run: submitOfflineBooking });
  }

  async function submitOfflineBooking() {
    if (!activeSlot || !selectedTurf) return;
    setOfflineSubmitting(true);
    try {
      if (offlineMode === "multiple" && multiSlots.length > 0) {
        // One separate booking per selected slot, all sharing the same customer.
        // Each slot is recorded at its own price as a fully-paid confirmed booking.
        for (const slot of multiSlots) {
          const dt = new Date(`${selectedDate}T${slot.startTime}:00`);
          await createVendorBooking({
            listingId: selectedTurf.id,
            customerName: offlineName,
            phone: offlinePhone,
            sport: offlineSport || undefined,
            courtId: offlineCourtId || undefined,
            dateTime: dt.toISOString(),
            endTime: slot.endTime || undefined,
            totalAmount: slot.price,
            paidAmount: slot.price,
            payment: "Cash (Offline)",
            status: "Confirmed",
          });
        }
      } else {
        const dt = new Date(`${selectedDate}T${activeSlot.startTime}:00`);
        // The duration stepper can extend this booking past the single slot the
        // vendor tapped, so bill and end it by the real span, not just that slot.
        const spanEnd = offlineEffectiveEnd || activeSlot.endTime;
        const spanTotal = offlineEffectiveTotal || activeSlot.price;
        const parsedAmount = offlineAmount ? Number(offlineAmount) : spanTotal;
        const statusText = parsedAmount > 0 && parsedAmount < spanTotal ? "Part Paid" : "Confirmed";

        await createVendorBooking({
          listingId: selectedTurf.id,
          customerName: offlineName,
          phone: offlinePhone,
          sport: offlineSport || undefined,
          courtId: offlineCourtId || undefined,
          dateTime: dt.toISOString(),
          endTime: spanEnd || undefined,
          totalAmount: spanTotal, // API requirement
          paidAmount: parsedAmount,
          payment: "Cash (Offline)",
          status: statusText as BookingStatus,
        });
      }
      // Refresh bookings
      const fresh = await getVendorBookings({ limit: 500 });
      setBookings(fresh.items as unknown as ApiBooking[]);
      setActiveSlot(null);
      setOfflineName("");
      setOfflinePhone("");
      setOfflineMode("single");
      setMultiSlots([]);
      exitSelectMode();
    } catch (e) {
      alert(e instanceof ApiError ? e.describe() : "Failed to create offline booking");
    }
    setOfflineSubmitting(false);
  }

  async function holdSlot(slot: AgendaSlot) {
    if (!selectedTurf) return;
    try {
      // Create a pending booking (no customer info yet — vendor can fill later)
      const dt = new Date(`${selectedDate}T${slot.startTime}:00`);
      await createVendorBooking({
        listingId: selectedTurf.id,
        customerName: "Hold",
        phone: "9000000000", // placeholder — must match backend's Indian mobile format (^[6-9]\d{9}$)
        dateTime: dt.toISOString(),
        totalAmount: slot.price,
        payment: "Cash (Offline)",
        status: "Pending",
      });
      const fresh = await getVendorBookings({ limit: 500 });
      setBookings(fresh.items as unknown as ApiBooking[]);
      setActiveSlot(null);
    } catch { alert("Failed to hold slot"); }
  }

  /* ── Actions on an already-booked slot ── */
  async function clearBookedSlot(slot: AgendaSlot) {
    try {
      if (slot.bookingId) {
        await updateVendorBookingStatus(slot.bookingId, "Cancelled");
        const fresh = await getVendorBookings({ limit: 500 });
        setBookings(fresh.items as unknown as ApiBooking[]);
      }
    } catch { alert("Failed to clear slot"); }
    setActiveSlot(null);
  }

  async function markSlotPaidConfirmed(slot: AgendaSlot) {
    try {
      if (slot.bookingId) {
        await updateVendorBookingStatus(slot.bookingId, "Confirmed");
        const fresh = await getVendorBookings({ limit: 500 });
        setBookings(fresh.items as unknown as ApiBooking[]);
      }
    } catch { alert("Failed to update booking"); }
    setActiveSlot(null);
  }

  async function blockSlotForMaintenance(slot: AgendaSlot) {
    try {
      if (slot.bookingId) {
        await updateVendorBookingStatus(slot.bookingId, "Cancelled");
        const fresh = await getVendorBookings({ limit: 500 });
        setBookings(fresh.items as unknown as ApiBooking[]);
      }
    } catch { alert("Failed to clear existing booking"); return; }
    await setSlotBlocked(slot, true, "Maintenance");
  }

  function handleConfirmPending() {
    if (!pendingConfirm) return;
    const { run } = pendingConfirm;
    setPendingConfirm(null);
    void run();
  }

  function handleUndoPending() {
    setPendingConfirm(null);
  }

  /* ── Add Booking ── */
  function openAddBooking(slot?: AgendaSlot) {
    setAddBookingInitial({
      courtId: selectedTurfId,
      price: slot ? String(slot.price) : "",
      startTime: slot?.startTime ?? "",
      endTime: slot?.endTime ?? "",
      sport: selectedTurf?.categories?.[0] ?? "",
    });
    setAddBookingOpen(true);
  }

  async function submitAddBooking(v: AddBookingValues) {
    setAddBookingSaving(true);
    try {
      const dt = new Date(`${selectedDate}T${v.startTime}:00`);
      await createVendorBooking({
        listingId: v.courtId,
        customerName: v.customerName.trim(),
        phone: v.phone,
        sport: v.sport || undefined,
        courtId: v.venueCourtId || undefined,
        numberOfPlayers: v.numberOfPlayers ? Number(v.numberOfPlayers) : undefined,
        foodIncluded: v.foodIncluded,
        dateTime: dt.toISOString(),
        endTime: v.endTime || undefined,
        totalAmount: Number(v.price) || 0,
        payment: v.payment,
        status: "Confirmed",
      });
      const fresh = await getVendorBookings({ limit: 500 });
      setBookings(fresh.items as unknown as ApiBooking[]);
      setAddBookingOpen(false);
      setActiveSlot(null);
      setSportCourtModalOpen(false);
      setSportCourtModalSlot(null);
    } catch (e) {
      alert(e instanceof ApiError ? e.describe() : "Failed to create booking");
    }
    setAddBookingSaving(false);
  }

  /* ── QR check-in: scan ticket → mark the booking arrived ── */
  async function handleQrCheckIn(orderId: string): Promise<string> {
    const booking = await checkInVendorBooking(orderId).catch((e) => {
      throw new Error(e instanceof ApiError ? e.describe() : "Check-in failed. Please try again.");
    });
    // Refresh so the slot immediately shows the "Arrived" badge.
    const fresh = await getVendorBookings({ limit: 500 });
    setBookings(fresh.items as unknown as ApiBooking[]);
    const name = (booking as unknown as { customerName?: string })?.customerName;
    return name ? `${name} · ${orderId}` : orderId;
  }

  /* ── QR check-in: scan a Challenge poster → mark it arrived at this venue ── */
  async function handleChallengeCheckIn(code: string): Promise<string> {
    const challenge = await checkInVendorChallenge(code).catch((e) => {
      throw new Error(e instanceof ApiError ? e.describe() : "Check-in failed. Please try again.");
    });
    const names = [challenge.challenger?.name, challenge.opponent?.name].filter(Boolean).join(" vs ");
    return names ? `${names} · ${code}` : code;
  }

  /* ── Timeline row ⋮ menu ── */
  function handleSlotAction(slot: AgendaSlot, action: SlotAction) {
    switch (action) {
      case "create-booking":
        startOfflineBooking(slot);
        return;
      case "block-slot":
        setActiveSlot(slot);
        setBlockReasonOpen(true);
        return;
      case "make-available":
        setPendingConfirm({
          title: "Make slot available",
          seconds: 6,
          run: () => (slot.status === "Blocked" ? setSlotBlocked(slot, false) : clearBookedSlot(slot)),
        });
        return;
      case "cancel-booking":
        setPendingConfirm({
          title: "Cancel this booking",
          seconds: 6,
          run: () => clearBookedSlot(slot),
        });
        return;
      case "mark-pending":
        setPendingConfirm({
          title: "Mark as pending",
          seconds: 6,
          run: () => setBookingStatus(slot, "Pending"),
        });
        return;
      case "mark-paid":
        setPendingConfirm({
          title: "Mark as paid & confirmed",
          seconds: 6,
          run: () => markSlotPaidConfirmed(slot),
        });
        return;
    }
  }

  /** Move a booking between Confirmed / Pending from the timeline. */
  async function setBookingStatus(slot: AgendaSlot, status: BookingStatus) {
    try {
      if (!slot.bookingId) return;
      await updateVendorBookingStatus(slot.bookingId, status);
      const fresh = await getVendorBookings({ limit: 500 });
      setBookings(fresh.items as unknown as ApiBooking[]);
    } catch (e) {
      alert(e instanceof ApiError ? e.describe() : "Failed to update booking");
    }
    setActiveSlot(null);
  }

  /* ── Clock select ── */
  /** Leaving the fullscreen dial drops back to the timeline, never to a cropped inline clock. */
  const leaveClockView = useCallback(() => setViewMode("timeline"), []);

  const handleClockHour = async (hour: number) => {
    if (!selectedTurf) return;
    const startStr = `${String(hour).padStart(2, "0")}:00`;
    const slot = resolvedSlots.find(s => s.startTime === startStr);
    if (slot) setActiveSlot(slot);
  };

  /** Press & hold on the clock / timeline → fast "book offline or block" sheet for
   * an empty slot; a held booking/blocked slot just opens its normal manage view. */
  const handleSlotLongPress = (slot: { startTime: string }) => {
    const real = resolvedSlots.find((s) => s.startTime === slot.startTime);
    if (!real) return;
    setActiveSlot(real);
    if (real.status === "Available") setQuickActionsOpen(true);
  };

  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  /** e.g. "Fri, 17 July" — the label beside "TODAY" in the header. */
  const headerDateLabel = selectedDateObj.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "long",
  });

  const isBookedSlot = activeSlot
    ? (["Booked", "Offline Booked", "Part Paid", "On Hold"] as SlotStatus[]).includes(activeSlot.status)
    : false;

  function handleTimelineSlotClick(slot: AgendaSlot) {
    setActiveSlot(slot);
  }

  async function handleBlockClubSlot(slot: AgendaSlot) {
    if (!selectedTurf) return;
    try {
      const overrides = [...(selectedTurf.dateOverrides || [])];
      const idx = overrides.findIndex((o) => o.date === selectedDate);
      const currentSlots = idx > -1 ? [...(overrides[idx].slots || [])] : [...(selectedTurf.slotsList || [])];
      const next = currentSlots.map((s) =>
        s.startTime === slot.startTime ? { ...s, blocked: !s.blocked } : s
      );
      const newOverride = { date: selectedDate, isHoliday: false, holidayName: "", slots: next };
      if (idx > -1) overrides[idx] = newOverride; else overrides.push(newOverride);
      const updated = { ...selectedTurf, dateOverrides: overrides };
      const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setListings((l) => l.map((x) => (x.id === selectedTurf.id ? apiListingToMock(saved) : x)));
      setActiveClubSlot(null);
    } catch {
      alert("Failed to update club slot block status");
    }
  }

  async function handleEditClubPrice(slot: AgendaSlot) {
    if (!selectedTurf) return;
    const input = prompt("Enter new price (₹) for this Club Slot:", String(slot.price));
    if (!input) return;
    const newPrice = Number(input.replace(/\D/g, "")) || slot.price;

    try {
      const overrides = [...(selectedTurf.dateOverrides || [])];
      const idx = overrides.findIndex((o) => o.date === selectedDate);
      const currentSlots = idx > -1 ? [...(overrides[idx].slots || [])] : [...(selectedTurf.slotsList || [])];
      const next = currentSlots.map((s) =>
        s.startTime === slot.startTime ? { ...s, price: newPrice } : s
      );
      const newOverride = { date: selectedDate, isHoliday: false, holidayName: "", slots: next };
      if (idx > -1) overrides[idx] = newOverride; else overrides.push(newOverride);
      const updated = { ...selectedTurf, dateOverrides: overrides };
      const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setListings((l) => l.map((x) => (x.id === selectedTurf.id ? apiListingToMock(saved) : x)));
      setActiveClubSlot(null);
    } catch {
      alert("Failed to update price");
    }
  }

  async function handleSplitClubSlot(slot: AgendaSlot) {
    if (!selectedTurf) return;
    try {
      const startMins = t24m(slot.startTime);
      const endMins = t24m(slot.endTime);
      const totalHours = Math.max(1, (endMins - startMins) / 60);
      const hourlyRate = Math.round(slot.price / totalHours);
      const splitSlots: any[] = [];

      let curr = startMins;
      while (curr + 60 <= endMins) {
        const sH = Math.floor(curr / 60) % 24;
        const sM = curr % 60;
        const eH = Math.floor((curr + 60) / 60) % 24;
        const eM = (curr + 60) % 60;
        const sStr = `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`;
        const eStr = `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;

        splitSlots.push({
          startTime: sStr,
          endTime: eStr,
          label: slotLabel(sStr),
          price: hourlyRate,
        });
        curr += 60;
      }

      const overrides = [...(selectedTurf.dateOverrides || [])];
      const idx = overrides.findIndex((o) => o.date === selectedDate);
      const currentSlots = idx > -1 ? [...(overrides[idx].slots || [])] : [...(selectedTurf.slotsList || [])];
      const filtered = currentSlots.filter((s) => s.startTime !== slot.startTime);
      const next = [...filtered, ...splitSlots].sort(
        (a, b) => dayOrderKey(a.startTime, dayStartMins) - dayOrderKey(b.startTime, dayStartMins)
      );

      const newOverride = { date: selectedDate, isHoliday: false, holidayName: "", slots: next };
      if (idx > -1) overrides[idx] = newOverride; else overrides.push(newOverride);
      const updated = { ...selectedTurf, dateOverrides: overrides };
      const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setListings((l) => l.map((x) => (x.id === selectedTurf.id ? apiListingToMock(saved) : x)));
      setActiveClubSlot(null);
      alert("Club slot split into individual 1-hour slots.");
    } catch {
      alert("Failed to split club slot");
    }
  }

  async function handleDeleteClubSlot(slot: AgendaSlot) {
    if (!selectedTurf) return;
    if (!confirm("Are you sure you want to delete this Club Slot?")) return;
    try {
      const overrides = [...(selectedTurf.dateOverrides || [])];
      const idx = overrides.findIndex((o) => o.date === selectedDate);
      const currentSlots = idx > -1 ? [...(overrides[idx].slots || [])] : [...(selectedTurf.slotsList || [])];
      const next = currentSlots.filter((s) => s.startTime !== slot.startTime);
      const newOverride = { date: selectedDate, isHoliday: false, holidayName: "", slots: next };
      if (idx > -1) overrides[idx] = newOverride; else overrides.push(newOverride);
      const updated = { ...selectedTurf, dateOverrides: overrides };
      const saved = await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setListings((l) => l.map((x) => (x.id === selectedTurf.id ? apiListingToMock(saved) : x)));
      setActiveClubSlot(null);
      alert("Club slot deleted.");
    } catch {
      alert("Failed to delete club slot");
    }
  }

  if (error) return <div className="p-10 text-center text-vibe-coral text-sm">{error}</div>;
  if (loading) {
    return <div className="p-10 text-center text-ink-faint text-sm">Loading dashboard…</div>;
  }

  if (pageTab === "academy") {
    return <AcademyBookingsPanel onSwitchToTurf={() => setPageTab("turf")} />;
  }

  return (
    /* The agenda scrolls with the page. It used to live inside a `100dvh - 64px` shell
       with its own overflow, but that height never matched the real viewport once the
       mobile browser chrome and the fixed bottom nav were in play, so the slot list got
       clipped part-way down the screen. */
    <div className="relative flex min-h-[60vh] flex-col overflow-x-hidden bg-[#f5f5f5] -mx-4 -mt-6 -mb-24 sm:-mx-6 lg:-mb-6">
      {/* ── HEADER: venue, today card, date strip ── */}
      <div className="z-20 bg-[#f5f7fa] px-4 pt-3 pb-2 md:px-6">
        <div className="mb-3 flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button className="flex-1 bg-vibe-navy px-3 py-2.5 text-center text-[11px] font-bold text-white">
            Turf Bookings
          </button>
          <button
            onClick={() => setPageTab("academy")}
            className="flex-1 px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 transition hover:bg-slate-50"
          >
            Academy Bookings
          </button>
        </div>

        <BookingsHeader
          turfs={turfListings.map((t) => ({ id: t.id, title: t.title }))}
          selectedTurfId={selectedTurfId}
          onSelectTurf={setSelectedTurfId}
          city={selectedTurf?.city}
          dateLabel={headerDateLabel}
          isOpenNow={isOpenNow}
          bookedSlots={bookedSlotCount}
          totalSlots={resolvedSlots.length}
          nextBookingTime={nextBooking ? to12h(nextBooking.startTime) : undefined}
          nextBookingIn={nextBookingIn}
          nextBookingName={nextBooking?.customerName}
          onOpenQrScanner={() => setQrScannerOpen(true)}
          onAddBooking={() => openAddBooking()}
          dates={weekDates}
          selectedDate={selectedDate}
          todayIso={todayIso}
          onSelectDate={setSelectedDate}
          onPrevWeek={() => setWeekStart((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })}
          onNextWeek={() => setWeekStart((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}
        />

        {/* Game Filters */}
        {selectedTurf && selectedTurf.categories && selectedTurf.categories.length > 0 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedGameFilter("All")}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold transition ${selectedGameFilter === "All" ? "bg-vibe-navy text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
            >
              All Games
            </button>
            {selectedTurf.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedGameFilter(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold transition flex items-center gap-1.5 ${selectedGameFilter === cat ? "bg-vibe-navy text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
              >
                <span>{getVendorSportEmoji(cat)}</span> {cat}
              </button>
            ))}
          </div>
        )}

        {/* View toggle + "All Slots" filter */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition ${viewMode === "timeline" ? "bg-vibe-navy text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <ListIcon size={12} /> Timeline
            </button>
            <button
              onClick={() => { exitSelectMode(); setViewMode("clock"); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition ${viewMode === "clock" ? "bg-vibe-navy text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <ClockIcon size={12} /> Clock
            </button>
          </div>

          {/* Multi-select toggle — pick several free slots, then club or book separately. */}
          {viewMode === "timeline" && (
            <button
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
                selectMode
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CheckSquare size={12} /> {selectMode ? "Cancel" : "Select"}
            </button>
          )}

          <button
            onClick={() => setFilterOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <SlidersHorizontal size={12} /> {filterSummary(filters)}
            {activeFilterCount(filters) > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vibe-violet px-1 text-[8px] font-black text-white">
                {activeFilterCount(filters)}
              </span>
            )}
            <ChevronDown size={11} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Bottom padding clears the fixed bottom nav (~64px) and the floating
          "See Booking" pill that sits above it. */}
      <div className="flex-1 px-4 pt-4 pb-36 md:px-6 lg:pb-32">
        {!selectedTurf && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white">
            <CalendarDays size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-500">No Turf listings found. Add a Turf listing to use the Agenda.</p>
          </div>
        )}

        {selectedTurf && groupedFilter && (
          <GroupedSlotsList
            slots={groupedSlots}
            filter={groupedFilter}
            onClose={() => setGroupedFilter(null)}
          />
        )}

        {selectedTurf && !groupedFilter && (
          <>
            {viewMode === "timeline" && (
              <>
                <BookingsTimeline
                  slots={visibleSlots}
                  onSlotClick={handleTimelineSlotClick}
                  onAction={handleSlotAction}
                  onLongPress={handleSlotLongPress}
                  scrollToNow={isToday}
                  selectMode={selectMode}
                  selectedKeys={selectedKeys}
                  onToggleSelect={toggleSelectSlot}
                />
                <button
                  onClick={() => setAddSlotOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-vibe-navy/30 bg-white py-3 text-[11px] font-black text-vibe-navy transition hover:bg-slate-50 active:scale-[0.99]"
                >
                  <CalendarDays size={13} /> Add a time slot (e.g. late night 1–2 AM)
                </button>
                <TimelineLegend />
              </>
            )}
            {viewMode === "clock" && (
              <div className="flex justify-center py-4">
                <ClockSlotsWidget
                  slots={visibleSlots}
                  onSelectSlot={handleTimelineSlotClick}
                  onSelectHour={handleClockHour}
                  onLongPressSlot={handleSlotLongPress}
                  // Picking "Clock" opens the dial fullscreen; closing it returns to the
                  // timeline rather than leaving a half-cropped dial in the page.
                  autoFullscreen
                  onExitFullscreen={leaveClockView}
                  renderSeeBooking={(closeFullscreen) => (
                    <SeeBookingButton
                      resolvedSlots={resolvedSlots}
                      onPick={(f) => {
                        // The grouped list renders in the page body, so leave fullscreen first.
                        closeFullscreen();
                        setGroupedFilter(f);
                      }}
                    />
                  )}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── BOTTOM "SEE BOOKING" BUTTON (grid mode only — clock mode has its own inline button) ── */}
      {selectedTurf && !groupedFilter && viewMode !== "clock" && !selectMode && (
        <div className="fixed bottom-16 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <SeeBookingButton resolvedSlots={resolvedSlots} onPick={setGroupedFilter} />
          </div>
        </div>
      )}

      {/* ── SELECTION ACTION BAR (multi-select mode) ── */}
      {selectedTurf && selectMode && viewMode === "timeline" && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4 lg:bottom-4">
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
            {selectedSlots.length === 0 ? (
              <p className="py-1.5 text-center text-[11px] font-bold text-slate-400">
                Tap the available slots you want to book together
              </p>
            ) : (
              <>
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-slate-800">
                    {selectedSlots.length} slot{selectedSlots.length > 1 ? "s" : ""} ·{" "}
                    {to12h(selectedSlots[0].startTime)} – {to12h(selectedSlots[selectedSlots.length - 1].endTime)}
                  </span>
                  <span className="text-[12px] font-black text-emerald-600">₹{selectionTotal}</span>
                </div>
                {selectionContiguous && selectedSlots.length > 1 && (
                  <label className="mb-2.5 flex cursor-pointer items-start gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                    <input
                      type="checkbox"
                      checked={applyClubDaily}
                      onChange={(e) => setApplyClubDaily(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-600"
                    />
                    <span>
                      <span className="block text-[10.5px] font-black text-slate-800">Apply this every day</span>
                      <span className="block text-[9px] font-semibold text-slate-400">
                        Makes {to12h(selectedSlots[0].startTime)}–{to12h(selectedSlots[selectedSlots.length - 1].endTime)} one standing slot on every future date, not just today.
                      </span>
                    </span>
                  </label>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={startClubBooking}
                    disabled={!selectionContiguous || clubbing}
                    title={selectionContiguous ? "" : "Pick back-to-back slots to club them"}
                    className="flex flex-col items-center gap-0.5 rounded-xl bg-emerald-600 py-2.5 text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="flex items-center gap-1 text-[11px] font-black">
                      <Layers size={13} /> {clubbing ? "Applying…" : "Club together"}
                    </span>
                    <span className="text-[8.5px] font-semibold opacity-80">One combined booking</span>
                  </button>
                  <button
                    onClick={startMultipleBooking}
                    disabled={clubbing}
                    className="flex flex-col items-center gap-0.5 rounded-xl bg-vibe-navy py-2.5 text-white transition hover:bg-vibe-navyDark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="flex items-center gap-1 text-[11px] font-black">
                      <Copy size={13} /> Multiple bookings
                    </span>
                    <span className="text-[8.5px] font-semibold opacity-80">Separate booking each</span>
                  </button>
                </div>
                {!selectionContiguous && (
                  <p className="mt-1.5 text-center text-[9px] font-bold text-amber-600">
                    Slots aren&apos;t back-to-back — clubbing needs consecutive slots.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── "ALL SLOTS" FILTER SHEET ── */}
      {filterOpen && (
      <SlotFilterSheet
        initial={filters}
        sports={selectedTurf?.categories || []}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
          // Date-scoped quick filters move the agenda instead of filtering rows.
          if (next.quick === "Today") jumpToDate(todayIso);
          if (next.quick === "Tomorrow") {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            jumpToDate(toIsoDate(d));
          }
          if (next.quick === "Weekend") {
            const d = new Date();
            d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
            jumpToDate(toIsoDate(d));
          }
        }}
      />
      )}

      {/* ── SPORT & COURT SELECTION MODAL ── */}
      {sportCourtModalOpen && sportCourtModalSlot && selectedTurf && (
        <SportCourtSelectionModal
          isOpen={sportCourtModalOpen}
          sports={selectedTurf.categories || []}
          courts={(selectedTurf.courts || []).filter((c) => c.active)}
          bookedCourtIds={sportCourtModalSlot.bookedCourtIds || []}
          slotTime={`${to12h(sportCourtModalSlot.startTime)} – ${to12h(sportCourtModalSlot.endTime)}`}
          onClose={() => {
            setSportCourtModalOpen(false);
            setSportCourtModalSlot(null);
          }}
          onConfirm={handleSportCourtConfirm}
        />
      )}

      {/* ── ADD BOOKING ── */}
      {addBookingOpen && (
        <AddBookingSheet
          courts={turfListings.map((t) => ({ id: t.id, title: t.title }))}
          venueCourts={(selectedTurf?.courts ?? []).filter((c) => c.active).map((c) => ({ id: c.id, name: c.name, sports: c.sports }))}
          sports={selectedTurf?.categories ?? []}
          bookedCourtIds={sportCourtModalSlot?.bookedCourtIds || []}
          initial={addBookingInitial}
          submitting={addBookingSaving}
          onClose={() => setAddBookingOpen(false)}
          onSubmit={submitAddBooking}
        />
      )}

      {/* ── QR SCANNER — scans the ticket QR and checks the player in ── */}
      {qrScannerOpen && (
        <QrScannerModal onClose={() => setQrScannerOpen(false)} onCheckIn={handleQrCheckIn} onChallengeCheckIn={handleChallengeCheckIn} />
      )}

      {/* ── ADD A TIME SLOT ── */}
      {addSlotOpen && (
        <AddSlotModal
          dateLabel={headerDateLabel}
          defaultPrice={resolvedSlots[0]?.price ?? 0}
          onClose={() => setAddSlotOpen(false)}
          onAdd={addCustomSlot}
        />
      )}

      {/* ── ACTION SELECTION BOTTOM SHEET (FOR ALL AVAILABLE SLOTS) ── */}
      {quickActionsOpen && activeSlot && !offlineModal && !blockReasonOpen && !pendingConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => { setQuickActionsOpen(false); setActiveSlot(null); }}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Select Action</h3>
                <p className="text-[11px] font-bold text-emerald-700 font-mono mt-0.5">
                  {to12h(activeSlot.startTime)} – {to12h(activeSlot.endTime)} · ₹{activeSlot.price}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setQuickActionsOpen(false); setActiveSlot(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setQuickActionsOpen(false);
                  startOfflineBooking(activeSlot);
                }}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left transition hover:bg-emerald-100/70 cursor-pointer active:scale-[0.98] shadow-2xs"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <BookOpen size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900">Create Offline Booking</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">Walk-in or phone customer booking</p>
                </div>
                <ChevronRight size={18} className="text-emerald-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickActionsOpen(false);
                  if (activeSlot.isClubSlot) {
                    handleBlockClubSlot(activeSlot);
                  } else {
                    setBlockReasonOpen(true);
                  }
                }}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-left transition hover:bg-rose-100/70 cursor-pointer active:scale-[0.98] shadow-2xs"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
                  <Ban size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900">Block Slot</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">Block slot for maintenance or private events</p>
                </div>
                <ChevronRight size={18} className="text-rose-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SLOT ACTION MODAL (available / blocked) ── */}
      {activeSlot && !quickActionsOpen && !offlineModal && !blockReasonOpen && !pendingConfirm && !isBookedSlot && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setActiveSlot(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {activeSlot.status === "Available" ? "Available Segment" : activeSlot.status}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <ClockIcon size={13} className="text-slate-400" />
                  <span className="text-sm text-slate-500 font-semibold">{to12h(activeSlot.startTime)} · {to12h(activeSlot.endTime)}</span>
                </div>
              </div>
              <button onClick={() => setActiveSlot(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {activeSlot.status === "Available" ? (
              <div className="space-y-2">
                <ActionRow
                  icon={<BookOpen size={18} className="text-emerald-600" />}
                  color="emerald"
                  title="Offline Booking"
                  sub="Book manually for a walk-in or phone customer"
                  onClick={() => {
                    const target = activeSlot;
                    setActiveSlot(null);
                    startOfflineBooking(target);
                  }}
                />
                <ActionRow
                  icon={<Ban size={18} className="text-rose-500" />}
                  color="rose"
                  title="Block Slot"
                  sub="Mark as blocked for maintenance or other reasons"
                  onClick={() => {
                    if (activeSlot.isClubSlot) {
                      handleBlockClubSlot(activeSlot);
                    } else {
                      setBlockReasonOpen(true);
                    }
                  }}
                />
                {activeSlot.isClubSlot && (
                  <ActionRow
                    icon={<Scissors size={18} className="text-amber-600" />}
                    color="amber"
                    title="Unclub / Split Slot"
                    sub="Split this clubbed slot back into separate 1-hour slots"
                    onClick={() => {
                      const target = activeSlot;
                      setActiveSlot(null);
                      handleSplitClubSlot(target);
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">Status</span><SlotBadge status={activeSlot.status} /></div>
                  {activeSlot.blockedReason && <div className="flex justify-between"><span className="text-slate-500">Reason</span><span className="font-bold">{activeSlot.blockedReason}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-500">Price</span><span className="font-bold">₹{activeSlot.price}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-bold">{durHrs(activeSlot.startTime, activeSlot.endTime)} hrs</span></div>
                  {activeSlot.status === "Part Paid" && activeSlot.paidAmount !== undefined && activeSlot.paidAmount > 0 && activeSlot.paidAmount < activeSlot.price && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="font-bold text-emerald-700">₹{activeSlot.paidAmount}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Remaining</span><span className="font-black text-rose-600">₹{activeSlot.price - activeSlot.paidAmount}</span></div>
                    </>
                  )}
                </div>
                {activeSlot.status === "Blocked" && (
                  <ActionRow icon={<Check size={18} className="text-emerald-600" />} color="emerald" title="Unblock Slot" sub="Make this slot available again" onClick={() => setSlotBlocked(activeSlot, false)} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MANAGE BOOKED SLOT MODAL ── */}
      {activeSlot && isBookedSlot && !pendingConfirm && (
        <ManageBookedSlotModal
          customerName={activeSlot.customerName}
          phone={activeSlot.phone}
          timeLabel={`${to12h(activeSlot.startTime)} – ${to12h(activeSlot.endTime)}`}
          courtName={activeSlot.courtName}
          courtsFree={activeSlot.courtsFree}
          courtsTotal={activeSlot.courtsTotal}
          onClose={() => setActiveSlot(null)}
          onClear={() => setPendingConfirm({ title: "Clear this slot", seconds: 6, run: () => clearBookedSlot(activeSlot) })}
          onMarkPaid={() => setPendingConfirm({ title: "Mark as Paid & Confirmed", seconds: 6, run: () => markSlotPaidConfirmed(activeSlot) })}
          onBlockMaintenance={() => setPendingConfirm({ title: "Block for Maintenance", seconds: 6, run: () => blockSlotForMaintenance(activeSlot) })}
        />
      )}

      {/* ── BLOCK REASON PICKER ── */}
      {blockReasonOpen && activeSlot && (
        <BlockReasonModal
          onPick={(reason) => {
            setBlockReasonOpen(false);
            setPendingConfirm({ title: "Block this slot", seconds: 6, run: () => setSlotBlocked(activeSlot, true, reason) });
          }}
          onClose={() => { setBlockReasonOpen(false); setActiveSlot(null); }}
        />
      )}

      {/* ── CONFIRM WITH UNDO COUNTDOWN ── */}
      {pendingConfirm && (
        <ConfirmCountdownModal
          title={pendingConfirm.title}
          seconds={pendingConfirm.seconds}
          onConfirm={handleConfirmPending}
          onUndo={handleUndoPending}
        />
      )}

      {/* ── SETUP SPORTS MODAL ── */}
      {setupSportsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSetupSportsOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Setup Sports</h3>
                <p className="text-xs text-slate-500">Select the sports you provide at this turf</p>
              </div>
              <button onClick={() => setSetupSportsOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6 max-h-60 overflow-y-auto pr-2">
              {ALL_SPORTS.map(sport => {
                const isSelected = setupSportsSelected.includes(sport);
                return (
                  <button 
                    key={sport}
                    onClick={() => setSetupSportsSelected(prev => 
                      isSelected ? prev.filter(s => s !== sport) : [...prev, sport]
                    )}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                      isSelected ? "bg-vibe-violet text-white border-vibe-violet shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span>{getVendorSportEmoji(sport)}</span>
                    <span className="capitalize">{sport}</span>
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={saveSetupSports} 
              disabled={setupSportsSelected.length === 0 || setupSportsSaving}
              className="w-full rounded-xl bg-vibe-violet text-white py-3 text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
            >
              {setupSportsSaving ? "Saving..." : "Save Sports"}
            </button>
          </div>
        </div>
      )}

      {/* ── OFFLINE BOOKING MODAL ── */}
      {offlineModal && activeSlot && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={closeOfflineModal}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-4xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {offlineMode === "multiple" ? `Offline Booking · ${multiSlots.length} separate bookings` : "Offline Booking"}
                </h3>
                <p className="text-xs text-slate-400">
                  {offlineMode === "multiple"
                    ? `${to12h(activeSlot.startTime)} – ${to12h(activeSlot.endTime)} · Total: ₹${activeSlot.price}`
                    : `${to12h(activeSlot.startTime)} – ${to12h(offlineEffectiveEnd)} · Total: ₹${offlineEffectiveTotal}`}
                </p>
              </div>
              <button onClick={closeOfflineModal} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>

            {offlineMode === "multiple" && (
              <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                Creates {multiSlots.length} separate confirmed bookings for the same customer — one per slot, each at its own price.
              </p>
            )}

            {/* Booking window + duration — a walk-in rarely wants exactly the one slot
                that was tapped, so make the real start/end explicit and extendable. */}
            {offlineMode !== "multiple" && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                    <ClockIcon size={15} />
                  </span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Booking window</p>
                    <p className="text-[13px] font-black text-slate-800">
                      {to12h(activeSlot.startTime)} – {to12h(offlineEffectiveEnd)}
                    </p>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Duration</p>
                    <p className="text-[13px] font-black text-slate-800">
                      {durHrs(activeSlot.startTime, offlineEffectiveEnd)} hrs
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Shorten booking"
                      disabled={offlineSpanCount <= 1}
                      onClick={() => setOfflineSpanCount((n) => Math.max(1, n - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-[12px] font-black text-slate-700">
                      {offlineSpanCount} slot{offlineSpanCount > 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      aria-label="Extend booking"
                      disabled={offlineSpanCount >= offlineExtendableSlots.length}
                      onClick={() => setOfflineSpanCount((n) => Math.min(offlineExtendableSlots.length, n + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                {offlineSpanCount >= offlineExtendableSlots.length && offlineExtendableSlots.length > 1 && (
                  <p className="w-full text-[9.5px] font-semibold text-slate-400">
                    That&apos;s every free slot in a row from here — the next one is already booked or blocked.
                  </p>
                )}
              </div>
            )}

            <div className={`grid grid-cols-1 gap-3 items-end ${offlineMode === "multiple" ? "sm:grid-cols-4" : "sm:grid-cols-5"}`}>
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Customer Name</label>
                <input value={offlineName} onChange={e => setOfflineName(e.target.value)} placeholder="e.g. Rahul"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-vibe-violet" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Phone Number</label>
                <input value={offlinePhone} onChange={e => setOfflinePhone(e.target.value)} placeholder="10-digit mobile" type="tel"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-vibe-violet" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Sport / Game</label>
                <VendorSportDropdown
                  sports={selectedTurf?.categories ?? ["Sports"]}
                  selectedSport={offlineSport}
                  onSelect={(s) => {
                    setOfflineSport(s);
                    setOfflineCourtId("");
                  }}
                />
              </div>
              {offlineMode !== "multiple" && (
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Amount Paid</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input value={offlineAmount} onChange={e => setOfflineAmount(e.target.value)} placeholder={String(offlineEffectiveTotal || activeSlot.price)} type="number"
                      className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 text-sm outline-none focus:border-vibe-violet" />
                  </div>
                </div>
              )}
              <button onClick={confirmOfflineBooking} disabled={offlineSubmitting || (selectedTurf?.courts && selectedTurf.courts.length > 0 && !offlineCourtId)}
                className="w-full rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-60 h-[42px]">
                {offlineSubmitting ? "Booking…" : "Confirm"}
              </button>
            </div>

            {/* Courts Selection */}
            {selectedTurf && selectedTurf.courts && selectedTurf.courts.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-2">Select Court</label>
                <div className="flex flex-wrap gap-2">
                  {selectedTurf.courts
                    .filter(c => c.active && (!c.sports || c.sports.length === 0 || c.sports.some(s => s.toLowerCase() === offlineSport.toLowerCase())))
                    .map(court => {
                      const isBooked = activeSlot.bookedCourtIds?.includes(court.id);
                      return (
                        <button
                          key={court.id}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setOfflineCourtId(court.id)}
                          className={`flex flex-col items-start p-2.5 rounded-xl border transition min-w-[120px] ${
                            isBooked 
                              ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed" 
                              : offlineCourtId === court.id
                                ? "bg-emerald-50 border-emerald-500 shadow-sm"
                                : "bg-white border-slate-200 hover:border-emerald-300"
                          }`}
                        >
                          <div className="flex justify-between w-full items-center mb-1 gap-2">
                            <span className={`text-[13px] font-black truncate ${isBooked ? "text-slate-500" : offlineCourtId === court.id ? "text-emerald-700" : "text-slate-700"}`}>
                              {court.name}
                            </span>
                            {isBooked && (
                              <span className="text-[9px] uppercase font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-sm">Booked</span>
                            )}
                          </div>
                          <span className={`text-[10px] font-medium ${isBooked ? "text-slate-400" : offlineCourtId === court.id ? "text-emerald-600" : "text-slate-500"}`}>
                            {court.surface || "Standard Court"}
                          </span>
                        </button>
                      );
                    })}
                </div>
                {selectedTurf.courts.filter(c => c.active && (!c.sports || c.sports.length === 0 || c.sports.some(s => s.toLowerCase() === offlineSport.toLowerCase()))).length === 0 && (
                  <p className="text-[11px] text-slate-400">No courts available for {offlineSport}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLUB SLOT DETAILS MODAL ── */}
      {activeClubSlot && (
        <ClubSlotDetailsModal
          isOpen={Boolean(activeClubSlot)}
          onClose={() => setActiveClubSlot(null)}
          clubSlot={activeClubSlot}
          selectedDate={selectedDate}
          onOfflineBooking={() => {
            if (!selectedTurf) return;
            const target = activeClubSlot;
            setActiveClubSlot(null);
            startOfflineBooking(target);
          }}
          onBlockSlot={() => handleBlockClubSlot(activeClubSlot)}
          onEditPrice={() => handleEditClubPrice(activeClubSlot)}
          onSplitClub={() => handleSplitClubSlot(activeClubSlot)}
          onDeleteClub={() => handleDeleteClubSlot(activeClubSlot)}
        />
      )}
    </div>
  );
}

/* ─── AGENDA GRID ─────────────────────────────────────────────── */
/* ─── SEE BOOKING BUTTON + DROPDOWN ────────────────────────────── */
function SeeBookingButton({ resolvedSlots, onPick }: { resolvedSlots: AgendaSlot[]; onPick: (f: SlotStatus) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-vibe-navy text-white text-sm font-bold px-6 py-3 rounded-full shadow-xl hover:bg-vibe-navyDark transition"
      >
        SEE BOOKING <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-100 min-w-[220px] overflow-hidden">
          {(["Booked", "Part Paid", "Offline Booked", "Blocked", "Available"] as SlotStatus[]).map(f => (
            <button key={f} onClick={() => { onPick(f); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0">
              {f} ({resolvedSlots.filter(s => s.status === f).length})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── GROUPED LIST ─────────────────────────────────────────────── */
function GroupedSlotsList({ slots, filter, onClose }: { slots: AgendaSlot[]; filter: SlotStatus; onClose: () => void }) {
  const colorMap: Record<SlotStatus, { border: string; label: string; dot: string }> = {
    Available:        { border: "border-emerald-200", label: "text-emerald-700", dot: "bg-emerald-500" },
    Booked:           { border: "border-emerald-300", label: "text-emerald-700", dot: "bg-emerald-600" },
    "Part Paid":      { border: "border-amber-200", label: "text-amber-700", dot: "bg-amber-500" },
    "Offline Booked": { border: "border-green-200", label: "text-green-700", dot: "bg-green-600" },
    Blocked:          { border: "border-rose-200", label: "text-rose-700", dot: "bg-rose-600" },
    "On Hold":        { border: "border-violet-200", label: "text-violet-700", dot: "bg-violet-500" },
    Empty:            { border: "border-slate-200", label: "text-slate-500", dot: "bg-slate-400" },
  };
  const c = colorMap[filter] || colorMap.Available;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800">Grouped {filter} Slots</h4>
        <span className="ml-auto text-xs font-bold text-slate-400">{slots.length} slot{slots.length !== 1 ? "s" : ""}</span>
        <button onClick={onClose} className="ml-2 p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={14} /></button>
      </div>
      {slots.length === 0 ? (
        <p className="px-5 py-8 text-sm text-center text-slate-400">No {filter.toLowerCase()} slots for this date</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {slots.map((s, i) => {
            const sc = colorMap[s.status] || c;
            return (
              <div key={i} className={`flex items-center justify-between px-5 py-4 border-l-2 ${sc.border}`}>
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">{s.label}</p>
                  <p className="text-[17px] font-extrabold text-slate-900 leading-none">{to12h(s.startTime)} – <span className={sc.label}>{to12h(s.endTime)}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{s.status}</p>
                  <p className="text-sm font-extrabold text-slate-700">{durHrs(s.startTime, s.endTime)} hrs</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── ACTION ROW ───────────────────────────────────────────────── */
function ActionRow({ icon, title, sub, onClick, color }: {
  icon: React.ReactNode; title: string; sub: string; onClick: () => void; color: string;
}) {
  const bgIconCls =
    color === "rose"
      ? "bg-rose-50 text-rose-500 border border-rose-100"
      : color === "amber"
      ? "bg-amber-50 text-amber-600 border border-amber-200"
      : "bg-emerald-50 text-emerald-600 border border-emerald-100";

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 rounded-2xl border border-slate-100 p-3.5 hover:bg-slate-50 text-left transition cursor-pointer active:scale-[0.98]">
      <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${bgIconCls}`}>{icon}</div>
      <div>
        <p className="text-sm font-extrabold text-slate-900">{title}</p>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">{sub}</p>
      </div>
    </button>
  );
}

/* ─── ADD A TIME SLOT MODAL ────────────────────────────────────── */
function AddSlotModal({
  dateLabel,
  defaultPrice,
  onClose,
  onAdd,
}: {
  dateLabel: string;
  defaultPrice: number;
  onClose: () => void;
  onAdd: (start: string, end: string, price: number) => void;
}) {
  const [start, setStart] = useState("01:00");
  const [end, setEnd] = useState("02:00");
  const [price, setPrice] = useState(defaultPrice ? String(defaultPrice) : "");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!start || !end) return setError("Set the start and end time.");
    if (t24m(end) <= t24m(start)) return setError("End time must be after the start time.");
    if (price === "" || Number(price) < 0) return setError("Enter a valid price.");
    onAdd(start, end, Number(price));
  }

  const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-vibe-violet";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-[15px] font-black text-slate-900">Add a time slot</h3>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">{dateLabel} — for late-night or extra hours.</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X size={15} /></button>
        </div>

        {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-600">{error}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">From</label>
            <TimeField value={start} onChange={setStart} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">To</label>
            <TimeField value={end} onChange={setEnd} />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Price ₹</label>
          <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="0" className={field} />
        </div>

        <button
          onClick={submit}
          className="mt-5 w-full rounded-2xl bg-vibe-navy py-3.5 text-[12px] font-black uppercase tracking-wide text-white transition active:scale-[0.98]"
        >
          Add Slot
        </button>
      </div>
    </div>
  );
}

/* ─── SLOT BADGE ───────────────────────────────────────────────── */
function SlotBadge({ status }: { status: SlotStatus }) {
  const cfg: Record<SlotStatus, string> = {
    Available: "bg-emerald-100 text-emerald-700",
    Booked: "bg-emerald-100 text-emerald-700",
    "Part Paid": "bg-amber-100 text-amber-700",
    "Offline Booked": "bg-green-100 text-green-700",
    Blocked: "bg-rose-100 text-rose-700",
    "On Hold": "bg-violet-100 text-violet-700",
    Empty: "bg-slate-100 text-slate-500",
  };
  return <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${cfg[status] || ""}`}>{status}</span>;
}
