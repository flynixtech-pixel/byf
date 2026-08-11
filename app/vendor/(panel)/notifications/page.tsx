"use client";

import { useEffect, useMemo, useState } from "react";
import { getVendorBookings, getVendorListings, listSubscriptions, updateVendorBookingStatus } from "@/lib/api/vendor";
import { apiListingToMock } from "@/lib/api/listingAdapter";
import { getReadNotificationIds, saveReadNotificationIds } from "@/lib/vendorNotifications";
import { Booking, Listing } from "@/lib/types";
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  SlidersHorizontal,
  CheckCheck,
  Settings,
  History,
  FileText,
  CalendarDays,
  User,
  Star,
  Clock,
  Timer,
  Users as UsersIcon,
  MapPin,
  Tag,
  IndianRupee,
  CreditCard,
  Globe,
  UtensilsCrossed,
  Repeat,
  QrCode,
  Hash,
  Trash2,
} from "lucide-react";
import { MessageTemplatesModal, type MessageTemplateContext } from "@/components/vendor/MessageTemplatesModal";
import { NotificationRow, type RowTone, type BookingSource } from "@/components/vendor/notifications/NotificationRow";

/** Vendor bookings carry more than the shared mock type models. */
type ApiBooking = Booking & {
  listingId?: string;
  customerName?: string;
  phone?: string;
  checkedIn?: boolean;
  checkedInAt?: string | null;
  endTime?: string;
  /** Set only for bookings a registered customer made through the app — walk-ins the
   * vendor typed in manually never get one. This is the real online-vs-walk-in signal,
   * not payment method (an app customer can still choose to pay cash at the venue). */
  customerId?: string | null;
};

type Tab = "Upcoming" | "Today" | "Tomorrow" | "Payments" | "Past";
const TABS: Tab[] = ["Upcoming", "Today", "Tomorrow", "Payments", "Past"];
type PriceFilter = "Paid" | "Partial" | "Cash";

/** "Reminder sent" = the vendor has tapped Message for this booking at least once.
 * There's no separate automated reminder system — this is that same action. */
const MESSAGED_ORDERS_KEY = "byv_vendor_messaged_orders";

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Relative label from now, e.g. "in 15 min" / "Just now" / "2 hr ago". Used for payment due labels. */
function relative(target: Date, now: number) {
  const diff = target.getTime() - now;
  const mins = Math.round(Math.abs(diff) / 60_000);
  if (mins < 1) return "Just now";
  const fmt = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} hr` : `${Math.round(mins / 1440)} day`;
  return diff > 0 ? `in ${fmt}` : `${fmt} ago`;
}

/** Countdown to a booking's slot start, e.g. "Starts in 30 min" / "Starts in 4 hr" — updates
 * live via the `now` tick. Past slots (only reachable from the Past filter) show "X ago". */
function arrivalLabel(target: Date, now: number) {
  const diff = target.getTime() - now;
  const mins = Math.round(Math.abs(diff) / 60_000);
  if (mins < 1) return diff > 0 ? "Starting now" : "Just started";
  const fmt = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} hr` : `${Math.round(mins / 1440)} day`;
  return diff > 0 ? `Starts in ${fmt}` : `${fmt} ago`;
}

