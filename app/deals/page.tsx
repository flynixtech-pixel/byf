"use client";

import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MobileTopBar } from "@/components/mobile/ui";
import { useLastMinuteDeals } from "@/lib/hooks/useLastMinuteDeals";
import { LastMinuteDealCard } from "@/components/deals/LastMinuteDealCard";

export default function DedicatedDealsPage() {
  const { deals, loading } = useLastMinuteDeals();
  const maxDiscount = deals.reduce((max, d) => Math.max(max, d.discountPct), 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_42%,_#ffffff_78%)] text-slate-900">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden px-4 pt-4">
        <MobileTopBar />
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Header section */}
        <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-6 text-white shadow-xl sm:p-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-orange-300 backdrop-blur-md">
              <Flame className="h-4 w-4 text-orange-400 fill-orange-400 animate-bounce" /> Last Minute Deals
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
              Live Now
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Exclusive Court Price Drops
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Hand-picked last minute deals triggered in real time. Grab discounted slots at top turfs near you before time runs out.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
              ⚡ {deals.length} active deals live
            </span>
            {maxDiscount > 0 && (
              <span className="rounded-full bg-orange-500/20 px-4 py-2 text-xs font-bold text-orange-300 border border-orange-500/30">
                Up to {maxDiscount}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Deals Listing Grid */}
        <section className="mt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl flex items-center gap-2">
              Discounted Slots <span className="text-sm font-semibold text-slate-500">({deals.length})</span>
            </h2>
            <Link
              href="/venues"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 sm:text-sm"
            >
              Browse All Venues →
            </Link>
          </div>

          {deals.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {deals.map((deal) => (
                <LastMinuteDealCard key={deal.id} deal={deal} />
              ))}
            </div>
          ) : loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">No Last Minute Deals Active Right Now</h3>
              <p className="mt-1 text-sm text-slate-500">
                Venues trigger last minute boosts when court slots approach. Check back soon or browse all available turfs.
              </p>
              <Link
                href="/venues"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700"
              >
                Browse All Venues
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
