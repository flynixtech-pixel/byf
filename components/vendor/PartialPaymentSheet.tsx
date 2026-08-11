"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, CreditCard, ShieldCheck, X } from "lucide-react";
import { getVendorListings, updateVendorListing } from "@/lib/api/vendor";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { Listing } from "@/lib/types";

export function PartialPaymentSheet({ onClose }: { onClose: () => void }) {
  const [turfs, setTurfs] = useState<Listing[]>([]);
  const [selectedTurfId, setSelectedTurfId] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState<number>(25);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    getVendorListings()
      .then((res) => {
        if (cancelled) return;
        const mockListings = res.map(apiListingToMock);
        setTurfs(mockListings);
        if (mockListings.length > 0) {
          const first = mockListings[0];
          setSelectedTurfId(first.id);
          const cfg = first.partialPayment ?? { enabled: true, type: "percentage", value: 25 };
          setEnabled(cfg.enabled);
          setType(cfg.type);
          setValue(cfg.value);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTurf = turfs.find((t) => t.id === selectedTurfId);

  const handleTurfSelect = (id: string) => {
    setSelectedTurfId(id);
    const turf = turfs.find((t) => t.id === id);
    if (turf) {
      const cfg = turf.partialPayment ?? { enabled: true, type: "percentage", value: 25 };
      setEnabled(cfg.enabled);
      setType(cfg.type);
      setValue(cfg.value);
    }
  };

  const sampleTotal = selectedTurf?.price || 1000;
  const samplePayNow = enabled
    ? type === "fixed"
      ? Math.min(sampleTotal, Math.max(1, value))
      : Math.min(sampleTotal, Math.max(1, Math.round((sampleTotal * Math.min(100, Math.max(1, value))) / 100)))
    : sampleTotal;
  const samplePayAtVenue = Math.max(0, sampleTotal - samplePayNow);

  async function handleSave() {
    if (!selectedTurf) return;
    setSaving(true);
    try {
      const updated = {
        ...selectedTurf,
        partialPayment: {
          enabled,
          type,
          value: Math.max(1, Math.round(value)),
        },
      };
      await updateVendorListing(selectedTurf.id, mockListingToApiInput(updated));
      setTurfs((prev) => prev.map((t) => (t.id === selectedTurf.id ? updated : t)));
      setToast("Partial payment settings saved successfully!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save partial payment settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Mandatory Partial Payment</h3>
              <p className="text-xs text-slate-500">Configure online deposit required from players</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading settings...</div>
        ) : turfs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No active venues found in your account.</div>
        ) : (
          <div className="mt-4 space-y-4 text-xs">
            {/* Select Venue */}
            <div>
              <label className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Select Venue</label>
              <select
                value={selectedTurfId}
                onChange={(e) => handleTurfSelect(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-semibold text-slate-800 outline-none focus:border-emerald-500"
              >
                {turfs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} (₹{t.price}/hr)
                  </option>
                ))}
              </select>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
              <div>
                <p className="font-bold text-slate-800">Require Online Partial Payment</p>
                <p className="text-[11px] text-slate-500">Bookings stay unconfirmed until player pays deposit</p>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
            </div>

            {enabled && (
              <>
                {/* Deposit Type Selector */}
                <div>
                  <label className="mb-1.5 block font-bold uppercase tracking-wider text-slate-500">Calculation Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("percentage")}
                      className={`rounded-2xl border p-3 text-center transition ${
                        type === "percentage"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-400"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-extrabold">Percentage (%)</p>
                      <p className="text-[10px] text-slate-500">e.g. 25% of total price</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("fixed")}
                      className={`rounded-2xl border p-3 text-center transition ${
                        type === "fixed"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-400"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-extrabold">Fixed Amount (₹)</p>
                      <p className="text-[10px] text-slate-500">e.g. ₹300 flat deposit</p>
                    </button>
                  </div>
                </div>

                {/* Value Input */}
                <div>
                  <label className="mb-1 block font-bold uppercase tracking-wider text-slate-500">
                    {type === "percentage" ? "Partial Payment Percentage (%)" : "Fixed Partial Payment Amount (₹)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={type === "percentage" ? 100 : 10000}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 font-extrabold text-slate-900 outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                {/* Live Preview Card */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 space-y-1.5">
                  <p className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Player Booking Preview
                  </p>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Sample Booking Total</span>
                    <span className="font-bold">₹{sampleTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-emerald-800">
                    <span>Pay Online Now to Lock Slot</span>
                    <span className="text-sm font-black">₹{samplePayNow.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-amber-800">
                    <span>Pay at Venue Check-in</span>
                    <span>₹{samplePayAtVenue.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </>
            )}

            {toast && (
              <p className="rounded-xl bg-emerald-100 p-2.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" /> {toast}
              </p>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 font-extrabold uppercase text-white shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
