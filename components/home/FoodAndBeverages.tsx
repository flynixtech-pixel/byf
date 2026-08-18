"use client";

import { useRouter } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { SectionHeading } from "./ui";
import type { FoodOutlet } from "@/lib/api/types";
import { getDiningMeta } from "@/lib/dineout-catalog";

/** Live player-facing food outlets section on web. */
export function FoodAndBeverages({ foodOutlets }: { foodOutlets?: FoodOutlet[] }) {
  const router = useRouter();

  if (!foodOutlets || foodOutlets.length === 0) return null;

  return (
    <section id="food" className="mx-auto mt-6 sm:mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Refuel the squad"
        title="Eat & Chill 🍕"
        subtitle="Reserve tables at top spots and split the bill without the awkward group chat."
      />

      <div className="relative mt-6">
        <div className="grid grid-cols-2 gap-3 pb-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 blur-[3px] opacity-70 pointer-events-none select-none">
        {foodOutlets.slice(0, 4).map((outlet, index) => {
          const meta = getDiningMeta(outlet, index);
          return (
            <article
              key={outlet.slug || outlet._id}
              className="group min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <button
                type="button"
                onClick={() => router.push(`/food/${outlet.slug || outlet._id}`)}
                className="relative block h-[140px] w-full overflow-hidden text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={outlet.poster || outlet.banner || meta.hero}
                  alt={outlet.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-1">
                  <div className="min-w-0 text-white flex-1 mr-1">
                    <h3 className="line-clamp-2 text-[12px] font-display italic font-bold leading-tight drop-shadow-sm">{outlet.name}</h3>
                    <p className="truncate text-[8px] font-bold text-slate-300 mt-0.5">
                      {outlet.cuisines.join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-extrabold text-slate-900 shadow-sm">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {meta.rating.toFixed(1)}
                  </span>
                </div>
              </button>

              <div className="p-2.5 flex flex-col gap-2">
                <div className="flex flex-col gap-1 w-full">
                  <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                    <MapPin className="h-3 w-3 shrink-0 text-brand-500" />
                    <span className="truncate">{[outlet.location?.area, outlet.location?.city].filter(Boolean).join(", ") || meta.area}</span>
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-900 ml-4">₹{meta.costForTwo} <span className="font-medium text-slate-400">for 2</span></span>
                </div>

                <div className="rounded border border-emerald-100/50 bg-emerald-50 px-1.5 py-1 text-[8px] font-extrabold text-emerald-700 leading-tight uppercase tracking-wide line-clamp-2">
                  {meta.offers[0] || "Up to 15% OFF"}
                </div>

                <div className="flex gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => router.push(`/food/${outlet.slug || outlet._id}`)}
                    className="flex-1 rounded-xl border border-brand-200 bg-brand-50 py-1.5 px-1 text-[8.5px] font-black uppercase text-brand-700 transition hover:bg-brand-100 active:scale-95 truncate"
                  >
                    Book Table
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/food/${outlet.slug || outlet._id}`)}
                    className="flex-1 rounded-xl bg-slate-900 py-1.5 px-1 text-[8.5px] font-black uppercase text-white shadow-sm transition hover:bg-brand-600 active:scale-95 truncate"
                  >
                    Pay Bill
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        </div>
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-2xl border border-white/20 bg-slate-900/80 px-8 py-5 backdrop-blur-md shadow-2xl flex flex-col items-center transform transition-all hover:scale-105">
            <span className="text-3xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg text-center">Coming Soon</span>
            <div className="mt-2 h-1 w-12 rounded-full bg-brand-500"></div>
            <span className="text-brand-400 font-bold text-sm mt-3 text-center">Get ready to dine out!</span>
          </div>
        </div>
      </div>
      <button type="button" disabled className="mt-5 w-full rounded-2xl border border-slate-200 py-2.5 text-[13px] font-bold text-slate-400 bg-slate-50 cursor-not-allowed sm:hidden">
        Coming Soon
      </button>
    </section>
  );
}

