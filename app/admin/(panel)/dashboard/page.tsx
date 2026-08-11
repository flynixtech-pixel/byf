"use client";

import { useEffect, useState } from "react";
import { Compass, CalendarCheck2, UserPlus, ArrowUp, ArrowDown, Wallet, Store } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { getAdminDashboard } from "@/lib/api/admin";
import { AdminDashboard, BookingStatus } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";

const BOOKING_BADGE_TONE: Record<BookingStatus, "success" | "pending" | "danger" | "neutral"> = {
  Confirmed: "success",
  Pending: "pending",
  Cancelled: "danger",
  Completed: "neutral",
  "Part Paid": "pending",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="rounded-xl2 border border-surface-border bg-white p-10 text-center text-sm text-ink-faint">Loading dashboard...</div>;
  }

  if (error || !data) {
    return <div className="rounded-xl2 border border-surface-border bg-white p-10 text-center text-sm text-vibe-coral">{error ?? "No data"}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Compass size={18} />} label="Total Listings" value={data.listingsCount} growth={data.listingsGrowthPercent} />
        <StatCard icon={<CalendarCheck2 size={18} />} label="Total Bookings" value={data.bookingsCount} growth={data.bookingsGrowthPercent} />
        <StatCard icon={<UserPlus size={18} />} label="New Users (30d)" value={data.newUsers} growth={data.usersGrowthPercent} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-vibe-violet">
            <Wallet size={13} /> Revenue Collected
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-ink">₹{data.revenue.totalCollected.toLocaleString("en-IN")}</p>
          <div className="mt-3 space-y-1.5 text-xs text-ink-soft">
            <div className="flex items-center justify-between">
              <span>Platform fee</span>
              <span className="font-semibold text-ink">₹{data.revenue.totalPlatformFee.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Vendor earnings</span>
              <span className="font-semibold text-ink">₹{data.revenue.totalVendorEarnings.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-vibe-violet">
            <Store size={13} /> Vendors by Status
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(data.vendorsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-lg bg-cream-200/60 px-3 py-2">
                <span className="capitalize text-ink-soft">{status}</span>
                <span className="font-semibold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
          <p className="text-[11px] font-bold uppercase tracking-wider text-vibe-violet">Bookings by Status</p>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(data.bookingsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-lg bg-cream-200/60 px-3 py-2">
                <span className="text-ink-soft">{status}</span>
                <span className="font-semibold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Listings by State</p>
            <span className="rounded-lg bg-cream-300 px-3 py-1.5 text-xs font-semibold text-ink-soft">
              States <span className="text-ink">{data.listingsByState.length}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.listingsByState.map((s) => (
              <span key={s.state} className="rounded-full border border-surface-border bg-white px-3 py-1 text-xs font-semibold text-ink-soft">
                {s.state} ({s.count})
              </span>
            ))}
            {data.listingsByState.length === 0 && <p className="text-xs text-ink-faint">No listings yet.</p>}
          </div>

          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Top cities</p>
          <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {data.topCities.map((c) => (
              <div key={`${c.city}-${c.state}`} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-ink">{c.city}</p>
                  <p className="text-[11px] text-ink-faint">{c.state}</p>
                </div>
                <span className="font-semibold text-vibe-violet">{c.count}</span>
              </div>
            ))}
            {data.topCities.length === 0 && <p className="text-xs text-ink-faint">No listings yet.</p>}
          </div>
        </div>

        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Recent Bookings</p>
            <span className="text-xs text-ink-faint">Total: {data.recentBookings.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  <th className="pb-2">Listing</th>
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((b) => (
                  <tr key={b.orderId} className="border-t border-surface-border">
                    <td className="max-w-[160px] truncate py-2 pr-2 font-medium text-ink">{b.listingName}</td>
                    <td className="py-2 pr-2 text-ink-soft">{b.customerName}</td>
                    <td className="py-2 pr-2">
                      <Badge tone={BOOKING_BADGE_TONE[b.status]}>{b.status.toUpperCase()}</Badge>
                    </td>
                    <td className="py-2 text-ink-faint">{new Date(b.dateTime).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
                {data.recentBookings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-ink-faint">
                      No bookings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, growth }: { icon: React.ReactNode; label: string; value: number; growth: number }) {
  const isPositive = growth >= 0;
  return (
    <div className="flex items-center justify-between rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold text-ink">{value.toLocaleString("en-IN")}</p>
        <p className={`mt-0.5 flex items-center gap-0.5 text-xs font-semibold ${isPositive ? "text-vibe-limeDark" : "text-vibe-coral"}`}>
          {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />} {Math.abs(growth)}%{" "}
          <span className="font-normal text-ink-faint">last 30d</span>
        </p>
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-vibe-violet/10 text-vibe-violet">{icon}</span>
    </div>
  );
}
