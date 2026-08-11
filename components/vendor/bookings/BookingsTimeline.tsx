"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, MoreVertical, Plus, CalendarPlus, Ban, CircleCheck, Hourglass, XCircle, BadgeCheck, Circle } from "lucide-react";
function t24m(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* ─── Slot model ────────────────────────────────────────────────── */

export type TimelineStatus = "Available" | "Booked" | "Part Paid" | "Offline Booked" | "Blocked" | "On Hold" | "Empty";

export interface TimelineSlot {
  startTime: string;
  endTime: string;
  label: string;
  price: number;
  status: TimelineStatus;
  bookingId?: string;
  customerName?: string;
  phone?: string;
  blockedReason?: string;
  /** Set once the player's QR ticket has been scanned at the gate. */
  arrived?: boolean;
  sport?: string;
  numberOfPlayers?: number;
  /** Amount actually collected so far — only meaningfully less than `price` on a "Part Paid" slot. */
  paidAmount?: number;
  isClubSlot?: boolean;
  clubId?: string;
  slotIds?: string[];
  durationMinutes?: number;
  courtsInfo?: { id: string; name: string; isBooked: boolean; isPending?: boolean }[];
}

/** What the ⋮ menu can trigger on a row. */
export type SlotAction = "create-booking" | "block-slot" | "make-available" | "cancel-booking" | "mark-pending" | "mark-paid";

/* ─── Status → presentation ─────────────────────────────────────── */

/** The tones the legend advertises, derived from the richer internal statuses.
 * "Booked" (paid online through the customer app) gets its own branded tone,
 * separate from "Offline Booked" (walk-in), so a vendor can tell at a glance
 * which slots BYV actually brought them versus ones they entered manually. */
type Tone = "available" | "onlineBooked" | "confirmed" | "pending" | "blocked" | "closed" | "empty";

function toneFor(status: TimelineStatus): Tone {
  switch (status) {
    case "Available":
      return "available";
    case "Booked":
      return "onlineBooked";
    case "Offline Booked":
      return "confirmed";
    case "Part Paid":
    case "On Hold":
      return "pending";
    case "Blocked":
      return "blocked";
    case "Empty":
      return "empty";
    default:
      return "closed";
  }
}

const TONE_STYLES: Record<Tone, { dot: string; card: string; title: string; badge: string; badgeText: string }> = {
  available: {
    dot: "bg-emerald-500",
    card: "border-emerald-100 bg-emerald-50/50",
    title: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    badgeText: "Available",
  },
  onlineBooked: {
    dot: "bg-red-500",
    card: "border-red-100 bg-red-50/50",
    title: "text-red-500",
    badge: "bg-red-100 text-red-700",
    badgeText: "Online",
  },
  // Walk-in / phone booking the vendor entered themselves — blue, so it never gets
  // mistaken for the red "came through BYV" rows.
  confirmed: {
    dot: "bg-blue-500",
    card: "border-blue-100 bg-blue-50/50",
    title: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    badgeText: "Walk-in",
  },
  pending: {
    dot: "bg-amber-500",
    card: "border-amber-200 bg-amber-50/70",
    title: "text-slate-900",
    badge: "bg-amber-100 text-amber-700",
    badgeText: "Pending",
  },
  blocked: {
    dot: "bg-rose-500",
    card: "border-rose-100 bg-rose-50/60",
    title: "text-rose-700",
    badge: "bg-rose-100 text-rose-700",
    badgeText: "Blocked",
  },
  closed: {
    dot: "bg-slate-400",
    card: "border-slate-200 bg-slate-50",
    title: "text-slate-500",
    badge: "bg-slate-200 text-slate-600",
    badgeText: "Closed",
  },
  // A past slot nobody ever booked — kept visible as a read-only historical marker
  // instead of just vanishing once the clock passes it.
  empty: {
    dot: "bg-slate-300",
    card: "border-slate-100 bg-slate-50/70",
    title: "text-slate-400",
    badge: "bg-slate-100 text-slate-500",
    badgeText: "Empty",
  },
};

export const TIMELINE_LEGEND: { tone: Tone; label: string }[] = [
  { tone: "available", label: "Available" },
  { tone: "onlineBooked", label: "Booked on BYV" },
  { tone: "confirmed", label: "Walk-in" },
  { tone: "pending", label: "Pending" },
  { tone: "blocked", label: "Blocked" },
  { tone: "closed", label: "Closed" },
  { tone: "empty", label: "Empty (past, unbooked)" },
];

/** "07:00" → "07:00 AM" */
function to12h(t: string): string {
  const [hStr, m] = t.split(":");
  let h = Number(hStr) % 24; // "24:00" (midnight close) → 12:00 AM
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ap}`;
}

/* ─── Row action menu ───────────────────────────────────────────── */

function RowMenu({ slot, onAction }: { slot: TimelineSlot; onAction: (s: TimelineSlot, a: SlotAction) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const isBlocked = slot.status === "Blocked";
  const isFree = slot.status === "Available";
  const isBooked = !isFree && !isBlocked;
  const isPending = slot.status === "Part Paid" || slot.status === "On Hold";

  const items: { action: SlotAction; label: string; icon: typeof Plus; tone?: string }[] = [
    // Free slot → book it or take it out of circulation.
    ...(isFree
      ? [
          { action: "create-booking" as SlotAction, label: "Create booking", icon: CalendarPlus },
          { action: "block-slot" as SlotAction, label: "Block slot", icon: Ban, tone: "text-rose-600" },
        ]
      : []),
    // Booked slot → move it between paid/pending, or cancel it.
    ...(isBooked && isPending
      ? [{ action: "mark-paid" as SlotAction, label: "Mark as paid", icon: CircleCheck, tone: "text-emerald-600" }]
      : []),
    ...(isBooked && !isPending
      ? [{ action: "mark-pending" as SlotAction, label: "Mark as pending", icon: Hourglass, tone: "text-amber-600" }]
      : []),
    ...(isBooked
      ? [{ action: "cancel-booking" as SlotAction, label: "Cancel booking", icon: XCircle, tone: "text-rose-600" }]
      : []),
    // Blocked slot → put it back on sale.
    ...(isBlocked
      ? [{ action: "make-available" as SlotAction, label: "Make available", icon: CircleCheck, tone: "text-emerald-600" }]
      : []),
  ];

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-label="Slot actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {items.map((it) => (
            <button
              key={it.action}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onAction(slot, it.action);
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[11px] font-bold transition hover:bg-slate-50 ${it.tone ?? "text-slate-700"}`}
            >
              <it.icon size={13} /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Timeline ──────────────────────────────────────────────────── */

