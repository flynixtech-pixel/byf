"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronRight, Clock, ShieldCheck, Trophy, Users, X } from "lucide-react";
import { browseVenues, getVenueAvailability, type BookedRange } from "@/lib/api/venues";
import { createHostedMatch, confirmHostPayment } from "@/lib/api/hostedMatches";
import { ApiError } from "@/lib/api/client";
import type { HostedMatch, Listing } from "@/lib/api/types";
import { nowMinutes as minutesOfDay } from "@/lib/lastMinBoost";

const POPULAR_SPORTS = ["Cricket", "Football", "Badminton", "Pickleball", "Tennis", "Volleyball", "Basketball"];

function to24Hour(t12: string): string {
  if (!t12) return "00:00";
  const [time, modifier] = t12.split(" ");
  let [hours, minutes] = (time || "").split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = String(parseInt(hours || "0", 10) + 12);
  return `${(hours || "0").padStart(2, "0")}:${(minutes || "0").padStart(2, "0")}`;
}

function time24ToMinutes(t: string): number {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
}

export function HostMatchModal({
  onClose,
  onMatchCreated,
}: {
  onClose: () => void;
  onMatchCreated: (match: HostedMatch) => void;
}) {
  const [step, setStep] = useState<"details" | "slots" | "pricing" | "checkout">("details");
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [sport, setSport] = useState<string>("Cricket");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0] || "");
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Pricing & Capacity state
  const [pricingType, setPricingType] = useState<"host_pays_all" | "split_cost">("split_cost");
  const [entryFee, setEntryFee] = useState<number>(200);
  const [maxPlayers, setMaxPlayers] = useState<number>(6);

  // Host info
  const [hostName, setHostName] = useState<string>("");
  const [hostPhone, setHostPhone] = useState<string>("");

  // Submission & Payment Gateway state
  const [submitting, setSubmitting] = useState(false);
  const [createdMatch, setCreatedMatch] = useState<HostedMatch | null>(null);
  const [paymentGatewayOpen, setPaymentGatewayOpen] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    browseVenues()
      .then((res) => {
        if (cancelled) return;
        setListings(res.items);
        if (res.items.length > 0 && res.items[0]) {
          setSelectedListingId(res.items[0]._id);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingListings(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedListing = listings.find((l) => l._id === selectedListingId);

  // Fetch slot availability when date or venue changes
  useEffect(() => {
    if (!selectedListingId || !date) return;
    let cancelled = false;
    getVenueAvailability(selectedListingId, date)
      .then((ranges) => {
        if (!cancelled) setBookedRanges(ranges);
      })
      .catch(() => {
        if (!cancelled) setBookedRanges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedListingId, date]);

  // Generate 1-hour selectable slot cards
  const generatedSlots = useMemo(() => {
    const isToday = date === new Date().toISOString().split("T")[0];
    const nowMin = isToday ? minutesOfDay() : -1;
    const basePrice = selectedListing?.price || 1000;
    const slots = [];

    for (let hour = 6; hour <= 23; hour++) {
      const sStartMin = hour * 60;
      const sEndMin = sStartMin + 60;
      const startStr = `${String(hour).padStart(2, "0")}:00`;
      const endStr = `${String((hour + 1) % 24).padStart(2, "0")}:00`;

      let h12 = hour % 12 || 12;
      let ampm = hour < 12 ? "AM" : "PM";
      let endH12 = (hour + 1) % 12 || 12;
      let endAmpm = (hour + 1) < 12 || (hour + 1) === 24 ? "AM" : "PM";
      const label = `${h12}:00 ${ampm} – ${endH12}:00 ${endAmpm}`;

      const isPast = isToday && sStartMin < nowMin;
      const isBooked = bookedRanges.some((r) => {
        const bStart = time24ToMinutes(r.startTime);
        let bEnd = time24ToMinutes(r.endTime);
        if (bEnd <= bStart) bEnd += 1440;
        return sStartMin < bEnd && bStart < sEndMin;
      });

      slots.push({
        index: hour - 6,
        startTime: startStr,
        endTime: endStr,
        label,
        price: basePrice,
        disabled: isPast || isBooked,
        reason: isPast ? "Past" : isBooked ? "Booked" : undefined,
      });
    }
    return slots;
  }, [date, selectedListing, bookedRanges]);

  const selectedSlot = selectedSlotIndex !== null ? generatedSlots[selectedSlotIndex] : null;

  const totalTurfCost = selectedSlot ? selectedSlot.price : (selectedListing?.price || 1000);
  const hostPayNow = pricingType === "host_pays_all" ? totalTurfCost : Math.max(1, entryFee);

  async function handleCreateMatch() {
    if (!selectedListing || !selectedSlot || !hostPhone) {
      setError("Please fill in all required match details and phone number.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const dateTime = new Date(`${date}T${selectedSlot.startTime}:00`).toISOString();
      const match = await createHostedMatch({
        listingId: selectedListing._id,
        sport,
        dateTime,
        durationMinutes: 60,
        pricingType,
        entryFeePerPlayer: pricingType === "split_cost" ? entryFee : 0,
        maxPlayers,
        hostName: hostName || "Match Host",
        hostPhone,
      });
      setCreatedMatch(match);
      setPaymentGatewayOpen(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to create match. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmHostPayment() {
    if (!createdMatch) return;
    setConfirmingPayment(true);
    setError("");
    try {
      const confirmed = await confirmHostPayment(createdMatch.matchId);
      onMatchCreated(confirmed);
      setPaymentGatewayOpen(false);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Host payment confirmation failed.");
    } finally {
      setConfirmingPayment(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60 backdrop-blur-md p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-600 p-5 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
                <Trophy className="h-5 w-5 text-white" />
              </span>
              <div>
                <h3 className="text-base font-extrabold tracking-wide uppercase">Host a Match</h3>
                <p className="text-[11px] text-emerald-100 font-medium">Create a lobby & invite players</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Step Progress Pills */}
          <div className="mt-4 grid grid-cols-3 gap-1.5 text-center text-[10px] font-extrabold uppercase tracking-wider">
            <div className={`py-1 rounded-full ${step === "details" ? "bg-white text-brand-700" : "bg-white/20 text-white"}`}>
              1. Venue
            </div>
            <div className={`py-1 rounded-full ${step === "slots" ? "bg-white text-brand-700" : "bg-white/20 text-white"}`}>
              2. Time Slot
            </div>
            <div className={`py-1 rounded-full ${step === "pricing" || step === "checkout" ? "bg-white text-brand-700" : "bg-white/20 text-white"}`}>
              3. Entry Fee
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* STEP 1: VENUE & SPORT */}
          {step === "details" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Select Venue / Turf *</label>
                {loadingListings ? (
                  <div className="py-4 text-slate-400">Loading venues...</div>
                ) : (
                  <select
                    value={selectedListingId}
                    onChange={(e) => setSelectedListingId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-semibold text-slate-800 outline-none focus:border-brand-500 text-sm"
                  >
                    {listings.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.title} ({l.city}) — ₹{l.price}/hr
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1.5 block font-bold uppercase tracking-wider text-slate-500">Select Sport *</label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SPORTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSport(s)}
                      className={`rounded-2xl border px-3.5 py-2 font-bold transition ${
                        sport === s
                          ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-400"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Match Date *</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelectedSlotIndex(null);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-semibold text-slate-800 outline-none focus:border-brand-500 text-sm"
                />
              </div>

              <button
                type="button"
                disabled={!selectedListingId || !date}
                onClick={() => setStep("slots")}
                className="w-full rounded-2xl bg-brand-600 hover:bg-brand-700 py-3.5 font-bold uppercase tracking-wide text-white shadow-md shadow-brand-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>Select Available Slot</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 2: 1-HOUR TIME SLOT CARD GRID */}
          {step === "slots" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Select 1-Hour Time Slot</h4>
                  <p className="text-[11px] text-slate-500">Pick any available card to host your match</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  Change Date
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
                {generatedSlots.map((s) => {
                  const isSelected = selectedSlotIndex === s.index;
                  return (
                    <button
                      key={s.index}
                      type="button"
                      disabled={s.disabled}
                      onClick={() => setSelectedSlotIndex(s.index)}
                      className={`rounded-2xl border p-3 text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400"
                          : s.disabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                          : "border-slate-200 bg-white text-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30"
                      }`}
                    >
                      <div>
                        <p className="text-[11px] font-extrabold leading-tight">{s.label}</p>
                        <p className={`mt-1 text-[10px] font-bold ${isSelected ? "text-white/90" : "text-slate-500"}`}>
                          1 Hour Duration
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t pt-1.5 border-current/10">
                        <span className="font-extrabold text-xs">₹{s.price}</span>
                        {s.disabled && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">
                            {s.reason}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={selectedSlotIndex === null}
                  onClick={() => setStep("pricing")}
                  className="flex-1 rounded-2xl bg-brand-600 hover:bg-brand-700 py-3 font-bold uppercase text-white shadow-md shadow-brand-500/30 transition disabled:opacity-50"
                >
                  Next: Entry Fee
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ENTRY FEE & MAX PLAYERS */}
          {step === "pricing" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Configure Entry Fee</h4>
                <p className="text-[11px] text-slate-500">Choose how turf costs are split with joining players</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPricingType("split_cost")}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    pricingType === "split_cost"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <p className="font-extrabold text-xs">Split Cost with Players</p>
                  <p className="text-[10px] text-slate-500 mt-1">Host sets entry fee (e.g. ₹200). Players pay to join.</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPricingType("host_pays_all");
                    setEntryFee(0);
                  }}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    pricingType === "host_pays_all"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <p className="font-extrabold text-xs">Host Pays All</p>
                  <p className="text-[10px] text-slate-500 mt-1">Host pays 100% turf fee upfront. Players join for ₹0.</p>
                </button>
              </div>

              {pricingType === "split_cost" && (
                <div>
                  <label className="mb-1 block font-bold uppercase tracking-wider text-slate-500">
                    Entry Fee Per Player (₹) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={entryFee}
                    onChange={(e) => setEntryFee(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 font-extrabold text-slate-900 outline-none focus:border-brand-500 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block font-bold uppercase tracking-wider text-slate-500">
                  Maximum Players Limit *
                </label>
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 font-extrabold text-slate-900 outline-none focus:border-brand-500 text-sm"
                />
              </div>

              {/* Host Contact info */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
                <p className="font-bold text-slate-800">Host Contact Info</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Host Name"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit Phone"
                    value={hostPhone}
                    onChange={(e) => setHostPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Cost Summary Preview Card */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Total Turf Booking Cost</span>
                  <span className="font-bold text-slate-800">₹{totalTurfCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Host Pay Now to Reserve Slot</span>
                  <span className="text-sm font-black">₹{hostPayNow.toLocaleString("en-IN")}</span>
                </div>
                {pricingType === "split_cost" && (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>Entry Fee Charged to Players</span>
                    <span className="font-extrabold">₹{entryFee.toLocaleString("en-IN")} / player</span>
                  </div>
                )}
              </div>

              {error && <p className="rounded-xl bg-rose-50 p-2.5 text-center text-xs font-semibold text-rose-600">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("slots")}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting || !hostPhone}
                  onClick={handleCreateMatch}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 font-extrabold uppercase text-white shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  {submitting ? "Creating..." : `PAY ₹${hostPayNow.toLocaleString("en-IN")} & HOST`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Host Payment Gateway Modal */}
      {paymentGatewayOpen && createdMatch && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-white" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide">Host Payment Gateway</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentGatewayOpen(false)}
                  className="rounded-full bg-white/10 p-1.5 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs font-mono font-bold text-emerald-100 mt-2">Reference: {createdMatch.matchId}</p>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Venue</span>
                  <span className="font-bold text-slate-800">{selectedListing?.title}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                  <span>Host Upfront Payment</span>
                  <span className="text-base font-black">₹{createdMatch.hostPaidAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {error && <p className="rounded-xl bg-rose-50 p-2.5 text-center font-semibold text-rose-600">{error}</p>}

              <button
                type="button"
                disabled={confirmingPayment}
                onClick={handleConfirmHostPayment}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 font-extrabold uppercase text-white shadow-lg shadow-emerald-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {confirmingPayment ? "Confirming Host Payment..." : `COMPLETE PAYMENT OF ₹${createdMatch.hostPaidAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
