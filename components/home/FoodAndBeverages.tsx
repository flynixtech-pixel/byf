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
        title="Food & Beverages"
        subtitle="Discover partner restaurants, reserve tables, and pay dine-in bills through BookYourVibe."
        actionLabel="View All"
        onAction={() => router.push("/food")}
      />

      <div className="mt-6 flex gap-4 overflow-x-auto pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {foodOutlets.map((outlet, index) => {
          const meta = getDiningMeta(outlet, index);
          return (
            <article
              key={outlet.slug || outlet._id}
              className="group flex-none w-[260px] sm:w-[280px] snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
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
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div className="min-w-0 text-white">
                    <h3 className="truncate text-[15px] font-black leading-tight drop-shadow-sm">{outlet.name}</h3>
                    <p className="truncate text-[10px] font-bold text-slate-300 mt-0.5">
                      {outlet.cuisines.slice(0, 2).join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-extrabold text-slate-900 shadow-sm">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {meta.rating.toFixed(1)}
                  </span>
                </div>
              </button>

              <div className="p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{[outlet.location?.area, outlet.location?.city].filter(Boolean).join(", ") || meta.area}</span>
                  </span>
                  <span>•</span>
                  <span className="shrink-0">₹{meta.costForTwo} for 2</span>
                </div>

                <div className="rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700 truncate border border-emerald-100/50 uppercase tracking-wide">
                  {meta.offers[0] || "Up to 15% OFF"}
                </div>

                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => router.push(`/food/${outlet.slug || outlet._id}`)}
                    className="flex-1 rounded-xl border border-brand-200 bg-brand-50 py-2 text-[11px] font-black text-brand-700 transition hover:bg-brand-100 active:scale-95"
                  >
                    Book Table
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/food/${outlet.slug || outlet._id}`)}
                    className="flex-1 rounded-xl bg-slate-900 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-brand-600 active:scale-95"
                  >
                    Pay Bill
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}