export function BookingsTimeline({
  slots,
  onSlotClick,
  onAction,
  onLongPress,
  scrollToNow = false,
  selectMode = false,
  selectedKeys,
  onToggleSelect,
}: {
  slots: TimelineSlot[];
  onSlotClick: (slot: TimelineSlot) => void;
  onAction: (slot: TimelineSlot, action: SlotAction) => void;
  /** Press-and-hold a row → quick "book offline / block" sheet (empty slots). */
  onLongPress?: (slot: TimelineSlot) => void;
  /** When viewing today, open the list at the current/upcoming slot; passed slots stay reachable by scrolling up. */
  scrollToNow?: boolean;
  /** Multi-select mode: tapping an available row toggles it instead of opening the slot modal. */
  selectMode?: boolean;
  /** Start times of the currently-selected available slots. */
  selectedKeys?: string[];
  onToggleSelect?: (slot: TimelineSlot) => void;
}) {
  const currentSlotRef = useRef<HTMLDivElement>(null);
  const didAutoScroll = useRef(false);

  // Shared long-press timer — only one row can be held at a time. `fired` stops
  // the trailing click from also opening the normal slot modal.
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = (slot: TimelineSlot) => {
    if (!onLongPress) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress(slot);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // First slot still running or upcoming; if the day is over, land at the end.
  const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  let scrollIdx = slots.findIndex((s) => toMins(s.endTime) > nowMins);
  if (scrollIdx === -1) scrollIdx = slots.length - 1;

  useEffect(() => {
    if (!scrollToNow) {
      didAutoScroll.current = false;
      return;
    }
    // Scroll once per visit to today — not again on every clock tick or filter change.
    if (didAutoScroll.current || !currentSlotRef.current) return;
    didAutoScroll.current = true;
    // The page itself scrolls now, so only move when the current slot is actually
    // below the fold — otherwise an early-morning slot would needlessly shove the
    // day summary and date strip off screen.
    const top = currentSlotRef.current.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.8) {
      currentSlotRef.current.scrollIntoView({ block: "start" });
    }
  }, [scrollToNow, slots]);

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-xs font-semibold text-slate-500">No slots match these filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      {slots.map((slot, i) => {
        const tone = toneFor(slot.status);
        const s = TONE_STYLES[tone];
        const isFree = slot.status === "Available";
        const isBlocked = slot.status === "Blocked";
        const isEmpty = slot.status === "Empty";
        // "Part Paid" also covers a plain pending hold with no money down at all —
        // only badge it "Partial" when something was genuinely collected but not in full.
        const isPartial = slot.status === "Part Paid" && slot.paidAmount !== undefined && slot.paidAmount > 0 && slot.paidAmount < slot.price;
        // The other half of that overload: a checkout someone has open right now but
        // hasn't paid for yet — still reversible, so it's flagged distinctly from a real booking.
        const isPendingOnly = slot.status === "Part Paid" && !isPartial;
        const remaining = slot.price - (slot.paidAmount ?? 0);
        const isLast = i === slots.length - 1;
        const isSelected = selectMode && isFree && (selectedKeys?.includes(slot.startTime) ?? false);
        // In select mode only free slots can be picked; everything else is dimmed & inert.
        const selectDisabled = selectMode && !isFree;

        return (
          <div
            key={`${slot.startTime}-${i}`}
            ref={i === scrollIdx ? currentSlotRef : undefined}
            className="flex gap-2 px-1.5 py-1.5 sm:gap-3 sm:px-3"
          >
            {/* Time rail — shows the slot's full duration cleanly */}
            <div className="w-[52px] shrink-0 pt-3 text-right sm:w-[60px]">
              <span className="block text-[10px] font-bold leading-tight tabular-nums text-slate-700 sm:text-[11px]">
                {to12h(slot.startTime)}
              </span>
              <span className="block text-[8.5px] font-semibold leading-tight tabular-nums text-slate-400 sm:text-[9.5px]">
                {to12h(slot.endTime)}
              </span>
            </div>

            {/* Dot + connector */}
            <div className="flex w-2.5 shrink-0 flex-col items-center pt-4 sm:w-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${s.dot}`} />
              {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
            </div>

            {/* Slot card */}
            <div
              role="button"
              tabIndex={0}
              aria-disabled={selectDisabled}
              onClick={() => {
                if (longPressFired.current) return; // consumed by the long-press sheet
                if (selectMode) {
                  if (isFree) onToggleSelect?.(slot);
                  return;
                }
                onSlotClick(slot);
              }}
              onPointerDown={() => { if (!selectMode && !isEmpty) startLongPress(slot); }}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (selectMode) { if (isFree) onToggleSelect?.(slot); return; }
                  onSlotClick(slot);
                }
              }}
              className={`mb-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border p-2.5 text-left transition active:scale-[0.995] sm:p-3 ${
                slot.isClubSlot && isFree ? "border-emerald-200 bg-emerald-50/50" : s.card
              } ${
                selectDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
              } ${isSelected ? "!border-emerald-500 ring-2 ring-emerald-400/60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                {slot.isClubSlot && isFree ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[9px] font-black uppercase">
                        🏷️ CLUBBED SLOT
                      </span>
                      <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wider shadow-2xs">
                        AVAILABLE (CLUBBED)
                      </span>
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
                      AVAILABLE (CLUBBED)
                    </p>
                    <p className="mt-0.5 text-xs font-black text-slate-800 font-mono">
                      {to12h(slot.startTime)} – {to12h(slot.endTime)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-emerald-800">
                      Duration: {Math.round((t24m(slot.endTime) - t24m(slot.startTime)) / 60)} Hours · ₹{slot.price}
                    </p>
                  </div>
                ) : isFree ? (
                  <div className="flex flex-col w-full pr-1 gap-1.5">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-wide ${s.title}`}>Available</p>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-400">Tap to add booking</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-black text-emerald-800 shadow-2xs">
                        ₹{(slot.price && slot.price > 0 ? slot.price : 1000).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {slot.courtsInfo && slot.courtsInfo.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {slot.courtsInfo.map(court => (
                          <span
                            key={court.id}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                              !court.isBooked
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : court.isPending
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-600 border-rose-200"
                            }`}
                          >
                            {court.name} {!court.isBooked ? "(Free)" : court.isPending ? "(Pending)" : "(Booked)"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : isBlocked ? (
                  <>
                    <p className={`text-[11px] font-black uppercase tracking-wide ${s.title}`}>Blocked</p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">{slot.blockedReason || "Unavailable"}</p>
                  </>
                ) : isEmpty ? (
                  <>
                    <p className={`text-[11px] font-black uppercase tracking-wide ${s.title}`}>Empty</p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">No booking was made for this slot</p>
                  </>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-1">
                        {slot.status === "Booked" && (
                          <img src="/logo.jpg" alt="BYV" className="h-3.5 w-3.5 rounded object-cover shrink-0"
            loading="lazy"
            decoding="async"
          />
                        )}
                        <span className={`text-[12px] font-black uppercase tracking-wide ${s.title}`}>
                          {slot.customerName || "Customer"}
                        </span>
                      </span>
                      {slot.status === "Booked" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[7.5px] font-black uppercase text-orange-700">
                          Online
                        </span>
                      )}
                      {isPartial && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[7.5px] font-black uppercase text-amber-700">
                          Partial
                        </span>
                      )}
                      {isPendingOnly && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[7.5px] font-black uppercase text-amber-700">
                          Pending
                        </span>
                      )}
                      {slot.arrived && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-emerald-700">
                          <BadgeCheck size={8} /> Arrived
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                      {slot.phone || "Booked online"} {slot.sport ? `· ${slot.sport}` : ""}
                    </p>
                    {isPartial && (
                      <p className="mt-0.5 text-[10px] font-black text-amber-700">
                        Paid ₹{slot.paidAmount} of ₹{slot.price} · <span className="text-rose-600">₹{remaining} remaining</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* In select mode, free rows show a checkbox; the ⋮ menu / add / lock chips are hidden. */}
              {selectMode ? (
                isFree && (
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm ${isSelected ? "bg-emerald-500 text-white" : "bg-white text-slate-300"}`}>
                    {isSelected ? <CircleCheck size={16} /> : <Circle size={16} />}
                  </span>
                )
              ) : (
                <>
                  {!isFree && !isBlocked && !isEmpty && (
                    <RowMenu slot={slot} onAction={onAction} />
                  )}

                  {isFree && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                      <Plus size={14} />
                    </span>
                  )}

                  {isBlocked && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
                      <Lock size={13} />
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Legend strip shown under the timeline. */
export function TimelineLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
      {TIMELINE_LEGEND.map((l) => (
        <span key={l.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${TONE_STYLES[l.tone].dot}`} />
          <span className="text-[9px] font-bold text-slate-500">{l.label}</span>
        </span>
      ))}
    </div>
  );
}
