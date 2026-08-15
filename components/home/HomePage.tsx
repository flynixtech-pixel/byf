"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Gamepad2,
  MapPin,
  Sparkles,
  Table2,
  Disc2,
  Volleyball,
} from "lucide-react";
import { type Venue, listingToVenue } from "@/lib/venues";
import { browseVenues } from "@/lib/api/venues";
import { getFoodOutlets } from "@/lib/api/foodOrders";
import { browsePublicTournaments } from "@/lib/api/tournaments";
import type { FoodOutlet, Tournament } from "@/lib/api/types";
import { SiteHeader } from "../site-header";
import { Hero } from "./Hero";
import { FoodAndBeverages } from "./FoodAndBeverages";
import { TopPlayersRanking } from "./TopPlayersRanking";
import { TrendingVenues } from "./TrendingVenues";
import { HowItWorks } from "./HowItWorks";
import { CommunityMatches } from "./CommunityMatches";
import { EventsAndOffers } from "./EventsAndOffers";
import { WhyBookYourVibe } from "./WhyBookYourVibe";
import { AboutUs } from "./AboutUs";
import { Testimonials } from "./Testimonials";
import { AppDownloadCTA } from "./AppDownloadCTA";
import { Footer } from "./Footer";
import { FiltersModal } from "./modals/FiltersModal";
import { SignupModal } from "./modals/SignupModal";
import { MobileHome } from "./mobile/MobileHome";
import { useVenueFilters } from "./useVenueFilters";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { SPORTS_CATALOG } from "./data";

