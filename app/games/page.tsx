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
import { MobileTopBar } from "@/components/mobile/ui";
import { browseVenues } from "@/lib/api/venues";
import { Listing } from "@/lib/api/types";
import { AnimatedSportIcon } from "@/components/sports/AnimatedSportIcon";
import { VenuePosterCard, VenuePosterCardSkeleton } from "@/components/venue-poster-card";

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
  const [showAllSports, setShowAllSports] = useState(false);

  useEffect(() => {
    browseVenues({ type: "Turf", limit: 20 })
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
    <div className="min-h-screen bg-slate-50/50 text-slate-900 selection:bg-brand-500 selection:text-white pb-6 sm:pb-10">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>
      <div className="sm:hidden px-4 pt-3 pb-1 bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <MobileTopBar />
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        
        {/* Compact, Premium Header */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">
              What's the play?
            </p>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Pick your game. Lock the vibe.
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
            Less scrolling, more scoring. Find a fire turf, assemble the squad, and show up to play.
          </p>
        </section>

        {/* Filter Tabs */}
        <div className="mb-5 flex items-center gap-2.5 overflow-x-auto pb-2 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "all", label: "All Sports", icon: <Layers className="h-3.5 w-3.5" /> },
            { id: "turf", label: "Field & Turf", icon: <Activity className="h-3.5 w-3.5" /> },
            { id: "racket", label: "Racket Sports", icon: <Zap className="h-3.5 w-3.5" /> },
            { id: "indoor", label: "Indoor & Leisure", icon: <Trophy className="h-3.5 w-3.5" /> },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.id as FilterCategory);
                  setShowAllSports(false);
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${isActive
                    ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/25 border border-brand-500 scale-105"
                    : "bg-white text-slate-500 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                  }`}
              >
                <span className={isActive ? "text-white opacity-90" : "text-brand-500 opacity-80"}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Compact Sports Grid */}
        <section>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredSports.map((sport, index) => {
              const categoryQuery = sport.id === "box-cricket" || sport.id === "cricket-nets" ? "cricket" : sport.id;
              const isHiddenOnMobile = !showAllSports && index >= 4;

              return (
                <Link
                  key={sport.id}
                  href={`/venues?category=${categoryQuery}`}
                  className={`${isHiddenOnMobile ? "hidden sm:flex" : "flex"} group items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-2 shadow-xs transition hover:shadow-md hover:border-brand-200`}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-slate-50 flex items-center justify-center">
                    <AnimatedSportIcon
                      id={sport.id}
                      label={sport.label}
                      image={sport.image}
                      alt={sport.alt}
                      bubble={sport.bubble}
                      index={index}
                      className="!h-7 !w-7"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[11px] sm:text-xs font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                      {sport.label}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
                      {sport.note}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredSports.length > 4 && (
            <div className="mt-4 flex justify-center sm:hidden">
              <button
                type="button"
                onClick={() => setShowAllSports(!showAllSports)}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                {showAllSports ? "View Less" : `View ${filteredSports.length - 4} More`}
              </button>
            </div>
          )}
        </section>

        {/* Featured Venues Section */}
        <section className="mt-12 sm:mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-600 mb-1">
                Top Arenas
              </p>
              <h2 className="font-display text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Book a court near you
              </h2>
            </div>
            <Link
              href="/venues"
              className="text-xs font-bold text-brand-600 hover:underline shrink-0"
            >
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <VenuePosterCardSkeleton key={i} />
              ))
            ) : venues.length > 0 ? (
              venues.map((venue) => (
                <VenuePosterCard
                  key={venue._id}
                  id={venue._id}
                  href={`/venues/${venue.slug || venue._id}`}
                  title={venue.title}
                  image={venue.coverImage}
                  city={venue.city}
                  price={venue.price}
                />
              ))
            ) : (
              <p className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
                No venues found.
              </p>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
