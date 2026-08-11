"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarClock,
  IndianRupee,
  Layers,
  Plus,
  UserRoundCog,
  Users,
} from "lucide-react";
import { MpinGate } from "@/components/vendor/MpinGate";
import { getVendorCoachesDashboard } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { VendorCoachesDashboard } from "@/lib/api/types";

export default function VendorCoachesDashboardPage() {
  return (
    <MpinGate title="Coaches Dashboard">
      <CoachesDashboardContent />
    </MpinGate>
  );
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PAY_DOT: Record<string, string> = {
  paid: "bg-emerald-500",
  pending: "bg-amber-500",
  failed: "bg-rose-500",
  refunded: "bg-slate-400",
};

function CoachesDashboardContent() {
  const [d, setD] = useState<VendorCoachesDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVendorCoachesDashboard()
      .then(setD)
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load dashboard"));
  }, []);

  const chart = useMemo(() => d?.chart ?? [], [d]);
  const maxEnrol = useMemo(() => Math.max(1, ...chart.map((c) => c.enrolments)), [chart]);
  const activeSubs = d?.subscriptionsByStatus.Active ?? 0;
  const latest = d?.recentSubscriptions?.[0];

  const PRIMARY = [
    { key: "earn", label: "Earnings", value: `₹${(d?.totalEarnings ?? 0).toLocaleString("en-IN")}`, hint: "From paid plans", icon: IndianRupee, ring: "from-emerald-50", tint: "text-emerald-600", bar: "bg-emerald-500" },
    { key: "students", label: "Active Students", value: String(activeSubs), hint: "Currently enrolled", icon: Users, ring: "from-violet-50", tint: "text-[#5c3a21]", bar: "bg-[#5c3a21]" },
    { key: "coaches", label: "Active Coaches", value: String(d?.activeCoachCount ?? 0), hint: `${d?.coachCount ?? 0} on roster`, icon: UserRoundCog, ring: "from-amber-50", tint: "text-amber-600", bar: "bg-amber-500" },
    { key: "batches", label: "Total Batches", value: String(d?.batchCount ?? 0), hint: "Across all coaches", icon: Layers, ring: "from-rose-50", tint: "text-rose-600", bar: "bg-rose-500" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-vibe-indigo via-[#5c3a21] to-[#7b4f2e] p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-vibe-lime/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-vibe-lime shadow-[0_0_8px_rgba(190,242,100,0.9)]" /> Coaching Report
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold leading-tight">Academy Dashboard</h1>
            <p className="text-xs text-white/70">Students, earnings & batches — secured behind your MPIN.</p>
          </div>
          <Link href="/vendor/coaches" className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3.5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25">
            <Plus size={16} /> <span className="hidden sm:inline">Add Coach</span>
          </Link>
        </div>
      </div>

      {error && <p className="rounded-xl2 border border-surface-border bg-white p-6 text-sm text-vibe-coral">{error}</p>}

      {latest && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#5c3a21]/20 bg-[#5c3a21]/5 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5c3a21]/15 text-[#5c3a21]"><Bell size={16} /></div>
          <p className="text-sm text-ink">
            <span className="font-semibold">{latest.customerName}</span> joined{" "}
            <span className="font-semibold">{latest.batchName}</span>
            <span className="text-ink-faint"> · {timeAgo(latest.createdAt)}</span>
          </p>
        </div>
      )}

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-3">
        {PRIMARY.map((s) => (
          <div key={s.key} className="relative overflow-hidden rounded-2xl border border-surface-border bg-white p-4 shadow-panel">
            <div className={`absolute right-0 top-0 h-14 w-14 bg-gradient-to-bl ${s.ring} to-transparent`} />
            <div className="relative mb-2 flex items-center justify-between">
              <p className={`text-[10px] font-extrabold uppercase tracking-wider ${s.tint}`}>{s.label}</p>
              <s.icon size={16} className={s.tint} />
            </div>
            <p className="relative text-2xl font-black text-ink">{d ? s.value : "—"}</p>
            <p className="relative mt-1 text-[11px] text-ink-faint">{s.hint}</p>
            <div className={`absolute inset-x-0 bottom-0 h-1 ${s.bar}`} />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/vendor/coaches" className="flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-white p-4 text-center shadow-panel transition hover:bg-cream-200/50">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5c3a21]/10 text-[#5c3a21]"><UserRoundCog size={20} /></span>
          <span className="text-xs font-semibold text-ink">Manage Coaches</span>
        </Link>
        <Link href="/vendor/coaches/schedule" className="flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-white p-4 text-center shadow-panel transition hover:bg-cream-200/50">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600"><CalendarClock size={20} /></span>
          <span className="text-xs font-semibold text-ink">Schedule</span>
        </Link>
        <Link href="/vendor/coaches/notifications" className="flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-white p-4 text-center shadow-panel transition hover:bg-cream-200/50">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Bell size={20} /></span>
          <span className="text-xs font-semibold text-ink">Notifications</span>
        </Link>
      </div>

      {/* Enrolment trend */}
      <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-panel">
        <div className="mb-4">
          <h2 className="font-display font-semibold text-ink">Enrolments Trend</h2>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Last 14 days</p>
        </div>
        <div className="flex h-36 items-end gap-1.5">
          {chart.map((pt, i) => {
            const h = Math.max(4, (pt.enrolments / maxEnrol) * 120);
            return (
              <div key={pt.date} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
                <div className="relative w-full">
                  <div className="w-full rounded-t-md bg-[#5c3a21]/80 transition-all group-hover:bg-[#5c3a21]" style={{ height: `${h}px` }} />
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    {pt.enrolments} joined · ₹{pt.revenue.toLocaleString("en-IN")}
                  </div>
                </div>
                <span className="h-3 text-[9px] font-semibold text-ink-faint">{i % 2 === 0 ? pt.label.split(" ")[0] : ""}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent enrolments */}
      <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-panel">
        <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-ink">
          <Users size={16} className="text-[#5c3a21]" /> Recent Enrolments
          <span className="rounded-full bg-cream-300 px-2 py-0.5 text-[11px] font-semibold text-ink-faint">Top 8</span>
        </h2>
        {!d ? (
          <p className="py-8 text-center text-sm text-ink-faint">Loading…</p>
        ) : d.recentSubscriptions.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cream-300 text-ink-faint"><Users size={22} /></div>
            <p className="text-sm text-ink-faint">No enrolments yet — add a coach and batches to start.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  <th className="py-2 pr-3 text-left">Student</th>
                  <th className="py-2 px-3 text-left">Batch</th>
                  <th className="py-2 px-3 text-left">Plan</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3 text-left">Payment</th>
                  <th className="py-2 pl-3 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {d.recentSubscriptions.map((s) => (
                  <tr key={s.orderId} className="hover:bg-cream-200/50">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5c3a21]/10 text-xs font-bold uppercase text-[#5c3a21]">
                          {s.customerName?.charAt(0) || "?"}
                        </div>
                        <span className="font-semibold text-ink">{s.customerName}</span>
                      </div>
                    </td>
                    <td className="px-3 text-ink-soft">{s.batchName}</td>
                    <td className="px-3 capitalize text-ink-soft">{s.plan}</td>
                    <td className="px-3 text-right font-semibold text-ink">₹{s.amount.toLocaleString("en-IN")}</td>
                    <td className="px-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize text-ink-soft">
                        <span className={`h-2 w-2 rounded-full ${PAY_DOT[s.paymentStatus] ?? "bg-slate-400"}`} />
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td className="pl-3 text-right text-xs text-ink-faint">{timeAgo(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
