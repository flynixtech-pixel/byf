"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Building2, Clock, MapPin, Tag } from "lucide-react";
import type { LastMinuteDeal } from "@/lib/api/deals";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Starting now";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `Starts in ${h}h ${m}m`;
  return `Starts in ${m}m ${s}s`;
}

/** Deep-links straight into checkout with this exact boosted slot preselected — see
 * `dealContext` on BookingFlow and the query-param handling in venues/[id]/page.tsx. */
export function dealHref(deal: LastMinuteDeal): string {
  const params = new URLSearchParams({
    deal: "1",
    date: deal.date,
    sport: deal.sport,
    slot: deal.slotStart,
  });
  if (deal.courtId) params.set("courtId", deal.courtId);
  return `/venues/${deal.slug || deal.listingId}?${params.toString()}`;
}

export function LastMinuteDealCard({ deal }: { deal: LastMinuteDeal }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = new Date(deal.slotStartsAt).getTime() - now;
  const savings = Math.max(0, deal.originalPrice - deal.discountedPrice);

  return (
    <Link
      href={dealHref(deal)}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {deal.coverImage ? (
          <Image
            src={deal.coverImage}
            alt={deal.title}
            fill
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
            <Building2 className="h-10 w-10" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1 text-xs font-black uppercase text-white shadow-lg shadow-orange-500/30">
          <Tag className="h-3 w-3 fill-current" /> {deal.discountPct}% OFF
        </span>

        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold text-amber-300 backdrop-blur-md">
          <Clock className="h-3 w-3" /> {formatCountdown(remaining)}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 line-clamp-1 group-hover:text-brand-600 transition">
            {deal.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {deal.city}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              {deal.sport}
            </span>
            {deal.courtName && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                {deal.courtName}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              {deal.slotStart} - {deal.slotEnd}
            </span>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 sm:text-xl">
                  ₹{deal.discountedPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-xs font-bold text-slate-400 line-through">
                  ₹{deal.originalPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[10px] font-bold text-emerald-600">
                Save ₹{savings.toLocaleString("en-IN")}
              </p>
            </div>

            <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow transition group-hover:bg-brand-600">
              Book Now
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
