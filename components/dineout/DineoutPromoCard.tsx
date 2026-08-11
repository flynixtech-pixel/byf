"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

interface DineoutPromoCardProps {
  className?: string;
  href?: string;
  onExplore?: () => void;
}

export function DineoutPromoCard({
  className = "",
  href = "/food",
  onExplore,
}: DineoutPromoCardProps) {
  const content = (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-[0_10px_30px_rgba(245,158,11,0.12)] transition-all duration-300 hover:shadow-[0_15px_35px_rgba(245,158,11,0.2)] hover:-translate-y-1 ${className}`}
    >
      {/* Header Banner */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
          alt="Dineout & Cafes"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2">
          <span className="rounded-full bg-slate-900/90 backdrop-blur-md px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-xs">
            DINEOUT &amp; CAFÉS
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-md">
            <Zap className="h-3.5 w-3.5 fill-slate-950 text-slate-950 shrink-0" />
            <span>UP TO 15% OFF</span>
          </span>
        </div>

        {/* Bottom Inset Outlets Preview */}
        <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between">
          <div className="flex -space-x-2">
            {[
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=120&q=80",
              "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=120&q=80",
              "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=120&q=80",
            ].map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt="Outlet preview"
                className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
              />
            ))}
          </div>
          <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-extrabold text-amber-300 border border-white/10">
            12+ Outlets Live
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="relative p-5 sm:p-6">
        <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-brand-600 transition-colors">
          Partner Dining Spots &amp; Venue Counters
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
          Explore all top-rated cafes, restaurants &amp; venue food counters near your game with exclusive player discounts.
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {["Continental", "Italian", "Fast Food", "Beverages"].map((c) => (
            <span
              key={c}
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              {c}
            </span>
          ))}
        </div>

        {/* Order Button */}
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#0f172a] px-5 py-3.5 text-white shadow-sm transition group-hover:bg-brand-600">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wide">
            EXPLORE DINEOUT OUTLETS
          </span>
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );

  if (onExplore) {
    return (
      <div onClick={onExplore} className="cursor-pointer">
        {content}
      </div>
    );
  }

  return <Link href={href}>{content}</Link>;
}
