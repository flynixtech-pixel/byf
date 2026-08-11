"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CalendarDays, Check, Clock, Minus, Plus, Sparkles, Users, X } from "lucide-react";
import { bookTable, getBookingSlots } from "@/lib/api/dineout";
import { ApiError } from "@/lib/api/client";
import type { BookingSlot, FoodOutlet, TableBooking } from "@/lib/api/types";

const OCCASIONS = ["Casual", "Birthday", "Anniversary", "Date night", "Business", "Team outing"];
const SEATING_FALLBACK = ["Indoor", "Outdoor", "Terrace", "Window"];
const BOOKING_OFFERS = [
  {
    code: "PREBOOK10",
    label: "Flat dining discount",
    description: "Reserve now and keep the restaurant's dining offer attached to the booking.",
  },
  {
    code: "DINECASH",
    label: "Earn 10% DineCash",
    description: "Cashback is credited after you pay the dine-in bill through BookYourVibe.",
  },
  {
    code: "OCCASION",
    label: "Occasion setup",
    description: "Prioritized for birthday, anniversary, and group-celebration tables.",
  },
] as const;

/** "YYYY-MM-DD" in local time — the API keys reservations by calendar day, not UTC instant. */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function humanTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h ?? 0;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

/**
 * Table reservation flow: pick a day, a slot, and a party size.
 *
 * Slots come from the server for the chosen day, so a player never sees a table that's
 * already gone. Whether the booking lands Confirmed or Pending is the restaurant's call
 * (its auto-confirm setting), and the success screen says which.
 */
