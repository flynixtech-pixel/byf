"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Clock,
  QrCode,
  ScanLine,
  Store,
  Users,
  X,
} from "lucide-react";
import { PageHero, Badge } from "@/components/vendor/ui";
import { QrScannerModal } from "@/components/vendor/bookings/QrScannerModal";
import {
  checkInVendorTableBooking,
  getVendorTableBooking,
  getVendorTableBookings,
  listVendorOutlets,
  updateVendorTableBookingStatus,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { FoodOutlet, TableBooking, TableBookingStatus } from "@/lib/api/types";

const STATUS_TONE: Record<TableBookingStatus, "success" | "pending" | "danger" | "info" | "neutral"> = {
  Pending: "pending",
  Confirmed: "info",
  Rejected: "danger",
  Seated: "success",
  Completed: "success",
  Cancelled: "neutral",
  NoShow: "danger",
};

const STATUS_FILTERS: ("All" | TableBookingStatus)[] = [
  "All",
  "Pending",
  "Confirmed",
  "Seated",
  "Completed",
  "Rejected",
  "Cancelled",
  "NoShow",
];

const SCOPES = [
  { key: "upcoming", label: "Upcoming", hint: "Pending, confirmed & seated" },
  { key: "history", label: "History", hint: "Completed, rejected & cancelled" },
  { key: "all", label: "All", hint: "Every reservation, all restaurants" },
] as const;

type Scope = (typeof SCOPES)[number]["key"];

function humanTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h ?? 0;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function VendorReservationsPage() {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [outlets, setOutlets] = useState<FoodOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("upcoming");
  const [status, setStatus] = useState<"All" | TableBookingStatus>("All");
  const [outletId, setOutletId] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [detail, setDetail] = useState<TableBooking | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    listVendorOutlets()
      .then(setOutlets)
      .catch(() => setOutlets([]));
  }, []);

  const refresh = useCallback(() => {
    getVendorTableBookings({
      status: status === "All" ? undefined : status,
      scope: scope === "all" ? undefined : scope,
      outletId: outletId || undefined,
      limit: 200,
    })
      .then((res) => setBookings(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load reservations"))
      .finally(() => setLoading(false));
  }, [status, scope, outletId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const outletName = useCallback((id?: string) => outlets.find((o) => o._id === id)?.name ?? "—", [outlets]);

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todays = bookings.filter((b) => new Date(b.date).setHours(0, 0, 0, 0) === today.getTime());
    return {
      count: todays.length,
      covers: todays
        .filter((b) => ["Confirmed", "Seated", "Completed"].includes(b.status))
        .reduce((sum, b) => sum + b.partySize, 0),
      pending: bookings.filter((b) => b.status === "Pending").length,
    };
  }, [bookings]);

  async function handleLookup(bookingId: string) {
    if (!bookingId.trim()) return;
    setLooking(true);
    setScanResult(null);
    try {
      setDetail(await getVendorTableBooking(bookingId.trim()));
    } catch (err) {
      setScanResult({ ok: false, message: err instanceof ApiError ? err.describe() : "Booking not found" });
    } finally {
      setLooking(false);
    }
  }

  /** A scanned QR opens the reservation so the host can check the party before seating them. */
  async function handleQrScan(bookingId: string): Promise<string> {
    const booking = await getVendorTableBooking(bookingId).catch((e) => {
      throw new Error(e instanceof ApiError ? e.describe() : "Booking not found");
    });
    setDetail(booking);
    return `${booking.customerName} — ${booking.partySize} guest(s) at ${humanTime(booking.slotTime)}`;
  }

  async function handleStatus(booking: TableBooking, next: Exclude<TableBookingStatus, "Pending">) {
    setWorking(true);
    try {
      await updateVendorTableBookingStatus(booking.bookingId, next);
      setDetail(null);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to update booking");
    } finally {
      setWorking(false);
    }
  }

  async function handleSeat(bookingId: string) {
    setWorking(true);
    try {
      const booking = await checkInVendorTableBooking(bookingId);
      setScanResult({ ok: true, message: `${booking.customerName} — party seated` });
      setDetail(null);
      setScanInput("");
      refresh();
    } catch (err) {
      setScanResult({ ok: false, message: err instanceof ApiError ? err.describe() : "Could not seat this party" });
      setDetail(null);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Dineout"
        title="Table Reservations"
        description="Bookings players made from the app — confirm them, then scan the QR to seat the party."
        right={
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
            <CalendarCheck2 size={16} /> {bookings.length} Booking(s)
          </span>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today's bookings", value: todayStats.count, tint: "text-vibe-violet" },
          { label: "Covers today", value: todayStats.covers, tint: "text-emerald-600" },
          { label: "Awaiting you", value: todayStats.pending, tint: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel">
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${s.tint}`}>{s.label}</p>
            <p className="mt-1 text-2xl font-black text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Scan to seat */}
      <div className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-vibe-violet">
            <QrCode size={13} /> Seat a Party
          </p>
          <button
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-vibe-navyDark"
          >
            <ScanLine size={14} /> Scan Booking QR
          </button>
        </div>
        <p className="mt-0.5 text-xs text-ink-faint">
          Scan the QR on the guest&apos;s booking — you&apos;ll see the party details, then confirm seating.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup(scanInput)}
            placeholder="e.g. BYV-MR7FB67W-1EFF26"
            className="flex-1 rounded-lg border border-surface-border px-3 py-2.5 font-mono text-sm outline-none focus:border-vibe-violet"
          />
          <button
            onClick={() => handleLookup(scanInput)}
            disabled={looking}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
          >
            <CheckCircle2 size={15} /> {looking ? "Looking up..." : "Look Up Booking"}
          </button>
        </div>
        {scanResult && (
          <p className={`mt-2 text-xs font-semibold ${scanResult.ok ? "text-vibe-limeDark" : "text-vibe-coral"}`}>
            {scanResult.message}
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setScope(s.key);
              setStatus("All");
            }}
            className={`rounded-xl2 border p-3 text-left transition ${
              scope === s.key ? "border-vibe-violet bg-vibe-violet/5" : "border-surface-border bg-white hover:bg-cream-200/50"
            }`}
          >
            <p className={`text-sm font-bold ${scope === s.key ? "text-vibe-violet" : "text-ink"}`}>{s.label}</p>
            <p className="text-[11px] text-ink-faint">{s.hint}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl2 border border-surface-border bg-white shadow-panel">
        <div className="space-y-3 border-b border-surface-border p-4 sm:p-5">
          {outlets.length > 1 && (
            <div className="flex items-center gap-2">
              <Store size={15} className="shrink-0 text-vibe-violet" />
              <div className="relative flex-1 sm:max-w-xs">
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-surface-border bg-white px-3 py-2 pr-9 text-sm font-semibold outline-none focus:border-vibe-violet"
                >
                  <option value="">All restaurants ({outlets.length})</option>
                  {outlets.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  status === s ? "bg-vibe-violet text-white" : "border border-surface-border text-ink-soft hover:bg-cream-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="px-5 py-3 text-xs text-vibe-coral">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Guest</th>
                <th className="px-5 py-3 font-semibold">Restaurant</th>
                <th className="px-5 py-3 font-semibold">Party</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id} className="border-b border-surface-border last:border-0 hover:bg-cream-200/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-ink">{dayLabel(b.date)}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
                      <Clock size={10} /> {humanTime(b.slotTime)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink">{b.customerName}</p>
                    <p className="text-[11px] text-ink-faint">{b.phone}</p>
                    {b.occasion && <p className="text-[11px] font-semibold text-vibe-violet">{b.occasion}</p>}
                  </td>
                  <td className="px-5 py-4 text-xs text-ink-soft">{outletName(b.outletId)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-ink">
                      <Users size={13} className="text-ink-faint" /> {b.partySize}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {b.status === "Pending" && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleStatus(b, "Confirmed")}
                          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleStatus(b, "Rejected")}
                          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-vibe-coral hover:bg-vibe-coral/10"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {b.status === "Confirmed" && (
                      <button
                        onClick={() => setDetail(b)}
                        className="rounded-lg bg-vibe-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-vibe-violetSoft"
                      >
                        Seat Party
                      </button>
                    )}
                    {b.status === "Seated" && (
                      <button
                        onClick={() => handleStatus(b, "Completed")}
                        className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
                      >
                        Mark Done
                      </button>
                    )}
                    {["Completed", "Rejected", "Cancelled", "NoShow"].includes(b.status) && (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-ink-faint">
                    Loading reservations...
                  </td>
                </tr>
              )}
              {!loading && bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-ink-faint">
                    No reservations match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {qrOpen && <QrScannerModal onClose={() => setQrOpen(false)} onCheckIn={handleQrScan} />}

      {detail && (
        <BookingDetailModal
          booking={detail}
          outletName={outletName(detail.outletId)}
          busy={working}
          onClose={() => setDetail(null)}
          onSeat={() => handleSeat(detail.bookingId)}
          onConfirm={() => handleStatus(detail, "Confirmed")}
          onNoShow={() => handleStatus(detail, "NoShow")}
        />
      )}
    </div>
  );
}

/** Full reservation behind a scanned QR — who's arriving, and the seat action. */
function BookingDetailModal({
  booking,
  outletName,
  busy,
  onClose,
  onSeat,
  onConfirm,
  onNoShow,
}: {
  booking: TableBooking;
  outletName: string;
  busy: boolean;
  onClose: () => void;
  onSeat: () => void;
  onConfirm: () => void;
  onNoShow: () => void;
}) {
  const closed = ["Completed", "Rejected", "Cancelled", "NoShow"].includes(booking.status);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 bg-vibe-navy px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Reservation</p>
            <p className="truncate font-mono text-sm font-bold">{booking.bookingId}</p>
            <p className="text-[11px] text-white/70">{outletName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
            {booking.occasion && (
              <span className="rounded-full bg-cream-300 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                {booking.occasion}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-surface-border p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">When</p>
              <p className="mt-0.5 text-sm font-bold text-ink">{dayLabel(booking.date)}</p>
              <p className="text-xs text-ink-soft">{humanTime(booking.slotTime)}</p>
            </div>
            <div className="rounded-2xl border border-surface-border p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Party size</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-ink">
                <Users size={14} className="text-vibe-violet" /> {booking.partySize} guest
                {booking.partySize === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border p-3.5">
            <p className="text-sm font-bold text-ink">{booking.customerName}</p>
            <p className="text-xs text-ink-faint">{booking.phone}</p>
            {booking.specialRequests && (
              <p className="mt-1.5 text-xs italic text-ink-soft">“{booking.specialRequests}”</p>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-surface-border p-4">
          {closed ? (
            <p className="text-center text-xs font-semibold text-ink-faint">
              This reservation is already {booking.status.toLowerCase()}.
            </p>
          ) : booking.status === "Seated" ? (
            <p className="text-center text-xs font-semibold text-ink-faint">This party is already seated.</p>
          ) : (
            <>
              {booking.status === "Pending" && (
                <button
                  onClick={onConfirm}
                  disabled={busy}
                  className="w-full rounded-xl border border-surface-border py-3 text-sm font-bold text-ink-soft hover:bg-cream-200 disabled:opacity-60"
                >
                  Confirm Booking
                </button>
              )}
              <button
                onClick={onSeat}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-vibe-violet py-3.5 text-sm font-bold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
              >
                <CheckCircle2 size={16} /> {busy ? "Seating…" : "Confirm & Seat Party"}
              </button>
              <button
                onClick={onNoShow}
                disabled={busy}
                className="w-full py-1 text-xs font-semibold text-ink-faint underline-offset-2 hover:text-vibe-coral hover:underline disabled:opacity-60"
              >
                Mark as no-show
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
