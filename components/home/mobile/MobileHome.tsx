"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CupSoda,
  Feather,
  Flame,
  GraduationCap,
  Gamepad2,
  Handshake,
  Heart,
  Home,
  LayoutGrid,
  MapPin,
  Medal,
  Menu,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Users,
  UtensilsCrossed,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { type Venue } from "@/lib/venues";
import { getFoodOutlets } from "@/lib/api/foodOrders";
import type { FoodOutlet } from "@/lib/api/types";
import { DISTANCE_OPTIONS, filterPillClass, PRICE_OPTIONS, SORT_OPTIONS, useVenueFilters } from "../useVenueFilters";
import { MobileCard, MobileChip, MobileSectionRow, MobileTopBar } from "@/components/mobile/ui";
import { AdBanner } from "../AdBanner";
import { LastMinuteDealsSection } from "../LastMinuteDealsSection";
import { TopPlayersRanking } from "../TopPlayersRanking";

const MOBILE_PRIMARY_NAV = [
  { label: "Home", href: "/", icon: Home },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Community", href: "/community", icon: Users },
  { label: "Dineout", href: "/food", icon: UtensilsCrossed },
  { label: "More", href: "/blogs", icon: Menu },
];

const MOBILE_QUICK_ACTIONS = [
  {
    id: "coaches",
    label: "Coaches",
    icon: GraduationCap,
    iconBg: "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600",
    glowColor: "shadow-amber-500/30",
  },
  {
    id: "challenge-a-friend",
    label: "Challenge a Friend",
    icon: Swords,
    iconBg: "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500",
    glowColor: "shadow-rose-500/30",
  },
  {
    id: "tournaments",
    label: "Tournaments",
    icon: Trophy,
    iconBg: "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500",
    glowColor: "shadow-yellow-500/35",
  },
  {
    id: "near-me",
    label: "Near Me",
    icon: MapPin,
    iconBg: "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500",
    glowColor: "shadow-emerald-500/30",
  },
  {
    id: "community",
    label: "Community",
    icon: Handshake,
    iconBg: "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
    glowColor: "shadow-blue-500/30",
  },
];

import { SportsCategoryBar, SportCategoryItem } from "@/components/sports/SportsCategoryBar";