export function TableBookingSheet({
  outlet,
  onClose,
  onBooked,
}: {
  outlet: FoodOutlet;
  onClose: () => void;
  onBooked?: (booking: TableBooking) => void;
}) {
  const maxParty = outlet.dineout?.maxPartySize ?? 20;
  const advanceDays = outlet.dineout?.advanceDays ?? 30;
  const seatingOptions = useMemo(() => {
    const options = outlet.dineout?.seatingOptions?.filter(Boolean) ?? [];
    return options.length > 0 ? options : SEATING_FALLBACK;
  }, [outlet.dineout?.seatingOptions]);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: Math.min(advanceDays, 14) }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, [advanceDays]);

  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  /** Bumped to force a re-fetch of the same day after a slot is lost to someone else. */
  const [reloadToken, setReloadToken] = useState(0);
  /**
   * Slots tagged with the day they were fetched for. Comparing that tag against the
   * selected day derives "still loading" without a second piece of state to keep in sync.
   */
  const [slotsResult, setSlotsResult] = useState<{
    key: string;
    slots: BookingSlot[];
    closedNote: string | null;
  } | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [seatingPreference, setSeatingPreference] = useState<string>(seatingOptions[0] ?? "Indoor");
  const [selectedOfferCode, setSelectedOfferCode] = useState<string>(BOOKING_OFFERS[0]!.code);
  const [occasion, setOccasion] = useState<string>("");
  const [requests, setRequests] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<TableBooking | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const outletKey = outlet.slug || outlet._id;
  const slotsKey = `${dateKey}#${reloadToken}`;

  const fresh = slotsResult?.key === slotsKey ? slotsResult : null;
  const slots = fresh?.slots ?? [];
  const closedNote = fresh?.closedNote ?? null;
  const loadingSlots = !fresh;

  /**
   * Honour the player's pick only while it's still bookable on the day being shown.
   * Changing the date, or a slot filling up under them, clears the selection by itself.
   */
  const slotTime = pickedTime && slots.some((s) => s.time === pickedTime && s.available) ? pickedTime : null;

  const activeSeatingPreference = seatingOptions.includes(seatingPreference)
    ? seatingPreference
    : seatingOptions[0] ?? "Indoor";

  useEffect(() => {
    let cancelled = false;
    getBookingSlots(outletKey, dateKey)
      .then((res) => {
        if (cancelled) return;
        setSlotsResult({
          key: slotsKey,
          slots: res.slots,
          closedNote: res.closed ? res.reason ?? "Closed on this day" : null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setSlotsResult({
          key: slotsKey,
          slots: [],
          closedNote: err instanceof ApiError ? err.describe() : "Could not load slots",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [outletKey, dateKey, slotsKey]);

  async function handleConfirm() {
    if (!slotTime || booking) return;
    setBooking(true);
    setError(null);
    try {
      const result = await bookTable({
        outletId: outletKey,
        date: dateKey,
        slotTime,
        partySize,
        seatingPreference: activeSeatingPreference,
        selectedOfferCode,
        occasion: occasion || undefined,
        specialRequests: requests.trim() || undefined,
      });
      setConfirmed(result);
      onBooked?.(result);
      try {
        setQrUrl(
          await QRCode.toDataURL(JSON.stringify({ orderId: result.bookingId, outletId: result.outletId }), {
            margin: 0,
            width: 180,
            color: { dark: "#0f172a", light: "#ffffff" },
          })
        );
      } catch {
        setQrUrl(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Could not book that table");
      // The slot may have gone while they were deciding — refresh what's left.
      setReloadToken((n) => n + 1);
    } finally {
      setBooking(false);
    }
  }

  /* ---------------------------- Confirmation ---------------------------- */

  if (confirmed) {
    const isConfirmed = confirmed.status === "Confirmed";
    return (
      <Shell onClose={onClose} title="Table Booking">
        <div className="overflow-y-auto p-6 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              isConfirmed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            }`}
          >
            {isConfirmed ? <Check className="h-8 w-8" strokeWidth={3} /> : <Clock className="h-8 w-8" />}
          </div>
          <h2 className="mt-3 text-xl font-extrabold text-slate-900">
            {isConfirmed ? "Table Confirmed!" : "Booking Requested"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {isConfirmed
              ? `${outlet.name} is expecting you.`
              : `${outlet.name} will confirm shortly — you'll see it under My Bookings.`}
          </p>

          <div className="mt-4 space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs">
            <Row label="Booking ID" value={confirmed.bookingId} mono />
            <Row
              label="Date"
              value={new Date(confirmed.date).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            />
            <Row label="Time" value={humanTime(confirmed.slotTime)} />
            <Row label="Guests" value={`${confirmed.partySize}`} />
            {confirmed.seatingPreference && <Row label="Seating" value={confirmed.seatingPreference} />}
            {confirmed.selectedOfferCode && <Row label="Reserved offer" value={confirmed.selectedOfferCode} />}
            {confirmed.occasion && <Row label="Occasion" value={confirmed.occasion} />}
            {outlet.dineout?.flatDiscountPct > 0 && (
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-emerald-700">
                <span>Your discount on the bill</span>
                <span>{outlet.dineout.flatDiscountPct}% off</span>
              </div>
            )}
          </div>

          {qrUrl && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-3.5">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Show this at the restaurant
              </p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="Booking QR" className="h-36 w-36 rounded-xl border border-slate-100 p-1" />
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-5 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </Shell>
    );
  }

  /* ------------------------------ Booking form ------------------------------ */

  const selectedSlot = slots.find((s) => s.time === slotTime);

  return (
    <Shell onClose={onClose} title="Book a table" subtitle={outlet.name}>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {/* Day strip */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" /> Select date
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d, i) => {
              const key = toDateKey(d);
              const active = key === dateKey;
              return (
                <button
                  key={key}
                  onClick={() => setDateKey(key)}
                  className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition ${
                    active
                      ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase ${active ? "text-brand-700" : "text-slate-400"}`}>
                    {i === 0 ? "Today" : i === 1 ? "Tmrw" : d.toLocaleDateString("en-IN", { weekday: "short" })}
                  </span>
                  <span className={`text-lg font-extrabold ${active ? "text-brand-700" : "text-slate-900"}`}>
                    {d.getDate()}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {d.toLocaleDateString("en-IN", { month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Select time
          </p>
          {loadingSlots ? (
            <p className="py-6 text-center text-sm text-slate-400">Checking availability…</p>
          ) : closedNote ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">
              {closedNote}
            </p>
          ) : slots.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              No slots for this day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => {
                const active = s.time === slotTime;
                return (
                  <button
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setPickedTime(s.time)}
                    title={s.reason}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                      !s.available
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through"
                        : active
                          ? "border-brand-500 bg-brand-50/60 text-brand-700 ring-2 ring-brand-500/30"
                          : "border-slate-200 text-slate-700 hover:border-brand-400"
                    }`}
                  >
                    {humanTime(s.time)}
                  </button>
                );
              })}
            </div>
          )}
          {selectedSlot && selectedSlot.seatsLeft <= 3 && (
            <p className="mt-2 text-[11px] font-semibold text-amber-600">
              Only {selectedSlot.seatsLeft} table{selectedSlot.seatsLeft === 1 ? "" : "s"} left at this time.
            </p>
          )}
        </div>

        {/* Party size */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Users className="h-3.5 w-3.5" /> Guests
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                disabled={partySize <= 1}
                aria-label="Fewer guests"
                className="flex h-10 w-10 items-center justify-center text-slate-600 disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-lg font-extrabold text-slate-900">{partySize}</span>
              <button
                onClick={() => setPartySize((n) => Math.min(maxParty, n + 1))}
                disabled={partySize >= maxParty}
                aria-label="More guests"
                className="flex h-10 w-10 items-center justify-center text-slate-600 disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">Up to {maxParty} guests per booking</p>
          </div>
        </div>

        {/* Seating preference */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Seating preference</p>
          <div className="flex flex-wrap gap-2">
            {seatingOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSeatingPreference(option)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  activeSeatingPreference === option
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Booking offer */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Lock an offer</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {BOOKING_OFFERS.map((offer) => (
              <button
                key={offer.code}
                type="button"
                onClick={() => setSelectedOfferCode(offer.code)}
                className={`rounded-2xl border p-3 text-left transition ${
                  selectedOfferCode === offer.code
                    ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-600">
                  <Sparkles className="h-3 w-3" /> {offer.code}
                </span>
                <p className="text-xs font-bold text-slate-900">{offer.label}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{offer.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Occasion */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Occasion (optional)</p>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <button
                key={o}
                onClick={() => setOccasion(occasion === o ? "" : o)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  occasion === o
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Special requests (optional)</p>
          <textarea
            value={requests}
            onChange={(e) => setRequests(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Window seat, high chair, birthday cake…"
            className="w-full resize-none rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 placeholder:text-slate-400"
          />
        </div>

        {error && <p className="rounded-xl bg-rose-50 p-3 text-center text-xs font-semibold text-rose-600">{error}</p>}
      </div>

      <div className="border-t border-slate-100 p-4">
        {outlet.dineout?.flatDiscountPct > 0 && (
          <p className="mb-2 text-center text-[11px] font-bold text-emerald-700">
            Flat {outlet.dineout.flatDiscountPct}% off when you pay your bill through the app
          </p>
        )}
        <button
          onClick={handleConfirm}
          disabled={!slotTime || booking}
          className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition hover:scale-[1.01] disabled:opacity-50"
        >
          {booking
            ? "Booking…"
            : slotTime
              ? `Confirm ${partySize} guest${partySize === 1 ? "" : "s"} · ${humanTime(slotTime)}`
              : "Select a time"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-900 px-5 py-4 text-white">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
            {subtitle && <p className="truncate text-[11px] text-slate-300">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-slate-500">{label}</span>
      <span className={`font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
