"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Sparkles,
  ArrowRight,
  Trophy,
  Zap,
  Star,
  CheckCircle2,
  Activity,
  Layers,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

import { SiteHeader } from "../../components/site-header";
import { MobileCard, MobileTopBar } from "@/components/mobile/ui";
import { browseVenues } from "@/lib/api/venues";
import { Listing } from "@/lib/api/types";
import { AnimatedSportIcon } from "@/components/sports/AnimatedSportIcon";

export interface SportCatalogItem {
  id: string;
  label: string;
  category: "turf" | "racket" | "indoor";
  image: string;
  alt: string;
  bubble: string;
  note: string;
  venuesCount: number;
}

const SPORTS_ITEMS: SportCatalogItem[] = [
  {
    id: "box-cricket",
    label: "Box Cricket",
    category: "turf",
    image: "/bat.png",
    alt: "Box cricket bat and ball",
    bubble: "from-amber-200 via-brand-100 to-amber-50",
    note: "High energy 6-a-side box matches",
    venuesCount: 24,
  },
  {
    id: "football",
    label: "Football",
    category: "turf",
    image: "/football.png",
    alt: "Football",
    bubble: "from-emerald-200 via-teal-100 to-slate-50",
    note: "5v5 & 7v7 turf kickoffs",
    venuesCount: 18,
  },
  {
    id: "badminton",
    label: "Badminton",
    category: "racket",
    image: "/badminton.png",
    alt: "Badminton shuttlecock",
    bubble: "from-sky-200 via-blue-100 to-indigo-100",
    note: "Wooden & synthetic indoor courts",
    venuesCount: 16,
  },
  {
    id: "pickleball",
    label: "Pickleball",
    category: "racket",
    image: "/pickball.png",
    alt: "Pickleball ball",
    bubble: "from-amber-200 via-yellow-100 to-amber-50",
    note: "Trending fast-paced court action",
    venuesCount: 12,
  },
  {
    id: "cricket-nets",
    label: "Cricket Nets",
    category: "turf",
    image: "/nets.png",
    alt: "Cricket ball and net practice",
    bubble: "from-rose-200 via-red-100 to-orange-50",
    note: "Bowling machines & net practice",
    venuesCount: 14,
  },
  {
    id: "tennis",
    label: "Tennis",
    category: "racket",
    image: "/tennis.png",
    alt: "Tennis ball and racket",
    bubble: "from-lime-200 via-emerald-100 to-green-50",
    note: "Hard & clay court singles/doubles",
    venuesCount: 10,
  },
  {
    id: "table-tennis",
    label: "Table Tennis",
    category: "racket",
    image: "/tabletennis.png",
    alt: "Table tennis paddle",
    bubble: "from-orange-200 via-amber-100 to-rose-50",
    note: "Indoor ping pong tables & rallies",
    venuesCount: 9,
  },
  {
    id: "volleyball",
    label: "Volleyball",
    category: "turf",
    image: "/volleyball.jpg",
    alt: "Volleyball court",
    bubble: "from-blue-200 via-cyan-100 to-sky-50",
    note: "Beach & hard court volleyball",
    venuesCount: 8,
  },
  {
    id: "snooker-pool",
    label: "Snooker & Pool",
    category: "indoor",
    image: "/snooker.jpg",
    alt: "Snooker table",
    bubble: "from-purple-200 via-slate-100 to-indigo-50",
    note: "8-ball pool & championship tables",
    venuesCount: 11,
  },
  {
    id: "swimming",
    label: "Swimming",
    category: "indoor",
    image: "/swimming.jpg",
    alt: "Swimming pool",
    bubble: "from-cyan-200 via-sky-100 to-blue-50",
    note: "Olympic & temperature-controlled pools",
    venuesCount: 7,
  },
];

type FilterCategory = "all" | "turf" | "racket" | "indoor";

