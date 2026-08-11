"use client";

import { useEffect, useMemo, useState } from "react";
import { X, User, Phone, Building2, IndianRupee, Clock, Trophy, Users, UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { TimeField } from "@/components/vendor/TimeField";
import { useBackDismiss } from "@/lib/useBackDismiss";

export type AddBookingPayment = "Cash (Offline)" | "UPI";

export interface AddBookingValues {
  customerName: string;
  phone: string;
  /** The listing being booked. Named `courtId` since before venues had real courts. */
  courtId: string;
  /** Which court inside that venue. Empty when the venue has no courts configured. */
  venueCourtId: string;
  price: string;
  startTime: string;
  endTime: string;
  sport: string;
  numberOfPlayers: string;
  foodIncluded: boolean;
  payment: AddBookingPayment;
}

function to12h(t: string) {
  if (!t) return "";
  const [hStr = "0", mStr = "00"] = t.split(":");
  let h = Number(hStr) % 24;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ap}`;
}

/**
 * Add Booking — customer name, number, court, price, timing, sport.
 * Timing/price arrive prefilled when opened from a slot, and stay editable.
 */
export function AddBookingSheet({
  courts,
  venueCourts,
  sports,
  bookedCourtIds = [],
  initial,
  submitting,
  onClose,
  onSubmit,
}: {
  /** The vendor's listings/venues — historically called "courts" here. */
  courts: { id: string; title: string }[];
  /** Real courts inside the selected venue. */
  venueCourts: { id: string; name: string; sports?: string[] }[];
  sports: string[];
  bookedCourtIds?: string[];
  initial: Partial<AddBookingValues>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: AddBookingValues) => void;
}) {
  // Device Back closes the sheet instead of leaving the bookings page.
  useBackDismiss(true, onClose);

  const isFromSlotTap = Boolean(initial.startTime || initial.sport || initial.courtId);
  const initialSport = initial.sport ?? sports[0] ?? "";

  const [form, setForm] = useState<AddBookingValues>({
    customerName: initial.customerName ?? "",
    phone: initial.phone ?? "",
    courtId: initial.courtId ?? courts[0]?.id ?? "",
    venueCourtId: initial.venueCourtId ?? venueCourts[0]?.id ?? "",
    price: initial.price ?? "",
    startTime: initial.startTime ?? "06:00",
    endTime: initial.endTime ?? "07:00",
    sport: initialSport,
    numberOfPlayers: initial.numberOfPlayers ?? "",
    foodIncluded: initial.foodIncluded ?? false,
    payment: initial.payment ?? "Cash (Offline)",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = <K extends keyof AddBookingValues>(k: K, v: AddBookingValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /** Filter venueCourts to show ONLY courts that host the selected sport. */
  const filteredCourts = useMemo(() => {
    if (!venueCourts || venueCourts.length === 0) return [];
    if (!form.sport) return venueCourts;
    const targetSport = form.sport.trim().toLowerCase();
    const matched = venueCourts.filter(
      (c) =>
        !c.sports ||
        c.sports.length === 0 ||
        c.sports.some((s) => s.trim().toLowerCase() === targetSport)
    );
    return matched.length > 0 ? matched : venueCourts;
  }, [venueCourts, form.sport]);

  // Keep venueCourtId valid & preselect first unbooked court for the sport
  useEffect(() => {
    if (filteredCourts.length > 0) {
      const isValid = filteredCourts.some((c) => c.id === form.venueCourtId);
      if (!isValid) {
        const firstFree = filteredCourts.find((c) => !bookedCourtIds.includes(c.id)) || filteredCourts[0];
        setForm((f) => ({ ...f, venueCourtId: firstFree.id }));
      }
    }
  }, [filteredCourts, bookedCourtIds, form.venueCourtId]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = "Enter the customer's name.";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit mobile number.";
    if (!form.courtId) e.courtId = "Pick a venue.";
    if (!form.startTime || !form.endTime) e.startTime = "Set the timing.";
    if (form.price === "" || Number(form.price) < 0) e.price = "Enter a valid price.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(form);
  }

  const selectedVenue = courts.find((c) => c.id === form.courtId) || courts[0];

  const inputCls = (bad?: boolean) =>
    `w-full rounded-xl border bg-white px-3 py-2.5 text-[12px] font-semibold text-slate-800 outline-none transition focus:border-vibe-violet ${
      bad ? "border-rose-300" : "border-slate-200"
    }`;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-150">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        {/* Modal Header */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-[15px] font-black text-slate-900">Add Booking</h2>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">Walk-in or phone booking.</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
            <X size={15} />
          </button>
        </div>

        {/* Selected Slot Summary Card (Locked Venue, Sport & Time) */}
        {isFromSlotTap && (
          <div className="mb-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 p-3">
            <div className="flex items-center justify-between text-xs font-black text-emerald-950 mb-1">
              <span className="flex items-center gap-1.5">
                <Building2 size={13} className="text-emerald-600" />
                <span>{selectedVenue?.title}</span>
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white capitalize">
                <Trophy size={10} /> {form.sport}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 mt-1">
              <Clock size={12} className="text-emerald-600" />
              <span>
                {to12h(form.startTime)} – {to12h(form.endTime)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Customer Name */}
          <Field label="Customer Name" icon={User} error={errors.customerName}>
            <input
              value={form.customerName}
              onChange={(e) => update("customerName", e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className={inputCls(!!errors.customerName)}
            />
          </Field>

          {/* Mobile Number */}
          <Field label="Mobile Number" icon={Phone} error={errors.phone}>
            <input
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit number"
              className={inputCls(!!errors.phone)}
            />
          </Field>

          {/* Venue (Dropdown shown only if multiple venues exist and not from slot tap) */}
          {!isFromSlotTap && courts.length > 1 && (
            <Field label="Venue" icon={Building2} error={errors.courtId}>
              <select
                value={form.courtId}
                onChange={(e) => update("courtId", e.target.value)}
                className={inputCls(!!errors.courtId)}
              >
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Court Selection Cards */}
          {filteredCourts.length > 0 && (
            <Field label="Select Court" icon={Building2}>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {filteredCourts.map((c) => {
                  const isBooked = bookedCourtIds.includes(c.id);
                  const isSelected = form.venueCourtId === c.id;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={isBooked}
                      onClick={() => update("venueCourtId", c.id)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-extrabold transition ${
                        isBooked
                          ? "border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed"
                          : isSelected
                          ? "border-vibe-violet bg-vibe-violet text-white shadow-xs ring-2 ring-vibe-violet/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-vibe-violet hover:bg-slate-50 cursor-pointer active:scale-95"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {isBooked ? (
                        <span className="text-[9px] font-black uppercase tracking-wide text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                          Booked
                        </span>
                      ) : isSelected ? (
                        <CheckCircle2 size={14} className="text-white shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {/* Sport (Shown only if not opened from slot tap) */}
          {!isFromSlotTap && (
            <Field label="Sport" icon={Trophy}>
              {sports.length > 0 ? (
                <select value={form.sport} onChange={(e) => update("sport", e.target.value)} className={inputCls()}>
                  {sports.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.sport}
                  onChange={(e) => update("sport", e.target.value)}
                  placeholder="e.g. Cricket"
                  className={inputCls()}
                />
              )}
            </Field>
          )}

          {/* Players & Food */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. of Players" icon={Users}>
              <input
                inputMode="numeric"
                value={form.numberOfPlayers}
                onChange={(e) => update("numberOfPlayers", e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="e.g. 10"
                className={inputCls()}
              />
            </Field>

            <Field label="Food & Beverage" icon={UtensilsCrossed}>
              <button
                type="button"
                onClick={() => update("foodIncluded", !form.foodIncluded)}
                className={`flex h-[42px] w-full items-center justify-between rounded-xl border px-3 text-[11px] font-bold transition ${
                  form.foodIncluded
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <span>{form.foodIncluded ? "Included" : "Not included"}</span>
                <span
                  className={`h-4 w-7 rounded-full p-0.5 transition ${
                    form.foodIncluded ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`block h-3 w-3 rounded-full bg-white transition-transform ${
                      form.foodIncluded ? "translate-x-3" : ""
                    }`}
                  />
                </span>
              </button>
            </Field>
          </div>

          {/* Timing (Shown only if not opened from slot tap) */}
          {!isFromSlotTap && (
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Timing
              </label>
              <div className="grid grid-cols-2 gap-2">
                <TimeField value={form.startTime} onChange={(v) => update("startTime", v)} />
                <TimeField value={form.endTime} onChange={(v) => update("endTime", v)} />
              </div>
              {errors.startTime && <p className="mt-1 text-[10px] font-bold text-rose-500">{errors.startTime}</p>}
            </div>
          )}

          {/* Price */}
          <Field label="Price" icon={IndianRupee} error={errors.price}>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-slate-400">₹</span>
              <input
                inputMode="numeric"
                value={form.price}
                onChange={(e) => update("price", e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className={`pl-7 ${inputCls(!!errors.price)}`}
              />
            </div>
          </Field>

          {/* Payment Mode */}
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
              Payment Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["Cash (Offline)", "UPI"] as AddBookingPayment[]).map((mode) => {
                const isSelected = form.payment === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => update("payment", mode)}
                    className={`rounded-xl border py-2.5 text-[11px] font-bold transition ${
                      isSelected
                        ? "border-vibe-violet bg-vibe-violet/10 text-vibe-violet"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-xl bg-vibe-violet py-3 text-[12px] font-black text-white transition hover:bg-vibe-violet/90 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? "Saving…" : "Save Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
        <Icon size={11} className="text-slate-400" />
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-[10px] font-bold text-rose-500">{error}</p>}
    </div>
  );
}
