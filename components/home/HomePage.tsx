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
import { OnboardingFlow } from "./OnboardingFlow";
import { SPORTS_CATALOG } from "./data";



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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [joinInviteOpen, setJoinInviteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const filters = useVenueFilters(venues, search);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      setShowOnboarding(false);
      return;
    }

    if (typeof window === "undefined") return;
    try {
      const seen = sessionStorage.getItem("onboarding_seen");
      if (!seen) {
        sessionStorage.setItem("onboarding_seen", "true");
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } catch {
      setShowOnboarding(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "guest" && new URLSearchParams(window.location.search).get("join") === "player") {
      setJoinInviteOpen(true);
    }
  }, [status]);

  useEffect(() => {
    browseVenues({ limit: 30, type: "Turf" })
      .then((result) => {
        setVenues(result.items.map(listingToVenue));
      })
      .catch(() => {
        setVenues([]);
      });
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

  const filteredVenuesNote = useMemo(() => {
    if (!search && filters.activeFilterCount === 0) return null;
    return filters.filteredVenues.length;
  }, [search, filters.activeFilterCount, filters.filteredVenues]);

  const handleOnboardingComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("onboarding_seen", "true");
      } catch {
        // Storage unavailable
      }
    }
    setShowOnboarding(false);
  }, []);

  if (showOnboarding === null) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  return (
    <div className="min-h-screen bg-[#f3f4fb] font-sans text-slate-950">
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      
      <SiteHeader />
      <Hero
        searchValue={search}
        onSearchChange={setSearch}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={filters.activeFilterCount}
      />

        {filteredVenuesNote !== null && (
          <p className="mx-auto mt-4 max-w-7xl px-4 text-sm text-slate-500 sm:px-6 lg:px-8">
            {filteredVenuesNote} venue(s) match &ldquo;{search}&rdquo;
          </p>
        )}

        {/* Find A Venue - Sports Section */}
        <section className="-mt-6 px-4 pb-8 sm:-mt-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[1.25rem] border border-white/60 bg-white/70 p-4 shadow-xl shadow-slate-200/40 backdrop-blur-xl sm:rounded-[2rem] sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white shadow-md sm:h-12 sm:w-12 sm:rounded-2xl">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">Find A Venue</h2>
                <p className="text-[11px] font-medium text-slate-500 sm:text-sm">Discover top venues for every game and vibe.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3 sm:mt-6 sm:gap-5 md:grid-cols-4 xl:grid-cols-7">
              {SPORTS_CATALOG.map((s, index) => {
                // Map the ID to a category for the venues page
                const category = s.id === "box-cricket" || s.id === "cricket-nets" ? "cricket" : s.id;
                
                return (
                  <Link
                    key={s.id}
                    href={`/venues?category=${category}`}
                    className="group flex flex-col items-center justify-start text-center min-w-0 w-full"
                  >
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-[1rem] bg-white border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-slate-200 group-hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] sm:h-20 sm:w-20 sm:rounded-[1.25rem]">
                      <div className={`absolute inset-0 rounded-[inherit] opacity-20 bg-gradient-to-br ${s.bubble}`} />
                      <img
                        src={s.image}
                        alt={s.alt}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="relative z-10 h-7 w-7 object-contain transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10"
                      />
                    </div>
                    <span className="mt-2 text-[10px] font-semibold text-slate-600 transition-colors group-hover:text-slate-950 sm:mt-3 sm:text-xs text-center line-clamp-1 w-full px-1">
                      {s.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <TrendingVenues
          venues={venues}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onViewVenue={openVenue}
          onBookVenue={openVenue}
          onViewAll={() => router.push("/venues")}
        />

        <TopPlayersRanking />

        <EventsAndOffers
          onViewAllEvents={() => router.push("/tournaments")}
        />

        <CommunityMatches
          onJoin={() => showToast("Joining Badminton Doubles match…")}
          onHost={() => router.push("/community")}
          onBookCoach={() => router.push("/coaches")}
          onViewAll={() => router.push("/community")}
          onLaunchChallenge={() => setChallengeOpen(true)}
        />

        <FoodAndBeverages />

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


