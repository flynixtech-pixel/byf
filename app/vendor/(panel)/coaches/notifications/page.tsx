"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Phone, SlidersHorizontal, UserRoundCog } from "lucide-react";
import { listVendorCoachSubscriptions } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { getReadNotificationIds, saveReadNotificationIds } from "@/lib/vendorNotifications";
import type { CoachSubscription } from "@/lib/api/types";

type Tab = "All" | "New" | "Paid" | "Pending" | "Cancelled";
const TABS: Tab[] = ["All", "New", "Paid", "Pending", "Cancelled"];

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

export default function CoachNotificationsPage() {
  const [subs, setSubs] = useState<CoachSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("All");
  const [read, setRead] = useState<Set<string>>(new Set());
  function markRead(next: Set<string>) {
    setRead(next);
    saveReadNotificationIds(next);
  }

  useEffect(() => {
    listVendorCoachSubscriptions({ limit: 100 })
      .then((res) => setSubs(res.items))
      .catch((err) => {
        if (!(err instanceof ApiError)) throw err;
      })
      .finally(() => setLoading(false));
    setRead(getReadNotificationIds());
  }, []);

  const counts = useMemo(
    () => ({
      All: subs.length,
      New: subs.filter((s) => isNew(s.createdAt)).length,
      Paid: subs.filter((s) => s.paymentStatus === "paid").length,
      Pending: subs.filter((s) => s.paymentStatus === "pending").length,
      Cancelled: subs.filter((s) => s.status === "Cancelled").length,
    }),
    [subs]
  );

  const visible = useMemo(() => {
    switch (tab) {
      case "New":
        return subs.filter((s) => isNew(s.createdAt));
      case "Paid":
        return subs.filter((s) => s.paymentStatus === "paid");
      case "Pending":
        return subs.filter((s) => s.paymentStatus === "pending");
      case "Cancelled":
        return subs.filter((s) => s.status === "Cancelled");
      default:
        return subs;
    }
  }, [subs, tab]);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="mx-[-16px] mt-[-24px] mb-4 flex items-center gap-3 rounded-b-2xl bg-white px-5 py-4 shadow-sm sm:mx-[-24px]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5c3a21]/10 text-[#5c3a21]">
          <Bell size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-black tracking-tight text-ink">Notifications</h1>
          <p className="text-[10px] font-medium text-ink-faint">New enrolments &amp; payment activity</p>
        </div>
        <button
          onClick={() => markRead(new Set([...read, ...subs.map((s) => s.orderId)]))}
          className="flex flex-col items-center gap-0.5 text-ink-faint transition hover:text-ink"
          aria-label="Mark all read"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-surface-border"><CheckCheck size={13} /></span>
          <span className="text-[7px] font-bold">Read all</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black transition ${
                active ? "bg-[#5c3a21] text-white" : "bg-white text-ink-soft hover:bg-cream-200"
              }`}
            >
              {t}
              <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black ${active ? "bg-white/25 text-white" : "bg-cream-300 text-ink-faint"}`}>
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-surface-border bg-white p-10 text-center text-sm font-bold text-ink-faint">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#5c3a21] border-t-transparent" />
          Loading…
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-surface-border bg-white p-10 text-center">
          <SlidersHorizontal size={16} className="mx-auto text-ink-faint" />
          <p className="flex-1 text-sm font-semibold text-ink-faint">Nothing here right now.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((s) => {
            const unread = !read.has(s.orderId);
            const payTone =
              s.status === "Cancelled"
                ? "text-rose-600"
                : s.paymentStatus === "paid"
                ? "text-emerald-600"
                : "text-amber-600";
            return (
              <div
                key={s.orderId}
                onClick={() => markRead(new Set(read).add(s.orderId))}
                className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-panel transition ${
                  unread ? "border-[#5c3a21]/30" : "border-surface-border"
                }`}
              >
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5c3a21]/10 text-sm font-bold uppercase text-[#5c3a21]">
                  {s.customerName?.charAt(0) || <UserRoundCog size={18} />}
                  {unread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#5c3a21] ring-2 ring-white" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-bold">{s.customerName}</span> joined{" "}
                    <span className="font-semibold">{s.batchName}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-faint">
                    <span className="capitalize">{s.plan} plan</span>
                    <span>·</span>
                    <span className={`font-semibold capitalize ${payTone}`}>
                      {s.status === "Cancelled" ? "Cancelled" : s.paymentStatus}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-ink-soft">₹{s.amount.toLocaleString("en-IN")}</span>
                    <span>·</span>
                    <span>{timeAgo(s.createdAt)}</span>
                  </p>
                </div>
                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 text-ink-soft hover:bg-cream-300"
                    aria-label={`Call ${s.customerName}`}
                  >
                    <Phone size={14} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