export default function NotificationsPage() {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  /** Phones of customers with an active membership — drives the "Member" flag. */
  const [memberPhones, setMemberPhones] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // Land on "Today" rather than "Upcoming" — a booking whose slot already started
  // (or even finished) earlier today is still today's activity and shouldn't be
  // invisible by default just because its clock time has passed.
  const [tab, setTab] = useState<Tab>("Today");
  const [filterOpen, setFilterOpen] = useState(false);
  const [priceFilters, setPriceFilters] = useState<Set<PriceFilter>>(new Set());
  const [reminderFilter, setReminderFilter] = useState<"Sent" | "Not Sent" | null>(null);
  /** Order ids the vendor has already messaged — persisted so "reminder sent" survives a reload. */
  const [messagedOrders, setMessagedOrders] = useState<Set<string>>(new Set());
  const REMOVED_NOTIFS_KEY = "byv_vendor_removed_notifications";
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MESSAGED_ORDERS_KEY);
      if (raw) setMessagedOrders(new Set(JSON.parse(raw)));
      const removedRaw = window.localStorage.getItem(REMOVED_NOTIFS_KEY);
      if (removedRaw) setRemovedKeys(new Set(JSON.parse(removedRaw)));
    } catch {
      // localStorage unavailable
    }
  }, []);

  function handleRemoveNotification(key: string) {
    setRemovedKeys((prev) => {
      const next = new Set(prev).add(key);
      try {
        window.localStorage.setItem(REMOVED_NOTIFS_KEY, JSON.stringify([...next]));
      } catch {
        // Non-fatal
      }
      return next;
    });
  }
  function markMessaged(orderId: string) {
    setMessagedOrders((prev) => {
      if (prev.has(orderId)) return prev;
      const next = new Set(prev).add(orderId);
      try {
        window.localStorage.setItem(MESSAGED_ORDERS_KEY, JSON.stringify([...next]));
      } catch {
        // Non-fatal — just won't persist across a reload.
      }
      return next;
    });
  }
  const [expanded, setExpanded] = useState<string | null>(null);
  const [read, setRead] = useState<Set<string>>(new Set());
  useEffect(() => {
    setRead(getReadNotificationIds());
  }, []);
  function markRead(next: Set<string>) {
    setRead(next);
    saveReadNotificationIds(next);
  }
  /** Order id of the booking whose full detail sheet is open. */
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [messageCtx, setMessageCtx] = useState<MessageTemplateContext | null>(null);

  // Lazy initialiser — Date.now() must not run during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.all([
      // 500 (matching the rest of the panel) so busy venues don't silently drop
      // bookings from the list — the vendor reported some never showing up.
      getVendorBookings({ limit: 500 }),
      getVendorListings(),
      listSubscriptions().catch(() => []),
    ])
      .then(([b, l, subs]) => {
        setBookings(b.items as unknown as ApiBooking[]);
        setListings(l.map(apiListingToMock));
        setMemberPhones(new Set(subs.filter((s) => s.status === "active").map((s) => s.phone)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const courtName = (b: ApiBooking) =>
    listings.find((l) => l.id === b.listingId || l.id === b.listing)?.title;

  /** How many times each phone number has booked at this venue. */
  const playCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      const key = b.phone ?? b.customerName ?? b.customer;
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [bookings]);

  const rows = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    return bookings
      .filter((b) => b.status !== "Cancelled")
      .map((b) => {
        const start = new Date(b.dateTime);
        const end = b.endTime
          ? new Date(`${start.toISOString().slice(0, 10)}T${b.endTime}:00`)
          : new Date(start.getTime() + 60 * 60_000);

        const isTomorrow = isSameDay(start, tomorrow);
        const isToday = isSameDay(start, today);
        const isPast = end.getTime() < now;
        const paidInFull = b.paymentStatus === "paid" && b.status !== "Part Paid";

        // Colour precedence: payment state first, then tomorrow's bookings.
        let tone: RowTone = "neutral";
        let statusLine = "Booking Confirmed";
        // "Part Paid" also covers a plain pending hold with nothing collected at all —
        // only call it out as a genuine partial payment when something was actually paid.
        const isGenuinePartial = b.status === "Part Paid" && (b.paidAmount ?? 0) > 0 && (b.paidAmount ?? 0) < b.totalAmount;
        if (isGenuinePartial) {
          tone = "partial";
          statusLine = `₹${b.totalAmount - (b.paidAmount ?? 0)} remaining of ₹${b.totalAmount}`;
        } else if (b.status === "Part Paid") {
          tone = "partial";
          statusLine = "Payment Pending";
        } else if (!paidInFull) {
          tone = "partial";
          statusLine = "Payment Pending";
        } else if (isTomorrow) {
          tone = "tomorrow";
          statusLine = "✅ Booking Confirmed";
        } else if (paidInFull) {
          tone = "paid";
          statusLine = b.checkedIn ? "QR Check-in Completed" : "✅ Booking Confirmed";
        }
        if (b.checkedIn) statusLine = "QR Check-in Completed";
        if (b.status === "Pending") statusLine = "Booking request";

        // Walk-in = no customerId (vendor typed it in manually) — not payment method,
        // since an app customer can still choose to pay cash at the venue.
        const source: BookingSource = b.customerId ? "O" : "F";
        const name = b.customerName ?? b.customer ?? "Guest";

        return {
          booking: b,
          key: b.orderId,
          name,
          statusLine,
          tone,
          source,
          start,
          end,
          isToday,
          isTomorrow,
          isPast,
          paidInFull,
          isGenuinePartial,
          playedTimes: playCounts.get(b.phone ?? name) ?? 1,
          isMember: b.phone ? memberPhones.has(b.phone) : false,
        };
      })
      // Newest booking first — this is a notification feed of vendor activity, not a
      // same-day agenda, so it orders by when the booking was made rather than by
      // the slot's start time. Falls back to slot start for the rare booking with no
      // createdAt (pre-migration records).
      .sort((a, z) => new Date(z.booking.createdAt ?? z.start).getTime() - new Date(a.booking.createdAt ?? a.start).getTime());
  }, [bookings, now, playCounts, memberPhones]);

  const counts = useMemo(
    () => ({
      Upcoming: rows.filter((r) => !r.isPast).length,
      Today: rows.filter((r) => r.isToday).length,
      Tomorrow: rows.filter((r) => r.isTomorrow).length,
      Payments: rows.filter((r) => !r.paidInFull).length,
      Past: rows.filter((r) => r.isPast).length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    let list: typeof rows;
    switch (tab) {
      case "Today":
        list = rows.filter((r) => r.isToday);
        break;
      case "Tomorrow":
        list = rows.filter((r) => r.isTomorrow);
        break;
      case "Payments":
        list = rows.filter((r) => !r.paidInFull);
        break;
      case "Past":
        list = rows.filter((r) => r.isPast);
        break;
      default:
        list = rows.filter((r) => !r.isPast);
    }
    if (priceFilters.size > 0) {
      list = list.filter(
        (r) =>
          (priceFilters.has("Paid") && r.paidInFull) ||
          (priceFilters.has("Partial") && !r.paidInFull) ||
          (priceFilters.has("Cash") && r.booking.payment === "Cash (Offline)")
      );
    }
    if (reminderFilter === "Sent") list = list.filter((r) => messagedOrders.has(r.key));
    if (reminderFilter === "Not Sent") list = list.filter((r) => !messagedOrders.has(r.key));
    return list.filter((r) => !removedKeys.has(r.key));
  }, [rows, tab, priceFilters, reminderFilter, messagedOrders, removedKeys]);

  async function acknowledge(orderId: string) {
    try {
      await updateVendorBookingStatus(orderId, "Confirmed");
      setBookings((prev) => prev.map((b) => (b.orderId === orderId ? { ...b, status: "Confirmed" } : b)));
    } catch {
      alert("Failed to acknowledge booking");
    }
  }

  /** Past bookings for one customer — the "Booking History" drill-down. */
  const historyRows = useMemo(() => {
    if (!historyFor) return [];
    return bookings
      .filter((b) => (b.phone ?? b.customerName ?? b.customer) === historyFor)
      .sort((a, z) => new Date(z.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [historyFor, bookings]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 font-sans text-slate-800">
      {/* Header */}
      <div className="mx-[-16px] mt-[-24px] mb-4 flex items-center gap-3 rounded-b-2xl bg-white px-5 py-4 shadow-sm sm:mx-[-24px]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Bell size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-black tracking-tight text-slate-900">Notifications</h1>
          <p className="text-[10px] font-medium text-slate-400">Stay updated on your bookings &amp; venue</p>
        </div>
        <div className="relative">
          <HeaderAction icon={SlidersHorizontal} label="Filter" onClick={() => setFilterOpen(true)} />
          {(priceFilters.size > 0 || reminderFilter !== null || tab === "Past") && (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </div>
        <HeaderAction icon={CheckCheck} label="Mark all read" onClick={() => markRead(new Set([...read, ...rows.map((r) => r.key)]))} />
        <HeaderAction
          icon={Trash2}
          label="Clear all"
          onClick={() => {
            if (visible.length === 0) return;
            const next = new Set(removedKeys);
            visible.forEach((r) => next.add(r.key));
            setRemovedKeys(next);
            try {
              window.localStorage.setItem(REMOVED_NOTIFS_KEY, JSON.stringify([...next]));
            } catch {
              // Ignore
            }
          }}
        />
        <HeaderAction icon={Settings} label="Settings" href="/vendor/profile" />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black transition ${
                active ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t}
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black ${
                  active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-2.5 flex items-center gap-2">
        <CalendarDays size={13} className="text-slate-400" />
        <h2 className="text-[11px] font-black text-slate-700">Upcoming Bookings &amp; Activity</h2>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm font-bold text-slate-400">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Loading…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm font-bold text-slate-400">
          Nothing here right now.
        </div>
      ) : (
        visible.map((r, i) => (
          <NotificationRow
            key={r.key}
            name={r.name}
            statusLine={r.statusLine}
            timeRange={`${fmtTime(r.start)} – ${fmtTime(r.end)}`}
            courtName={courtName(r.booking)}
            when={arrivalLabel(r.start, now)}
            tone={r.tone}
            source={r.source}
            amount={r.isGenuinePartial ? r.booking.totalAmount - (r.booking.paidAmount ?? 0) : (!r.paidInFull ? r.booking.totalAmount : undefined)}
            amountNote={r.isGenuinePartial ? `remaining · paid ₹${r.booking.paidAmount ?? 0} of ₹${r.booking.totalAmount}` : (!r.paidInFull ? `Due ${relative(r.start, now)}` : undefined)}
            isLast={i === visible.length - 1}
            expanded={expanded === r.key}
            unread={!read.has(r.key)}
            onRemove={() => handleRemoveNotification(r.key)}
            onToggle={() => {
              setExpanded(expanded === r.key ? null : r.key);
              markRead(new Set(read).add(r.key));
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] font-black text-slate-700">
                  <Repeat size={10} className="text-slate-400" />
                  {r.playedTimes > 1 ? `Played ${r.playedTimes} times` : "New player"}
                </span>
                <span className="text-[9px] font-black tracking-wide text-slate-400">ID: {r.booking.orderId}</span>
              </div>

              {r.booking.checkedIn && (
                <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[9px] font-black text-emerald-700">
                  Checked in{r.booking.checkedInAt ? ` at ${fmtTime(new Date(r.booking.checkedInAt))}` : ""}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {r.booking.status === "Pending" ? (
                  <button
                    onClick={() => acknowledge(r.booking.orderId)}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-[10px] font-black text-white transition active:scale-[0.97]"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-[10px] font-black text-emerald-600">
                    <CheckCircle2 size={12} /> Confirmed
                  </span>
                )}

                <button
                  onClick={() => {
                    markMessaged(r.booking.orderId);
                    setMessageCtx({
                      customerName: r.name,
                      phone: r.booking.phone ?? "",
                      orderId: r.booking.orderId,
                      timeLabel: `${fmtTime(r.start)} - ${fmtTime(r.end)}`,
                      dateLabel: r.start.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "long" }),
                      totalAmount: r.booking.totalAmount,
                      paymentStatus: r.booking.paymentStatus,
                    });
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[10px] font-black text-white transition active:scale-[0.97]"
                >
                  <MessageSquare size={11} /> Message
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDetailKey(r.key)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-[10px] font-black text-indigo-600 transition active:scale-[0.97]"
                >
                  <FileText size={11} /> Full detail
                </button>

                <button
                  onClick={() => setHistoryFor(r.booking.phone ?? r.name)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-[10px] font-black text-slate-600 transition active:scale-[0.97]"
                >
                  <History size={11} /> Booking History
                </button>
              </div>
            </div>
          </NotificationRow>
        ))
      )}

      {/* Filter sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setFilterOpen(false)}>
          <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-black text-slate-900">Filters</h3>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">Narrow down what shows up in the list.</p>

            <p className="mb-2 mt-4 text-[10px] font-black uppercase tracking-wide text-slate-400">Booking Window</p>
            <div className="flex gap-2">
              {(["Upcoming", "Past"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setTab(w)}
                  className={`flex-1 rounded-xl py-2.5 text-[11px] font-black transition ${
                    tab === w ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {w} Bookings
                </button>
              ))}
            </div>

            <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-wide text-slate-400">Price</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "Paid", label: "Paid" },
                  { key: "Partial", label: "Partially Paid" },
                  { key: "Cash", label: "Cash" },
                ] as { key: PriceFilter; label: string }[]
              ).map(({ key, label }) => {
                const active = priceFilters.has(key);
                return (
                  <button
                    key={key}
                    onClick={() =>
                      setPriceFilters((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    className={`rounded-full px-3.5 py-2 text-[11px] font-black transition ${
                      active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-wide text-slate-400">Reminder</p>
            <p className="mb-2 text-[10px] font-medium text-slate-400">Whether you&apos;ve tapped Message for this booking.</p>
            <div className="flex gap-2">
              {(["Sent", "Not Sent"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setReminderFilter((cur) => (cur === r ? null : r))}
                  className={`flex-1 rounded-xl py-2.5 text-[11px] font-black transition ${
                    reminderFilter === r ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setPriceFilters(new Set());
                  setReminderFilter(null);
                  setTab("Upcoming");
                }}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-[11px] font-black uppercase tracking-wide text-slate-600"
              >
                Reset
              </button>
              <button onClick={() => setFilterOpen(false)} className="flex-1 rounded-2xl bg-slate-900 py-3 text-[11px] font-black uppercase tracking-wide text-white">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full booking detail sheet */}
      {(() => {
        const r = rows.find((x) => x.key === detailKey);
        if (!r) return null;
        const durMins = Math.round((r.end.getTime() - r.start.getTime()) / 60_000);
        const durationLabel =
          durMins >= 60 ? `${(durMins / 60).toFixed(durMins % 60 === 0 ? 0 : 1)} hr` : `${durMins} min`;
        const foodLabel =
          r.booking.foodIncluded === true ? "Included" : r.booking.foodIncluded === false ? "Not included" : "Not recorded";

        type DetailItem = { icon: typeof User; label: string; value: React.ReactNode; valueClass?: string };
        type DetailSection = { title: string; accent: string; iconBg: string; iconColor: string; items: DetailItem[] };

        const sections: DetailSection[] = [
          {
            title: "Player",
            accent: "border-indigo-100",
            iconBg: "bg-indigo-50",
            iconColor: "text-indigo-600",
            items: [
              { icon: User, label: "Customer", value: r.name },
              {
                icon: Star,
                label: "Member",
                value: r.isMember ? "Member" : "Not a member",
                valueClass: r.isMember ? "text-amber-600" : undefined,
              },
              { icon: Repeat, label: "Times played here", value: `${r.playedTimes}` },
            ],
          },
          {
            title: "Schedule",
            accent: "border-sky-100",
            iconBg: "bg-sky-50",
            iconColor: "text-sky-600",
            items: [
              {
                icon: CalendarDays,
                label: "Date",
                value: r.start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }),
              },
              { icon: Clock, label: "Time", value: `${fmtTime(r.start)} – ${fmtTime(r.end)}` },
              { icon: Timer, label: "Duration", value: durationLabel },
              ...(courtName(r.booking) ? [{ icon: MapPin, label: "Court", value: courtName(r.booking)! }] : []),
              ...(r.booking.sport ? [{ icon: Tag, label: "Sport", value: r.booking.sport }] : []),
              {
                icon: UsersIcon,
                label: "No. of players",
                value: r.booking.numberOfPlayers ? `${r.booking.numberOfPlayers}` : "Not recorded",
              },
            ],
          },
          {
            title: "Payment",
            accent: r.paidInFull ? "border-emerald-100" : "border-rose-100",
            iconBg: r.paidInFull ? "bg-emerald-50" : "bg-rose-50",
            iconColor: r.paidInFull ? "text-emerald-600" : "text-rose-600",
            items: [
              { icon: IndianRupee, label: "Amount", value: `₹${r.booking.totalAmount.toLocaleString("en-IN")}` },
              ...(r.isGenuinePartial
                ? [
                    { icon: IndianRupee, label: "Paid so far", value: `₹${(r.booking.paidAmount ?? 0).toLocaleString("en-IN")}`, valueClass: "text-emerald-600" },
                    {
                      icon: IndianRupee,
                      label: "Remaining",
                      value: `₹${(r.booking.totalAmount - (r.booking.paidAmount ?? 0)).toLocaleString("en-IN")}`,
                      valueClass: "text-rose-600",
                    },
                  ]
                : []),
              {
                icon: CreditCard,
                label: "Payment",
                value: `${r.booking.payment} · ${r.paidInFull ? "Paid" : r.isGenuinePartial ? "Partially Paid" : "Pending"}`,
                valueClass: r.paidInFull ? "text-emerald-600" : "text-rose-600",
              },
              {
                icon: Globe,
                label: "Source",
                value: r.source === "F" ? "Offline / walk-in" : "Online booking",
                valueClass: r.source === "F" ? "text-amber-600" : "text-emerald-600",
              },
            ],
          },
          {
            title: "Activity",
            accent: "border-slate-100",
            iconBg: "bg-slate-100",
            iconColor: "text-slate-500",
            items: [
              { icon: CheckCircle2, label: "Status", value: r.statusLine },
              { icon: UtensilsCrossed, label: "Food & beverage", value: foodLabel },
              ...(r.booking.checkedIn
                ? [
                    {
                      icon: QrCode,
                      label: "Check-in",
                      value: r.booking.checkedInAt ? `Checked in at ${fmtTime(new Date(r.booking.checkedInAt))}` : "Checked in",
                      valueClass: "text-emerald-600",
                    },
                  ]
                : []),
              { icon: Hash, label: "Booking ID", value: r.booking.orderId },
            ],
          },
        ];

        return (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setDetailKey(null)}>
            <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[14px] font-black text-slate-900">Full Booking Detail</h3>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">Everything BYV has on this booking.</p>
              <div className="mt-3 space-y-3">
                {sections.map((s) => (
                  <div key={s.title} className={`overflow-hidden rounded-xl border ${s.accent}`}>
                    <p className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${s.iconColor} ${s.iconBg}`}>
                      {s.title}
                    </p>
                    <div className="divide-y divide-slate-100 bg-white">
                      {s.items.map((it) => (
                        <div key={it.label} className="flex items-center gap-2.5 px-3 py-2.5">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.iconBg} ${s.iconColor}`}>
                            <it.icon size={12} />
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{it.label}</span>
                          <span className={`ml-auto text-right text-[11px] font-black ${it.valueClass ?? "text-slate-800"}`}>
                            {it.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setDetailKey(null)} className="mt-3 w-full rounded-2xl bg-slate-100 py-3 text-[11px] font-black uppercase tracking-wide text-slate-600">
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* Booking history drill-down */}
      {historyFor && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setHistoryFor(null)}>
          <div className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-black text-slate-900">Booking History</h3>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              {historyRows.length} booking{historyRows.length === 1 ? "" : "s"} at your venue.
            </p>
            <div className="mt-3 space-y-2">
              {historyRows.map((b) => (
                <div key={b.orderId} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-slate-800">
                      {new Date(b.dateTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${
                        b.status === "Cancelled" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                    {fmtTime(new Date(b.dateTime))} · ₹{b.totalAmount} · {b.payment}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={() => setHistoryFor(null)} className="mt-4 w-full rounded-2xl bg-slate-100 py-3 text-[11px] font-black uppercase tracking-wide text-slate-600">
              Close
            </button>
          </div>
        </div>
      )}

      {messageCtx && <MessageTemplatesModal ctx={messageCtx} onClose={() => setMessageCtx(null)} />}
    </div>
  );
}

function HeaderAction({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: typeof Bell;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls = "flex flex-col items-center gap-0.5 text-slate-400 transition hover:text-slate-700";
  const body = (
    <>
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200">
        <Icon size={13} />
      </span>
      <span className="text-[7px] font-bold">{label}</span>
    </>
  );
  return href ? (
    <a href={href} className={cls}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {body}
    </button>
  );
}
