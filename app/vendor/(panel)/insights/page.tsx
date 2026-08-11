"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, Clock, CalendarCheck, Percent } from "lucide-react";
import { getVendorBookings, getVendorListings } from "@/lib/api/vendor";
import { apiListingToMock } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import type { Listing } from "@/lib/types";

/**
 * BYV Insights — everything here is computed from the vendor's real bookings
 * and configured slots. No placeholder numbers.
 */

interface InsightBooking {
  dateTime: string;
  totalAmount: number;
  status: string;
  sport?: string;
  payment?: string;
  phone?: string;
}

const LOOKBACK_DAYS = 30;

function hourLabel(h: number) {
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh} ${ap}`;
}

export default function InsightsPage() {
  const [bookings, setBookings] = useState<InsightBooking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getVendorBookings({ limit: 500 }), getVendorListings()])
      .then(([b, l]) => {
        setBookings(b.items as unknown as InsightBooking[]);
        setListings(l.map(apiListingToMock));
      })
      .catch((e) => setError(e instanceof ApiError ? e.describe() : "Failed to load insights"))
      .finally(() => setLoading(false));
  }, []);

  const insights = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);
    since.setHours(0, 0, 0, 0);

    const recent = bookings.filter((b) => new Date(b.dateTime) >= since && b.status !== "Cancelled");
    const cancelled = bookings.filter((b) => new Date(b.dateTime) >= since && b.status === "Cancelled");

    // Busiest hour by booking count.
    const byHour = new Map<number, number>();
    for (const b of recent) {
      const h = new Date(b.dateTime).getHours();
      byHour.set(h, (byHour.get(h) ?? 0) + 1);
    }
    const peak = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0];

    // Most-booked sport (only present on manual bookings that recorded one).
    const bySport = new Map<string, number>();
    for (const b of recent) {
      if (!b.sport) continue;
      bySport.set(b.sport, (bySport.get(b.sport) ?? 0) + 1);
    }
    const topSport = [...bySport.entries()].sort((a, b) => b[1] - a[1])[0];

    // Occupancy = booked slots ÷ (slots per day × days) across turfs.
    const turfs = listings.filter((l) => l.type === "Turf");
    const slotsPerDay = turfs.reduce((s, t) => s + (t.slotsList?.length ?? 0), 0);
    const capacity = slotsPerDay * LOOKBACK_DAYS;
    const occupancy = capacity > 0 ? Math.round((recent.length / capacity) * 100) : null;

    const cancelRate = recent.length + cancelled.length > 0
      ? Math.round((cancelled.length / (recent.length + cancelled.length)) * 100)
      : 0;

    // Customer cohorts — how much of the business comes back for more.
    const byCustomer = new Map<string, number>();
    for (const b of recent) {
      if (!b.phone) continue;
      byCustomer.set(b.phone, (byCustomer.get(b.phone) ?? 0) + 1);
    }
    const totalCustomers = byCustomer.size;
    const repeatCustomers = [...byCustomer.values()].filter((c) => c > 1).length;
    const repeatShare = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : null;

    // Day-of-week pattern — where demand clusters and where it dries up.
    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const byDay = new Map<number, number>();
    for (const b of recent) {
      const d = new Date(b.dateTime).getDay();
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    const dayEntries = [...byDay.entries()].sort((a, b) => b[1] - a[1]);
    const bestDay = dayEntries[0] ? { name: DAY_NAMES[dayEntries[0][0]], count: dayEntries[0][1] } : null;
    const quietDay =
      dayEntries.length > 1
        ? { name: DAY_NAMES[dayEntries[dayEntries.length - 1][0]], count: dayEntries[dayEntries.length - 1][1] }
        : null;

    return {
      count: recent.length,
      peakHour: peak ? { hour: peak[0], count: peak[1] } : null,
      topSport: topSport ? { name: topSport[0], count: topSport[1] } : null,
      occupancy,
      cancelRate,
      hasSlots: slotsPerDay > 0,
      repeatShare,
      repeatCustomers,
      totalCustomers,
      bestDay,
      quietDay,
    };
  }, [bookings, listings]);

  if (error) return <div className="p-10 text-center text-sm text-vibe-coral">{error}</div>;
  if (loading) return <div className="p-10 text-center text-sm text-ink-faint">Loading insights…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="text-indigo-500" size={18} />
        <div>
          <h1 className="text-[15px] font-black text-slate-900">BYV Insights</h1>
          <p className="text-[10px] font-medium text-slate-400">Based on your last {LOOKBACK_DAYS} days of bookings.</p>
        </div>
      </div>

      {insights.count === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <CalendarCheck size={28} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-500">No bookings in the last {LOOKBACK_DAYS} days yet.</p>
          <p className="mt-1 text-xs text-slate-400">Insights appear here once players start booking.</p>
        </div>
      ) : (
        <>
          {/* Decision metrics only — no revenue figure here, per the owner's request. */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={CalendarCheck}
              tone="emerald"
              label="Bookings"
              value={`${insights.count}`}
              sub={`in the last ${LOOKBACK_DAYS} days`}
            />
            <StatCard
              icon={Percent}
              tone="indigo"
              label="Occupancy"
              value={insights.occupancy !== null ? `${insights.occupancy}%` : "—"}
              sub={insights.hasSlots ? "of configured slots" : "add slots to measure"}
            />
            <StatCard
              icon={Clock}
              tone="amber"
              label="Peak Hour"
              value={insights.peakHour ? hourLabel(insights.peakHour.hour) : "—"}
              sub={insights.peakHour ? `${insights.peakHour.count} bookings` : "not enough data"}
            />
            <StatCard
              icon={TrendingUp}
              tone="rose"
              label="Cancel Rate"
              value={`${insights.cancelRate}%`}
              sub="of all bookings"
            />
          </div>

          {/* Customer cohorts */}
          {insights.totalCustomers > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-[12px] font-black text-slate-900">Customer Cohorts</h2>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[17px] font-black text-slate-900">{insights.totalCustomers}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Customers</p>
                </div>
                <div>
                  <p className="text-[17px] font-black text-emerald-600">{insights.repeatCustomers}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Came Back</p>
                </div>
                <div>
                  <p className="text-[17px] font-black text-indigo-600">{insights.repeatShare ?? 0}%</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Repeat Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions computed from the numbers above — each links to where the vendor acts. */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-[12px] font-black text-slate-900">BYV Suggestions</h2>
            <div className="mt-2.5 space-y-2.5">
              {insights.peakHour && (
                <Suggestion tone="bg-amber-500" href="/vendor/pricing" cta="Set peak pricing">
                  <strong className="text-slate-800">{hourLabel(insights.peakHour.hour)}</strong> is your busiest hour
                  ({insights.peakHour.count} bookings). Raise the rate on that slot to capture the demand.
                </Suggestion>
              )}
              {insights.occupancy !== null && insights.occupancy < 50 && (
                <Suggestion tone="bg-indigo-500" href="/vendor/marketing" cta="Create promo code">
                  Occupancy is <strong className="text-slate-800">{insights.occupancy}%</strong> — a discount code for
                  off-peak hours can fill empty slots without touching peak rates.
                </Suggestion>
              )}
              {insights.quietDay && insights.bestDay && insights.quietDay.name !== insights.bestDay.name && (
                <Suggestion tone="bg-sky-500" href="/vendor/pricing" cta="Adjust day pricing">
                  <strong className="text-slate-800">{insights.bestDay.name}</strong> is your strongest day
                  ({insights.bestDay.count} bookings); <strong className="text-slate-800">{insights.quietDay.name}</strong> is
                  the quietest ({insights.quietDay.count}). A lower {insights.quietDay.name} rate can even out the week.
                </Suggestion>
              )}
              {insights.repeatShare !== null && insights.repeatShare < 40 && (
                <Suggestion tone="bg-emerald-500" href="/vendor/memberships" cta="Create a membership">
                  Only <strong className="text-slate-800">{insights.repeatShare}%</strong> of customers book again.
                  A membership or session pack gives them a reason to return.
                </Suggestion>
              )}
              {insights.topSport && (
                <Suggestion tone="bg-purple-500" href="/vendor/marketing" cta="Promote it">
                  <strong className="text-slate-800">{insights.topSport.name}</strong> is your most-booked sport
                  ({insights.topSport.count} bookings) — lead with it in your promotions.
                </Suggestion>
              )}
              {insights.cancelRate > 20 && (
                <Suggestion tone="bg-rose-500" href="/vendor/notifications" cta="Review bookings">
                  Cancellations are at <strong className="text-slate-800">{insights.cancelRate}%</strong> — call
                  pending-payment bookings a few hours before their slot to confirm.
                </Suggestion>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** One actionable suggestion row: the finding, plus a link to the page where the vendor can act on it. */
function Suggestion({
  tone,
  href,
  cta,
  children,
}: {
  tone: string;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium leading-relaxed text-slate-600">{children}</p>
        <Link href={href} className="mt-0.5 inline-block text-[10px] font-black text-indigo-600 hover:text-indigo-700">
          {cta} →
        </Link>
      </div>
    </div>
  );
}

const TONES = {
  emerald: "bg-emerald-50 text-emerald-600",
  indigo: "bg-indigo-50 text-indigo-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
} as const;

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: typeof Clock;
  tone: keyof typeof TONES;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONES[tone]}`}>
        <Icon size={15} />
      </span>
      <p className="mt-2.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-[17px] font-black leading-tight text-slate-900">{value}</p>
      <p className="text-[9px] font-medium text-slate-400">{sub}</p>
    </div>
  );
}
