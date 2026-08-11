"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  Download,
  IndianRupee,
  Plus,
  Receipt,
  ScanLine,
  SlidersHorizontal,
  Ticket,
  TicketCheck,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { MpinGate } from "@/components/vendor/MpinGate";
import { useVendorAuth } from "@/components/providers/VendorAuthProvider";
import { isVendorOwner } from "@/lib/api/auth";
import {
  getVendorEventsDashboard,
  getVendorEventBookings,
  exportVendorEventBookings,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { EventBookingSummary, VendorEventsDashboard } from "@/lib/api/types";

export default function VendorEventsDashboardPage() {
  return (
    <MpinGate title="Events Dashboard">
      <EventsDashboardContent />
    </MpinGate>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function rangeForPreset(months: number) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  return { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
}

const DOWNLOAD_PRESETS = [
  { label: "Last 1 Month", months: 1 },
  { label: "Last 3 Months", months: 3 },
  { label: "Last 6 Months", months: 6 },
  { label: "Last 12 Months", months: 12 },
];

const STATUS_OPTIONS = ["All", "Confirmed", "Pending", "Completed", "Cancelled"];

const STATUS_DOT: Record<string, string> = {
  Confirmed: "bg-emerald-500",
  Pending: "bg-amber-500",
  Completed: "bg-slate-400",
  Cancelled: "bg-rose-500",
};

function EventsDashboardContent() {
  const { vendor } = useVendorAuth();
  const organizerName = isVendorOwner(vendor) ? vendor.businessName : vendor.holderName;

  const [dashboard, setDashboard] = useState<VendorEventsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  // sheets
  const [downloadSheetOpen, setDownloadSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [exporting, setExporting] = useState(false);

  // recent-bookings filters
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [bookings, setBookings] = useState<EventBookingSummary[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const activeFilterCount = (filterDate ? 1 : 0) + (filterStatus !== "All" ? 1 : 0);

  useEffect(() => {
    getVendorEventsDashboard()
      .then(setDashboard)
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load dashboard"));
  }, []);

  useEffect(() => {
    setLoadingBookings(true);
    getVendorEventBookings({
      limit: 5,
      status: filterStatus,
      startDate: filterDate || undefined,
      endDate: filterDate || undefined,
    })
      .then((res) => setBookings(res.items))
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false));
  }, [filterDate, filterStatus]);

  async function runExport(params: { startDate?: string; endDate?: string }) {
    if (exporting) return;
    setExporting(true);
    try {
      await exportVendorEventBookings(params);
      setDownloadSheetOpen(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.describe() : "Failed to export bookings");
    } finally {
      setExporting(false);
    }
  }

  const totalTournaments = dashboard
    ? Object.values(dashboard.tournamentsByStatus).reduce((sum, n) => sum + (n ?? 0), 0)
    : 0;
  const avgTicket = dashboard && dashboard.bookingCount > 0 ? Math.round(dashboard.totalRevenue / dashboard.bookingCount) : 0;

  const latestBooking = dashboard?.recentBookings?.[0];
  const chart = dashboard?.chart ?? [];
  const maxBookings = useMemo(() => Math.max(1, ...chart.map((c) => c.bookings)), [chart]);
  const maxRevenue = useMemo(() => Math.max(1, ...chart.map((c) => c.revenue)), [chart]);

  const revenuePath = useMemo(() => {
    if (chart.length === 0) return { line: "", area: "" };
    const w = 100;
    const h = 40;
    const step = chart.length > 1 ? w / (chart.length - 1) : w;
    const pts = chart.map((c, i) => {
      const x = i * step;
      const y = h - (c.revenue / maxRevenue) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { line: `M${pts.join(" L")}`, area: `M0,${h} L${pts.join(" L")} L${w},${h} Z` };
  }, [chart, maxRevenue]);

  const PRIMARY_STATS = [
    { key: "revenue", label: "Revenue", value: `₹${(dashboard?.totalRevenue ?? 0).toLocaleString("en-IN")}`, hint: "From paid bookings", icon: IndianRupee, ring: "from-emerald-50", tint: "text-emerald-600", bar: "bg-emerald-500" },
    { key: "bookings", label: "Bookings", value: String(dashboard?.registrationCount ?? 0), hint: "Total bookings", icon: Ticket, ring: "from-violet-50", tint: "text-vibe-violet", bar: "bg-vibe-violet" },
    { key: "upcoming", label: "Upcoming Events", value: String(dashboard?.upcomingEventCount ?? 0), hint: "Scheduled ahead", icon: CalendarClock, ring: "from-amber-50", tint: "text-amber-600", bar: "bg-amber-500" },
    { key: "tournaments", label: "Total Tournaments", value: String(totalTournaments), hint: "All statuses", icon: Trophy, ring: "from-rose-50", tint: "text-rose-600", bar: "bg-rose-500" },
  ];

  const SECONDARY_STATS = [
    { key: "paid", label: "Paid Bookings", value: String(dashboard?.bookingCount ?? 0), icon: TicketCheck, tint: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "checkin", label: "Checked-in", value: String(dashboard?.checkedInCount ?? 0), icon: CheckCircle2, tint: "text-vibe-violet", bg: "bg-vibe-violet/10" },
    { key: "active", label: "Active Events", value: String(dashboard?.activeEventCount ?? 0), icon: Ticket, tint: "text-amber-600", bg: "bg-amber-50" },
    { key: "avg", label: "Avg. Ticket", value: `₹${avgTicket.toLocaleString("en-IN")}`, icon: Wallet, tint: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="relative rounded-2xl bg-gradient-to-br from-vibe-indigo via-vibe-violet to-vibe-violetSoft p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-vibe-lime/20 blur-3xl" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-black uppercase ring-2 ring-white/30">
              {organizerName?.charAt(0) || "E"}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-vibe-lime shadow-[0_0_8px_rgba(190,242,100,0.9)]" /> Events Report
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold leading-tight">{organizerName}</h1>
              <p className="text-xs text-white/70">Bookings, revenue & events — secured behind your MPIN.</p>
            </div>
          </div>

          <button
            onClick={() => setDownloadSheetOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3.5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"
          >
            <Download size={16} /> <span className="hidden sm:inline">Download Excel</span>
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl2 border border-surface-border bg-white p-6 text-sm text-vibe-coral">{error}</p>}

      {/* ── LATEST BOOKING NOTIFICATION ── */}
      {latestBooking && (
        <div className="flex items-center gap-3 rounded-2xl border border-vibe-violet/20 bg-vibe-violet/5 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vibe-violet/15 text-vibe-violet">
            <Bell size={16} />
          </div>
          <p className="text-sm text-ink">
            <span className="font-semibold">{latestBooking.customerName}</span> just booked{" "}
            <span className="font-semibold">{latestBooking.listingTitle}</span>
            <span className="text-ink-faint"> · {timeAgo(latestBooking.createdAt)}</span>
          </p>
        </div>
      )}

      {/* ── PRIMARY STAT GRID (2×2) ── */}
      <div className="grid grid-cols-2 gap-3">
        {PRIMARY_STATS.map((s) => (
          <div key={s.key} className="relative overflow-hidden rounded-2xl border border-surface-border bg-white p-4 shadow-panel">
            <div className={`absolute right-0 top-0 h-14 w-14 bg-gradient-to-bl ${s.ring} to-transparent`} />
            <div className="relative mb-2 flex items-center justify-between">
              <p className={`text-[10px] font-extrabold uppercase tracking-wider ${s.tint}`}>{s.label}</p>
              <s.icon size={16} className={s.tint} />
            </div>
            <p className="relative text-2xl font-black text-ink">{dashboard ? s.value : "—"}</p>
            <p className="relative mt-1 text-[11px] text-ink-faint">{s.hint}</p>
            <div className={`absolute inset-x-0 bottom-0 h-1 ${s.bar}`} />
          </div>
        ))}
      </div>

      {/* ── SECONDARY METRICS STRIP ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SECONDARY_STATS.map((s) => (
          <div key={s.key} className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white p-3.5 shadow-panel">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg} ${s.tint}`}>
              <s.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-ink-faint">{s.label}</p>
              <p className="text-lg font-black text-ink">{dashboard ? s.value : "—"}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/vendor/events/listings" className="flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-white p-4 text-center shadow-panel transition hover:bg-cream-200/50">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-vibe-violet/10 text-vibe-violet"><Plus size={20} /></span>
          <span className="text-xs font-semibold text-ink">Create Event</span>
        </Link>
        <Link href="/vendor/events/scanner" className="flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-white p-4 text-center shadow-panel transition hover:bg-cream-200/50">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><ScanLine size={20} /></span>
          <span className="text-xs font-semibold text-ink">Scan Tickets</span>
        </Link>
        <button onClick={() => setDownloadSheetOpen(true)} className="flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-white p-4 text-center shadow-panel transition hover:bg-cream-200/50">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Receipt size={20} /></span>
          <span className="text-xs font-semibold text-ink">Download Report</span>
        </button>
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-panel">
          <div className="mb-4">
            <h2 className="font-display font-semibold text-ink">Bookings Trend</h2>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Last 14 days</p>
          </div>
          <div className="flex h-36 items-end gap-1.5">
            {chart.map((pt, i) => {
              const h = Math.max(4, (pt.bookings / maxBookings) * 120);
              return (
                <div key={pt.date} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
                  <div className="relative w-full">
                    <div className="w-full rounded-t-md bg-vibe-violet/80 transition-all group-hover:bg-vibe-violet" style={{ height: `${h}px` }} />
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                      {pt.bookings} bookings · ₹{pt.revenue.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span className="h-3 text-[9px] font-semibold text-ink-faint">{i % 2 === 0 ? pt.label : ""}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-panel">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-display font-semibold text-ink">Revenue Trend</h2>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Last 14 days</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
              <ArrowUpRight size={12} /> ₹{(dashboard?.totalRevenue ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="h-36">
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="evtRev" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(124 58 237 / 0.25)" />
                  <stop offset="100%" stopColor="rgb(124 58 237 / 0)" />
                </linearGradient>
              </defs>
              {revenuePath.area && <path d={revenuePath.area} fill="url(#evtRev)" />}
              {revenuePath.line && <path d={revenuePath.line} fill="none" stroke="rgb(124 58 237)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
            </svg>
          </div>
        </div>
      </div>

      {/* ── RECENT BOOKINGS + FILTERS ── */}
      <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display font-semibold text-ink">
            <Bell size={16} className="text-vibe-violet" /> Recent Bookings
            <span className="rounded-full bg-cream-300 px-2 py-0.5 text-[11px] font-semibold text-ink-faint">Top 5</span>
          </h2>

          <button
            onClick={() => setFilterSheetOpen(true)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeFilterCount > 0 ? "border-vibe-violet bg-vibe-violet/5 text-vibe-violet" : "border-surface-border text-ink-soft hover:bg-cream-300"
            }`}
          >
            <SlidersHorizontal size={14} /> Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-vibe-violet px-1 text-[10px] font-bold text-white">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {loadingBookings ? (
          <p className="py-8 text-center text-sm text-ink-faint">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cream-300 text-ink-faint"><Ticket size={22} /></div>
            <p className="text-sm text-ink-faint">
              {filterDate || filterStatus !== "All" ? "No bookings match these filters." : "No bookings yet — publish an event to start selling."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  <th className="py-2 pr-3 text-left">Customer</th>
                  <th className="py-2 px-3 text-left">Event</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3 text-left">Status</th>
                  <th className="py-2 pl-3 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {bookings.map((b, i) => (
                  <tr key={b.orderId ?? i} className="hover:bg-cream-200/50">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vibe-violet/10 text-xs font-bold uppercase text-vibe-violet">
                          {b.customerName?.charAt(0) || "?"}
                        </div>
                        <span className="font-semibold text-ink">{b.customerName}</span>
                      </div>
                    </td>
                    <td className="px-3 text-ink-soft">{b.listingTitle}</td>
                    <td className="px-3 text-right font-semibold text-ink">₹{b.totalAmount.toLocaleString("en-IN")}</td>
                    <td className="px-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[b.status] ?? "bg-slate-400"}`} />
                        {b.status}
                      </span>
                    </td>
                    <td className="pl-3 text-right text-xs text-ink-faint">{timeAgo(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DOWNLOAD BOTTOM SHEET ── */}
      {downloadSheetOpen && (
        <BottomSheet title="Download bookings (Excel)" onClose={() => setDownloadSheetOpen(false)}>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Quick ranges</p>
            <div className="grid grid-cols-2 gap-2">
              {DOWNLOAD_PRESETS.map((p) => (
                <button
                  key={p.label}
                  disabled={exporting}
                  onClick={() => runExport(rangeForPreset(p.months))}
                  className="rounded-xl border border-surface-border px-3 py-2.5 text-xs font-semibold text-ink-soft hover:border-vibe-violet hover:text-vibe-violet disabled:opacity-60"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Custom range</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase text-ink-faint">From</span>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase text-ink-faint">To</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet" />
              </label>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              disabled={exporting}
              onClick={() => runExport({})}
              className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-cream-300 disabled:opacity-60"
            >
              All bookings
            </button>
            <button
              disabled={exporting || !customStart || !customEnd}
              onClick={() => runExport({ startDate: customStart, endDate: customEnd })}
              className="flex-1 rounded-xl bg-vibe-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violet/90 disabled:opacity-50"
            >
              {exporting ? "Preparing..." : "Download custom"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── FILTER BOTTOM SHEET ── */}
      {filterSheetOpen && (
        <BottomSheet title="Filter bookings" onClose={() => setFilterSheetOpen(false)}>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Booking date</p>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet" />
          </div>
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => {
                const active = filterStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      active ? "bg-vibe-violet text-white" : "border border-surface-border bg-white text-ink-soft hover:bg-cream-300"
                    }`}
                  >
                    {s === "All" ? "All statuses" : s}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => { setFilterDate(""); setFilterStatus("All"); }}
              className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-cream-300"
            >
              Clear all
            </button>
            <button
              onClick={() => setFilterSheetOpen(false)}
              className="flex-1 rounded-xl bg-vibe-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violet/90"
            >
              Show results
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

/** A reusable slide-up bottom sheet (centers on desktop). */
function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-in fade-in" />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:rounded-3xl sm:duration-200">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-surface-border sm:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-cream-300 p-1.5 text-ink-soft hover:bg-cream-200">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
