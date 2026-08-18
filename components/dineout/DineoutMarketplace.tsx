"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgePercent,
  Filter,
  MapPin,
  Search,
  Star,
  Sparkles,
} from "lucide-react";
import { MobileTopBar } from "@/components/mobile/ui";
import { SiteHeader } from "@/components/site-header";
import { ApiError } from "@/lib/api/client";
import { getFoodOutlets } from "@/lib/api/foodOrders";
import type { FoodOutlet } from "@/lib/api/types";
import { DINING_SPOTS, getDiningMeta } from "@/lib/dineout-catalog";

type SortKey = "recommended" | "rating" | "distance" | "cost" | "offers";

const FILTERS = [
  { key: "open", label: "Open now" },
  { key: "cafe", label: "Cafe" },
  { key: "rooftop", label: "Rooftop" },
  { key: "fine-dining", label: "Fine dining" },
  { key: "outdoor", label: "Outdoor seating" },
  { key: "live-music", label: "Live music" },
  { key: "family-friendly", label: "Family-friendly" },
  { key: "pub", label: "Nightlife & pubs" },
] as const;

function isOpenNow(outlet: FoodOutlet): boolean {
  const now = new Date();
  const todayKey = now.toDateString();
  if ((outlet.leaves ?? []).some((l) => new Date(l.date).toDateString() === todayKey && l.type === "full")) return false;
  const day = (outlet.weeklyAvailability ?? []).find((d) => d.day === now.getDay());
  if (!day) return true;
  if (!day.isOpen) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= day.startTime && hhmm <= day.endTime;
}

function seedOutlets(): FoodOutlet[] {
  return DINING_SPOTS.map((spot) => ({
    _id: spot.slug,
    slug: spot.slug,
    vendorId: "catalog",
    name: spot.name,
    kind: "dining",
    offer: spot.offers[0],
    cuisines: spot.cuisines,
    gallery: spot.gallery,
    location: { city: "Udaipur", area: spot.area },
    weeklyAvailability: [],
    leaves: [],
    categoryPrepTimes: [],
    dineout: {
      tableBooking: true,
      payBill: true,
      flatDiscountPct: 10,
      slotMinutes: 60,
      tablesPerSlot: 10,
      maxPartySize: 20,
      advanceDays: 30,
      costForTwo: spot.costForTwo,
      autoConfirm: false,
    },
    serviceBufferMins: 5,
    fulfilment: { preOrder: false, inVenue: false, postMatch: false, dineIn: true },
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    poster: spot.hero,
    banner: spot.hero,
  })) as FoodOutlet[];
}

