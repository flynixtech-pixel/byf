"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, QrCode, RefreshCw, Users } from "lucide-react";
import { PageHero } from "@/components/vendor/ui";
import { QrScannerModal } from "@/components/vendor/bookings/QrScannerModal";
import { checkInEventBooking, getVendorEventArrivals, type EventArrival } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EventScannerPage() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [arrivals, setArrivals] = useState<EventArrival[]>([]);
  const [loading, setLoading] = useState(true);

  function loadArrivals() {
    setLoading(true);
    getVendorEventArrivals({ limit: 200 })
      .then((res) => setArrivals(res.items))
      .catch(() => setArrivals([]))
      .finally(() => setLoading(false));
  }

  useEffect(loadArrivals, []);

  /* Scan a ticket QR → mark arrived. Throws (→ modal alert) on unknown/fake/repeated tickets. */
  async function handleCheckIn(orderId: string): Promise<string> {
    let res;
    try {
      res = await checkInEventBooking(orderId);
    } catch (e) {
      // Unknown / fake / other-vendor ticket → backend 404, or cancelled → 400.
      throw new Error(e instanceof ApiError ? e.describe() : "Invalid ticket — not found in your bookings.");
    }
    if (res.alreadyCheckedIn) {
      // Repeated scan of a ticket that already arrived.
      throw new Error(`${res.booking.customerName} is already checked in.`);
    }
    loadArrivals();
    return `${res.booking.customerName} · ${res.booking.listingTitle}`;
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Entry & Check-in"
        title="Ticket Scanner"
        description="Scan attendees' ticket QR codes to check them in. Invalid, fake or already-used tickets are rejected instantly."
        right={
          <button
            onClick={() => setScannerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"
          >
            <QrCode size={16} /> Scan Ticket
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-panel">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Total Arrived</p>
            <Users size={16} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-ink">{arrivals.length}</p>
          <p className="mt-1 text-[11px] text-ink-faint">Checked-in attendees</p>
        </div>
        <button
          onClick={() => setScannerOpen(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-vibe-violet/40 bg-vibe-violet/5 p-5 text-vibe-violet transition hover:bg-vibe-violet/10 sm:col-span-2"
        >
          <QrCode size={28} />
          <span className="text-sm font-semibold">Tap to scan a ticket QR</span>
          <span className="text-[11px] text-ink-faint">Camera or manual order-id entry</span>
        </button>
      </div>

      <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-semibold text-ink">
            <CheckCircle2 size={16} className="text-emerald-600" /> Arrived List
          </h2>
          <button
            onClick={loadArrivals}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-ink-faint">Loading arrivals...</p>
        ) : arrivals.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-faint">No attendees checked in yet. Scan a ticket to begin.</p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {arrivals.map((a) => (
              <li key={a.orderId} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.customerName}</p>
                  <p className="truncate text-xs text-ink-faint">{a.listingTitle} · {a.orderId}</p>
                </div>
                <span className="shrink-0 text-[11px] text-ink-faint">{timeAgo(a.checkedInAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {scannerOpen && <QrScannerModal onClose={() => setScannerOpen(false)} onCheckIn={handleCheckIn} />}
    </div>
  );
}
