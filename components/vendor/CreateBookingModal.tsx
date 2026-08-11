"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createVendorBooking, getVendorListings } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { TimeField } from "./TimeField";
import { Booking, Listing, PaymentMethod, BookingStatus } from "@/lib/api/types";

const PAYMENT_METHODS: PaymentMethod[] = ["Cashfree (Online)", "Cash (Offline)", "UPI"];
const STATUSES: BookingStatus[] = ["Confirmed", "Pending", "Completed", "Cancelled"];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (booking: Booking) => void;
}

function emptyState(firstListingId: string) {
  return {
    customer: "",
    phone: "",
    listingId: firstListingId,
    date: "",
    time: "",
    totalAmount: "",
    payment: PAYMENT_METHODS[0],
    status: STATUSES[0],
  };
}

export default function CreateBookingModal({ open, onClose, onCreate }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [form, setForm] = useState(emptyState(""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getVendorListings()
      .then((items) => {
        setListings(items);
        setForm((f) => ({ ...f, listingId: f.listingId || items[0]?._id || "" }));
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.describe() : "Failed to load listings"));
  }, [open]);

  if (!open) return null;

  function update<K extends keyof ReturnType<typeof emptyState>>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.customer.trim()) e.customer = "Customer name is required.";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit phone number.";
    if (!form.listingId) e.listingId = "Select a listing.";
    if (!form.date) e.date = "Select a date.";
    if (!form.time) e.time = "Select a time.";
    const amount = Number(form.totalAmount);
    if (!amount || amount <= 0) e.totalAmount = "Enter a valid amount.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const dateTime = new Date(`${form.date}T${form.time}:00`).toISOString();
      const booking = await createVendorBooking({
        listingId: form.listingId,
        customerName: form.customer.trim(),
        phone: form.phone,
        dateTime,
        totalAmount: Number(form.totalAmount),
        payment: form.payment,
        status: form.status,
      });
      onCreate(booking);
      setForm(emptyState(listings[0]?._id ?? ""));
      onClose();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.describe() : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl2 bg-white shadow-pop">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-display font-semibold text-ink text-lg">Create Booking</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-faint hover:bg-cream-300"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {loadError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-vibe-coral">{loadError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Customer Name" error={errors.customer}>
              <input
                value={form.customer}
                onChange={(e) => update("customer", e.target.value)}
                className={inputClass(!!errors.customer)}
                placeholder="Aarav Mehta"
              />
            </FormField>
            <FormField label="Phone Number" error={errors.phone}>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                className={inputClass(!!errors.phone)}
                placeholder="9812345670"
              />
            </FormField>
          </div>

          <FormField label="Listing" error={errors.listingId}>
            <select
              value={form.listingId}
              onChange={(e) => update("listingId", e.target.value)}
              className={inputClass(!!errors.listingId)}
            >
              {listings.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.title}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date" error={errors.date}>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className={inputClass(!!errors.date)}
              />
            </FormField>
            <FormField label="Time" error={errors.time}>
              <TimeField
                value={form.time || "06:00"}
                onChange={(next) => update("time", next)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Total Amount (₹)" error={errors.totalAmount}>
              <input
                value={form.totalAmount}
                onChange={(e) => update("totalAmount", e.target.value.replace(/\D/g, ""))}
                className={inputClass(!!errors.totalAmount)}
                placeholder="1200"
              />
            </FormField>
            <FormField label="Payment Method">
              <select
                value={form.payment}
                onChange={(e) => update("payment", e.target.value)}
                className={inputClass(false)}
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className={inputClass(false)}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-cream-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-vibe-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violet/90 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border ${
    hasError ? "border-vibe-coral" : "border-surface-border"
  } px-3 py-2.5 text-sm outline-none focus:border-vibe-violet`;
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-vibe-coral">{error}</p>}
    </div>
  );
}