const FALLBACK_VENUES: Venue[] = [
  { id: "mock-1", slug: "box-cricket", name: "Box Cricket Arena", area: "Udaipur", distanceKm: 0, rating: 4.8, pricePerHour: 800, status: "Available", sport: "Cricket", image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80" },
  { id: "mock-2", slug: "premium-sports", name: "Premium Sports Arena", area: "Udaipur", distanceKm: 0, rating: 4.5, pricePerHour: 1500, status: "Available", sport: "Multi-Sport", image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&q=80" },
  { id: "mock-3", slug: "dugout-box", name: "Dugout - Box turf", area: "Udaipur", distanceKm: 0, rating: 4.2, pricePerHour: 1000, status: "Available", sport: "Football", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80" },
];

// Only rendered once the player opens the challenge sheet, and pulls in
// jsPDF/html-to-image — code-split out of the initial home page bundle.
const ChallengeFlow = dynamic(
  () => import("@/components/challenges/ChallengeFlow").then((m) => m.ChallengeFlow),
  { ssr: false }
);

export default function HomePage() {
  const router = useRouter();
  const { status } = useCustomerAuth();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [foodOutlets, setFoodOutlets] = useState<FoodOutlet[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [joinInviteOpen, setJoinInviteOpen] = useState(false);
  const filters = useVenueFilters(venues, search);

  useEffect(() => {
    if (status === "guest" && new URLSearchParams(window.location.search).get("join") === "player") {
      setJoinInviteOpen(true);
    }
  }, [status]);

  useEffect(() => {
    browseVenues({ limit: 30, type: "Turf" })
      .then((result) => {
        if (result.items && result.items.length > 0) {
          setVenues(result.items.map(listingToVenue));
        } else {
          // Fallback if no venues are returned but API succeeded
          setVenues(FALLBACK_VENUES);
        }
      })
      .catch(() => {
        setVenues(FALLBACK_VENUES);
      });

    browsePublicTournaments({ limit: 1 })
      .then((res) => setTournaments(res.items))
      .catch(() => setTournaments([]));
      
    getFoodOutlets({ kind: "dining", limit: 10 })
      .then((res) => setFoodOutlets(res.items))
      .catch(() => setFoodOutlets([]));
  }, []);

  const openVenue = useCallback(
    (v: Venue) => router.push(`/venues/${v.slug || v.id}`),
    [router]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleQuickAction = useCallback(
    (taskId: string, gameId: string) => {
      const routes: Record<string, string> = {
        coaches: "/coaches",
        "challenge-a-friend": "/challenges",
        tournaments: "/tournaments",
        "near-me": "/venues",
        community: "/community",
        "book-now": "/venues",
        "find-players": "/community",
        offers: "/deals",
        venue: `/venues?category=${gameId}`,
        food: "/food",
        challenge: "/challenges",
      };
      router.push(routes[taskId] ?? "/venues");
    },
    [router]
  );

  const handleSearchSubmit = useCallback(() => {
    if (search.trim()) {
      router.push(`/venues?search=${encodeURIComponent(search.trim())}`);
    } else {
      router.push("/venues");
    }
  }, [search, router]);

  const filteredVenuesNote = useMemo(() => {
    if (!search && filters.activeFilterCount === 0) return null;
    return filters.filteredVenues.length;
  }, [search, filters.activeFilterCount, filters.filteredVenues]);

  return (
    <div className="min-h-screen bg-[#f3f4fb] font-sans text-slate-950">
      <SiteHeader />
      <Hero
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={filters.activeFilterCount}
        venues={venues}
      />

        {filteredVenuesNote !== null && (
          <p className="mx-auto mt-4 max-w-7xl px-4 text-sm text-slate-500 sm:px-6 lg:px-8">
            {filteredVenuesNote} venue(s) match &ldquo;{search}&rdquo;
          </p>
        )}

        <TrendingVenues
          venues={venues}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onViewVenue={openVenue}
          onBookVenue={openVenue}
          onViewAll={() => router.push("/venues")}
        />

        {/* Find A Venue - Sports Section */}
        <section className="relative z-10 mx-auto max-w-7xl pt-1 pb-1 sm:pt-4 sm:px-6 lg:px-8">
          <div className="sm:rounded-[2.5rem] sm:border sm:border-slate-100 sm:bg-white sm:p-8 sm:shadow-xl sm:shadow-slate-200/50 relative">
            
            <div className="relative z-10 flex items-center justify-between gap-3 mb-4 px-4 sm:px-0 sm:mb-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 sm:h-12 sm:w-12 sm:rounded-2xl">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-2xl drop-shadow-sm">Find A Venue</h2>
                  <p className="text-[11px] font-semibold text-slate-500 sm:text-sm mt-0.5">Discover top venues for every game and vibe.</p>
                </div>
              </div>
              <Link
                href="/venues"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline transition shrink-0"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="relative z-10 flex overflow-x-auto px-4 pb-4 pt-2 sm:px-0 sm:grid sm:overflow-visible gap-3 sm:gap-6 sm:grid-cols-4 xl:grid-cols-7 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
              {SPORTS_CATALOG.map((s, index) => {
                // Map the ID to a category for the venues page
                const category = s.id === "box-cricket" || s.id === "cricket-nets" ? "cricket" : s.id;

                return (
                  <Link
                    key={s.id}
                    href={`/venues?category=${category}`}
                    className="group flex flex-col items-center justify-start text-center min-w-0 w-[72px] shrink-0 sm:w-full cursor-pointer snap-start"
                  >
                    <div className="relative flex h-16 w-16 sm:h-[110px] sm:w-[110px] items-center justify-center rounded-[1.25rem] sm:rounded-[2rem] bg-slate-50 border border-slate-100 transition-all duration-300 group-hover:-translate-y-2 group-hover:bg-white group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                      <div className={`absolute inset-0 opacity-15 bg-gradient-to-br ${s.bubble} transition-opacity duration-300 group-hover:opacity-30`} />
                      <img
                        src={s.image}
                        alt={s.alt}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="relative z-10 h-8 w-8 sm:h-[55px] sm:w-[55px] object-contain transition-transform duration-500 group-hover:scale-125 drop-shadow-md"
                      />
                    </div>
                    <span className="mt-2 sm:mt-3.5 text-[10px] font-black uppercase tracking-wider text-slate-700 transition-colors group-hover:text-brand-600 sm:text-xs text-center truncate w-full px-1">
                      {s.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {tournaments.length > 0 && (
          <EventsAndOffers
            tournaments={tournaments}
            onViewAllEvents={() => router.push("/tournaments")}
          />
        )}

        {foodOutlets.length > 0 && <FoodAndBeverages foodOutlets={foodOutlets} />}

        <TopPlayersRanking />

        <CommunityMatches
          onJoin={() => showToast("Joining Badminton Doubles match…")}
          onHost={() => router.push("/community")}
          onBookCoach={() => router.push("/coaches")}
          onViewAll={() => router.push("/community")}
          onLaunchChallenge={() => setChallengeOpen(true)}
        />

        <HowItWorks />

        <WhyBookYourVibe />

        <AboutUs />

        <Testimonials />

        <AppDownloadCTA />

      <Footer />

      {filtersOpen && (
        <FiltersModal
          onClose={() => setFiltersOpen(false)}
          resultCount={filters.filteredVenues.length}
          filters={filters}
        />
      )}
      {challengeOpen && <ChallengeFlow onClose={() => setChallengeOpen(false)} />}
      {joinInviteOpen && (
        <SignupModal
          onClose={() => setJoinInviteOpen(false)}
          onSignedUp={() => setJoinInviteOpen(false)}
          onSwitchToLogin={() => setJoinInviteOpen(false)}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}