const CHOOSE_GAME_CHIPS: SportCategoryItem[] = [
  { id: "cricket", label: "Cricket", emoji: "🏏", image: "/bat.png" },
  { id: "football", label: "Football", emoji: "⚽", image: "/football.png" },
  { id: "badminton", label: "Badminton", emoji: "🏸", image: "/badminton.png" },
  { id: "pickleball", label: "Pickleball", emoji: "🏓", image: "/pickball.png" },
  { id: "tennis", label: "Tennis", emoji: "🎾", image: "/tennis.png" },
  { id: "snooker", label: "Snooker", emoji: "🎱" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
  { id: "more", label: "More", icon: LayoutGrid },
];

function MobileVenueCard({
  venue,
  isFavorite,
  onToggleFavorite,
  onView,
  onBook,
}: {
  venue: Venue;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView: () => void;
  onBook: () => void;
}) {
  const statusStyles =
    venue.status === "Available"
      ? "bg-emerald-500/90 text-white"
      : venue.status === "Filling Fast"
      ? "bg-brand-500/90 text-white"
      : "bg-accent-500/90 text-white";

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={onView}
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-100"
      >
        {/* next/image instead of a CSS background-image: optimised + lazy-loaded, so the
            card no longer pulls the full-size original over the wire. */}
        {venue.image && (
          <Image
            src={venue.image}
            alt={venue.name}
            fill
            sizes="50vw"
            className="object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 backdrop-blur-sm">
          <Star className="h-2.5 w-2.5 fill-current" /> {venue.rating.toFixed(1)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label="Toggle favorite"
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow"
        >
          <Heart className={`h-2.5 w-2.5 ${isFavorite ? "fill-accent-500 text-accent-500" : "text-slate-400"}`} />
        </button>
        <span
          className={`absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${statusStyles}`}
        >
          <span className="h-1 w-1 rounded-full bg-white/90" /> {venue.status}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <h3 className="truncate text-[11px] font-bold text-slate-900">{venue.name}</h3>
        <p className="flex items-center gap-0.5 truncate text-[9px] text-slate-500">
          <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden /> {venue.area}
        </p>
        <p className="mt-0.5 text-[11px] font-bold text-slate-900">
          ₹{venue.pricePerHour}
          <span className="font-normal text-slate-400"> /hr</span>
        </p>
        <button
          type="button"
          onClick={onBook}
          className="mt-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 py-1.5 text-[10px] font-semibold text-white shadow-sm"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

export function MobileHome({
  searchValue,
  onSearchChange,
  venues,
  favorites,
  onToggleFavorite,
  onViewVenue,
  onBookVenue,
  onViewAllVenues,
  onQuickAction,
  onViewAllQuickActions,
  onChooseGame,
  onViewAllSports,
  onJoinCommunity,
  onViewAllCommunity,
  onViewAllEvents,
}: {
  searchValue: string;
  onSearchChange: (v: string) => void;
  venues: Venue[];
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  onViewVenue: (v: Venue) => void;
  onBookVenue: (v: Venue) => void;
  onViewAllVenues: () => void;
  onQuickAction: (taskId: string, gameId: string) => void;
  onViewAllQuickActions: () => void;
  onChooseGame: () => void;
  onViewAllSports: () => void;
  onJoinCommunity: () => void;
  onViewAllCommunity: () => void;
  onViewAllEvents: () => void;
}) {
  const [selectedGame, setSelectedGame] = useState<string>("cricket");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [foodOutlets, setFoodOutlets] = useState<FoodOutlet[]>([]);

  useEffect(() => {
    getFoodOutlets({ limit: 2 })
      .then((result) => setFoodOutlets(result.items))
      .catch(() => setFoodOutlets([]));
  }, []);
  const {
    sportOptions,
    selectedSports,
    toggleSport,
    clearSports,
    maxPrice,
    setMaxPrice,
    maxDistance,
    setMaxDistance,
    sortBy,
    setSortBy,
    resetFilters,
    activeFilterCount,
    filteredVenues,
  } = useVenueFilters(venues, searchValue);

  return (
    <div className="flex flex-col gap-7 px-4 pb-8 pt-4">
      {/* Search sits with the top bar rather than in the page's gap-7 rhythm, so the
          two read as one header block instead of floating apart. */}
      <div className="flex flex-col gap-3">
        <MobileTopBar />

        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 shadow-sm">
          <button
            type="button"
            aria-label="Filters"
            onClick={() => setFiltersOpen(true)}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm"
          >
            <SlidersHorizontal className="h-3 w-3" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white ring-2 ring-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Let's find your vibe"
            className="w-full flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </div>

        <nav
          aria-label="Explore Book Your Vibe"
          className="-mx-4 overflow-x-auto px-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max min-w-full items-stretch gap-2 pb-1">
            {MOBILE_PRIMARY_NAV.map(({ label, href, icon: Icon }, index) => (
              <Link
                key={href}
                href={href}
                className={`group flex min-w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-3 py-2.5 transition active:scale-95 ${
                  index === 0
                    ? "border-brand-200 bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-[0_8px_22px_rgba(220,38,38,0.22)]"
                    : "border-slate-100 bg-white text-slate-600 shadow-[0_5px_16px_rgba(15,23,42,0.06)]"
                }`}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-xl ${index === 0 ? "bg-white/18" : "bg-slate-50 group-hover:bg-brand-50"}`}>
                  <Icon className={`h-[18px] w-[18px] ${index === 0 ? "text-white" : "text-slate-600 group-hover:text-brand-600"}`} strokeWidth={2.2} />
                </span>
                <span className="text-[10px] font-extrabold tracking-tight">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <section>
        <MobileSectionRow title="Choose Your Game" />
        <SportsCategoryBar
          categories={CHOOSE_GAME_CHIPS}
          selectedId={selectedGame}
          variant="card"
          onSelectCategory={(id) => {
            if (id === "more") {
              onViewAllSports();
              return;
            }
            setSelectedGame(id);
            onChooseGame();
          }}
        />
      </section>

      <AdBanner className="" />
      <LastMinuteDealsSection className="" />

      <section>
        <MobileSectionRow title="Quick Actions" />
        <div className="-mx-4 flex items-start gap-3.5 overflow-x-auto px-4 pt-2 pb-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MOBILE_QUICK_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onQuickAction(a.id, "")}
              className="flex shrink-0 w-[76px] flex-col items-center gap-2 text-center group active:scale-95 transition-transform"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-white p-1 shadow-[0_8px_22px_rgba(0,0,0,0.06)] border border-slate-100 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
                <div
                  className={`flex h-full w-full items-center justify-center rounded-[18px] ${a.iconBg} text-white shadow-md ${a.glowColor}`}
                >
                  <a.icon className="h-8 w-8 stroke-[2.2] drop-shadow-md" />
                </div>
              </div>
              <span className="text-[11px] font-extrabold leading-tight text-slate-800 tracking-tight group-hover:text-brand-600 transition-colors">
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <MobileSectionRow title="Trending Venues" emoji="🔥" actionLabel="View All" onAction={onViewAllVenues} />
        {filteredVenues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No venues match your search/filters.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {filteredVenues.slice(0, 4).map((v) => (
                <MobileVenueCard
                  key={v.id}
                  venue={v}
                  isFavorite={favorites.has(v.id)}
                  onToggleFavorite={() => onToggleFavorite(v.id)}
                  onView={() => onViewVenue(v)}
                  onBook={() => onBookVenue(v)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onViewAllVenues}
              className="mt-3 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
            >
              View More Venues
            </button>
          </>
        )}
      </section>

      <TopPlayersRanking variant="mobile" />

      {/* The "Challenge a Friend" duel now lives only in the Community banner below —
          the compact card here said the same thing twice on one screen. */}

      <section>
        <MobileSectionRow title="Community" actionLabel="View All" onAction={onViewAllCommunity} />
        <button type="button" onClick={onJoinCommunity} className="w-full text-left">
          <MobileCard className="relative flex flex-col gap-4 overflow-hidden !bg-slate-950 !p-5 text-white active:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.34),transparent_34%),radial-gradient(circle_at_84%_100%,rgba(16,185,129,0.2),transparent_38%)]" />
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-orange-300">
                <Flame className="h-3.5 w-3.5" /> Vibe Challenge
              </span>
            </div>
            <div className="relative">
              <p className="text-xl font-black uppercase leading-tight">Challenge a Friend</p>
              <p className="mt-2 max-w-[260px] text-xs font-medium leading-relaxed text-slate-400">
                Pick a sport, set the stakes, and send a cinematic duel poster.
              </p>
            </div>
            <div className="relative flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-slate-300">Generate poster & share</span>
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-orange-400">
                Create Now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </MobileCard>
        </button>

        <MobileCard className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              Open Match
            </span>
            <Feather className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Badminton Doubles</p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> Shobhagpura · 1.2 km
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {["A", "R", "K", "S"].map((letter, i) => (
                <span
                  key={letter + i}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-brand-400 to-accent-500 text-[10px] font-bold text-white"
                >
                  {letter}
                </span>
              ))}
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-600">
                +6
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-brand-600">Today, 8:00 PM</p>
              <p className="text-[10px] text-slate-500">₹100 / Player</p>
            </div>
          </div>
          {/* Join = go to the Open Match Lobbies (where matches are actually joinable).
              Challenge = open the create-a-challenge flow. They must not be the same action. */}
          <button
            type="button"
            onClick={onViewAllCommunity}
            className="w-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            Join Now
          </button>
          <button
            type="button"
            onClick={onJoinCommunity}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2 text-xs font-bold text-slate-600"
          >
            <Swords className="h-3.5 w-3.5" /> Or Challenge a Player
          </button>
        </MobileCard>
      </section>

      <section>
        <MobileSectionRow title="Dineout" />
        <div className="mt-2">
          <Link
            href="/food"
            className="group relative block overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-300 active:scale-[0.99]"
          >
            {/* Hero Cover Banner Image */}
            <div className="relative h-44 w-full overflow-hidden bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
                alt="Dineout"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-black/20" />

              {/* Top Badges */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-slate-900/90 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                  DINEOUT &amp; CAFÉS
                </span>
                <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md">
                  <Zap className="h-3 w-3 fill-slate-950 text-slate-950 shrink-0" />
                  <span>UP TO 15% OFF</span>
                </span>
              </div>

              {/* Bottom Inset Outlets Preview */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=120&q=80",
                    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=120&q=80",
                    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=120&q=80",
                  ].map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="Outlet" className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm" />
                  ))}
                </div>
                <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 border border-white/10">
                  12+ Outlets Live
                </span>
              </div>
            </div>

            {/* Body Content */}
            <div className="relative p-4 pt-3">
              <h3 className="text-base font-black text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
                Partner Dining Spots &amp; Venue Counters
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                Explore all top-rated cafes, restaurants &amp; venue food counters near your game with exclusive player discounts.
              </p>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {["Continental", "Italian", "Fast Food", "Beverages"].map((c: string) => (
                  <span key={c} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                    {c}
                  </span>
                ))}
              </div>

              {/* Order Button */}
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#0f172a] px-4 py-2.5 text-white shadow-sm transition group-hover:bg-brand-600">
                <span className="text-xs font-black uppercase tracking-wide">EXPLORE DINEOUT OUTLETS</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section>
        <MobileSectionRow title="Upcoming Events & Tournaments" actionLabel="View All" onAction={onViewAllEvents} />

        <div className="mt-2 space-y-4">
          <div
            onClick={onViewAllEvents}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-[0_10px_30px_rgba(245,158,11,0.12)] transition-all duration-300 active:scale-[0.99]"
          >
            {/* Header Banner */}
            <div className="relative h-36 w-full overflow-hidden bg-slate-900 p-4 text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/events-banner.png"
                alt="Upcoming Events Banner"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              {/* Badges */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md">
                  <Sparkles className="h-3 w-3 fill-slate-950" /> Live Championship
                </span>
                <span className="rounded-full bg-black/65 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold text-amber-200 border border-amber-400/30">
                  ₹50,000 Prize Pool
                </span>
              </div>

              <div className="absolute bottom-3 left-4 right-4 z-10">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">Annual Tournament</p>
                <h3 className="text-lg font-black text-white drop-shadow-md line-clamp-1">BYV Premier League 2026</h3>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 pt-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>31 May – 6 June 2026</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Udaipur Sports Hub</span>
                </div>
              </div>

              {/* Tournament Features */}
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50/80 border border-amber-100 p-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-900 truncate">Multi-Sport Championship</p>
                  <p className="text-[11px] font-medium text-amber-800 truncate">Football · Pickleball · Badminton</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Slots</span>
                  <span className="text-xs font-black text-emerald-600">12 / 16 Teams</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={onViewAllEvents}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-2.5 text-xs font-extrabold text-white shadow-md shadow-amber-500/20 transition group-hover:brightness-110"
              >
                <Medal className="h-4 w-4" /> Register &amp; View Details
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {filtersOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => setFiltersOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">Filters</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Sport</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={clearSports} className={filterPillClass(selectedSports.size === 0)}>
                  Any
                </button>
                {sportOptions.map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={filterPillClass(selectedSports.has(sport))}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Max Price</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setMaxPrice(null)} className={filterPillClass(maxPrice === null)}>
                  Any
                </button>
                {PRICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMaxPrice(opt.value)}
                    className={filterPillClass(maxPrice === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Distance</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMaxDistance(null)}
                  className={filterPillClass(maxDistance === null)}
                >
                  Any
                </button>
                {DISTANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMaxDistance(opt.value)}
                    className={filterPillClass(maxDistance === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Sort By</p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value)}
                    className={filterPillClass(sortBy === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 py-3 text-sm font-semibold text-white shadow-sm"
              >
                Show {filteredVenues.length} Venues
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