export function DineoutMarketplace() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<FoodOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** True while the grid is showing the built-in catalog rather than live restaurants. */
  const [usingSamples, setUsingSamples] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<string[]>(["open"]);
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    let cancelled = false;
    // 50 is the API's max page size — asking for more fails validation and drops us to the seed catalog.
    getFoodOutlets({ kind: "dining", limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setOutlets(res.items.length > 0 ? res.items : seedOutlets());
        setUsingSamples(res.items.length === 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.describe() : "Could not load restaurants right now");
        setOutlets(seedOutlets());
        setUsingSamples(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    const view = outlets.map((outlet, index) => ({
      outlet,
      meta: getDiningMeta(outlet, index),
      open: isOpenNow(outlet),
    }));

    const filtered = view.filter(({ outlet, meta, open }) => {
      if (queryText) {
        const haystack = [
          outlet.name,
          outlet.offer,
          outlet.location?.area,
          outlet.location?.city,
          ...outlet.cuisines,
          ...meta.features,
          ...meta.offers,
          meta.vibe,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(queryText)) return false;
      }

      return filters.every((key) => {
        switch (key) {
          case "open":
            return open;
          case "cafe":
            return meta.features.some((feature) => feature.toLowerCase().includes("cafe"));
          case "rooftop":
            return meta.features.some((feature) => feature.toLowerCase().includes("rooftop"));
          case "fine-dining":
            return meta.features.some((feature) => feature.toLowerCase().includes("fine"));
          case "outdoor":
            return meta.features.some((feature) => feature.toLowerCase().includes("outdoor"));
          case "live-music":
            return meta.features.some((feature) => feature.toLowerCase().includes("live"));
          case "family-friendly":
            return meta.features.some((feature) => feature.toLowerCase().includes("family"));
          case "pub":
            return meta.features.some((feature) => feature.toLowerCase().includes("pub") || feature.toLowerCase().includes("night"));
          default:
            return true;
        }
      });
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.meta.rating - a.meta.rating;
        case "distance":
          return a.meta.distanceKm - b.meta.distanceKm;
        case "cost":
          return a.meta.costForTwo - b.meta.costForTwo;
        case "offers":
          return b.meta.offers.length - a.meta.offers.length;
        default:
          return b.meta.rating * 100 - b.meta.distanceKm * 10 - a.meta.rating * 100 + a.meta.distanceKm * 10;
      }
    });

    return sorted;
  }, [filters, outlets, query, sortBy]);

  const openCount = useMemo(() => outlets.filter(isOpenNow).length, [outlets]);
  const averageCost = useMemo(() => {
    if (outlets.length === 0) return 0;
    const total = outlets.reduce((sum, outlet, index) => sum + getDiningMeta(outlet, index).costForTwo, 0);
    return Math.round(total / outlets.length);
  }, [outlets]);

  function toggleFilter(key: string) {
    setFilters((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
    setVisibleCount(4);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eefdf5,#f8fafc_40%,#ffffff_85%)]">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>
      <div className="px-4 pt-4 sm:hidden">
        <MobileTopBar />
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#053d24_0%,#0d6b3e_50%,#144d31_100%)] p-4 sm:p-5 text-white shadow-[0_8px_30px_rgba(5,61,36,0.15)] font-sans">
          <div className="pointer-events-none absolute -left-20 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />
          
          <div className="relative flex flex-col gap-2">
            {/* Header row with badge & offer inline */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-200 backdrop-blur-md">
                <Sparkles className="h-3 w-3" /> Dineout
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950 uppercase tracking-wide shadow-sm">
                <BadgePercent className="h-3 w-3" /> Flat 10% OFF
              </span>
            </div>

            {/* Compact Heading */}
            <div className="mt-1">
              <h1 className="text-lg font-black tracking-tight sm:text-2xl leading-tight">
                Discover &amp; Book Table in One Flow
              </h1>
              <p className="mt-1 text-[11px] text-white/80 line-clamp-1 sm:line-clamp-2 leading-snug font-medium">
                Browse top cafes, rooftops &amp; dining spots near your turf with instant table pre-booking.
              </p>
            </div>

            {/* Inline Compact Stats Ribbon */}
            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2 mt-2">
              <div className="rounded-xl border border-white/10 bg-white/10 px-2 py-1.5 text-center backdrop-blur">
                <p className="text-[8px] font-bold uppercase tracking-wider text-white/70">Restaurants</p>
                <p className="text-xs font-black text-white">{outlets.length || DINING_SPOTS.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 px-2 py-1.5 text-center backdrop-blur">
                <p className="text-[8px] font-bold uppercase tracking-wider text-white/70">Open Now</p>
                <p className="text-xs font-black text-emerald-300">{openCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 px-2 py-1.5 text-center backdrop-blur">
                <p className="text-[8px] font-bold uppercase tracking-wider text-white/70">Avg Cost</p>
                <p className="text-xs font-black text-amber-300">₹{averageCost.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search restaurants, cuisine, vibe, or area"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">
                <Filter className="h-4 w-4" />
                Sort
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-transparent text-sm font-bold text-slate-900 outline-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="rating">Top rated</option>
                  <option value="distance">Nearest</option>
                  <option value="cost">Cost for two</option>
                  <option value="offers">Most offers</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => {
              const active = filters.includes(filter.key);
              return (
                <button
                  key={filter.key}
                  onClick={() => toggleFilter(filter.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    active
                      ? "bg-slate-900 text-white shadow"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </section>

        {usingSamples && (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Showing sample restaurants</p>
            <p className="mt-0.5 text-amber-800">
              {error ?? "No live restaurants are listed yet."} These cards are placeholders, so booking a table or
              paying a bill won&apos;t work until live listings load.
            </p>
          </div>
        )}

        <section className="mt-6">
          {loading && cards.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-[1.75rem] bg-white/80" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No restaurants matched your filters. Try clearing a few chips.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 font-sans">
                {cards.slice(0, visibleCount).map(({ outlet, meta, open }) => (
                  <article
                    key={outlet.slug || outlet._id}
                    className="group overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/food/${outlet.slug || outlet._id}`)}
                      className="relative block h-56 w-full overflow-hidden text-left"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={outlet.poster || outlet.banner || meta.hero}
                        alt={outlet.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent" />
                      <div className="absolute left-4 top-4 flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
                            open ? "bg-emerald-500 text-white" : "bg-slate-900/90 text-white backdrop-blur"
                          }`}
                        >
                          {open ? "Open now" : "Closed"}
                        </span>
                        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-slate-900 shadow-sm backdrop-blur">
                          {meta.distanceKm.toFixed(1)} km
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-xl font-extrabold text-white drop-shadow-md">{outlet.name}</h3>
                            <p className="truncate text-[11px] font-semibold text-white/90 drop-shadow-sm">
                              {outlet.cuisines.slice(0, 3).join(" · ") || meta.features.slice(0, 3).join(" · ")}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-black text-slate-900 shadow-sm backdrop-blur">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {meta.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="space-y-4 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-brand-500" />
                          {[outlet.location?.area, outlet.location?.city].filter(Boolean).join(", ") || meta.area}
                        </span>
                        <span>•</span>
                        <span>₹{meta.costForTwo.toLocaleString("en-IN")} / two</span>
                        <span>•</span>
                        <span>{meta.reviewCount.toLocaleString("en-IN")} reviews</span>
                      </div>

                      <p className="text-xs font-medium leading-relaxed text-slate-600 line-clamp-2">{meta.aiSummary}</p>

                      <div className="flex flex-wrap gap-2">
                        {meta.features.slice(0, 4).map((feature) => (
                          <span key={feature} className="rounded-full bg-slate-100/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                            {feature}
                          </span>
                        ))}
                      </div>

                      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                        {meta.offers[0]}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/food/${outlet.slug || outlet._id}`)}
                          className="rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-xs font-black uppercase tracking-wide text-brand-700 transition hover:bg-brand-100"
                        >
                          Book Table
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/food/${outlet.slug || outlet._id}`)}
                          className="rounded-xl bg-[linear-gradient(135deg,#053d24_0%,#0d6b3e_50%,#144d31_100%)] py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-md transition hover:scale-[1.02]"
                        >
                          Pay Bill
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              
              {visibleCount < cards.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 6)}
                    className="rounded-full border border-slate-200 bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                  >
                    View more restaurants
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