export default function GamesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  useEffect(() => {
    browseVenues({ type: "Turf", limit: 8 })
      .then((res) => {
        setVenues(res.items);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const filteredSports = useMemo(() => {
    if (activeFilter === "all") return SPORTS_ITEMS;
    return SPORTS_ITEMS.filter((s) => s.category === activeFilter);
  }, [activeFilter]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      {/* Mobile Top Header */}
      <div className="sm:hidden px-4 pt-3 pb-1 bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <MobileTopBar />
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* ================================================================= */}
        {/* HERO SECTION - PICK A SPORT                                      */}
        {/* ================================================================= */}
        <section className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-10 lg:p-12 text-white shadow-2xl shadow-slate-900/20 border border-slate-800">
          {/* Ambient Glow Accents */}
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left Content Column */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Instant Game Finder
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
                Pick a sport, then jump straight to the right venue.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base sm:leading-7">
                We keep booking effortless. Select your sport to view active courts, check live slot availability, and complete your booking in seconds.
              </p>

              {/* Value Props & Stat Pills */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-brand-400">
                  <Trophy className="h-3.5 w-3.5" />
                  {SPORTS_ITEMS.length} Sports Ready
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-emerald-400">
                  <Activity className="h-3.5 w-3.5" />
                  Live Slot Availability
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-sky-400">
                  <Zap className="h-3.5 w-3.5" />
                  Instant Confirmation
                </span>
              </div>
            </div>

            {/* Right Interactive Animated Feature Cards (Desktop Spotlight) */}
            <div className="hidden sm:block">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-inner">
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" /> Trending Right Now
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {SPORTS_ITEMS.slice(0, 4).map((s, idx) => (
                    <div
                      key={s.id}
                      onClick={() => router.push(`/venues?category=${s.id === "box-cricket" || s.id === "cricket-nets" ? "cricket" : s.id}`)}
                      className="group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-md transition-all duration-300 hover:border-brand-500/50 hover:bg-slate-900/90 hover:shadow-lg cursor-pointer"
                    >
                      <AnimatedSportIcon
                        id={s.id}
                        label={s.label}
                        image={s.image}
                        alt={s.alt}
                        bubble={s.bubble}
                        index={idx}
                        className="!h-14 !w-14 sm:!h-16 sm:!w-16 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-brand-400 transition">
                          {s.label}
                        </h3>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                          {s.venuesCount}+ Active Turfs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SPORTS CATALOG & CATEGORY FILTERING                              */}
        {/* ================================================================= */}
        <section className="mt-10 sm:mt-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                <p className="text-xs font-black uppercase tracking-widest text-brand-600">
                  Browse Catalog
                </p>
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl tracking-tight">
                Select Your Favorite Sport
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: "all", label: "All Sports", count: SPORTS_ITEMS.length },
                { id: "turf", label: "🏏 Field & Turf", count: 4 },
                { id: "racket", label: "🏸 Racket Sports", count: 4 },
                { id: "indoor", label: "🎱 Indoor & Leisure", count: 2 },
              ].map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id as FilterCategory)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer ${isActive
                        ? "bg-slate-950 text-white shadow-md shadow-slate-950/20 ring-2 ring-slate-950/30 scale-[1.02]"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${isActive ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animated Sports Grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSports.map((sport, index) => {
              const categoryQuery =
                sport.id === "box-cricket" || sport.id === "cricket-nets" ? "cricket" : sport.id;

              return (
                <Link
                  key={sport.id}
                  href={`/venues?category=${categoryQuery}`}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/5"
                >
                  {/* Decorative background gradient */}
                  <div
                    className={`absolute inset-0 opacity-0 bg-gradient-to-br ${sport.bubble} transition-opacity duration-300 group-hover:opacity-10 pointer-events-none`}
                  />

                  <div>
                    {/* Top Row: Animated Icon + Venue Count Tag */}
                    <div className="flex items-start justify-between gap-3">
                      <AnimatedSportIcon
                        id={sport.id}
                        label={sport.label}
                        image={sport.image}
                        alt={sport.alt}
                        bubble={sport.bubble}
                        index={index}
                        className="!h-20 !w-20 sm:!h-24 sm:!w-24 shrink-0"
                      />

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 group-hover:bg-brand-50 group-hover:text-brand-700 transition">
                          <MapPin className="h-3 w-3 text-brand-500" />
                          {sport.venuesCount} Venues
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          Slots Open
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="mt-4">
                      <h3 className="text-xl font-black tracking-tight text-slate-950 group-hover:text-brand-600 transition-colors">
                        {sport.label}
                      </h3>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                        {sport.note}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-bold text-slate-600 group-hover:text-brand-600 transition">
                      View Available Courts
                    </span>
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-700 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-white group-hover:translate-x-1 group-hover:shadow-md group-hover:shadow-brand-500/30">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* FEATURED VENUES SECTION                                           */}
        {/* ================================================================= */}
        <section className="mt-14 sm:mt-20">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-brand-600">
                Top Rated Arenas
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl tracking-tight">
                Book a Court, Turf, or Table Near You
              </h2>
            </div>
            <Link
              href="/venues"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 hover:underline transition shrink-0"
            >
              View All Venues <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {venues.map((venue) => (
              <Link
                key={venue._id}
                href={`/venues/${venue.slug || venue._id}`}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300"
              >
                {/* Cover Image Container */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  {venue.coverImage ? (
                    <Image
                      src={venue.coverImage}
                      alt={venue.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-600 font-bold text-xs">
                      Venue Preview
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                  {/* Rating & Sport Pills */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-black text-slate-900 shadow-sm">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      4.8
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/20">
                      Turf & Court
                    </span>
                  </div>

                  {/* Bottom Image Title Overlay */}
                  <div className="absolute bottom-3 left-4 right-4 z-10">
                    <h3 className="text-base font-black text-white leading-tight drop-shadow-sm group-hover:text-amber-300 transition">
                      {venue.title}
                    </h3>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-4 flex items-center justify-between gap-3 bg-white">
                  <div>
                    <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-brand-500" /> {venue.city || "Udaipur"}
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      ₹{venue.price?.toLocaleString("en-IN") ?? 800} <span className="text-[11px] font-semibold text-slate-400">/ hr</span>
                    </p>
                  </div>

                  <span className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 group-hover:bg-brand-500 group-hover:text-white transition">
                    Book Slot
                  </span>
                </div>
              </Link>
            ))}

            {/* Skeleton Loading State */}
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-[2rem] border border-slate-200 bg-white p-4 h-64 flex flex-col justify-between"
                >
                  <div className="h-36 rounded-xl bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
