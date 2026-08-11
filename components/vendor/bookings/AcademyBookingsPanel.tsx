"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Phone, CalendarDays, IndianRupee } from "lucide-react";
import { PageBack } from "@/components/vendor/PageBack";
import { listVendorCoachSubscriptions, listVendorCoaches, getVendorListings } from "@/lib/api/vendor";
import { apiListingToMock } from "@/lib/api/listingAdapter";
import { CoachSubscription, CoachSubscriptionStatus } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";

const STATUS_STYLE: Record<CoachSubscriptionStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-600",
  Expired: "bg-slate-100 text-slate-500",
};

const PLAN_LABEL: Record<CoachSubscription["plan"], string> = {
  demo: "Demo",
  monthly: "Monthly",
  yearly: "Yearly",
};

/** The "Academy Bookings" side of the Turf/Academy tab split — every student
 * enrolled across the vendor's coach/academy profiles, newest first. */
export function AcademyBookingsPanel({ onSwitchToTurf }: { onSwitchToTurf: () => void }) {
  const [subs, setSubs] = useState<CoachSubscription[]>([]);
  const [coachMeta, setCoachMeta] = useState<Record<string, { name: string; turfTitle?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CoachSubscriptionStatus | "All">("Active");

  useEffect(() => {
    Promise.all([
      listVendorCoachSubscriptions({ limit: 500 }),
      listVendorCoaches({ limit: 200 }),
      getVendorListings(),
    ])
      .then(([subsRes, coachesRes, listings]) => {
        const turfTitleById = new Map(listings.map(apiListingToMock).map((l) => [l.id, l.title]));
        const meta: Record<string, { name: string; turfTitle?: string }> = {};
        // Only academies attached to one of this vendor's turfs belong on this tab —
        // a standalone Coaches-vertical profile has its own Coaches section, and mixing
        // the two here made a turf owner's academy list show unrelated coach students.
        const academyIds = new Set<string>();
        coachesRes.items.forEach((c) => {
          if (!c.turfListingId) return;
          academyIds.add(c._id);
          meta[c._id] = { name: c.name, turfTitle: turfTitleById.get(c.turfListingId) };
        });
        setCoachMeta(meta);
        setSubs(subsRes.items.filter((s) => academyIds.has(s.coachId)));
      })
      .catch((e) => {
        // A turf-only vendor who never added an academy isn't authorised for the
        // Coaches API at all. That's an empty state, not an error worth shouting about.
        if (e instanceof ApiError && (e.status === 403 || e.status === 401)) {
          setSubs([]);
          return;
        }
        setError(e instanceof ApiError ? e.describe() : "Failed to load academy bookings");
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const list = statusFilter === "All" ? subs : subs.filter((s) => s.status === statusFilter);
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [subs, statusFilter]);

  const counts = useMemo(
    () => ({
      All: subs.length,
      Active: subs.filter((s) => s.status === "Active").length,
      Cancelled: subs.filter((s) => s.status === "Cancelled").length,
      Expired: subs.filter((s) => s.status === "Expired").length,
    }),
    [subs]
  );

  return (
    <div className="relative flex min-h-[60vh] flex-col overflow-x-hidden bg-[#f5f5f5] -mx-4 -mt-6 -mb-24 sm:-mx-6 lg:-mb-6">
      <div className="z-20 bg-[#f5f7fa] px-4 pt-3 pb-2 md:px-6">
        <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button
            onClick={onSwitchToTurf}
            className="flex-1 px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 transition hover:bg-slate-50"
          >
            Turf Bookings
          </button>
          <button className="flex-1 bg-violet-600 px-3 py-2.5 text-center text-[11px] font-bold text-white">
            Academy Bookings
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <GraduationCap size={16} />
          </span>
          <div>
            <h1 className="text-[13px] font-black text-slate-900">Academy Bookings</h1>
            <p className="text-[10px] font-medium text-slate-400">Students enrolled across your coaching batches</p>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["Active", "All", "Cancelled", "Expired"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black transition ${
                statusFilter === s ? "bg-vibe-navy text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {s}
              <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black ${statusFilter === s ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-10 md:px-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm font-bold text-slate-400">Loading…</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm font-bold text-rose-600">{error}</div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <GraduationCap className="mx-auto h-7 w-7 text-slate-300" />
            {subs.length === 0 && Object.keys(coachMeta).length === 0 ? (
              <>
                <p className="mt-2 text-sm font-semibold text-slate-500">You haven&apos;t added an academy yet.</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Add one from My Listings → your turf, and students who enrol will show up here.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-500">
                No {statusFilter !== "All" ? statusFilter.toLowerCase() : ""} academy bookings yet.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((s) => {
              const meta = coachMeta[s.coachId];
              return (
                <div key={s._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black text-slate-900">{s.customerName}</p>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-violet-600">
                        {meta?.name ?? "Academy"}{meta?.turfTitle ? ` · ${meta.turfTitle}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${STATUS_STYLE[s.status]}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><Phone size={11} /> {s.phone}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={11} /> {s.batchName} · {PLAN_LABEL[s.plan]}</span>
                    <span className="flex items-center gap-1 font-black text-slate-800"><IndianRupee size={11} /> {s.amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
